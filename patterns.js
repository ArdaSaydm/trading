window.SV = window.SV || {};

SV.patterns = (() => {
  const { pivots } = SV.ind;
  const NAMES = {
    hs: 'Omuz-baş-omuz', ihs: 'Ters omuz-baş-omuz', dtop: 'İkili tepe', dbot: 'İkili dip', ttop: 'Üçlü tepe', tbot: 'Üçlü dip',
    asc: 'Yükselen üçgen', desc: 'Alçalan üçgen', sym: 'Simetrik üçgen', rwedge: 'Yükselen kama', fwedge: 'Düşen kama',
    rchan: 'Yükselen kanal', fchan: 'Düşen kanal', rect: 'Dikdörtgen', broad: 'Genişleyen formasyon', bflag: 'Boğa bayrağı', sflag: 'Ayı bayrağı'
  };
  const BIAS = {
    hs: -1, ihs: 1, dtop: -1, dbot: 1, ttop: -1, tbot: 1, asc: 1, desc: -1, sym: 0, rwedge: -1, fwedge: 1,
    rchan: 0, fchan: 0, rect: 0, broad: 0, bflag: 1, sflag: -1
  };
  const STATS = { hs: { n: 256, brk: 0.68, hit: 0.49, up: 0 }, ihs: { n: 212, brk: 0.76, hit: 0.47, up: 1 }, ttop: { n: 129, brk: 0.72, hit: 0.55, up: 0 }, tbot: { n: 124, brk: 0.68, hit: 0.45, up: 1 }, sym: { n: 103, brk: 1, hit: 0.2, up: 0.53 }, dtop: { n: 80, brk: 0.69, hit: 0.43, up: 0 }, rwedge: { n: 79, brk: 1, hit: 0.55, up: 0.18 }, bflag: { n: 78, brk: 1, hit: 0.42, up: 1 }, dbot: { n: 76, brk: 0.7, hit: 0.49, up: 1 }, sflag: { n: 73, brk: 1, hit: 0.35, up: 0 }, fwedge: { n: 57, brk: 1, hit: 0.53, up: 0.86 }, fchan: { n: 54, brk: 1, hit: 0.89, up: 0.83 }, rchan: { n: 42, brk: 1, hit: 0.8, up: 0.29 }, broad: { n: 33, brk: 0.39, hit: 1, up: 0.46 }, asc: { n: 24, brk: 1, hit: 0.29, up: 0.58 }, desc: { n: 15, brk: 1, hit: 0.42, up: 0.6 } };
  const PRIO = { hs: 5, ihs: 5, ttop: 5, tbot: 5, asc: 4, desc: 4, sym: 4, rwedge: 4, fwedge: 4, bflag: 4, sflag: 4, dtop: 3, dbot: 3, rchan: 2, fchan: 2, rect: 2, broad: 2 };

  function alternate(piv) {
    const all = [...piv.highs, ...piv.lows].sort((a, b) => a.i - b.i || (a.kind === 'h' ? -1 : 1));
    const seq = [];
    for (const p of all) {
      const last = seq[seq.length - 1];
      if (last && last.kind === p.kind) {
        if (p.kind === 'h' ? p.p > last.p : p.p < last.p) seq[seq.length - 1] = p;
      } else seq.push(p);
    }
    return seq;
  }

  const down = (x, h) => Math.max(x - h, x * x / (x + h));
  const through = (a, b) => i => a.p + (b.p - a.p) * (i - a.i) / ((b.i - a.i) || 1);
  const throughL = (a, b) => i => Math.exp(Math.log(a.p) + (Math.log(b.p) - Math.log(a.p)) * (i - a.i) / ((b.i - a.i) || 1));

  function track(bars, from, o) {
    const n = bars.length, lim = Math.min(n, from + o.max);
    let b = -1, tgt = null, bull = o.bull;
    for (let i = from; i < lim; i++) {
      if (b < 0) {
        if (o.fail && o.fail(i)) return { status: 'failed', end: i };
        const d = o.brk(i);
        if (d) { b = i; bull = d > 0; tgt = o.target(i, bull); }
      } else {
        if (bull ? bars[i].h >= tgt : bars[i].l <= tgt) return { status: 'target', brk: b, end: i, target: tgt, bull };
        if (o.after && o.after(i, bull)) return { status: 'failed', brk: b, end: i, target: tgt, bull };
      }
    }
    if (b >= 0) return { status: lim >= n ? 'confirmed' : 'expired', brk: b, end: lim - 1, target: tgt, bull };
    return { status: lim >= n ? 'forming' : 'expired', end: lim - 1, bull };
  }

  function neckPattern(type, bars, A, pts, nA, nB, ext) {
    const neck = through(nA, nB), last = pts[pts.length - 1].i, bull = BIAS[type] > 0, a = A[last];
    const height = Math.abs(ext.p - neck(ext.i));
    const r = track(bars, last + 1, {
      max: 60, bull,
      brk: i => bull ? (bars[i].c > neck(i) + 0.1 * a ? 1 : 0) : (bars[i].c < neck(i) - 0.1 * a ? -1 : 0),
      fail: i => bull ? bars[i].c < ext.p - 0.25 * a : bars[i].c > ext.p + 0.25 * a,
      after: i => bull ? bars[i].c < ext.p : bars[i].c > ext.p,
      target: i => bull ? neck(i) + height : down(neck(i), height)
    });
    const endI = r.brk ?? Math.min(bars.length - 1 + 8, last + 20);
    const nRef = Math.max(neck(Math.min(bars.length - 1, last + 20)), ext.p * 0.05);
    const projected = r.target ?? (bull ? nRef + height : down(nRef, height));
    return {
      type, start: pts[0].i, last, pts, ...r, target: projected, bull, height,
      lines: [{ a: { i: pts[0].i, p: neck(pts[0].i) }, b: { i: endI, p: neck(endI) }, role: 'neck' }]
    };
  }

  function findNeck(bars, A, seq, j, out) {
    const a = A[seq[j].i];
    if (j >= 4) {
      const [p0, p1, p2, p3, p4] = seq.slice(j - 4, j + 1), top = p0.kind === 'h', sg = top ? 1 : -1;
      const span = p4.i - p0.i;
      if (span >= 15 && span <= 220) {
        const mid = p2, neckA = p1, neckB = p3;
        const neckAvg = (p1.p + p3.p) / 2, head = sg * (mid.p - neckAvg);
        const tolT = Math.max(a * 0.8, Math.abs(head) * 0.12);
        if (Math.abs(p0.p - p2.p) <= tolT && Math.abs(p2.p - p4.p) <= tolT && Math.abs(p0.p - p4.p) <= tolT && head >= a * 2.5) {
          out.push(neckPattern(top ? 'ttop' : 'tbot', bars, A, [p0, p1, p2, p3, p4], neckA, neckB, top ? [p0, p2, p4].reduce((x, y) => x.p > y.p ? x : y) : [p0, p2, p4].reduce((x, y) => x.p < y.p ? x : y)));
        } else if (head >= a * 3 && sg * (mid.p - (top ? Math.max(p0.p, p4.p) : Math.min(p0.p, p4.p))) > a
          && sg * (p0.p - neckAvg) >= a && sg * (p4.p - neckAvg) >= a
          && Math.abs(p0.p - p4.p) <= head * 0.4 && Math.abs(p1.p - p3.p) <= head * 0.5) {
          out.push(neckPattern(top ? 'hs' : 'ihs', bars, A, [p0, p1, p2, p3, p4], neckA, neckB, mid));
        }
      }
    }
    if (j >= 2) {
      const [p0, p1, p2] = seq.slice(j - 2, j + 1), top = p0.kind === 'h', sg = top ? 1 : -1;
      const span = p2.i - p0.i, depth = sg * (Math.min(sg * p0.p, sg * p2.p) * sg - p1.p);
      const pre = bars[Math.max(0, p0.i - 30)].c;
      if (span >= 10 && span <= 120 && Math.abs(p0.p - p2.p) <= a * 0.75 && depth >= a * 2.5 && sg * (p1.p - pre) > 0) {
        const nk = { i: p0.i, p: p1.p }, nk2 = { i: p2.i, p: p1.p };
        out.push(neckPattern(top ? 'dtop' : 'dbot', bars, A, [p0, p1, p2], nk, nk2, top ? (p0.p > p2.p ? p0 : p2) : (p0.p < p2.p ? p0 : p2)));
      }
    }
  }

  function findBounded(bars, A, seq, j, out) {
    if (j < 4) return;
    const P = seq.slice(j - 4, j + 1), H = P.filter(p => p.kind === 'h'), Lw = P.filter(p => p.kind === 'l');
    const i0 = P[0].i, e = P[4].i, a = A[e], n = bars.length;
    if (e - i0 < 15) return;
    const top = throughL(H[0], H[H.length - 1]), bot = throughL(Lw[0], Lw[Lw.length - 1]);
    if (H.length === 3 && Math.abs(H[1].p - top(H[1].i)) > a * 0.6) return;
    if (Lw.length === 3 && Math.abs(Lw[1].p - bot(Lw[1].i)) > a * 0.6) return;
    for (let k = i0; k <= e; k++) {
      if (bars[k].c > top(k) + 0.3 * a || bars[k].c < bot(k) - 0.3 * a) return;
    }
    const w0 = top(i0) - bot(i0), w1 = top(e) - bot(e);
    if (w0 <= 0 || w1 <= 0) return;
    const sh = (top(e) - top(i0)) / (e - i0) / a, sl = (bot(e) - bot(i0)) / (e - i0) / a, flat = 0.02;
    let type = null;
    if (w1 < w0 * 0.75) {
      if (Math.abs(sh) < flat && sl > flat) type = 'asc';
      else if (sh < -flat && Math.abs(sl) < flat) type = 'desc';
      else if (sh < -flat && sl > flat) type = 'sym';
      else if (sh > flat && sl > sh) type = 'rwedge';
      else if (sl < -flat && sh < sl) type = 'fwedge';
    } else if (w1 <= w0 * 1.25 && w1 >= w0 * 0.8) {
      if (sh > flat && sl > flat) type = 'rchan';
      else if (sh < -flat && sl < -flat) type = 'fchan';
      else if (Math.abs(sh) < flat && Math.abs(sl) < flat) type = 'rect';
    } else if (w1 > w0 * 1.4 && sh > flat && sl < -flat) type = 'broad';
    if (!type) return;
    const bias = BIAS[type];
    const r = track(bars, e + 1, {
      max: 50, bull: bias > 0,
      brk: i => bars[i].c > top(i) + 0.25 * a ? 1 : bars[i].c < bot(i) - 0.25 * a ? -1 : 0,
      target: (i, up) => up ? bars[i].c + w0 : down(bars[i].c, w0),
      after: (i, up) => up ? bars[i].c < bot(i) : bars[i].c > top(i)
    });
    const endI = r.brk ?? Math.min(n - 1 + Math.max(3, Math.min(8, Math.round((e - i0) * 0.2))), e + 25);
    const bull = r.brk != null ? r.bull : bias > 0 ? true : bias < 0 ? false : null;
    const ref = bars[n - 1].c;
    const target = r.target ?? (bull === true ? ref + w0 : bull === false ? down(ref, w0) : null);
    out.push({
      type, start: i0, last: e, pts: P, ...r, bull, target, height: w0,
      lines: [
        { a: { i: i0, p: top(i0) }, b: { i: endI, p: top(endI) }, role: 'top', lg: true },
        { a: { i: i0, p: bot(i0) }, b: { i: endI, p: bot(endI) }, role: 'bot', lg: true }
      ]
    });
  }

  function findFlags(bars, A, seq, out) {
    const n = bars.length;
    for (const p of seq) {
      const up = p.kind === 'h', t = p.i, a = A[t];
      let s = t, ext = bars[t][up ? 'l' : 'h'];
      for (let k = Math.max(0, t - 15); k < t; k++) {
        const v = up ? bars[k].l : bars[k].h;
        if (up ? v < ext : v > ext) { ext = v; s = k; }
      }
      const pole = up ? p.p - ext : ext - p.p;
      if (pole < a * 5 || t - s < 3) continue;
      let hi = -Infinity, lo = Infinity, brk = -1, k = t + 1;
      for (; k < Math.min(n, t + 26); k++) {
        const b = bars[k];
        if (k - t >= 5 && (up ? b.c > Math.max(hi, p.p) + 0.1 * a : b.c < Math.min(lo, p.p) - 0.1 * a)) { brk = k; break; }
        hi = Math.max(hi, b.h); lo = Math.min(lo, b.l);
        if (up ? hi > p.p + 0.25 * a || lo < p.p - pole * 0.5 : lo < p.p - 0.25 * a || hi > p.p + pole * 0.5) { k = -1; break; }
      }
      if (k < 0 || k - t < 5) continue;
      if (brk < 0 && k < n) continue;
      const type = up ? 'bflag' : 'sflag', endI = brk >= 0 ? brk : n - 1;
      let status = 'forming', target = up ? Math.max(hi, p.p) + pole : down(Math.min(lo, p.p), pole), end = endI;
      if (brk >= 0) {
        target = up ? bars[brk].c + pole : down(bars[brk].c, pole);
        status = 'confirmed';
        for (let i = brk + 1; i < Math.min(n, brk + 60); i++) {
          if (up ? bars[i].h >= target : bars[i].l <= target) { status = 'target'; end = i; break; }
          if (up ? bars[i].c < lo : bars[i].c > hi) { status = 'failed'; end = i; break; }
          if (i === brk + 59) status = 'expired';
        }
      }
      out.push({
        type, start: s, last: t, pts: [{ i: s, p: ext }, p], status, brk: brk >= 0 ? brk : undefined, end, bull: up, target, height: pole,
        lines: [
          { a: { i: s, p: ext }, b: { i: t, p: p.p }, role: 'pole' },
          { a: { i: t, p: up ? hi : lo }, b: { i: endI, p: up ? hi : lo }, role: 'box' },
          { a: { i: t, p: up ? lo : hi }, b: { i: endI, p: up ? lo : hi }, role: 'box' }
        ]
      });
    }
  }

  function outlook(p, last) {
    const st = STATS[p.type], neck = ['hs', 'ihs', 'dtop', 'dbot', 'ttop', 'tbot'].includes(p.type);
    if (!st) return null;
    let dir, pDir = 1, pHit = st.hit ?? 0, target = p.target;
    if (p.brk != null) dir = p.bull ? 1 : -1;
    else if (neck || p.type === 'bflag' || p.type === 'sflag') { dir = BIAS[p.type]; pDir = st.brk; }
    else if (st.up != null) { dir = st.up >= 0.5 ? 1 : -1; pDir = Math.max(st.up, 1 - st.up); }
    else return null;
    if (target == null || (p.brk == null && Math.sign(target - last) !== dir)) target = dir > 0 ? last + (p.height || 0) : down(last, p.height || 0);
    const prob = p.brk != null ? pHit : pDir * pHit;
    const text = p.brk != null
      ? `${dir > 0 ? 'Yukarı' : 'Aşağı'} kırıldı; geçmişte hedefe ulaşma oranı %${Math.round(pHit * 100)}`
      : `Beklenen ${dir > 0 ? 'yukarı' : 'aşağı'} kırılım (geçmişte %${Math.round(pDir * 100)}); kırılırsa hedefe ulaşma %${Math.round(pHit * 100)}`;
    return { dir, target, prob, pDir, pHit, n: st.n, text, weak: pDir < 0.6 || st.n < 30 };
  }

  function detect(bars, ctx, S) {
    const n = bars.length, A = ctx.atr;
    const seq = alternate(pivots(bars, S.pivot));
    const cand = [];
    for (let j = 2; j < seq.length; j++) { findNeck(bars, A, seq, j, cand); findBounded(bars, A, seq, j, cand); }
    findFlags(bars, A, seq, cand);
    cand.sort((x, y) => PRIO[y.type] - PRIO[x.type] || y.last - x.last);
    const kept = [];
    for (const c of cand) {
      const len = c.last - c.start;
      if (kept.some(k => (Math.min(k.last, c.last) - Math.max(k.start, c.start)) / Math.min(len, k.last - k.start || 1) > 0.3)) continue;
      kept.push(c);
    }
    const last = bars[n - 1].c;
    for (const p of kept) {
      p.name = NAMES[p.type];
      p.outlook = outlook(p, last);
      p.active = (p.status === 'forming' && p.last >= n - 1 - 40) || (p.status === 'confirmed' && p.brk >= n - 1 - 30);
    }
    kept.sort((x, y) => x.last - y.last);
    return { patterns: kept };
  }

  return { detect, NAMES, STATS };
})();
