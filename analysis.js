window.SV = window.SV || {};

SV.analysis = (() => {
  const { sma, stdev, rsi, atr, macd, pivots, median } = SV.ind;

  function indicators(bars) {
    const c = bars.map(b => b.c), v = bars.map(b => b.v);
    const mid = sma(c, 20), sd = stdev(c, 20, mid);
    return {
      atr: atr(bars),
      rsi: rsi(c),
      bbUp: mid.map((m, i) => m == null ? null : m + 2 * sd[i]),
      bbLo: mid.map((m, i) => m == null ? null : m - 2 * sd[i]),
      bbW: mid.map((m, i) => m == null || !m ? null : 4 * sd[i] / m),
      s50: sma(c, 50),
      s200: sma(c, 200),
      volAvg: sma(v, 20),
      macd: macd(c)
    };
  }

  function levels(bars, piv, medAtr, S) {
    const n = bars.length, last = bars[n - 1].c, tol = medAtr * S.tol;
    const all = [...piv.highs, ...piv.lows].sort((a, b) => a.p - b.p);
    const clusters = [];
    for (const x of all) {
      const c = clusters[clusters.length - 1];
      if (c && x.p - c[c.length - 1].p <= tol && x.p - c[0].p <= tol * 2) c.push(x);
      else clusters.push([x]);
    }
    const scored = clusters
      .filter(c => c.length >= 2)
      .map(c => {
        const lastI = Math.max(...c.map(x => x.i));
        const price = c.reduce((s, x) => s + x.p, 0) / c.length;
        const w = c.reduce((s, x) => s + 0.3 + 0.7 * x.i / n, 0);
        const far = Math.abs(price - last) / last;
        return { price, touches: c.length, far, score: w + 3 * lastI / n - 8 * far };
      })
      .filter(l => l.far <= 0.3);
    const half = Math.ceil(S.levels / 2);
    const up = scored.filter(l => l.price >= last).sort((a, b) => b.score - a.score);
    const dn = scored.filter(l => l.price < last).sort((a, b) => b.score - a.score);
    const nu = Math.min(up.length, Math.max(S.levels - Math.min(dn.length, half), half));
    return [...up.slice(0, nu), ...dn.slice(0, S.levels - Math.min(nu, up.length))].sort((a, b) => b.price - a.price);
  }

  function htfTrends(bars, L, maxDist, nowT, lastPrice) {
    const n = bars.length;
    if (n < L * 4 + 4) return [];
    const A = atr(bars);
    const piv = pivots(bars, L);
    const pick = (list, dir) => {
      const P = list.filter(x => x.i + L < n).slice(-14);
      let best = null;
      for (let a = 0; a < P.length; a++) {
        for (let b = a + 1; b < P.length; b++) {
          const pa = P[a], pb = P[b];
          if (pb.i - pa.i < L * 2) continue;
          if (dir < 0 ? pb.p >= pa.p : pb.p <= pa.p) continue;
          const ta = bars[pa.i].t, m = (pb.p - pa.p) / (bars[pb.i].t - ta), f = t => pa.p + m * (t - ta);
          let ok = true;
          for (let k = pa.i + 1; k < n && ok; k++) {
            const tol = A[k] * 0.3, v = f(bars[k].t);
            if (dir < 0 ? bars[k].c > v + tol : bars[k].c < v - tol) ok = false;
            if (k < pb.i && (dir < 0 ? bars[k].h > v + 2 * tol : bars[k].l < v - 2 * tol)) ok = false;
          }
          const now = f(nowT);
          if (!ok || now <= 0 || Math.abs(now - lastPrice) / lastPrice > maxDist) continue;
          const touches = P.filter(x => x.i >= pa.i && Math.abs(x.p - f(bars[x.i].t)) <= A[x.i] * 0.4).length;
          const score = touches * 2 + (pb.i - pa.i) / n + pb.i / n;
          if (!best || score > best.score) best = { dir, t1: ta, p1: pa.p, m, touches, score, now };
        }
      }
      return best;
    };
    return [pick(piv.highs, -1), pick(piv.lows, 1)].filter(Boolean);
  }

  function arcs(bars, L, maxDist, nowT, lastPrice) {
    const n = bars.length;
    if (n < 40) return [];
    const A = atr(bars), piv = pivots(bars, L), lg = Math.log;
    const T0 = bars[0].t, SC = (bars[n - 1].t - T0) || 1, u = t => (t - T0) / SC;
    const tolAt = k => Math.max(0.004, 0.35 * A[k] / bars[k].c);
    const solve = (pts) => {
      const [[x1, y1], [x2, y2], [x3, y3]] = pts;
      const d = (x1 - x2) * (x1 - x3) * (x2 - x3);
      if (!d) return null;
      const c2 = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / d;
      const c1 = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / d;
      const c0 = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / d;
      return { c0, c1, c2 };
    };
    const build = (list, kind) => {
      const P = list.filter(x => x.i + L < n).slice(-18), sg = kind === 'sup' ? 1 : -1;
      let best = null;
      for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) for (let c = b + 1; c < P.length; c++) {
        const pa = P[a], pb = P[b], pc = P[c];
        if (pc.i - pa.i < n * 0.25 || pb.i - pa.i < L * 2 || pc.i - pb.i < L * 2) continue;
        const pts = [pa, pb, pc].map(p => [u(bars[p.i].t), lg(p.p)]);
        const q = solve(pts);
        if (!q) continue;
        const chord = pts[0][1] + (pts[2][1] - pts[0][1]) * (pts[1][0] - pts[0][0]) / (pts[2][0] - pts[0][0]);
        if (Math.abs(pts[1][1] - chord) < Math.max(0.06, 3 * tolAt(pb.i))) continue;
        const f = t => q.c0 + q.c1 * u(t) + q.c2 * u(t) ** 2;
        let ok = true;
        for (let k = pa.i; k < n - 3 && ok; k++) {
          if (sg * (lg(bars[k].c) - f(bars[k].t)) < -tolAt(k)) ok = false;
        }
        if (!ok) continue;
        const now = Math.exp(f(nowT));
        if (!isFinite(now) || Math.abs(now - lastPrice) / lastPrice > maxDist) continue;
        const touches = P.filter(x => x.i >= pa.i && Math.abs(lg(x.p) - f(bars[x.i].t)) <= tolAt(x.i) * 1.2).length;
        let broken = false;
        for (let k = Math.max(pa.i, n - 3); k < n; k++) if (sg * (lg(bars[k].c) - f(bars[k].t)) < -tolAt(k)) broken = true;
        const score = touches * 2 + 3 * (pc.i - pa.i) / n + pc.i / n;
        if (!best || score > best.score) best = { kind, T0, SC, ...q, t1: bars[pa.i].t, span: bars[pc.i].t - bars[pa.i].t, now, touches, broken, score };
      }
      return best;
    };
    return [build(piv.lows, 'sup'), build(piv.highs, 'res')].filter(Boolean);
  }

  function signals(bars, ctx, L, S) {
    const n = bars.length, out = [];
    const { atr: A, rsi: R, bbUp, bbLo, bbW, s50, s200, volAvg } = ctx;
    const piv = pivots(bars, L);
    const queue = [...piv.highs, ...piv.lows].sort((a, b) => a.i - b.i);
    const known = [];
    const insert = v => { let lo = 0, hi = known.length; while (lo < hi) { const m = (lo + hi) >> 1; if (known[m] < v) lo = m + 1; else hi = m; } known.splice(lo, 0, v); };
    const near = (v, tol, pred) => {
      let lo = 0, hi = known.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (known[m] < v - tol) lo = m + 1; else hi = m; }
      for (let k = lo; k < known.length && known[k] <= v + tol; k++) if (pred(known[k])) return true;
      return false;
    };
    const EXT = S.ext || 20;
    let q = 0, lastH = null, lastL = null, inSq = false, sqAge = 1e9, cdSq = -1e9, cdCl = -1e9;
    const cd = { buy: -1e9, sell: -1e9, big: -1e9, rev: -1e9, react: -1e9, ltb: -1e9 };
    const LM = 15, queueM = pivots(bars, LM).highs;
    let qm = 0, lastMH = null, macroDiv = -1e9;
    let fresh = true;
    const add = (i, type, why, extra) => out.push({ i, type, why, ...extra });
    const longTF = !S.interval || ['4h', '1d', '1w', '1M'].includes(S.interval);
    const kl = [], kh = [];
    const M5 = { bA: null, bB: null, sS: null, sR: null };
    const tryConfirm = (key, i, dir, emit) => {
      const c = M5[key];
      if (!c || i <= c.i || i - c.i > 3) { if (c && i - c.i > 3) M5[key] = null; return; }
      const b = bars[i], j = bars[c.i];
      const ok = dir > 0 ? b.c > j.h && b.c > b.o : b.c < j.l && b.c < b.o;
      if (ok) {
        let ext = dir > 0 ? Infinity : -Infinity;
        for (let k = c.i; k <= i; k++) ext = dir > 0 ? Math.min(ext, bars[k].l) : Math.max(ext, bars[k].h);
        emit(c, ext);
        M5[key] = null;
      } else if (dir > 0 ? b.l < j.l : b.h > j.h) M5[key] = null;
    };

    for (let i = 1; i < n; i++) {
      while (q < queue.length && queue[q].i + L <= i) {
        const p = queue[q++];
        insert(p.p);
        const prev = p.kind === 'h' ? lastH : lastL;
        if (prev && p.i - prev.i <= 80 && R[p.i] != null && R[prev.i] != null && i - cd.rev >= 20) {
          if (p.kind === 'h' && p.p > prev.p && R[p.i] < R[prev.i] - 5 && R[prev.i] >= 62) {
            add(i, 'rev', ['Ayı uyumsuzluğu', 'fiyat daha yüksek tepe, RSI daha düşük']); cd.rev = i;
          }
          if (p.kind === 'l' && p.p < prev.p && R[p.i] > R[prev.i] + 5 && R[prev.i] <= 38) {
            add(i, 'rev', ['Boğa uyumsuzluğu', 'fiyat daha düşük dip, RSI daha yüksek']); cd.rev = i;
          }
        }
        if (p.kind === 'h') { lastH = p; kh.push(p); } else { lastL = p; kl.push(p); }
      }
      while (qm < queueM.length && queueM[qm].i + LM <= i) {
        const p = queueM[qm++];
        if (lastMH && p.p > lastMH.p && R[p.i] != null && R[lastMH.i] != null && R[p.i] < R[lastMH.i] - 5 && R[lastMH.i] >= 65) macroDiv = i;
        lastMH = p;
      }
      if (i < 21 || R[i] == null) continue;

      const b = bars[i], a = A[i], rng = b.h - b.l || a * 1e-6;
      const volR = volAvg[i - 1] ? b.v / volAvg[i - 1] : 1;
      const r3min = Math.min(R[i], R[i - 1] ?? 100, R[i - 2] ?? 100);
      const r3max = Math.max(R[i], R[i - 1] ?? 0, R[i - 2] ?? 0);
      let lo20 = Infinity, hi20 = -Infinity;
      for (let k = Math.max(0, i - EXT); k < i; k++) { if (bars[k].l < lo20) lo20 = bars[k].l; if (bars[k].h > hi20) hi20 = bars[k].h; }
      const atLow = b.l <= lo20 + a * 0.25, atHigh = b.h >= hi20 - a * 0.25;
      const s50ok = s50[i] != null && s200[i] != null && s50[i - 5] != null;
      const strongDown = s50ok && b.c < s50[i] && s50[i] < s200[i] && s50[i] < s50[i - 5];
      const strongUp = s50ok && b.c > s50[i] && s50[i] > s200[i] && s50[i] > s50[i - 5];
      const body = Math.abs(b.c - b.o), lw = Math.min(b.o, b.c) - b.l, uw = b.h - Math.max(b.o, b.c);

      if (s50[i] != null && s200[i] != null && s50[i - 1] != null && s200[i - 1] != null && i - cd.rev >= 20) {
        const d0 = s50[i - 1] - s200[i - 1], d1 = s50[i] - s200[i];
        if (d0 <= 0 && d1 > 0) { add(i, 'rev', ['Altın kesişim', 'SMA50, SMA200\'ü yukarı kesti']); cd.rev = i; }
        if (d0 >= 0 && d1 < 0) { add(i, 'rev', ['Ölüm kesişimi', 'SMA50, SMA200\'ü aşağı kesti']); cd.rev = i; }
      }

      if (s200[i] != null && b.c > s200[i]) fresh = true;
      if (i >= 160 && s200[i] != null && s50[i] != null && b.c < s200[i] && s50[i] < s200[i] && i - cd.ltb >= 150 && (fresh || i - cd.ltb >= 400)) {
        const why = [];
        if (s200[i - 21] != null && s200[i] - s200[i - 20] < 0 && s200[i - 1] - s200[i - 21] >= 0) why.push('SMA200 aşağı döndü');
        if (why.length && i - macroDiv <= 30) why.push('uzun vadeli ayı uyumsuzluğu da var');
        if (why.length && longTF) { add(i, 'ltb', ['Uzun vadeli sert düşüş uyarısı', 'fiyat ve SMA50, SMA200 altında', ...why]); cd.ltb = i; fresh = false; }
      }

      if (i >= 210 && s200[i] != null) {
        const emitBuy = (c, ext) => { if (i - cd.buy >= 5) { add(i, 'buy', c.why, { stop: ext, from: c.i }); cd.buy = i; } };
        const emitSell = (c, ext) => { if (i - cd.sell >= 10 && (!c.gateAtConfirm || b.c < s200[i])) { add(i, 'sell', c.why, { stop: ext, from: c.i }); cd.sell = i; } };
        tryConfirm('bA', i, 1, emitBuy);
        tryConfirm('bB', i, 1, emitBuy);
        tryConfirm('sS', i, -1, emitSell);
        tryConfirm('sR', i, -1, emitSell);
        const lastLow = kl[kl.length - 1];
        if (lastLow && i - lastLow.i <= 60 && b.l < lastLow.p && b.c > lastLow.p && volR >= 1.3 && lw >= rng * 0.3) {
          const base = ['Dip süpürüldü, fiyat geri aldı', `alt iğne ${(lw / a).toFixed(1)} ATR`, `hacim ×${volR.toFixed(1)}`, 'onay: sonraki mum yukarı kapattı'];
          if (lw >= a * 0.6) M5.bA = { i, why: base };
          if (lw >= a * 0.3 && b.c > s200[i]) M5.bB = { i, why: [...base, 'trend yukarı (SMA200 üstü)'] };
          if ((lw >= a * 0.6 || (lw >= a * 0.3 && b.c > s200[i])) && i - cd.react >= 5) { add(i, 'react', ['Dip süpürüldü: yukarı tepki adayı', `alt iğne ${(lw / a).toFixed(1)} ATR`, `hacim ×${volR.toFixed(1)}`, 'sonraki 3 mumda onay gelirse Buy olur'], { dir: 1 }); cd.react = i; }
        }
        for (let m = kh.length - 1; m >= 0 && m >= kh.length - 3; m--) {
          const p = kh[m];
          if (i - p.i > 60) break;
          if (b.h > p.p && b.c < p.p) {
            if (volR >= 1.3 && uw >= a * 0.6 && uw >= rng * 0.3 && b.c < s200[i]) {
              M5.sS = { i, why: ['Tepe süpürüldü, fiyat geri düştü', `üst iğne ${(uw / a).toFixed(1)} ATR`, `hacim ×${volR.toFixed(1)}`, 'trend aşağı (SMA200 altı)', 'onay: sonraki mum aşağı kapattı'] };
              if (i - cd.react >= 5) { add(i, 'react', ['Tepe süpürüldü: aşağı tepki adayı', `üst iğne ${(uw / a).toFixed(1)} ATR`, `hacim ×${volR.toFixed(1)}`, 'sonraki 3 mumda onay gelirse Sell olur'], { dir: -1 }); cd.react = i; }
            }
            break;
          }
        }
        if (atHigh) {
          const pts = [];
          if (R[i] >= 65) pts.push(`RSI ${R[i].toFixed(0)}`);
          if (r3max >= 70) pts.push('aşırı alım');
          if (bbUp[i] != null && b.h >= bbUp[i]) pts.push('üst Bollinger bandı');
          if (near(b.h, a * 0.5, p => b.c < p)) pts.push('direnç');
          if (volR >= 1.5) pts.push(`hacim ×${volR.toFixed(1)}`);
          if (lastH && i - lastH.i <= 60 && b.h > lastH.p && R[lastH.i] != null && R[i] < R[lastH.i] - 3) pts.push('RSI uyumsuzluğu');
          if (pts.length >= 4) M5.sR = { i, gateAtConfirm: true, why: [...pts, 'trend aşağı (SMA200 altı)', 'onay: sonraki mum aşağı kapattı'] };
        }
      }

      if (i >= 210 && bbW[i] != null && s200[i] != null) {
        const m = median(bbW.slice(i - 120, i)), sq = m != null && bbW[i] <= m * 0.65, up = b.c > s200[i];
        if (sq) { inSq = true; sqAge = 0; } else sqAge++;
        const cands = [];
        if (inSq && sqAge <= 20 && !sq) {
          if (b.c > bbUp[i]) { if (i - cdSq >= 40) { cands.push([1, ['Sıkışmadan yukarı kırılım', 'Bollinger bantları daralmıştı', 'büyük yükseliş ihtimali']]); cdSq = i; } inSq = false; }
          else if (b.c < bbLo[i]) { if (i - cdSq >= 40) { cands.push([-1, ['Sıkışmadan aşağı kırılım', 'Bollinger bantları daralmıştı', 'büyük düşüş riski']]); cdSq = i; } inSq = false; }
        }
        if (sqAge > 20) inSq = false;
        if (volR >= 2.5 && rng >= 2 * a && i - cdCl >= 40) {
          if (b.c > b.o && up) { cands.push([1, ['Trend yönünde güçlü alım mumu', `hacim ×${volR.toFixed(1)}`, 'SMA200 üstü', 'büyük yükseliş ihtimali']]); cdCl = i; }
          else if (b.c < b.o && !up) { cands.push([-1, ['Trend yönünde güçlü satış mumu', `hacim ×${volR.toFixed(1)}`, 'SMA200 altı', 'büyük düşüş riski']]); cdCl = i; }
        }
        for (const [dir, why] of cands) {
          if (i - cd.big < 40) continue;
          add(i, dir > 0 ? 'bull' : 'bear', why); cd.big = i;
          if (dir > 0 && up && i - cd.buy >= 5) { add(i, 'buy', ['Kırılım alımı', ...why.slice(0, 2), 'SMA200 üstü'], { stop: Math.min(b.l, bars[i - 1].l), from: i }); cd.buy = i; }
        }
      }
    }
    return out;
  }

  const RULES = { bull: [40, 4, 2], bear: [40, 4, 2], react: [6, 1, 0.7] };
  function structural(bars, A, i, dir, stopPx) {
    const n = bars.length, e = bars[i].c, a = A[i], stop = stopPx - dir * 0.2 * a, risk = Math.abs(e - stop);
    if (i + 40 >= n || risk <= 0 || risk > 4 * a) return null;
    const tgt = e + dir * 1.5 * risk;
    for (let k = i + 1; k <= i + 40; k++) {
      if (dir > 0 ? bars[k].l <= stop : bars[k].h >= stop) return -1;
      if (dir > 0 ? bars[k].h >= tgt : bars[k].l <= tgt) return 1.5;
    }
    return dir * (bars[i + 40].c - e) / risk;
  }
  function atrRule(bars, A, i, dir, [H, tg, sl]) {
    const n = bars.length, e = bars[i].c, a = A[i];
    if (i + H >= n) return null;
    for (let k = i + 1; k <= i + H; k++) {
      if (dir > 0 ? bars[k].l <= e - sl * a : bars[k].h >= e + sl * a) return -1;
      if (dir > 0 ? bars[k].h >= e + tg * a : bars[k].l <= e - tg * a) return tg / sl;
    }
    return dir * (bars[i + H].c - e) / (sl * a);
  }
  const baseCache = new WeakMap();
  function baseline(bars, A) {
    if (baseCache.has(bars)) return baseCache.get(bars);
    const n = bars.length, acc = {};
    const put = (k, v) => { if (v == null) return; const o = acc[k] || (acc[k] = { s: 0, n: 0 }); o.s += v; o.n++; };
    for (let i = 212; i < n; i += 2) {
      for (const dir of [1, -1]) {
        put('st' + dir, structural(bars, A, i, dir, dir > 0 ? Math.min(bars[i].l, bars[i - 1].l, bars[i - 2].l) : Math.max(bars[i].h, bars[i - 1].h, bars[i - 2].h)));
        for (const t in RULES) put(t + dir, atrRule(bars, A, i, dir, RULES[t]));
      }
      if (i + 100 < n) put('ltb', Math.log(bars[i + 100].c / bars[i].c) * 100);
    }
    const out = {};
    for (const k in acc) out[k] = acc[k].s / acc[k].n;
    baseCache.set(bars, out);
    return out;
  }
  function evaluate(bars, ctx, sigs) {
    const A = ctx.atr, st = {}, B = baseline(bars, A), n = bars.length;
    for (const s of sigs) {
      if (s.type === 'rev') continue;
      const o = st[s.type] || (st[s.type] = { n: 0, win: 0, r: 0, base: 0, open: 0, unit: s.type === 'ltb' ? '%' : 'R' });
      let v, b;
      if (s.type === 'ltb') {
        if (s.i + 100 >= n) { o.open++; continue; }
        v = Math.log(bars[s.i + 100].c / bars[s.i].c) * 100; b = B.ltb;
        o.n++; if (v < 0) o.win++; o.r += -v; o.base += -b;
        continue;
      }
      const dir = s.type === 'react' ? s.dir : (s.type === 'buy' || s.type === 'bull') ? 1 : -1;
      if (s.type === 'buy' || s.type === 'sell' || s.type === 'zsell') { v = structural(bars, A, s.i, s.type === 'zsell' ? -1 : dir, s.stop); b = B['st' + (s.type === 'zsell' ? -1 : dir)]; }
      else { v = atrRule(bars, A, s.i, dir, RULES[s.type]); b = B[s.type + dir]; }
      if (v == null) { o.open++; continue; }
      o.n++; if (v > 0) o.win++; o.r += v; o.base += b;
    }
    return st;
  }

  function trendState(bars, ctx) {
    const n = bars.length, c = bars[n - 1].c, s50 = ctx.s50[n - 1], s200 = ctx.s200[n - 1];
    const s50Prev = ctx.s50[n - 11];
    const main = s50 == null || s200 == null ? null : s50 > s200 ? 'up' : 'down';
    const short = s50 == null ? null : c > s50 ? 'up' : 'down';
    const slope = s50 != null && s50Prev != null ? (s50 - s50Prev) / s50Prev * 100 : null;
    return { main, short, slope, s50, s200, rsi: ctx.rsi[n - 1] };
  }

  function compute(bars, S) {
    const n = bars.length;
    if (n < 60) return { ctx: null, levels: [], signals: [], patterns: [], state: null, stats: {} };
    const ctx = indicators(bars);
    const medAtr = median(ctx.atr.slice(20)) || ctx.atr[n - 1];
    const piv = pivots(bars, S.pivot);
    const sig = signals(bars, ctx, S.pivot, S);
    return {
      ctx,
      levels: levels(bars, piv, medAtr, S),
      signals: sig,
      stats: evaluate(bars, ctx, sig),
      ...SV.patterns.detect(bars, ctx, S),
      state: trendState(bars, ctx)
    };
  }

  return { compute, htfTrends, arcs, signals, evaluate, indicators };
})();
