window.SV = window.SV || {};

SV.zz = (() => {
  const TH = Math.log(1.2), H = 26;
  const pct = x => `%${Math.abs(Math.round((Math.exp(x) - 1) * 100))}`;

  function detect(w) {
    const out = [];
    if (!w || w.length < 3) return { list: out, now: null };
    const lc = w.map(b => Math.log(b.c)), n = w.length;
    let dir = 0, ext = lc[0], ei = 0, mx = lc[0], mi = 0, mn = lc[0], ni = 0;
    const push = (i, k, d, x) => out.push({ kind: 'zz', i, ref: k, t: w[i].t, tr: w[k].t, dir: d, why: d > 0
      ? ['%20 dönüş: dip', `dipten ${pct(x)} yükseldi`, `dip ${i - k} hafta önceydi`]
      : ['%20 dönüş: tepe', `tepeden ${pct(x)} düştü`, `tepe ${i - k} hafta önceydi`] });
    for (let i = 1; i < n; i++) {
      const x = lc[i];
      if (dir === 0) {
        if (x > mx) { mx = x; mi = i; }
        if (x < mn) { mn = x; ni = i; }
        if (x - mn >= TH && ni < i) { push(i, ni, 1, x - mn); dir = 1; ext = x; ei = i; }
        else if (mx - x >= TH && mi < i) { push(i, mi, -1, x - mx); dir = -1; ext = x; ei = i; }
        continue;
      }
      if (dir > 0) {
        if (x > ext) { ext = x; ei = i; }
        else if (ext - x >= TH) { push(i, ei, -1, x - ext); dir = -1; ext = x; ei = i; }
      } else {
        if (x < ext) { ext = x; ei = i; }
        else if (x - ext >= TH) { push(i, ei, 1, x - ext); dir = 1; ext = x; ei = i; }
      }
    }
    const now = dir ? { dir, ext: Math.exp(ext), t: w[ei].t, move: lc[n - 1] - ext } : null;
    return { list: out, now };
  }

  function stats(w, list) {
    const o = { n: 0, win: 0, r: 0, base: 0, open: 0, unit: 'g' };
    if (!w || w.length <= H + 10) return o;
    const n = w.length, lc = w.map(b => Math.log(b.c)), base = {};
    for (const dir of [1, -1]) {
      let s = 0, m = 0;
      for (let i = 0; i + H < n; i++) { s += dir * (Math.exp(lc[i + H] - lc[i]) - 1); m++; }
      base[dir] = m ? s / m : 0;
    }
    for (const s of list) {
      if (s.i + H >= n) { o.open++; continue; }
      o.n++;
      const r = s.dir * (Math.exp(lc[s.i + H] - lc[s.i]) - 1);
      if (r > 0) o.win++;
      o.r += r * 100;
      o.base += base[s.dir] * 100;
    }
    return o;
  }

  return { detect, stats, TH };
})();
