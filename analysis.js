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
    if (n < L * 6 + 6) return [];
    const A = atr(bars), piv = pivots(bars, L);
    const tolAt = k => Math.min(0.025, Math.max(0.004, 0.25 * (A[k] || 0) / bars[k].c));
    const pick = (list, dir) => {
      const P = list.filter(x => x.i + L < n).slice(-24);
      let best = null;
      for (const log of [false, true]) {
        const Y = log ? Math.log : v => v, inv = log ? Math.exp : v => v;
        for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
          const pa = P[a], pb = P[b];
          if (pb.i - pa.i < L * 2) continue;
          if (dir > 0 ? pb.p <= pa.p : pb.p >= pa.p) continue;
          const ta = bars[pa.i].t, ya = Y(pa.p), m = (Y(pb.p) - ya) / (bars[pb.i].t - ta);
          const at = t => inv(ya + m * (t - ta));
          let ok = true;
          for (let k = pa.i + 1; k < n && ok; k++) {
            const v = at(bars[k].t), tol = tolAt(k);
            if (!(v > 0)) { ok = false; break; }
            const cl = (bars[k].c - v) / v, wk = ((dir > 0 ? bars[k].l : bars[k].h) - v) / v;
            if (dir > 0 ? cl < -tol : cl > tol) ok = false;
            else if (dir > 0 ? wk < -3 * tol : wk > 3 * tol) ok = false;
          }
          if (!ok) continue;
          const now = at(nowT);
          if (!(now > 0) || Math.abs(now - lastPrice) / lastPrice > maxDist) continue;
          const pts = [];
          for (const x of P) {
            if (x.i < pa.i) continue;
            const v = at(bars[x.i].t);
            if (Math.abs(x.p - v) / v > tolAt(x.i)) continue;
            if (pts.length && x.i - pts[pts.length - 1].i < L) continue;
            if (pts.length && (dir > 0 ? x.p <= pts[pts.length - 1].p : x.p >= pts[pts.length - 1].p)) continue;
            pts.push(x);
          }
          if (pts.length < 3) continue;
          const last = pts[pts.length - 1].i;
          const score = pts.length * 2 + (last - pa.i) / n + last / n - (log ? 0.01 : 0);
          if (!best || score > best.score) best = { dir, log, t1: ta, t2: bars[last].t, y1: ya, m, touches: pts.length, pts: pts.map(x => ({ t: bars[x.i].t, p: x.p })), score, now, at };
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
    const tolAt = k => Math.min(0.025, Math.max(0.004, 0.35 * A[k] / bars[k].c));
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
        if (!q || sg * q.c2 <= 0) continue;
        const chord = pts[0][1] + (pts[2][1] - pts[0][1]) * (pts[1][0] - pts[0][0]) / (pts[2][0] - pts[0][0]);
        if (Math.abs(pts[1][1] - chord) < Math.max(0.06, 3 * tolAt(pb.i))) continue;
        const f = t => q.c0 + q.c1 * u(t) + q.c2 * u(t) ** 2;
        let ok = true;
        for (let k = pa.i; k < n - 3 && ok; k++) {
          if (sg * (lg(bars[k].c) - f(bars[k].t)) < -tolAt(k)) ok = false;
        }
        if (!ok) continue;
        const gaps = [];
        for (let k = pa.i; k <= pc.i; k++) gaps.push(sg * (lg(sg > 0 ? bars[k].l : bars[k].h) - f(bars[k].t)));
        gaps.sort((x, y) => x - y);
        if (gaps[Math.floor(gaps.length / 2)] > 0.25 || gaps[gaps.length - 1] > 0.8) continue;
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
    const { rsi: R, s50, s200, volAvg } = ctx;
    const piv = pivots(bars, L);
    const queue = [...piv.highs, ...piv.lows].sort((a, b) => a.i - b.i);
    const EXT = S.ext || 20, K = 5, RL = 30, RH = 70;
    let q = 0, lastH = null, lastL = null;
    const cd = { big: -1e9, rev: -1e9, ltb: -1e9, r1: -1e9, r_1: -1e9 };
    const LM = 15, queueM = pivots(bars, LM).highs;
    let qm = 0, lastMH = null, macroDiv = -1e9;
    let fresh = true;
    const add = (i, type, why, extra) => out.push({ i, type, why, ...extra });
    const longTF = !S.interval || ['4h', '1d', '1w', '1M'].includes(S.interval);
    const last = { buy: null, sell: null }, used = { buy: -1, sell: -1 };
    const isExt = (j, i, dir) => {
      const ex = dir > 0 ? bars[j].l : bars[j].h;
      for (let k = Math.max(0, j - EXT); k <= i; k++) if (k !== j && (dir > 0 ? bars[k].l < ex : bars[k].h > ex)) return false;
      return true;
    };
    const rsiExt = (j, dir) => {
      let r = dir > 0 ? 100 : 0;
      for (let k = Math.max(0, j - 2); k <= j; k++) if (R[k] != null) r = dir > 0 ? Math.min(r, R[k]) : Math.max(r, R[k]);
      return r;
    };

    for (let i = 1; i < n; i++) {
      while (q < queue.length && queue[q].i + L <= i) {
        const p = queue[q++];
        const prev = p.kind === 'h' ? lastH : lastL;
        if (prev && p.i - prev.i <= 80 && R[p.i] != null && R[prev.i] != null && i - cd.rev >= 60) {
          if (p.kind === 'h' && p.p > prev.p && R[p.i] < R[prev.i] - 8 && R[prev.i] >= 70) {
            add(i, 'rev', ['Ayı uyumsuzluğu', 'fiyat daha yüksek tepe, RSI daha düşük']); cd.rev = i;
          }
          if (p.kind === 'l' && p.p < prev.p && R[p.i] > R[prev.i] + 8 && R[prev.i] <= 30) {
            add(i, 'rev', ['Boğa uyumsuzluğu', 'fiyat daha düşük dip, RSI daha yüksek']); cd.rev = i;
          }
        }
        if (p.kind === 'h') lastH = p; else lastL = p;
      }
      while (qm < queueM.length && queueM[qm].i + LM <= i) {
        const p = queueM[qm++];
        if (lastMH && p.p > lastMH.p && R[p.i] != null && R[lastMH.i] != null && R[p.i] < R[lastMH.i] - 5 && R[lastMH.i] >= 65) macroDiv = i;
        lastMH = p;
      }
      if (i < 25 || R[i] == null) continue;

      const b = bars[i];
      const volR = volAvg[i - 1] ? b.v / volAvg[i - 1] : 1;

      if (s200[i] != null && b.c > s200[i]) fresh = true;
      if (i >= 160 && s200[i] != null && s50[i] != null && b.c < s200[i] && s50[i] < s200[i] && i - cd.ltb >= 150 && (fresh || i - cd.ltb >= 400)) {
        const why = [];
        if (s200[i - 21] != null && s200[i] - s200[i - 20] < 0 && s200[i - 1] - s200[i - 21] >= 0) why.push('SMA200 aşağı döndü');
        if (why.length && i - macroDiv <= 30) why.push('uzun vadeli ayı uyumsuzluğu da var');
        if (why.length && longTF) { add(i, 'ltb', ['Uzun vadeli sert düşüş uyarısı', 'fiyat ve SMA50, SMA200 altında', ...why]); cd.ltb = i; fresh = false; }
      }

      for (const dir of [1, -1]) {
        const ty = dir > 0 ? 'buy' : 'sell';
        for (let j = i - 1; j >= i - K && j > 20; j--) {
          if (j <= used[ty]) break;
          if (!isExt(j, i, dir)) continue;
          const rx = rsiExt(j, dir);
          if (dir > 0 ? rx > RL : rx < RH) continue;
          if (dir > 0 ? b.c <= bars[j].h : b.c >= bars[j].l) continue;
          const ex = dir > 0 ? bars[j].l : bars[j].h, P = last[ty];
          if (P && i - P.i < 5) continue;
          if (P && i - P.i < 30 && (dir > 0 ? ex >= P.ext : ex <= P.ext)) continue;
          const why = dir > 0
            ? ['Salınım dibi', `RSI ${rx.toFixed(0)} (aşırı satım)`, `son ${EXT} mumun en düşüğü`, 'onay: kapanış dip mumunun tepesinin üstünde']
            : ['Salınım tepesi', `RSI ${rx.toFixed(0)} (aşırı alım)`, `son ${EXT} mumun en yükseği`, 'onay: kapanış tepe mumunun dibinin altında'];
          add(i, ty, why, { stop: ex, from: j });
          last[ty] = { i, ext: ex }; used[ty] = j;
          break;
        }
        if (i - cd['r' + dir] >= 15 && isExt(i, i, dir) && (dir > 0 ? rsiExt(i, 1) <= RL : rsiExt(i, -1) >= RH)) {
          add(i, 'react', dir > 0
            ? ['Dip + aşırı satım: Buy adayı', `RSI ${R[i].toFixed(0)}`, `sonraki ${K} mumda bu mumun tepesi üstünde kapanış gelirse Buy olur`]
            : ['Tepe + aşırı alım: Sell adayı', `RSI ${R[i].toFixed(0)}`, `sonraki ${K} mumda bu mumun dibi altında kapanış gelirse Sell olur`], { dir });
          cd['r' + dir] = i;
        }
      }

      if (i - cd.big >= 40 && volR >= 2.5) {
        if (R[i] <= 22 && b.c < b.o) { add(i, 'bull', ['Satış klimaksı (kapitülasyon)', `RSI ${R[i].toFixed(0)}`, `hacim ×${volR.toFixed(1)}`, 'dönüş / sert yükseliş ihtimali']); cd.big = i; }
        else if (R[i] >= 85 && b.c > b.o) { add(i, 'bear', ['Alım klimaksı (aşırı ısınma)', `RSI ${R[i].toFixed(0)}`, `hacim ×${volR.toFixed(1)}`, 'düzeltme riski']); cd.big = i; }
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
      if (s.type === 'rev' || s.type === 'orange') continue;
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
