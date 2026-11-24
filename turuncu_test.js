const COINS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'LDOUSDT', 'LTCUSDT', 'ADAUSDT', 'LINKUSDT', 'DOGEUSDT', 'TRXUSDT', 'XLMUSDT', 'ETCUSDT', 'BCHUSDT', 'DOTUSDT', 'AVAXUSDT', 'ATOMUSDT', 'NEOUSDT', 'EOSUSDT', 'VETUSDT', 'FILUSDT', 'UNIUSDT', 'AAVEUSDT', 'NEARUSDT', 'ALGOUSDT', 'IOTAUSDT'];
const MAJ = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
const CUT = Date.UTC(2023, 0, 1) / 1000, PRE = 45, POST = 20, CD = 30, H = 90, WARM = 364;

async function get(s) {
  let out = [], st = 1500000000000;
  for (let k = 0; k < 6; k++) {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${s}&interval=1d&limit=1000&startTime=${st}`);
    if (!r.ok) break;
    const a = await r.json();
    if (!a.length) break;
    out = out.concat(a.map(x => ({ t: x[0] / 1000, o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5] })));
    st = a[a.length - 1][0] + 864e5;
    if (a.length < 1000) break;
  }
  return out;
}

function zigzag(b, th) {
  const piv = []; let dir = 0, ext = b[0].c, ei = 0;
  for (let i = 1; i < b.length; i++) {
    const h = b[i].h, l = b[i].l;
    if (dir === 0) {
      if (h >= ext * (1 + th)) { piv.push({ i: ei, p: b[ei].l }); dir = 1; ext = h; ei = i; }
      else if (l <= ext * (1 - th)) { piv.push({ i: ei, p: b[ei].h }); dir = -1; ext = l; ei = i; }
      continue;
    }
    if (dir > 0) { if (h > ext) { ext = h; ei = i; } else if (l <= ext * (1 - th)) { piv.push({ i: ei, p: ext }); dir = -1; ext = l; ei = i; } }
    else { if (l < ext) { ext = l; ei = i; } else if (h >= ext * (1 + th)) { piv.push({ i: ei, p: ext }); dir = 1; ext = h; ei = i; } }
  }
  return piv;
}
function legs(b) {
  const p = zigzag(b, 0.3), out = [];
  for (let k = 0; k + 1 < p.length; k++) {
    const a = p[k], z = p[k + 1], days = z.i - a.i, mv = z.p / a.p - 1;
    if (days >= 60 && Math.abs(mv) >= 0.3) out.push({ s: a.i, e: z.i, dir: mv > 0 ? 1 : -1, days });
  }
  return out;
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
function prep(b) {
  const n = b.length, c = b.map(x => x.c);
  const sma = k => { const o = new Array(n).fill(null); let s = 0; for (let i = 0; i < n; i++) { s += c[i]; if (i >= k) s -= c[i - k]; if (i >= k - 1) o[i] = s / k; } return o; };
  const P = { b, c, n, L: legs(b), rsiD: rsi(c, 14), dd: [], ru: [], dsl: [], dsh: [], vol: [] };
  for (const k of [10, 20, 30, 50, 100, 200]) P['s' + k] = sma(k);
  for (let i = 0; i < n; i++) {
    let hi = -Infinity, lo = Infinity, hiI = i, loI = i;
    for (let k = Math.max(0, i - WARM); k <= i; k++) { if (b[k].h > hi) { hi = b[k].h; hiI = k; } if (b[k].l < lo) { lo = b[k].l; loI = k; } }
    P.dd.push(c[i] / hi - 1); P.ru.push(c[i] / lo - 1); P.dsl.push(i - loI); P.dsh.push(i - hiI);
    let va = 0, vb = 0;
    if (i >= 90) { for (let k = i - 6; k <= i; k++) va += b[k].v; for (let k = i - 89; k <= i; k++) vb += b[k].v; P.vol.push(va / 7 / (vb / 90)); } else P.vol.push(null);
  }
  return P;
}

const crossUp = (P, k, i) => P[k][i - 1] != null && P.c[i] > P[k][i] && P.c[i - 1] <= P[k][i - 1];
const crossDn = (P, k, i) => P[k][i - 1] != null && P.c[i] < P[k][i] && P.c[i - 1] >= P[k][i - 1];

const RULES = {
  'Turuncu alt (uygulamadaki)': [1, (P, i) => P.dsl[i] <= 30 && P.dd[i] <= -0.4 && crossUp(P, 's10', i)],
  'Turuncu üst (uygulamadaki)': [-1, (P, i) => P.ru[i] >= 0.5 && crossDn(P, 's50', i)]
};

function evaluate(PP, dir, f, from) {
  let ev = 0, good = 0, inW = 0, days = 0, hw = 0, he = 0, L = 0;
  const r = [], bb = [];
  const fw = (P, i) => { let mx = 0; for (let k = i + 1; k <= i + H; k++) mx = Math.max(mx, dir * (P.c[k] / P.c[i] - 1)); return { r: dir * (P.c[i + H] / P.c[i] - 1), fav: mx }; };
  for (const P of PP) {
    const n = P.n, mark = new Uint8Array(n);
    for (const l of P.L) if (l.dir === dir) for (let k = Math.max(0, l.s - PRE); k <= Math.min(n - 1, l.s + POST); k++) mark[k] = 1;
    let last = -1e9, prev = false; const E = [];
    for (let i = WARM; i < n; i++) {
      const v = !!f(P, i);
      if (v && !prev && i - last >= CD) { last = i; if (P.b[i].t >= from) { E.push(i); ev++; if (mark[i]) good++; } }
      prev = v;
    }
    for (let i = WARM; i < n; i++) if (P.b[i].t >= from) { days++; if (mark[i]) inW++; }
    for (const l of P.L) if (l.dir === dir && l.s >= WARM && P.b[l.s].t >= from) {
      L++;
      if (E.some(i => i >= l.s - PRE && i <= l.s + POST)) hw++;
      if (E.some(i => i >= l.s - PRE && i <= l.s + Math.round(l.days / 3))) he++;
    }
    for (const i of E) if (i + H < n) r.push(fw(P, i));
    for (let i = WARM; i + H < n; i += 3) if (P.b[i].t >= from) bb.push(fw(P, i));
  }
  const med = a => { a = [...a].sort((x, y) => x - y); return a[a.length >> 1]; };
  const st = a => `90g medyan ${(med(a.map(x => x.r)) * 100).toFixed(0)}% · ≥%30 lehte %${(a.filter(x => x.fav >= 0.3).length / a.length * 100).toFixed(0)}`;
  return `olay ${ev} (${(ev / (days / 365)).toFixed(1)}/yıl/coin) · yakalanan ${hw}/${L}=%${(hw / L * 100).toFixed(0)} (erken %${(he / L * 100).toFixed(0)}) · isabet %${(good / ev * 100).toFixed(0)} / taban %${(inW / days * 100).toFixed(0)} · ${st(r)} || taban ${st(bb)}`;
}

(async () => {
  const all = {};
  for (const s of COINS) { const b = await get(s); if (b.length > 500) all[s] = prep(b); }
  const A = Object.values(all), M = MAJ.filter(s => all[s]).map(s => all[s]);
  for (const [name, [dir, f]] of Object.entries(RULES)) {
    console.log(`\n${name}`);
    console.log('  Tümü 2018+   ', evaluate(A, dir, f, 0));
    console.log('  Tümü 2023+   ', evaluate(A, dir, f, CUT));
    console.log('  Büyük 5 coin ', evaluate(M, dir, f, 0));
  }
})();
