window.SV = window.SV || {};

SV.orange = (() => {
  const CD = 30, WARM = 364, H = 90;
  const sma = (c, k) => {
    const o = new Array(c.length).fill(null);
    let s = 0;
    for (let i = 0; i < c.length; i++) {
      s += c[i];
      if (i >= k) s -= c[i - k];
      if (i >= k - 1) o[i] = s / k;
    }
    return o;
  };
  const pct = x => `%${Math.round(Math.abs(x) * 100)}`;
  const rsi = (c, n) => {
    const o = new Array(c.length).fill(null);
    let ag = 0, al = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1], g = Math.max(d, 0), l = Math.max(-d, 0);
      if (i <= n) { ag += g / n; al += l / n; if (i < n) continue; }
      else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; }
      o[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return o;
  };

  function detect(d) {
    const n = d.length, out = [];
    if (n <= WARM) return out;
    const c = d.map(b => b.c), s10 = sma(c, 10), s50 = sma(c, 50), R = rsi(c, 14);
    const last = { 1: -1e9, '-1': -1e9 }, prev = { 1: false, '-1': false };
    for (let i = WARM; i < n; i++) {
      let hi = -Infinity, lo = Infinity;
      for (let k = i - WARM; k <= i; k++) {
        if (d[k].h > hi) hi = d[k].h;
        if (d[k].l < lo) lo = d[k].l;
      }
      const dd = c[i] / hi - 1, ru = c[i] / lo - 1;
      let rMin = 100;
      for (let k = i - 1; k >= Math.max(1, i - 15); k--) if (R[k] != null) rMin = Math.min(rMin, R[k]);
      const up = dd <= -0.4 && rMin <= 25 && s10[i - 1] != null && c[i] > s10[i] && c[i - 1] <= s10[i - 1];
      const dn = ru >= 0.5 && s50[i - 1] != null && c[i] < s50[i] && c[i - 1] >= s50[i - 1];
      for (const [dir, v] of [[1, up], [-1, dn]]) {
        if (v && !prev[dir] && i - last[dir] >= CD) {
          last[dir] = i;
          out.push({ i, t: d[i].t, dir, c: c[i], why: dir > 0
            ? ['Büyük dönüş deseni: dip', `1 yıllık tepenin ${pct(dd)} altında`, `son 15 günde RSI ${Math.round(rMin)} (aşırı satım)`, 'günlük kapanış 10 günlük ortalamanın üstüne çıktı']
            : ['Büyük dönüş deseni: tepe', `1 yıllık dibin ${pct(ru)} üstünde`, 'günlük kapanış 50 günlük ortalamanın altına indi'] });
        }
        prev[dir] = v;
      }
    }
    return out;
  }

  function fwd(c, i, dir) {
    let fav = 0;
    for (let k = i + 1; k <= i + H; k++) fav = Math.max(fav, dir * (c[k] / c[i] - 1));
    return { r: dir * (c[i + H] / c[i] - 1), fav };
  }

  function stats(d, sigs) {
    const n = d.length, c = d.map(b => b.c), o = { n: 0, win: 0, r: 0, base: 0, open: 0, unit: 'g' };
    const base = {};
    for (const dir of [1, -1]) {
      let s = 0, m = 0;
      for (let i = WARM; i + H < n; i += 3) { s += fwd(c, i, dir).r; m++; }
      base[dir] = m ? s / m : 0;
    }
    for (const s of sigs) {
      if (s.i + H >= n) { o.open++; continue; }
      const f = fwd(c, s.i, s.dir);
      o.n++; if (f.fav >= 0.3) o.win++; o.r += f.r * 100; o.base += base[s.dir] * 100;
    }
    return o;
  }

  return { detect, stats };
})();
