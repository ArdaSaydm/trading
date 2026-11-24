const YAHOO = ['^GSPC', '^IXIC', '^DJI', '^N225', '^GDAXI', '^FTSE', '^HSI', 'XU100.IS', '^BVSP', '^STOXX50E', 'GC=F', 'SI=F', 'CL=F', 'HG=F', 'EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'INTC', 'CSCO', 'KO', 'XOM', 'GE', 'JPM', 'IBM', 'WMT', 'TSLA', 'META', 'GOOGL', 'BA', 'PFE', 'C', '^RUT', '^FCHI', '^AXJO', '^KS11', '^BSESN', 'NG=F', 'PL=F', 'ZC=F', 'ZW=F', 'AUDUSD=X', 'USDCAD=X', 'ORCL', 'MCD', 'PG', 'JNJ', 'HD', 'DIS', 'CAT', 'MMM', 'AMD', 'QCOM', 'TXN', 'ADBE', 'NFLX', 'SBUX'];
const BINANCE = ['ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'LTCUSDT', 'LINKUSDT', 'DOGEUSDT', 'SOLUSDT', 'TRXUSDT', 'XLMUSDT', 'ETCUSDT', 'AVAXUSDT', 'DOTUSDT', 'ATOMUSDT'];
const WARM = 104, PRE = 26, POST = 4, CD = 13, H = 26, CUT = Date.UTC(2010, 0, 1) / 1000;

async function yahoo(s) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?period1=0&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const q = (await r.json()).chart.result[0], o = q.indicators.quote[0], a = [];
  for (let i = 0; i < q.timestamp.length; i++) { const c = o.close[i]; if (c > 0) a.push({ t: q.timestamp[i], h: o.high[i] ?? c, l: o.low[i] ?? c, c }); }
  return a;
}
async function binance(s) {
  let out = [], st = 1500000000000;
  for (let k = 0; k < 6; k++) {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${s}&interval=1d&limit=1000&startTime=${st}`);
    if (!r.ok) break;
    const a = await r.json();
    if (!a.length) break;
    out = out.concat(a.map(x => ({ t: x[0] / 1000, h: +x[2], l: +x[3], c: +x[4] })));
    st = a[a.length - 1][0] + 864e5;
    if (a.length < 1000) break;
  }
  return out;
}
async function bitstamp() {
  let out = [], st = 1313000000;
  for (let p = 0; p < 8 && st < Date.now() / 1000; p++) {
    const r = await fetch(`https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=86400&limit=1000&start=${st}`);
    const a = (await r.json()).data.ohlc;
    if (!a.length) break;
    out = out.concat(a.map(x => ({ t: +x.timestamp, h: +x.high, l: +x.low, c: +x.close })));
    st = +a[a.length - 1].timestamp + 86400;
  }
  const seen = new Set();
  return out.filter(x => !seen.has(x.t) && seen.add(x.t)).sort((a, b) => a.t - b.t);
}

const cls = s => /USDT$|^BTC$/.test(s) ? 'kripto' : /^\^|XU100/.test(s) ? 'endeks' : /=F$/.test(s) ? 'emtia' : /=X$/.test(s) ? 'döviz' : 'hisse';
function weekly(d) {
  const o = []; let key = null;
  for (const b of d) {
    const k = Math.floor((b.t / 86400 + 3) / 7);
    if (k !== key) { key = k; o.push({ ...b }); } else { const c = o[o.length - 1]; c.h = Math.max(c.h, b.h); c.l = Math.min(c.l, b.l); c.c = b.c; }
  }
  return o;
}
function rsi(c, n) {
  const o = new Array(c.length).fill(null); let ag = 0, al = 0;
  for (let i = 1; i < c.length; i++) {
    const d = c[i] - c[i - 1], g = Math.max(d, 0), l = Math.max(-d, 0);
    if (i <= n) { ag += g / n; al += l / n; if (i < n) continue; } else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; }
    o[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return o;
}
function prep(w) {
  const n = w.length, c = w.map(b => b.c), lc = c.map(Math.log);
  const s40 = new Array(n).fill(null); let s = 0;
  for (let i = 0; i < n; i++) { s += c[i]; if (i >= 40) s -= c[i - 40]; if (i >= 39) s40[i] = s / 40; }
  const dev = lc.map((v, i) => s40[i] ? v - Math.log(s40[i]) : null), z = new Array(n).fill(null);
  for (let i = 196; i < n; i++) {
    let m = 0, q = 0;
    for (let k = i - 155; k <= i; k++) m += dev[k];
    m /= 156;
    for (let k = i - 155; k <= i; k++) q += (dev[k] - m) ** 2;
    const sd = Math.sqrt(q / 155); z[i] = sd > 0 ? dev[i] / sd : null;
  }
  const R = rsi(c, 14), ph = [], pl = [], L = 3;
  for (let i = L; i < n - L; i++) {
    let hi = true, lo = true;
    for (let j = i - L; j <= i + L; j++) { if (j === i) continue; if (c[j] >= c[i]) hi = false; if (c[j] <= c[i]) lo = false; }
    if (hi) ph.push(i); if (lo) pl.push(i);
  }
  const bear = new Set(), bull = new Set();
  for (let k = 1; k < ph.length; k++) { const a = ph[k - 1], b = ph[k]; if (b - a <= 52 && R[a] != null && R[b] != null && c[b] > c[a] && R[b] < R[a] - 3 && R[a] >= 60) bear.add(b + L); }
  for (let k = 1; k < pl.length; k++) { const a = pl[k - 1], b = pl[k]; if (b - a <= 52 && R[a] != null && R[b] != null && c[b] < c[a] && R[b] > R[a] + 5 && R[a] <= 35) bull.add(b + L); }
  const r = [0]; for (let i = 1; i < n; i++) r.push(lc[i] - lc[i - 1]);
  const sds = [];
  for (let i = 52; i < n; i++) { let m = 0, v = 0; for (let k = i - 51; k <= i; k++) m += r[k]; m /= 52; for (let k = i - 51; k <= i; k++) v += (r[k] - m) ** 2; sds.push(Math.sqrt(v / 51) * Math.sqrt(52)); }
  sds.sort((a, b) => a - b);
  const th = Math.max(Math.log(1.2), sds[sds.length >> 1]), piv = [];
  let dir = 0, ext = lc[0], ei = 0;
  for (let i = 1; i < n; i++) {
    const v = lc[i];
    if (dir === 0) { if (v - ext >= th) { piv.push({ i: ei, dir: 1 }); dir = 1; ext = v; ei = i; } else if (ext - v >= th) { piv.push({ i: ei, dir: -1 }); dir = -1; ext = v; ei = i; } continue; }
    if (dir > 0) { if (v > ext) { ext = v; ei = i; } else if (ext - v >= th) { piv.push({ i: ei, dir: -1 }); dir = -1; ext = v; ei = i; } }
    else { if (v < ext) { ext = v; ei = i; } else if (v - ext >= th) { piv.push({ i: ei, dir: 1 }); dir = 1; ext = v; ei = i; } }
  }
  const T = piv.filter((p, k) => piv[k + 1] && piv[k + 1].i - p.i >= 12);
  const S = new Array(n).fill(null), sorted = [];
  for (let i = 52; i < n; i++) { let m = 0, q = 0; for (let k = i - 51; k <= i; k++) m += r[k]; m /= 52; for (let k = i - 51; k <= i; k++) q += (r[k] - m) ** 2; const v = Math.sqrt(q / 51) * Math.sqrt(52); let lo = 0, hi = sorted.length; while (lo < hi) { const md = (lo + hi) >> 1; if (sorted[md] < v) lo = md + 1; else hi = md; } sorted.splice(lo, 0, v); S[i] = sorted[sorted.length >> 1]; }
  const lo3 = lc.map((_, i) => { let m = Infinity; for (let j = Math.max(0, i - 155); j <= i; j++) m = Math.min(m, lc[j]); return m; });
  return { w, n, c, lc, z, R, bear, bull, T, S, lo3 };
}

const zmax = (P, i, k) => { let m = -9; for (let j = Math.max(0, i - k); j <= i; j++) if (P.z[j] != null) m = Math.max(m, P.z[j]); return m; };

const zmin = (P, i, k) => { let m = 9; for (let j = Math.max(0, i - k); j <= i; j++) if (P.z[j] != null) m = Math.min(m, P.z[j]); return m; };

const RULES = {
  'Ön uyarı ▲ (uygulamadaki, içi boş)': [1, (P, i) => P.z[i] != null && P.z[i] <= -2 && zmin(P, i, 13) <= -1.5 && P.z[i] >= zmin(P, i, 13) + 0.75],
  'Ön uyarı ▼ (uygulamadaki, içi boş)': [-1, (P, i) => P.R[i] != null && P.R[i - 1] != null && P.R[i] < 65 && P.R[i - 1] >= 65 && P.S[i] != null && P.lc[i] - P.lo3[i] >= 3 * P.S[i]],
  'Ön uyarı ▼ + aynı sınıf kalabalığı': [-1, (P, i) => {
    if (P.R[i] == null || P.R[i - 1] == null || P.S[i] == null) return false;
    const ext = (P.lc[i] - P.lo3[i]) / P.S[i];
    const cross65 = P.R[i] < 65 && P.R[i - 1] >= 65;
    const cross70 = P.R[i] < 70 && P.R[i - 1] >= 70;
    return (cross65 && ext >= 3) || (P.brd[i] && cross70 && ext >= 2);
  }]
};

function attachBreadth(U) {
  const bucket = new Map();
  for (const s in U) {
    const P = U[s];
    P.ext = new Float64Array(P.n);
    P.brd = new Uint8Array(P.n);
    for (let i = 0; i < P.n; i++) P.ext[i] = P.S[i] > 0 ? (P.lc[i] - P.lo3[i]) / P.S[i] : 0;
    for (let i = 52; i < P.n; i++) {
      if (P.S[i] == null) continue;
      const k = Math.floor((P.w[i].t / 86400 + 3) / 7);
      let b = bucket.get(k); if (!b) bucket.set(k, b = []);
      b.push([s, i]);
    }
  }
  for (const arr of bucket.values()) {
    const by = {};
    for (const [s, i] of arr) { const c = U[s].cls; (by[c] || (by[c] = [])).push([s, i]); }
    for (const c in by) {
      const peers = by[c];
      let hi = 0;
      for (const [s, i] of peers) if (U[s].ext[i] >= 2.5) hi++;
      for (const [s, i] of peers) {
        const n = peers.length - 1, h = hi - (U[s].ext[i] >= 2.5 ? 1 : 0);
        if (n >= 4 && h / n >= 0.5) U[s].brd[i] = 1;
      }
    }
  }
}

function evaluate(U, dir, f) {
  const g = {};
  const add = (k, x) => { const o = g[k] || (g[k] = { ev: 0, ok: 0, base: 0, bn: 0, T: 0, hit: 0, r: [], br: [] }); for (const q in x) if (q === 'r' || q === 'br') o[q].push(...x[q]); else o[q] += x[q]; };
  for (const s in U) {
    const P = U[s], n = P.n, TT = P.T.filter(t => t.dir === dir), near = new Uint8Array(n);
    for (const t of TT) for (let k = Math.max(0, t.i - PRE); k <= Math.min(n - 1, t.i + POST); k++) near[k] = 1;
    let last = -1e9, prev = false; const E = [];
    for (let i = WARM; i < n; i++) { const v = !!f(P, i); if (v && !prev && i - last >= CD) { E.push(i); last = i; } prev = v; }
    const keys = i => [P.cls, P.w[i].t < CUT ? '2010 öncesi' : '2010 sonrası', 'TÜMÜ'];
    for (const i of E) { const r = i + H < n ? dir * (P.lc[i + H] - P.lc[i]) : null; for (const k of keys(i)) add(k, { ev: 1, ok: near[i], r: r != null ? [r] : [] }); }
    for (let i = WARM; i < n; i++) { const r = i + H < n ? dir * (P.lc[i + H] - P.lc[i]) : null; for (const k of keys(i)) add(k, { base: near[i], bn: 1, br: i % 4 === 0 && r != null ? [r] : [] }); }
    for (const t of TT) { if (t.i < WARM) continue; const h = E.some(i => i >= t.i - PRE && i <= t.i + POST); for (const k of keys(t.i)) add(k, { T: 1, hit: h ? 1 : 0 }); }
  }
  const med = a => { a = [...a].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : NaN; };
  const pc = x => (x >= 0 ? '+' : '') + Math.round((Math.exp(x) - 1) * 100) + '%';
  return Object.entries(g).sort().map(([k, o]) => `  ${k.padEnd(12)} olay ${o.ev} · yakalama ${o.hit}/${o.T}=%${Math.round(o.hit / o.T * 100)} · isabet %${Math.round(o.ok / o.ev * 100)} / taban %${Math.round(o.base / o.bn * 100)} · 26 hafta ${pc(med(o.r))} / ${pc(med(o.br))}`).join('\n');
}

(async () => {
  const U = {}, add = (s, d) => { if (d.length >= 800) { const P = prep(weekly(d)); P.cls = cls(s); U[s] = P; } };
  for (const s of YAHOO) { try { add(s, await yahoo(s)); } catch (e) { console.log('alınamadı', s, e.message); } }
  for (const s of BINANCE) { try { add(s, await binance(s)); } catch (e) { console.log('alınamadı', s, e.message); } }
  try { add('BTC', await bitstamp()); } catch (e) { console.log('alınamadı BTC', e.message); }
  console.log(`${Object.keys(U).length} piyasa`);
  attachBreadth(U);
  for (const [name, [dir, f]] of Object.entries(RULES)) console.log(`\n${name}\n${evaluate(U, dir, f)}`);
  console.log('\n' + cover(U));
})();

function cover(U) {
  const FLOOR = Math.log(1.2);
  const g = {};
  const add = (k, fn) => { const o = g[k] || (g[k] = { T: 0, hit: 0, ev: 0, ok: 0, delay: [], r: [], rm: [], br: [] }); fn(o); };
  for (const s in U) {
    const P = U[s], n = P.n, lc = P.lc, conf = [];
    let dir = 0, ext = 0, ei = 0; const done = new Set();
    for (let i = WARM; i < n; i++) {
      const x = lc[i];
      if (dir === 0) {
        let mx = -Infinity, mn = Infinity;
        for (let j = 52; j <= i; j++) { mx = Math.max(mx, lc[j]); mn = Math.min(mn, lc[j]); }
        if (x - mn >= FLOOR) { dir = 1; ext = x; ei = i; } else if (mx - x >= FLOOR) { dir = -1; ext = x; ei = i; }
        continue;
      }
      if (dir > 0) {
        if (x > ext) { ext = x; ei = i; }
        else if (ext - x >= FLOOR && !done.has(ei)) { done.add(ei); conf.push({ i, ei, dir: -1 }); }
        if (ext - x >= FLOOR) { dir = -1; ext = x; ei = i; }
      } else {
        if (x < ext) { ext = x; ei = i; }
        else if (x - ext >= FLOOR && !done.has(ei)) { done.add(ei); conf.push({ i, ei, dir: 1 }); }
        if (x - ext >= FLOOR) { dir = 1; ext = x; ei = i; }
      }
    }
    const turns = P.T.filter(t => t.i >= WARM);
    for (const t of turns) {
      const c = conf.find(q => q.dir === t.dir && q.ei === t.i && q.i >= t.i - 1);
      const era = P.w[t.i].t < CUT ? '2010 öncesi' : '2010 sonrası';
      for (const k of ['TÜMÜ', era, P.cls]) add(k, o => { o.T++; if (c) { o.hit++; o.delay.push(c.i - t.i); } });
    }
    for (const c of conf) {
      const matched = turns.some(t => t.dir === c.dir && t.i === c.ei);
      const era = P.w[c.i].t < CUT ? '2010 öncesi' : '2010 sonrası';
      const side = c.dir > 0 ? '▲ ' : '▼ ';
      const ret = c.i + H < n ? c.dir * (lc[c.i + H] - lc[c.i]) : null;
      for (const k of [side + 'TÜMÜ', side + era, side + P.cls]) add(k, o => { o.ev++; if (matched) o.ok++; if (ret != null) { o.r.push(ret); if (matched) o.rm.push(ret); } });
    }
    for (let i = WARM; i + H < n; i++) if (i % 4 === 0) {
      const era = P.w[i].t < CUT ? '2010 öncesi' : '2010 sonrası';
      for (const d of [1, -1]) {
        const side = d > 0 ? '▲ ' : '▼ ';
        const ret = d * (lc[i + H] - lc[i]);
        for (const k of [side + 'TÜMÜ', side + era, side + P.cls]) add(k, o => o.br.push(ret));
      }
    }
  }
  const med = a => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
  const pc = x => Number.isFinite(x) ? (x >= 0 ? '+' : '') + Math.round((Math.exp(x) - 1) * 100) + '%' : 'na';
  const rows = [];
  rows.push('%20 zigzag — üçgen ekstrem haftaya, fiyat %20 dönünce');
  for (const k of ['TÜMÜ', '2010 öncesi', '2010 sonrası', 'endeks', 'hisse', 'emtia', 'kripto', 'döviz']) {
    const o = g[k]; if (!o || !o.T) continue;
    const d = med(o.delay);
    rows.push(`  ${k.padEnd(12)} eşleşme ${o.hit}/${o.T}=%${Math.round(o.hit / o.T * 100)} gecikme ${Number.isFinite(d) ? Math.round(d) : '-'}hf`);
  }
  for (const k of ['▲ TÜMÜ', '▲ 2010 öncesi', '▲ 2010 sonrası', '▲ endeks', '▲ hisse', '▲ emtia', '▲ kripto', '▼ TÜMÜ', '▼ 2010 öncesi', '▼ 2010 sonrası', '▼ endeks', '▼ hisse', '▼ emtia', '▼ kripto']) {
    const o = g[k]; if (!o || !o.ev) continue;
    rows.push(`  ${k.padEnd(16)} uzun vade payı %${Math.round(o.ok / o.ev * 100)} (${o.ok}/${o.ev}) · 26h ${pc(med(o.r))}/${pc(med(o.br))} · yalnız eşleşen ${pc(med(o.rm))}`);
  }
  return rows.join('\n');
}
