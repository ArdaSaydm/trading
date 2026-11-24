window.SV = window.SV || {};

SV.turn = (() => {
  const WARM = 104, CD = 13, H = 26, L = 3, K = 0.7;

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

  function prep(w) {
    const n = w.length, c = w.map(b => b.c), lc = c.map(Math.log);
    const s40 = new Array(n).fill(null);
    let s = 0;
    for (let i = 0; i < n; i++) { s += c[i]; if (i >= 40) s -= c[i - 40]; if (i >= 39) s40[i] = s / 40; }
    const dev = lc.map((v, i) => s40[i] ? v - Math.log(s40[i]) : null);
    const z = new Array(n).fill(null);
    for (let i = 196; i < n; i++) {
      let m = 0, q = 0;
      for (let k = i - 155; k <= i; k++) m += dev[k];
      m /= 156;
      for (let k = i - 155; k <= i; k++) q += (dev[k] - m) ** 2;
      const sd = Math.sqrt(q / 155);
      z[i] = sd > 0 ? dev[i] / sd : null;
    }
    const r = [0];
    for (let i = 1; i < n; i++) r.push(lc[i] - lc[i - 1]);
    const S = new Array(n).fill(null), sorted = [];
    for (let i = 52; i < n; i++) {
      let m = 0, q = 0;
      for (let k = i - 51; k <= i; k++) m += r[k];
      m /= 52;
      for (let k = i - 51; k <= i; k++) q += (r[k] - m) ** 2;
      const v = Math.sqrt(q / 51) * Math.sqrt(52);
      let lo = 0, hi = sorted.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; }
      sorted.splice(lo, 0, v);
      S[i] = sorted[sorted.length >> 1];
    }
    const lo3 = new Array(n).fill(null);
    for (let i = 0; i < n; i++) { let m = Infinity; for (let j = Math.max(0, i - 155); j <= i; j++) m = Math.min(m, lc[j]); lo3[i] = m; }
    return { n, c, lc, z, S, lo3, R: rsi(c, 14) };
  }

  const f1 = x => x.toFixed(1).replace('.', ',');
  const pct = x => `%${Math.round((Math.exp(x) - 1) * 100)}`;

  function detect(w) {
    const out = [];
    if (!w || w.length <= WARM + 10) return out;
    const P = prep(w), { n, z, lc, R, S } = P;
    const last = { 1: -1e9, '-1': -1e9 }, prev = { 1: false, '-1': false };
    for (let i = WARM; i < n; i++) {
      let zmin = 9;
      for (let j = Math.max(0, i - 13); j <= i; j++) if (z[j] != null) zmin = Math.min(zmin, z[j]);
      const up = z[i] != null && z[i] <= -2 && zmin <= -1.5 && z[i] >= zmin + 0.75;
      const dn = R[i] != null && R[i - 1] != null && R[i] < 65 && R[i - 1] >= 65 && S[i] != null && lc[i] - P.lo3[i] >= 3 * S[i];
      for (const [dir, v] of [[1, up], [-1, dn]]) {
        if (v && !prev[dir] && i - last[dir] >= CD) {
          last[dir] = i;
          out.push({ kind: 'pre', i, t: w[i].t, dir, why: dir > 0
            ? ['Dönüş ön uyarısı: ayıdan boğaya', `fiyat 40 haftalık ortalamanın çok altında (${f1(-z[i])} sapma) ve toparlanmaya başladı (dip ${f1(-zmin)} sapma)`, 'birkaç ay içinde dip / yukarı dönüş beklenir']
            : ['Dönüş ön uyarısı: boğadan ayıya', `haftalık RSI 65'in altına indi (${Math.round(R[i - 1])} → ${Math.round(R[i])})`, `fiyat 3 yıllık dibin ${pct(lc[i] - P.lo3[i])} üstünde (kendi oynaklığının ${f1((lc[i] - P.lo3[i]) / S[i])} katı)`, 'birkaç ay içinde tepe / aşağı dönüş beklenir'] });
        }
        prev[dir] = v;
      }
    }
    let dir = 0, ext = 0, ei = 0;
    const done = new Set();
    for (let i = WARM; i < n; i++) {
      const th = Math.max(Math.log(1.2), S[i] || 0), x = lc[i];
      if (dir === 0) {
        let mx = -Infinity, mn = Infinity;
        for (let j = 52; j <= i; j++) { mx = Math.max(mx, lc[j]); mn = Math.min(mn, lc[j]); }
        if (x - mn >= th) { dir = 1; ext = x; ei = i; } else if (mx - x >= th) { dir = -1; ext = x; ei = i; }
        continue;
      }
      if (dir < 0) {
        if (x < ext) { ext = x; ei = i; }
        else if (x - ext >= K * th && !done.has(ei)) {
          done.add(ei);
          out.push({ kind: 'conf', i, ref: ei, t: w[i].t, tr: w[ei].t, dir: 1, why: ['Dönüş teyidi: ayıdan boğaya', `dipten ${pct(x - ext)} yükseldi (büyük hareket eşiğinin %${Math.round(K * 100)}'i)`, `dip ${i - ei} hafta önceydi`] });
        }
        if (x - ext >= th) { dir = 1; ext = x; ei = i; }
      } else {
        if (x > ext) { ext = x; ei = i; }
        else if (ext - x >= K * th && !done.has(ei)) {
          done.add(ei);
          out.push({ kind: 'conf', i, ref: ei, t: w[i].t, tr: w[ei].t, dir: -1, why: ['Dönüş teyidi: boğadan ayıya', `tepeden ${pct(x - ext).replace('%-', '%')} düştü (büyük hareket eşiğinin %${Math.round(K * 100)}'i)`, `tepe ${i - ei} hafta önceydi`] });
        }
        if (ext - x >= th) { dir = -1; ext = x; ei = i; }
      }
    }
    return out.sort((a, b) => a.i - b.i);
  }

  function turns(w) {
    const n = w.length, lc = w.map(b => Math.log(b.c)), r = [0];
    for (let i = 1; i < n; i++) r.push(lc[i] - lc[i - 1]);
    const sds = [];
    for (let i = 52; i < n; i++) {
      let m = 0, v = 0;
      for (let k = i - 51; k <= i; k++) m += r[k];
      m /= 52;
      for (let k = i - 51; k <= i; k++) v += (r[k] - m) ** 2;
      sds.push(Math.sqrt(v / 51) * Math.sqrt(52));
    }
    sds.sort((a, b) => a - b);
    const th = Math.max(Math.log(1.2), sds.length ? sds[sds.length >> 1] : 0.3), piv = [];
    let dir = 0, ext = lc[0], ei = 0;
    for (let i = 1; i < n; i++) {
      const v = lc[i];
      if (dir === 0) {
        if (v - ext >= th) { piv.push({ i: ei, dir: 1 }); dir = 1; ext = v; ei = i; }
        else if (ext - v >= th) { piv.push({ i: ei, dir: -1 }); dir = -1; ext = v; ei = i; }
        continue;
      }
      if (dir > 0) { if (v > ext) { ext = v; ei = i; } else if (ext - v >= th) { piv.push({ i: ei, dir: -1 }); dir = -1; ext = v; ei = i; } }
      else { if (v < ext) { ext = v; ei = i; } else if (v - ext >= th) { piv.push({ i: ei, dir: 1 }); dir = 1; ext = v; ei = i; } }
    }
    return piv.filter((p, k) => piv[k + 1] && piv[k + 1].i - p.i >= 12);
  }

  function stats(w, sigs, kind) {
    const o = { n: 0, win: 0, r: 0, base: 0, open: 0, unit: 'g' };
    if (!w || w.length <= WARM + H) return o;
    const n = w.length, lc = w.map(b => Math.log(b.c)), T = turns(w), base = {};
    for (const dir of [1, -1]) {
      let s = 0, m = 0;
      for (let i = WARM; i + H < n; i++) { s += dir * (Math.exp(lc[i + H] - lc[i]) - 1); m++; }
      base[dir] = m ? s / m : 0;
    }
    for (const s of sigs) {
      if (s.kind !== kind) continue;
      if (s.i + H >= n) { o.open++; continue; }
      o.n++;
      const ok = kind === 'pre'
        ? T.some(t => t.dir === s.dir && t.i >= s.i - 4 && t.i <= s.i + H)
        : T.some(t => t.dir === s.dir && t.i <= s.i && t.i >= s.i - 52);
      if (ok) o.win++;
      o.r += s.dir * (Math.exp(lc[s.i + H] - lc[s.i]) - 1) * 100;
      o.base += base[s.dir] * 100;
    }
    return o;
  }

  return { detect, stats };
})();
