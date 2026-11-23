window.SV = window.SV || {};

SV.overlay = ({ chart, series, stage, canvas, get }) => {
  const ts = chart.timeScale();
  const g = canvas.getContext('2d');
  const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const FIB_COL = ['#787b86', '#f23645', '#ff9800', '#4caf50', '#089981', '#00bcd4', '#787b86'];
  const BLUE = '#2962ff';
  let drawings = [], tool = 'cursor', pending = null, hover = null, sel = null, drag = null;
  let dirty = true, sig = '', key = '', W = 0, H = 0, dpr = 1;
  let toolCb = () => {}, changeCb = () => {};

  const idxOfTime = t => {
    const { bars, step } = get(), n = bars.length;
    if (!n) return 0;
    if (t >= bars[n - 1].t) return n - 1 + (t - bars[n - 1].t) / step;
    if (t <= bars[0].t) return (t - bars[0].t) / step;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (bars[m].t <= t) lo = m; else hi = m; }
    return lo + (t - bars[lo].t) / (bars[hi].t - bars[lo].t);
  };
  const timeOfIdx = l => {
    const { bars, step } = get(), n = bars.length;
    if (!n) return 0;
    if (l >= n - 1) return bars[n - 1].t + (l - (n - 1)) * step;
    if (l <= 0) return bars[0].t + l * step;
    const lo = Math.floor(l);
    return bars[lo].t + (l - lo) * (bars[lo + 1].t - bars[lo].t);
  };
  const X = l => {
    const a = Math.floor(l), f = l - a, xa = ts.logicalToCoordinate(a);
    if (xa == null || !f) return xa;
    const xb = ts.logicalToCoordinate(a + 1);
    return xb == null ? xa : xa + (xb - xa) * f;
  };
  const Xt = t => X(idxOfTime(t));
  const Y = p => series.priceToCoordinate(p);
  const P = y => series.coordinateToPrice(y);
  const Lx = x => ts.coordinateToLogical(x);
  const ready = () => get().bars.length > 0;

  function snap(x, y) {
    const { bars } = get();
    const l = Lx(x) ?? 0;
    let p = P(y), best = 10;
    const i = Math.round(l);
    if (i >= 0 && i < bars.length) {
      for (const v of [bars[i].h, bars[i].l, bars[i].o, bars[i].c]) {
        const d = Math.abs(Y(v) - y);
        if (d < best) { best = d; p = v; }
      }
    }
    return { t: timeOfIdx(l), p };
  }

  function resize() {
    const w = ts.width(), h = Math.max(0, stage.clientHeight - ts.height()), r = window.devicePixelRatio || 1;
    if (w === W && h === H && r === dpr) return false;
    W = w; H = h; dpr = r;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    return true;
  }

  function line(x1, y1, x2, y2, color, width = 1, dash = []) {
    g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
  }
  function text(s, x, y, color, align = 'left', weight = 500, size = 11.5) {
    g.font = `${weight} ${size}px "IBM Plex Sans", system-ui, sans-serif`;
    g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle';
    g.fillText(s, x, y);
  }
  function tag(s, x, y, bg, fg, align = 'left') {
    g.font = '600 11.5px "IBM Plex Sans", system-ui, sans-serif';
    const w = g.measureText(s).width + 10, h = 18;
    const left = Math.max(2, Math.min(W - w - 2, align === 'right' ? x - w : align === 'center' ? x - w / 2 : x));
    g.fillStyle = bg; roundRect(left, y - h / 2, w, h, 3); g.fill();
    text(s, left + 5, y, fg, 'left', 600);
  }
  function roundRect(x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function handle(x, y) {
    g.fillStyle = '#ffffff'; g.strokeStyle = BLUE; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); g.stroke();
  }

  function outcome(d) {
    const { bars } = get(), n = bars.length, long = d.type === 'long';
    if (!n) return { k: 'wait' };
    const i0 = Math.max(0, Math.ceil(idxOfTime(d.a.t))), i1 = Math.min(n - 1, Math.floor(idxOfTime(d.t2)));
    if (i0 > n - 1) return { k: 'wait' };
    for (let i = i0; i <= i1; i++) {
      const b = bars[i];
      if (long ? b.l <= d.stop : b.h >= d.stop) return { k: 'stop' };
      if (long ? b.h >= d.target : b.l <= d.target) return { k: 'target' };
    }
    const last = bars[i1].c;
    return { k: i1 >= n - 1 ? 'open' : 'expired', pnl: (long ? last - d.a.p : d.a.p - last) / d.a.p * 100 };
  }

  function positionStats(d) {
    const { S } = get();
    const risk = Math.abs(d.a.p - d.stop), reward = Math.abs(d.target - d.a.p);
    const qty = risk > 0 ? S.account * S.riskPct / 100 / risk : 0;
    return { risk, reward, rr: risk > 0 ? reward / risk : 0, qty, value: qty * d.a.p };
  }

  function drawOne(d, active) {
    if (d.type === 'trend') {
      const x1 = Xt(d.a.t), y1 = Y(d.a.p), x2 = Xt(d.b.t), y2 = Y(d.b.p);
      if ([x1, y1, x2, y2].some(v => v == null)) return;
      line(x1, y1, x2, y2, BLUE, active ? 1.5 : 1);
      if (active) { handle(x1, y1); handle(x2, y2); }
    } else if (d.type === 'hline') {
      const y = Y(d.p);
      if (y == null) return;
      line(0, y, W, y, BLUE, active ? 1.5 : 1);
      tag(SV.fmt(d.p), W - 4, y, BLUE, '#ffffff', 'right');
    } else if (d.type === 'fib') {
      const x1 = Xt(d.a.t), x2 = Xt(d.b.t), ya = Y(d.a.p), yb = Y(d.b.p);
      if ([x1, x2, ya, yb].some(v => v == null)) return;
      const xl = Math.min(x1, x2), xr = Math.max(Math.max(x1, x2), xl + 60);
      const price = r => d.b.p + (d.a.p - d.b.p) * r;
      const y5 = Y(price(0.5)), y6 = Y(price(0.618));
      g.fillStyle = 'rgba(255,193,7,.14)'; g.fillRect(xl, Math.min(y5, y6), xr - xl, Math.abs(y6 - y5));
      FIB.forEach((r, k) => {
        const y = Y(price(r));
        line(xl, y, xr, y, FIB_COL[k], 1);
        text(`${r} · ${SV.fmt(price(r))}`, xl + 4, y - 8, FIB_COL[k], 'left', 600);
      });
      line(x1, ya, x2, yb, 'rgba(120,123,134,.7)', 1, [4, 4]);
      if (active) { handle(x1, ya); handle(x2, yb); }
    } else if (d.type === 'long' || d.type === 'short') {
      const x1 = Xt(d.a.t), x2 = Xt(d.t2), ye = Y(d.a.p), yt = Y(d.target), ys = Y(d.stop);
      if ([x1, x2, ye, yt, ys].some(v => v == null)) return;
      const xl = Math.min(x1, x2), w = Math.max(8, Math.abs(x2 - x1));
      g.fillStyle = 'rgba(8,153,129,.22)'; g.fillRect(xl, Math.min(ye, yt), w, Math.abs(yt - ye));
      g.fillStyle = 'rgba(242,54,69,.22)'; g.fillRect(xl, Math.min(ye, ys), w, Math.abs(ys - ye));
      line(xl, ye, xl + w, ye, '#9598a1', 1);
      line(xl, yt, xl + w, yt, '#089981', active ? 1.5 : 1);
      line(xl, ys, xl + w, ys, '#f23645', active ? 1.5 : 1);
      const st = positionStats(d), e = d.a.p;
      const tPct = (d.target - e) / e * 100, sPct = (d.stop - e) / e * 100;
      const cx = xl + w / 2, up = yt < ye;
      tag(`Hedef ${SV.fmt(d.target)} (${SV.pct(tPct)})`, cx, yt + (up ? -12 : 12), '#089981', '#ffffff', 'center');
      tag(`Stop ${SV.fmt(d.stop)} (${SV.pct(sPct)})`, cx, ys + (up ? 12 : -12), '#f23645', '#ffffff', 'center');
      const qtyTxt = st.qty >= 100 ? st.qty.toFixed(0) : st.qty >= 1 ? st.qty.toFixed(2) : st.qty.toPrecision(3);
      tag(`${d.type === 'long' ? 'Long' : 'Short'} · R:R ${st.rr.toFixed(2).replace('.', ',')} · Miktar ${qtyTxt}`, cx, ye, '#434651', '#ffffff', 'center');
      const o = outcome(d);
      const oy = Math.max(Math.max(ye, yt, ys) + 30, 0);
      if (o.k === 'target') tag('Hedefe ulaştı ✓', cx, oy, '#089981', '#ffffff', 'center');
      else if (o.k === 'stop') tag('Stop oldu ✗', cx, oy, '#f23645', '#ffffff', 'center');
      else if (o.k === 'open' || o.k === 'expired') tag(`${o.k === 'open' ? 'Açık' : 'Süre doldu'} · ${SV.pct(o.pnl)}`, cx, oy, o.pnl >= 0 ? '#089981' : '#f23645', '#ffffff', 'center');
      if (active) { handle(xl + w, ye); handle(cx, yt); handle(cx, ys); }
    }
  }

  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (!ready()) return;
    const { bars, res, S } = get(), n = bars.length, op = S.opacity ?? 0.5;
    g.globalAlpha = op;
    const bs = ts.options().barSpacing;
    if (res && res.signals) {
      for (const s of res.signals) {
        const big = s.type === 'bull' || s.type === 'bear';
        if ((big && !S.layers.big) || (s.type === 'rev' && !S.layers.rev) || (!big && s.type !== 'rev')) continue;
        const x = X(s.i);
        if (x == null || x < -20 || x > W + 20) continue;
        const w = big ? Math.max(1.5, Math.min(3, bs * 0.3)) : 1;
        g.fillStyle = s.type === 'bull' ? 'rgba(34,227,58,.55)' : s.type === 'bear' ? 'rgba(178,60,253,.55)' : 'rgba(245,197,24,.6)';
        g.fillRect(x - w / 2, 0, w, H);
      }
    }
    const used = [];
    const label = (txt, x, y, col) => {
      if (x > 0 && y > 10 && y < H - 10 && !used.some(u => Math.abs(u[1] - y) < 22 && Math.abs(u[0] - x) < 140)) {
        used.push([x, y]); tag(txt, x, y, col, '#ffffff', 'center');
      }
    };
    const htf = get().htf || {};
    const TF = [['1M', 'Aylık', 1.4], ['1w', 'Haftalık', 1.1], ['1d', 'Günlük', 0.8]];
    for (const [k, name, lw] of TF) {
      if (!S.layers['htf' + k] || !htf[k]) continue;
      for (const t of htf[k]) {
        const ta = Math.max(t.t1, bars[0].t), tb = bars[n - 1].t + 60 * get().step;
        const x1 = Xt(ta), x2 = Xt(tb), y1 = Y(t.p1 + t.m * (ta - t.t1)), y2 = Y(t.p1 + t.m * (tb - t.t1));
        if ([x1, x2, y1, y2].some(v => v == null)) continue;
        const col = t.dir < 0 ? '#ff6d3a' : '#20c5b5';
        line(x1, y1, x2, y2, col, lw);
        const lx = Math.min(W - 80, X(n - 1) + 40), ly = y1 + (y2 - y1) * ((lx - x1) / (x2 - x1 || 1));
        label(`${name} ${t.dir < 0 ? 'düşen' : 'yükselen'}`, lx, ly - 14, col);
      }
    }
    if (S.layers.para && htf.arcs) {
      const step = get().step, tEnd = bars[n - 1].t + Math.max(60 * step, 0);
      for (const q of htf.arcs) {
        const f = t => Math.exp(q.c0 + q.c1 * (t - q.T0) / q.SC + q.c2 * ((t - q.T0) / q.SC) ** 2);
        const ta = Math.max(q.t1, bars[0].t), tb = Math.max(tEnd, bars[n - 1].t + q.span * 0.15), col = '#e6c229';
        g.strokeStyle = col; g.lineWidth = q.tf === '1M' ? 1.2 : 1; g.setLineDash([]); g.beginPath();
        let first = true;
        for (let k = 0; k <= 160; k++) {
          const t = ta + (tb - ta) * k / 160, x = Xt(t), y = Y(f(t));
          if (x == null || y == null || !isFinite(y)) continue;
          if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y);
        }
        g.stroke();
        const tn = bars[n - 1].t, xn = Xt(tn), yn = Y(f(tn));
        if (xn == null || yn == null || yn < 0 || yn > H) continue;
        g.fillStyle = col; g.beginPath(); g.arc(xn, yn, 4, 0, Math.PI * 2); g.fill();
        const down = q.kind === 'sup', lx = Math.min(xn + 50, W - 150), ly = yn + (down ? -26 : 26);
        if (used.some(u => Math.abs(u[1] - ly) < 22 && Math.abs(u[0] - lx) < 220)) continue;
        used.push([lx, ly]);
        line(xn, yn, lx, ly, 'rgba(230,194,41,.8)', 1);
        tag(`${q.tf === '1M' ? 'Aylık' : 'Haftalık'} parabolik ${down ? 'destek' : 'direnç'} ${SV.fmt(f(tn))}${q.broken ? ' · kırıldı' : ''}`, lx, ly, q.broken ? (down ? '#ef5350' : '#26a69a') : '#7a5d00', '#ffffff', 'left');
        if (q.broken) {
          const dy = down ? 60 : -60;
          line(xn + 6, yn + dy * 0.15, xn + 30, yn + dy, down ? '#ef5350' : '#26a69a', 1.5, [5, 4]);
          g.fillStyle = down ? '#ef5350' : '#26a69a'; g.beginPath();
          g.moveTo(xn + 30, yn + dy + (down ? 6 : -6)); g.lineTo(xn + 25, yn + dy - (down ? 2 : -2)); g.lineTo(xn + 35, yn + dy - (down ? 2 : -2)); g.closePath(); g.fill();
        }
      }
    }
    const idea = get().idea;
    if (S.layers.idea && idea) {
      for (const [c, col, fill, name] of [[idea.res, '#ef5350', 'rgba(239,83,80,.12)', 'Direnç bölgesi'], [idea.sup, '#26a69a', 'rgba(38,166,154,.12)', 'Destek bölgesi']]) {
        if (!c) continue;
        const pad = idea.atr * 0.15, y1 = Y(c.hi + pad), y2 = Y(c.lo - pad), x1 = X(n - 1 - 30);
        if (y1 == null || y2 == null || x1 == null) continue;
        g.fillStyle = fill; g.fillRect(x1, y1, W - x1, y2 - y1);
        line(x1, y1, W, y1, col, 1, [4, 3]); line(x1, y2, W, y2, col, 1, [4, 3]);
        label(c.label || name, Math.min(W - 70, x1 + 60), (y1 + y2) / 2, col);
      }
    }
    if (res && res.patterns && S.layers.pat) {
      const sel = get().patSel;
      const show = res.patterns.filter(p => p.active).slice(-2);
      if (sel != null && res.patterns[sel] && !show.includes(res.patterns[sel])) show.push(res.patterns[sel]);
      for (const p of show) drawPattern(p, label);
    }
    g.globalAlpha = 1;
    for (const d of drawings) if (!d.hidden) drawOne(d, d.id === sel);
    if (pending && hover) drawOne(tool === 'fib' ? { type: 'fib', a: pending, b: hover } : { type: 'trend', a: pending, b: hover }, true);
    g.globalAlpha = Math.min(1, op + 0.15);
    if (res && res.signals && (S.layers.bs || S.layers.zone)) {
      for (const s of res.signals) {
        const isZ = s.type === 'zsell';
        if (isZ ? !S.layers.zone : (s.type !== 'buy' && s.type !== 'sell') || !S.layers.bs) continue;
        const x = X(s.i);
        if (x == null || x < -30 || x > W + 30) continue;
        const buy = s.type === 'buy', y = Y(buy ? bars[s.i].l : bars[s.i].h);
        if (y == null) continue;
        const off = isZ && S.layers.bs && res.signals.some(o => o.i === s.i && o.type === 'sell') ? 28 : 0;
        const tip = buy ? y + 5 : y - 5 - off, by = buy ? tip + 5 : tip - 5;
        g.font = `600 ${isZ ? 11 : 12}px "IBM Plex Sans", system-ui, sans-serif`;
        const label = buy ? 'Buy' : isZ ? 'Direnç' : 'Sell', w = g.measureText(label).width + 14, h = isZ ? 19 : 22;
        g.fillStyle = buy ? '#16d94a' : isZ ? '#b71c1c' : '#f23645';
        g.beginPath(); g.moveTo(x, tip); g.lineTo(x - 5, by); g.lineTo(x + 5, by); g.closePath(); g.fill();
        roundRect(x - w / 2, buy ? by : by - h, w, h, 3); g.fill();
        text(label, x, buy ? by + h / 2 : by - h / 2, buy ? '#05310f' : '#ffffff', 'center', 600, isZ ? 11 : 12);
      }
    }
    if (res && res.signals && S.layers.ltb) {
      for (const s of res.signals) {
        if (s.type !== 'ltb') continue;
        const x = X(s.i), y0 = Y(bars[s.i].l);
        if (x == null || y0 == null || x < -30 || x > W + 30) continue;
        const off = S.layers.bs && res.signals.some(o => o.i === s.i && o.type === 'buy') ? 30 : 0;
        const tip = y0 + 5 + off, by = tip + 5, w = 22, h = 24;
        g.fillStyle = '#9c27b0';
        g.beginPath(); g.moveTo(x, tip); g.lineTo(x - 5, by); g.lineTo(x + 5, by); g.closePath(); g.fill();
        roundRect(x - w / 2, by, w, h, 3); g.fill();
        text('P', x, by + h / 2, '#ffffff', 'center', 700, 13);
      }
    }
    if (res && res.signals && S.layers.react) {
      for (const s of res.signals) {
        if (s.type !== 'react') continue;
        const x = X(s.i);
        if (x == null || x < -10 || x > W + 10) continue;
        const up = s.dir > 0, y = Y(up ? bars[s.i].l : bars[s.i].h);
        if (y == null) continue;
        const off = (S.layers.bs && res.signals.some(o => o.i === s.i && (o.type === (up ? 'buy' : 'sell'))) ? 34 : 0) + (up && S.layers.ltb && res.signals.some(o => o.i === s.i && o.type === 'ltb') ? 32 : 0);
        const cy = up ? y + 9 + off : y - 9 - off, col = up ? '#00bfa5' : '#ff8a3d';
        g.fillStyle = col; g.beginPath();
        g.moveTo(x, cy - 5); g.lineTo(x + 5, cy); g.lineTo(x, cy + 5); g.lineTo(x - 5, cy); g.closePath(); g.fill();
        if (bs >= 7) text(up ? 'Tepki ↑' : 'Tepki ↓', x, up ? cy + 13 : cy - 13, col, 'center', 600, 10.5);
      }
    }
    const fl = get().fills;
    if (fl && fl.length) {
      g.globalAlpha = Math.max(0.75, op);
      const grp = new Map(), t0 = bars[0].t;
      for (const f of fl) {
        if (f.t < t0) continue;
        const bi = Math.floor(idxOfTime(f.t) + 1e-6), k = bi + '|' + f.side;
        const a = grp.get(k) || { bi, side: f.side, q: 0, n: 0, pnl: 0, close: false };
        a.q += f.sz; a.n += f.sz * f.px; a.pnl += f.pnl; a.close = a.close || f.close;
        grp.set(k, a);
      }
      for (const a of grp.values()) {
        const x = X(a.bi), y = Y(a.n / a.q);
        if (x == null || y == null || x < -10 || x > W + 10) continue;
        const up = a.side > 0, col = up ? '#26a69a' : '#ef5350', s = 6;
        g.beginPath();
        if (up) { g.moveTo(x, y); g.lineTo(x - s, y + s * 1.6); g.lineTo(x + s, y + s * 1.6); }
        else { g.moveTo(x, y); g.lineTo(x - s, y - s * 1.6); g.lineTo(x + s, y - s * 1.6); }
        g.closePath();
        g.fillStyle = col; g.fill();
        g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
        if (bs >= 5) {
          const t = (up ? 'Al' : 'Sat') + (a.close && Math.abs(a.pnl) >= 0.01 ? ' ' + (a.pnl >= 0 ? '+' : '−') + Math.abs(a.pnl).toLocaleString('tr-TR', { maximumFractionDigits: Math.abs(a.pnl) >= 100 ? 0 : 2 }) + ' $' : '');
          text(t, x, up ? y + s * 1.6 + 11 : y - s * 1.6 - 5, col, 'center', 600, 10.5);
        }
      }
    }
    g.globalAlpha = 1;
  }

  function drawPattern(p, label) {
    const { bars } = get(), n = bars.length;
    const col = p.bull === true ? '#26a69a' : p.bull === false ? '#ef5350' : '#f5a623';
    const fill = p.bull === true ? 'rgba(38,166,154,.09)' : p.bull === false ? 'rgba(239,83,80,.09)' : 'rgba(245,166,35,.09)';
    const pt = q => [X(q.i), Y(q.p)];
    const top = p.lines.find(l => l.role === 'top'), bot = p.lines.find(l => l.role === 'bot');
    if (top && bot) {
      const c = [pt(top.a), pt(top.b), pt(bot.b), pt(bot.a)];
      if (c.flat().every(v => v != null)) {
        g.fillStyle = fill; g.beginPath(); c.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
      }
    }
    const boxes = p.lines.filter(l => l.role === 'box');
    if (boxes.length === 2) {
      const [a1, b1] = [pt(boxes[0].a), pt(boxes[0].b)], [a2] = [pt(boxes[1].a)];
      if ([...a1, ...b1, ...a2].every(v => v != null)) { g.fillStyle = fill; g.fillRect(a1[0], Math.min(a1[1], a2[1]), b1[0] - a1[0], Math.abs(a2[1] - a1[1])); }
    }
    for (const l of p.lines) {
      const [x1, y1] = pt(l.a), [x2, y2] = pt(l.b);
      if ([x1, y1, x2, y2].some(v => v == null)) continue;
      line(x1, y1, x2, y2, col, 1, l.role === 'neck' ? [5, 4] : []);
    }
    if (p.type !== 'bflag' && p.type !== 'sflag' && !top) {
      g.strokeStyle = col; g.lineWidth = 1; g.setLineDash([]); g.beginPath();
      p.pts.forEach((q, k) => { const [x, y] = pt(q); if (x == null || y == null) return; k ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }
    const ys = p.pts.map(q => Y(q.p)).filter(v => v != null);
    const st = { forming: 'oluşuyor', confirmed: 'kırıldı', target: 'hedefe ulaştı', failed: 'başarısız', expired: 'süresi doldu' }[p.status] || '';
    const lx = X((p.start + p.last) / 2);
    if (lx != null && ys.length) label(`${p.name} · ${st}`, lx, Math.min(...ys) - 16, col);
    const o = p.outlook;
    if (o && o.target != null && (p.status === 'forming' || p.status === 'confirmed' || get().patSel != null)) {
      const from = p.brk ?? n - 1, x1 = X(from), x2 = X(from + 18), y1 = Y(bars[Math.min(from, n - 1)].c), y2 = Y(o.target);
      if ([x1, x2, y1, y2].every(v => v != null)) {
        const oc = o.dir > 0 ? '#26a69a' : '#ef5350';
        line(x1, y1, x2, y2, oc, 1, [5, 4]);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        g.fillStyle = oc; g.beginPath(); g.moveTo(x2, y2);
        g.lineTo(x2 - 8 * Math.cos(ang - 0.45), y2 - 8 * Math.sin(ang - 0.45)); g.lineTo(x2 - 8 * Math.cos(ang + 0.45), y2 - 8 * Math.sin(ang + 0.45)); g.closePath(); g.fill();
        tag(`Hedef ${SV.fmt(o.target)} · olasılık %${Math.round(o.prob * 100)}`, x2 + 6, y2, oc, '#ffffff', 'left');
      }
    }
  }

  function frame() {
    if (ready()) {
      const sized = resize();
      const r = ts.getVisibleLogicalRange(), ref = get().bars[get().bars.length - 1].c;
      const s = `${W}|${H}|${r ? r.from.toFixed(3) + ',' + r.to.toFixed(3) : ''}|${Y(ref)}|${Y(ref * 1.01)}`;
      if (sized || dirty || s !== sig) { sig = s; dirty = false; render(); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L2)) : 0;
    return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
  }

  function hitOne(d, x, y) {
    if (d.type === 'trend' || d.type === 'fib') {
      const x1 = Xt(d.a.t), y1 = Y(d.a.p), x2 = Xt(d.b.t), y2 = Y(d.b.p);
      if (Math.hypot(x - x1, y - y1) <= 8) return 'a';
      if (Math.hypot(x - x2, y - y2) <= 8) return 'b';
      if (d.type === 'trend') return segDist(x, y, x1, y1, x2, y2) <= 6 ? 'body' : null;
      const xl = Math.min(x1, x2), xr = Math.max(Math.max(x1, x2), xl + 60);
      if (x < xl - 4 || x > xr + 4) return null;
      return FIB.some(r => Math.abs(y - Y(d.b.p + (d.a.p - d.b.p) * r)) <= 5) ? 'body' : null;
    }
    if (d.type === 'hline') return Math.abs(y - Y(d.p)) <= 5 ? 'body' : null;
    const x1 = Xt(d.a.t), x2 = Xt(d.t2), ye = Y(d.a.p), yt = Y(d.target), ys = Y(d.stop);
    const xl = Math.min(x1, x2), xr = Math.max(x1, x2, xl + 8), top = Math.min(yt, ys), bot = Math.max(yt, ys);
    const inX = x >= xl - 4 && x <= xr + 4;
    if (inX && Math.abs(y - yt) <= 5) return 'target';
    if (inX && Math.abs(y - ys) <= 5) return 'stop';
    if (Math.abs(x - xr) <= 6 && Math.abs(y - ye) <= 8) return 'end';
    if (inX && y >= top && y <= bot) return 'body';
    return null;
  }

  function hit(x, y) {
    if (!ready()) return null;
    const order = drawings.filter(d => !d.hidden).sort((a, b) => (a.id === sel) - (b.id === sel)).reverse();
    for (const d of order) { const part = hitOne(d, x, y); if (part) return { id: d.id, part }; }
    return null;
  }

  const save = () => SV.store.set(key, drawings);
  const byId = id => drawings.find(d => d.id === id);
  const changed = () => { dirty = true; changeCb(); };

  function setTool(t) {
    tool = t; pending = null; hover = null;
    stage.style.cursor = t === 'cursor' ? '' : 'crosshair';
    dirty = true; toolCb(t);
  }

  function create(d) {
    d.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    drawings.push(d); sel = d.id; save(); setTool('cursor'); changed();
  }

  function down(x, y) {
    const pt = snap(x, y);
    if (tool === 'cursor') {
      const h = hit(x, y);
      sel = h.id;
      drag = { id: h.id, part: h.part, o: JSON.parse(JSON.stringify(byId(h.id))), l0: Lx(x) ?? 0, p0: P(y) };
      changed();
      return;
    }
    if (tool === 'trend' || tool === 'fib') {
      if (!pending) { pending = pt; hover = pt; dirty = true; return; }
      create({ type: tool, a: pending, b: pt });
      return;
    }
    if (tool === 'hline') { create({ type: 'hline', p: pt.p }); return; }
    if (tool === 'long' || tool === 'short') {
      const { res, step, bars } = get();
      const a = res && res.ctx ? res.ctx.atr[res.ctx.atr.length - 1] : bars[bars.length - 1].c * 0.01;
      const L = tool === 'long', p = P(y);
      create({ type: tool, a: { t: pt.t, p }, t2: pt.t + 30 * step, stop: L ? p - 1.5 * a : p + 1.5 * a, target: L ? p + 3 * a : p - 3 * a });
    }
  }

  function move(x, y) {
    if (drag) {
      const d = byId(drag.id), o = drag.o, l = Lx(x) ?? drag.l0, p = P(y);
      if (!d || p == null) return;
      const dl = l - drag.l0, dp = p - drag.p0, shift = t => timeOfIdx(idxOfTime(t) + dl);
      if (drag.part === 'a') d.a = snap(x, y);
      else if (drag.part === 'b') d.b = snap(x, y);
      else if (drag.part === 'target') d.target = p;
      else if (drag.part === 'stop') d.stop = p;
      else if (drag.part === 'end') d.t2 = timeOfIdx(Math.max(idxOfTime(o.a.t) + 1, l));
      else if (d.type === 'hline') d.p = o.p + dp;
      else if (d.type === 'trend' || d.type === 'fib') {
        d.a = { t: shift(o.a.t), p: o.a.p + dp };
        d.b = { t: shift(o.b.t), p: o.b.p + dp };
      } else {
        d.a = { t: shift(o.a.t), p: o.a.p + dp };
        d.t2 = shift(o.t2); d.stop = o.stop + dp; d.target = o.target + dp;
      }
      dirty = true;
      return;
    }
    if (pending) { hover = snap(x, y); dirty = true; return; }
    if (tool === 'cursor' && x >= 0 && y >= 0 && x <= W && y <= H) {
      const h = hit(x, y);
      stage.style.cursor = !h ? '' : h.part === 'body' ? 'move' : h.part === 'end' ? 'ew-resize' : h.part === 'target' || h.part === 'stop' ? 'ns-resize' : 'pointer';
    }
  }

  const local = e => {
    const r = stage.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
    return [p.clientX - r.left, p.clientY - r.top];
  };
  const inside = (x, y) => x >= 0 && y >= 0 && x <= W && y <= H;
  const wants = (x, y) => ready() && inside(x, y) && (tool !== 'cursor' || !!hit(x, y));

  for (const type of ['mousedown', 'touchstart']) {
    stage.addEventListener(type, e => { const [x, y] = local(e); if (wants(x, y)) e.stopPropagation(); }, true);
  }
  stage.addEventListener('pointerdown', e => {
    const [x, y] = local(e);
    if (!wants(x, y)) {
      if (sel && inside(x, y)) { sel = null; changed(); }
      return;
    }
    e.stopPropagation(); e.preventDefault();
    down(x, y);
  }, true);
  window.addEventListener('pointermove', e => { if (ready()) { const [x, y] = local(e); move(x, y); } });
  window.addEventListener('pointerup', () => { if (drag) { drag = null; save(); changed(); } });
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); api.removeSelected(); }
    if (e.key === 'Escape') { sel = null; setTool('cursor'); changed(); }
  });

  const api = {
    setTool,
    tool: () => tool,
    selected: () => sel,
    count: () => drawings.length,
    list: () => drawings,
    onTool: cb => { toolCb = cb; },
    onChange: cb => { changeCb = cb; },
    invalidate: () => { dirty = true; },
    removeSelected() { if (!sel) return; drawings = drawings.filter(d => d.id !== sel); sel = null; save(); changed(); },
    clearAll() { drawings = []; sel = null; save(); changed(); },
    select(id) { sel = id; changed(); },
    add(d) { create(d); },
    toggle(id) { const d = byId(id); if (!d) return; d.hidden = !d.hidden; if (d.hidden && sel === id) sel = null; save(); changed(); },
    remove(id) { drawings = drawings.filter(d => d.id !== id); if (sel === id) sel = null; save(); changed(); },
    stats: d => ({ ...positionStats(d), outcome: outcome(d) }),
    load(symbol) {
      key = `seviye.cizim.${symbol}`;
      drawings = SV.store.get(key, []);
      sel = null; pending = null; changed();
    }
  };
  return api;
};
