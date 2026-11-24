window.SV = window.SV || {};

SV.scen = (() => {
  const STATS = {
    short: {
      strong: { with: { n: 117, p50: 0.66, p100: 0.38, p200: 0.32, usd: 28, w7: 0.59, usd7: 22, tr: 0.68, te: 0.63 }, against: { n: 88, p50: 0.36, p100: 0.27, p200: 0.17, usd: -4, w7: 0.33, usd7: -4, tr: 0.28, te: 0.61 } },
      base: { with: { n: 598, p50: 0.56, p100: 0.36, p200: 0.21, usd: 16, w7: 0.49, usd7: 12 }, against: { n: 350, p50: 0.52, p100: 0.24, p200: 0.09, usd: 0, w7: 0.45, usd7: 1 } }
    },
    long: {
      strong: { with: { n: 133, p50: 0.68, p100: 0.45, p200: 0.23, usd: 31, w7: 0.5, usd7: 15, tr: 0.72, te: 0.55 }, against: { n: 176, p50: 0.38, p100: 0.19, p200: 0.09, usd: -12, w7: 0.32, usd7: -13, tr: 0.4, te: 0.35 } },
      base: { with: { n: 418, p50: 0.53, p100: 0.28, p200: 0.16, usd: 6, w7: 0.43, usd7: 3 }, against: { n: 593, p50: 0.46, p100: 0.2, p200: 0.09, usd: -3, w7: 0.35, usd7: -7 } }
    },
    rand50: 0.5,
    market: { early: { with: 0.6, against: 0.39 }, late: { with: 0.48, against: 0.4 }, flips: 3, old: 9 }
  };
  const MIN_WIN = 0.6;
  const cache = new Map();
  const LV = [0.05, 0.1, 0.2], STOP = 0.05;
  const STEPS = { '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800, '1M': 2629800 };
  let btcM = null;

  function setMarket(M) { btcM = M && M.length ? M : null; }

  function regime(t) {
    const M = btcM;
    if (!M) return null;
    let k = M.length - 1;
    while (k >= 0 && M[k].t > t) k--;
    const c = k - 1;
    if (c < 12) return null;
    const avg = (j, last) => { let s = last != null ? last : M[j].c; for (let q = j - 9; q < j; q++) s += M[q].c; return s / 10; };
    let dir = 0, since = 0;
    for (let j = 11; j <= c; j++) {
      const s = avg(j), s2 = avg(j - 2), a = M[j].c > s ? 1 : -1, b = s > s2 ? 1 : -1, nd = a === b ? a : dir || a;
      since = nd === dir ? since + 1 : 1; dir = nd;
    }
    const sm = avg(c), sm2 = avg(c - 2);
    const out = { dir, close: M[c].c, sma: sm, dist: (M[c].c - sm) / sm, slope: (sm - sm2) / sm2, side: M[c].c > sm ? 1 : -1, since, month: M[c].t };
    if (k > c) {
      const ns = avg(k, M[k].c), ns2 = avg(k - 2), a = M[k].c > ns ? 1 : -1, b = ns > ns2 ? 1 : -1;
      out.next = { dir: a === b ? a : dir, price: M[k].c, sma: ns, side: a };
    }
    return out;
  }

  function zonesAt(htf, t, price, id) {
    const out = [];
    for (const tf of ['1M', '1w']) {
      const H = htf[tf];
      if (!H || H.length < 4) continue;
      let k = H.length - 1;
      while (k >= 0 && H[k].t > t) k--;
      if (k < 1) continue;
      const key = (id || '') + tf + k + ':' + H[k - 1].t;
      if (!cache.has(key)) { if (cache.size > 300) cache.clear(); cache.set(key, SV.zones.build(H.slice(0, k), tf, t, price)); }
      out.push(...cache.get(key));
    }
    return out;
  }

  function pick(zs, t, pc, a) {
    const list = [];
    for (const z of zs) { const v = z.f(t); if (isFinite(v) && v > 0 && Math.abs(v - pc) / pc <= 0.25) list.push({ name: z.name, tf: z.tf, kind: z.kind, v }); }
    if (!list.length) return { R1: null, S1: null };
    const cl = SV.zones.clusters(list, pc);
    for (const c of cl) c.trends = c.items.filter(x => x.kind === 'trend' || x.kind === 'arc').length;
    return {
      R1: cl.filter(c => c.lo > pc + 0.2 * a).sort((x, y) => x.lo - y.lo)[0] || null,
      S1: cl.filter(c => c.hi < pc - 0.2 * a).sort((x, y) => y.hi - x.hi)[0] || null
    };
  }

  function checks(dir, zone, close, s200, t) {
    const list = [{ ok: zone.items.some(x => x.kind === 'trend'), text: 'Bölgede aylık ya da haftalık trend çizgisi (3 temaslı)' }];
    const strong = list[0].ok, rg = regime(t), aligned = !!rg && rg.dir === dir;
    list.push({ ok: aligned, market: true, text: rg ? `Piyasa yönüyle aynı (BTC aylık: ${rg.dir > 0 ? 'boğa' : 'ayı'})` : 'Piyasa yönü bilinmiyor (BTC aylık veri yok)' });
    return { list, strong, aligned };
  }
  const statsFor = (key, ck) => STATS[key][ck.strong ? 'strong' : 'base'][ck.aligned ? 'with' : 'against'];

  function touched(dir, b, zone, a) {
    return dir < 0 ? b.h >= zone.lo - 0.25 * a && b.c < zone.lo : b.l <= zone.hi + 0.25 * a && b.c > zone.hi;
  }

  function plan(dir, entry) {
    if (!(entry > 0)) return null;
    return { dir, entry, stop: entry * (1 - dir * STOP), lv: LV.map(x => entry * (1 + dir * x)) };
  }

  function eventAt(bars, ctx, htf, i, id) {
    const b = bars[i], pc = bars[i - 1].c, a = ctx.atr[i - 1];
    if (!a) return [];
    const zs = zonesAt(htf, b.t, b.o, id), { R1, S1 } = pick(zs, b.t, pc, a), out = [];
    for (const dir of [-1, 1]) {
      const zone = dir < 0 ? R1 : S1, opp = dir < 0 ? S1 : R1;
      if (!zone || !touched(dir, b, zone, a)) continue;
      const ck = checks(dir, zone, b.c, ctx.s200[i], b.t), gap = dir < 0 ? zone.lo - b.c : b.c - zone.hi;
      const p = plan(dir, b.c);
      if (p) out.push({ i, dir, zone, strong: ck.strong, aligned: ck.aligned, checks: ck.list, plan: p, gap: gap / b.c, late: gap > a || gap / b.c > 0.04 });
    }
    return out;
  }

  function follow(bars, ev, upto) {
    const p = ev.plan, d = p.dir;
    let k = 0, pnl = 0, size = 1, st = p.stop;
    for (let m = ev.i + 1; m <= upto; m++) {
      const b = bars[m];
      if (d < 0 ? b.h >= st : b.l <= st) { pnl += size * d * (st - p.entry) / p.entry; return { k: k ? 'be' : 'stop', tier: k, pnl, at: m, done: true }; }
      while (k < 3 && (d < 0 ? b.l <= p.lv[k] : b.h >= p.lv[k])) { const part = k < 2 ? 1 / 3 : size; pnl += part * LV[k]; size -= part; k++; if (k === 1) st = p.entry; }
      if (k === 3) return { k: 'full', tier: 3, pnl, at: m, done: true };
    }
    return { k: 'open', tier: k, pnl: pnl + size * d * (bars[upto].c - p.entry) / p.entry, done: false };
  }

  function history(bars, ctx, htf, closedN, interval, id) {
    const H = Math.round(30 * 86400 / (STEPS[interval] || 14400)), mk = () => ({ n: 0, t: [0, 0, 0, 0], usd: 0 });
    const res = { short: { strong: mk(), base: mk() }, long: { strong: mk(), base: mk() } }, last = { 1: -1e9, '-1': -1e9 };
    for (let i = 260; i < closedN; i++) {
      if (i + H >= closedN) break;
      for (const ev of eventAt(bars, ctx, htf, i, id)) {
        if (i - last[ev.dir] < 6) continue;
        last[ev.dir] = i;
        if (ev.late) continue;
        const o = follow(bars, ev, i + H), g = res[ev.dir < 0 ? 'short' : 'long'][ev.strong ? 'strong' : 'base'];
        g.n++; g.t[o.tier]++; g.usd += o.pnl * 1000;
      }
    }
    return res;
  }

  const TESTED = ['1h', '4h', '1d'];
  function live(bars, ctx, htf, closedN, id, interval) {
    const n = bars.length, cur = bars[n - 1], c = closedN - 1;
    if (c < 30 || !ctx.atr[c]) return null;
    const a = ctx.atr[c], price = cur.c;
    const out = { atr: a, price };
    const zsNow = zonesAt(htf, cur.t, cur.o, id), pcNow = cur.c;
    const now = pick(zsNow, cur.t, pcNow, a);
    out.R1 = now.R1; out.S1 = now.S1;
    const trig = { 1: null, '-1': null };
    for (let j = c; j >= Math.max(31, c - 2); j--) for (const ev of eventAt(bars, ctx, htf, j, id)) if (!trig[ev.dir]) trig[ev.dir] = ev;
    for (const dir of [-1, 1]) {
      const key = dir < 0 ? 'short' : 'long', ev = trig[dir];
      if (ev && ev.late) out[key] = { ...ev, state: 'late', ago: c - ev.i };
      else if (ev) {
        const f = follow(bars, ev, n - 1);
        out[key] = { ...ev, state: f.done ? f.k : 'triggered', tier: f.tier, ago: c - ev.i, stats: STATS[key][ev.strong ? 'strong' : 'base'][ev.aligned ? 'with' : 'against'] };
        if (!f.done) continue;
      }
      const zone = dir < 0 ? now.R1 : now.S1, opp = dir < 0 ? now.S1 : now.R1;
      if (!zone) { if (!out[key]) out[key] = null; continue; }
      const edge = dir < 0 ? zone.lo : zone.hi, distA = (dir < 0 ? edge - price : price - edge) / a, distP = Math.abs(edge - price) / price;
      const inZone = dir < 0 ? price >= zone.lo - 0.25 * a : price <= zone.hi + 0.25 * a;
      const broke = dir < 0 ? price > zone.hi : price < zone.lo;
      const state = broke ? 'broken' : inZone ? 'inzone' : distP <= 0.012 || (distA <= 1.5 && distP <= 0.05) ? 'near' : 'wait';
      const ck = checks(dir, zone, price, ctx.s200[c], cur.t);
      const p = plan(dir, edge + dir * 0.4 * a);
      const prev = out[key];
      out[key] = { dir, zone, state, distA: Math.max(0, distA), distP, strong: ck.strong, aligned: ck.aligned, checks: ck.list, plan: p, stats: statsFor(key, ck), done: prev && prev.state !== 'triggered' ? prev : null };
    }
    out.tested = TESTED.includes(interval);
    for (const key of ['short', 'long']) if (out[key]) out[key].tested = out.tested;
    return out;
  }

  const PST = {
    fwedgeL: { n: 190, p50: 0.64, p100: 0.33, p200: 0.21, usd: 18, a: 0.57, b: 0.7, h4: 0.61, d1: 0.7 },
    fchanL: { n: 123, p50: 0.62, p100: 0.35, p200: 0.22, usd: 19, a: 0.69, b: 0.56, h4: 0.63, d1: 0.58 },
    descL: { n: 40, p50: 0.65, p100: 0.42, p200: 0.23, usd: 23, a: 0.77, b: 0.59, h4: 0.63, d1: 0.69 },
    rwedgeS: { n: 121, p50: 0.61, p100: 0.3, p200: 0.19, usd: 15, a: 0.54, b: 0.67, h4: 0.58, d1: 0.69 },
    rchanS: { n: 116, p50: 0.59, p100: 0.26, p200: 0.09, usd: 5, a: 0.63, b: 0.53, h4: 0.59, d1: 0.57 },
    fwedgeS: { n: 40, p50: 0.6, p100: 0.3, p200: 0.1, usd: 7, a: 0.53, b: 0.65, h4: 0.63, d1: 0.5 },
    ascS: { n: 32, p50: 0.66, p100: 0.38, p200: 0.28, usd: 27, a: 0.63, b: 0.69, h4: 0.63, d1: 0.69 }
  };
  const PAT_TF = ['4h', '1d'], PAT_RAND = 0.49, PAT_ALL = 0.51;
  const score = st => st ? (st.p50 * st.n + 0.5 * 50) / (st.n + 50) : -1;
  const lineAt = (l, j) => l.lg ? Math.exp(Math.log(l.a.p) + (Math.log(l.b.p) - Math.log(l.a.p)) * (j - l.a.i) / ((l.b.i - l.a.i) || 1)) : l.a.p + (l.b.p - l.a.p) * (j - l.a.i) / ((l.b.i - l.a.i) || 1);

  function patLive(list, bars, ctx, closedN, interval) {
    if (!PAT_TF.includes(interval) || !list) return [];
    const n = bars.length, c = closedN - 1, a = ctx.atr[c], price = bars[n - 1].c, out = [];
    if (!a) return out;
    for (const p of list) {
      for (const dir of [1, -1]) {
        const st = PST[p.type + (dir > 0 ? 'L' : 'S')];
        if (!st) continue;
        const line = p.lines.find(l => l.role === (dir > 0 ? 'top' : 'bot'));
        if (!line) continue;
        const base = { kind: 'pat', type: p.type, name: p.name, dir, stats: st, score: score(st), tested: true, aligned: (() => { const rg = regime(bars[n - 1].t); return rg ? rg.dir === dir : null; })() };
        if (p.brk != null) {
          if ((p.bull ? 1 : -1) !== dir) continue;
          if (p.brk > c) { const lv = lineAt(line, p.brk) + dir * 0.25 * a; out.push({ ...base, state: 'trying', level: lv, plan: plan(dir, price) }); continue; }
          const ago = c - p.brk;
          if (ago > 5) continue;
          const ev = { i: p.brk, plan: plan(dir, bars[p.brk].c) }, f = follow(bars, ev, n - 1);
          out.push({ ...base, state: f.done ? f.k : 'triggered', tier: f.tier, ago, level: lineAt(line, p.brk) + dir * 0.25 * a, plan: ev.plan });
          continue;
        }
        if (p.status !== 'forming' || !p.active) continue;
        const lv = lineAt(line, n - 1) + dir * 0.25 * a, distA = dir * (lv - price) / a, distP = Math.abs(lv - price) / price;
        if (distA < 0) { out.push({ ...base, state: 'trying', level: lv, plan: plan(dir, price) }); continue; }
        out.push({ ...base, state: distA <= 1.5 ? 'near' : 'wait', distA, distP, level: lv, plan: plan(dir, lv) });
      }
    }
    return out.sort((x, y) => y.score - x.score);
  }

  const good = s => !!s && s.tested && s.strong && s.aligned && s.stats.p50 >= MIN_WIN && s.stats.n >= 60 && (s.stats.tr == null || (s.stats.tr >= MIN_WIN && s.stats.te >= MIN_WIN));

  return { STATS, MIN_WIN, LV, STOP, TESTED, PST, PAT_TF, PAT_RAND, PAT_ALL, score, zonesAt, live, history, good, regime, setMarket, patLive };
})();
