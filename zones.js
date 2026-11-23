window.SV = window.SV || {};

SV.zones = (() => {
  const TFN = { '1M': 'Aylık', '1w': 'Haftalık', '1d': 'Günlük' };
  const PIV = { '1M': 2, '1w': 3, '1d': 5 };

  function levels(bars, L, tf) {
    const piv = SV.ind.pivots(bars, L), n = bars.length;
    const pts = [...piv.highs, ...piv.lows].filter(p => p.i + L < n).sort((a, b) => a.i - b.i).slice(-40).sort((a, b) => a.p - b.p);
    const out = [];
    let cl = [];
    const flush = () => {
      if (cl.length >= 2) {
        const p = cl.reduce((s, x) => s + x.p, 0) / cl.length;
        out.push({ tf, kind: 'level', name: `${TFN[tf]} seviye`, touches: cl.length, f: () => p });
      }
      cl = [];
    };
    for (const x of pts) {
      if (cl.length && x.p > cl[0].p * 1.012) flush();
      cl.push(x);
    }
    flush();
    return out;
  }

  function build(bars, tf, nowT, price) {
    const L = PIV[tf], out = [];
    if (bars.length < L * 6 + 10) return out;
    for (const t of SV.analysis.htfTrends(bars, L, 0.6, nowT, price)) {
      out.push({ tf, kind: 'trend', name: `${TFN[tf]} ${t.dir < 0 ? 'düşen' : 'yükselen'} trend`, touches: t.touches, f: x => t.p1 + t.m * (x - t.t1) });
    }
    for (const q of SV.analysis.arcs(bars, L, 0.6, nowT, price)) {
      out.push({ tf, kind: 'arc', name: `${TFN[tf]} parabolik ${q.kind === 'sup' ? 'destek' : 'direnç'}`, touches: q.touches, f: x => Math.exp(q.c0 + q.c1 * (x - q.T0) / q.SC + q.c2 * ((x - q.T0) / q.SC) ** 2) });
    }
    out.push(...levels(bars, L, tf));
    return out;
  }

  function timeline(bars, htf, tfs = ['1M', '1w']) {
    const n = bars.length, cur = {}, idx = {}, res = new Array(n);
    for (const tf of tfs) { cur[tf] = []; idx[tf] = -1; }
    let merged = [];
    for (let i = 0; i < n; i++) {
      let changed = false;
      for (const tf of tfs) {
        const H = htf[tf];
        if (!H || !H.length) continue;
        let k = idx[tf];
        while (k + 1 < H.length && H[k + 1].t <= bars[i].t) k++;
        if (k !== idx[tf]) {
          idx[tf] = k;
          cur[tf] = k >= 1 ? build(H.slice(0, k), tf, bars[i].t, bars[i].o) : [];
          changed = true;
        }
      }
      if (changed) merged = tfs.flatMap(tf => cur[tf]);
      res[i] = merged;
    }
    return res;
  }

  function near(zs, t, price, tol) {
    return zs.map(z => ({ z, v: z.f(t) })).filter(o => isFinite(o.v) && o.v > 0 && Math.abs(o.v - price) <= tol);
  }

  function signals(bars, ctx, tl, o = {}) {
    const n = bars.length, A = ctx.atr, out = [], cand = { 1: null, '-1': null }, cd = { 1: -1e9, '-1': -1e9 };
    const minConf = o.minConf ?? 1, cool = o.cool ?? 10, confirm = o.confirm ?? true;
    for (let i = 1; i < n; i++) {
      const b = bars[i], a = A[i], zs = tl[i];
      if (!zs || !zs.length || a == null) continue;
      const rng = b.h - b.l || 1e-9, tol = Math.max(0.5 * a, b.c * 0.004);
      for (const dir of [1, -1]) {
        const c = cand[dir];
        if (c && i > c.i && i - c.i <= 3) {
          const ok = dir > 0 ? b.c > bars[c.i].h && b.c > b.o : b.c < bars[c.i].l && b.c < b.o;
          if (ok) {
            if (i - cd[dir] >= cool) {
              let ext = dir > 0 ? Infinity : -Infinity;
              for (let k = c.i; k <= i; k++) ext = dir > 0 ? Math.min(ext, bars[k].l) : Math.max(ext, bars[k].h);
              out.push({ i, type: dir > 0 ? 'buy' : 'sell', src: 'htf', from: c.i, stop: ext, conf: c.names.length, why: c.why });
              cd[dir] = i;
            }
            cand[dir] = null;
          } else if (dir > 0 ? b.l < bars[c.i].l : b.h > bars[c.i].h) cand[dir] = null;
        } else if (c && i - c.i > 3) cand[dir] = null;
        const probe = dir > 0 ? b.l : b.h;
        const hits = near(zs, b.t, probe, tol).filter(({ z, v }) => (!o.skip || !o.skip(z)) && (dir > 0 ? b.c > v && b.l <= v + tol : b.c < v && b.h >= v - tol));
        if (!hits.length) continue;
        const names = [...new Set(hits.map(h => h.z.name))];
        if (names.length < minConf) continue;
        const rej = dir > 0 ? (b.c - b.l) / rng >= 0.5 : (b.h - b.c) / rng >= 0.5;
        if (!rej) continue;
        const why = [dir > 0 ? 'Üst zaman dilimi desteğinden tepki' : 'Üst zaman dilimi direncinden red', ...names, confirm ? 'onay: sonraki mum ' + (dir > 0 ? 'yukarı' : 'aşağı') + ' kapattı' : (dir > 0 ? 'alt iğne, bölge üstünde kapanış' : 'üst iğne, bölge altında kapanış')];
        if (!confirm) {
          if (i - cd[dir] >= cool) { out.push({ i, type: dir > 0 ? 'buy' : 'sell', src: 'htf', from: i, stop: dir > 0 ? b.l : b.h, conf: names.length, why }); cd[dir] = i; }
          continue;
        }
        cand[dir] = { i, names, why };
      }
    }
    return out;
  }

  function now(zs, t, price, atr) {
    return zs.map(z => ({ name: z.name, tf: z.tf, kind: z.kind, touches: z.touches, v: z.f(t) }))
      .filter(o => isFinite(o.v) && o.v > 0)
      .map(o => ({ ...o, side: o.v >= price ? 'res' : 'sup', dist: (o.v - price) / price, atrDist: (o.v - price) / atr }));
  }

  function resistanceSells(bars, ctx, htf) {
    const tl = timeline(bars, htf);
    const sig = signals(bars, ctx, tl, { confirm: false, cool: 10, skip: z => z.tf === '1w' && z.kind === 'level' });
    return sig.filter(s => s.type === 'sell' && s.i >= 210).map(s => ({ ...s, type: 'zsell' }));
  }

  function clusters(list, price) {
    const sorted = [...list].sort((a, b) => a.v - b.v), out = [];
    for (const z of sorted) {
      const c = out[out.length - 1];
      if (c && z.v <= c.lo * 1.012) { c.items.push(z); c.hi = Math.max(c.hi, z.v); }
      else out.push({ lo: z.v, hi: z.v, items: [z] });
    }
    return out.map(c => ({ ...c, mid: (c.lo + c.hi) / 2, names: [...new Set(c.items.map(z => z.name))], dist: ((c.lo + c.hi) / 2 - price) / price }));
  }

  return { build, timeline, signals, now, levels, clusters, resistanceSells, TFN };
})();
