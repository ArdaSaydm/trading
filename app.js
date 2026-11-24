(async () => {
await SV.store.init();
const LWC = window.LightweightCharts;
const $ = id => document.getElementById(id);
const API = {
  spot:    { rest: ['https://api.binance.com/api/v3/klines', 'https://data-api.binance.vision/api/v3/klines'], ws: 'wss://stream.binance.com:9443/ws/' },
  futures: { rest: ['https://fapi.binance.com/fapi/v1/klines'], ws: 'wss://fstream.binance.com/ws/' }
};
const STEP = { '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800, '1M': 2629800 };
const TV_INT = { '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W', '1M': 'M' };
const TZ = -new Date().getTimezoneOffset() * 60;
const DEF = {
  market: 'spot', symbol: 'BTCUSDT', interval: '4h', pivot: 5, levels: 5, tol: 0.6, sens: 4, cool: 20, ext: 20, depth: 3000, layersOpen: true, log: false, opacity: 0.5, notify: false, volH: 0.18,
  account: 1000, riskPct: 1, view: 'chart', dom: 'CRYPTOCAP:BTC.D',
  layers: { bs: true, vol: true, pos: true, zone: true, idea: true, react: true, big: true, ltb: true, rev: true, orange: true, htf1M: true, htf1w: true, htf1d: true, pat: true, para: true, levels: true, sma: false, hist: true }
};
const S = JSON.parse(JSON.stringify(DEF));
{
  const saved = SV.store.get('seviye', {});
  Object.assign(S, saved, { layers: { ...DEF.layers, ...(saved.layers || {}) } });
}
const save = () => SV.store.set('seviye', S);
if (!('layersOpen' in SV.store.get('seviye', {})) && innerWidth < 700) S.layersOpen = false;
const LAYERS = [
  ['bs', 'Buy / Sell', 'buy'], ['zone', 'Direnç reddi (HTF)', 'zone'], ['idea', 'Fikir bölgeleri', 'idea'], ['react', 'Tepki (iğne)', 'react'], ['big', 'Mor / yeşil çizgi', 'big'], ['ltb', 'Mor P (uzun vade)', 'ltb'], ['rev', 'Sarı çizgi', 'rev'], ['orange', 'Turuncu (büyük dönüş)', 'orange'],
  ['pat', 'Formasyonlar', 'pat'], ['para', 'Parabolik yay', 'para'], ['htf1M', 'Aylık trend', 'tr w3'], ['htf1w', 'Haftalık trend', 'tr w2'],
  ['htf1d', 'Günlük trend', 'tr'], ['levels', 'Destek / direnç', 'lv'], ['sma', 'SMA 50 / 200', 'sma'], ['vol', 'Hacim', 'volb'], ['pos', 'İşlemlerim', 'pos'], ['hist', 'Geçmiş işlemlerim', 'hist']
];
const EYE_ON = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

let bars = [], res = null, priceLines = [], ws = null, wsToken = 0, retry = 0, reTimer = null, anTimer = null, C = {};
let lastMsg = 0, sigByIndex = new Map(), htf = {}, htfRaw = {}, htfKey = '', htfAt = 0, patSel = null;
const HTF = [['1M', 2, 0.30], ['1w', 3, 0.15], ['1d', 5, 0.08]];

function showMsg(h, p) { $('msgH').textContent = h; $('msgP').textContent = p || ''; $('msg').classList.add('show'); }
function hideMsg() { $('msg').classList.remove('show'); }
function setLive(st, t) { $('dot').className = 'dot' + (st === 'on' ? ' on' : st === 'err' ? ' err' : ''); $('liveTxt').textContent = t; }

if (!LWC) {
  showMsg('Grafik kütüphanesi yüklenemedi', 'İnternet bağlantını kontrol et ve sayfayı yenile.');
  throw new Error('lightweight-charts yüklenemedi');
}

function colors() {
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const get = v => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
  const c = { bg: get('--bg'), muted: get('--muted'), line: get('--line'), up: get('--up'), down: get('--down') };
  probe.remove();
  return c;
}
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

const chart = LWC.createChart($('chart'), {
  autoSize: true,
  crosshair: { mode: LWC.CrosshairMode.Normal },
  timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 12 },
  localization: { locale: 'tr-TR' }
});
const candle = chart.addCandlestickSeries({ borderVisible: false });
candle.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.22 } });
const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false });
chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
const sma50 = chart.addLineSeries({ color: `rgba(247,166,0,${S.opacity})`, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
const sma200 = chart.addLineSeries({ color: `rgba(142,154,175,${S.opacity})`, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

const alpha = (rgb, a) => rgb.replace('rgb(', 'rgba(').replace(')', `,${a})`);
const toC = b => ({ time: b.t + TZ, open: b.o, high: b.h, low: b.l, close: b.c });
const toV = b => ({ time: b.t + TZ, value: b.v, color: alpha(b.c >= b.o ? C.up : C.down, 0.35) });

const overlay = SV.overlay({
  chart, series: candle, stage: $('stage'), canvas: $('ov'),
  get: () => ({ bars, step: STEP[S.interval], res, S, htf, patSel, idea, fills: S.layers.hist && SV.history ? SV.history.marks(S.symbol) : null })
});

function theme() {
  C = colors();
  chart.applyOptions({
    layout: { background: { type: 'solid', color: C.bg }, textColor: C.muted, fontFamily: '"IBM Plex Sans", system-ui, sans-serif', attributionLogo: false },
    grid: { vertLines: { color: C.line }, horzLines: { color: C.line } },
    rightPriceScale: { borderColor: C.line },
    timeScale: { borderColor: C.line }
  });
  candle.applyOptions({ upColor: C.up, downColor: C.down, wickUpColor: C.up, wickDownColor: C.down });
  if (bars.length) { vol.setData(bars.map(toV)); renderLevels(); }
  overlay.invalidate();
  if (S.view === 'dom') mountTv();
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(theme, 0));
new MutationObserver(() => setTimeout(theme, 0)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const parse = k => ({ t: k[0] / 1000, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] });

async function fetchPage(base, interval, limit, endTime) {
  const r = await fetch(`${base}?symbol=${S.symbol}&interval=${interval}&limit=${limit}${endTime ? `&endTime=${endTime}` : ''}`);
  if (r.status === 400) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error(j.msg || 'Geçersiz parite'), { fatal: true });
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).map(parse);
}

async function fetchHistory(base, interval, depth, onPage) {
  const max = base.includes('fapi') ? 1500 : 1000;
  let out = [], end = 0;
  while (out.length < depth) {
    const lim = Math.min(max, depth - out.length);
    const raw = await fetchPage(base, interval, lim, end);
    const page = out.length ? raw.filter(b => b.t < out[0].t) : raw;
    if (!page.length) break;
    out = page.concat(out);
    if (onPage) onPage(out.length);
    if (raw.length < lim) break;
    end = page[0].t * 1000 - 1;
  }
  return out;
}

async function fetchBars(my) {
  let lastErr;
  for (const base of API[S.market].rest) {
    try {
      return await fetchHistory(base, S.interval, S.depth, k => { if (my === wsToken) showMsg('Yükleniyor', `${S.symbol} · ${k.toLocaleString('tr-TR')} mum geldi`); });
    } catch (e) {
      lastErr = e;
      if (e.fatal) break;
    }
  }
  throw lastErr;
}

let altTried = false, pendingFocus = null;
function idxAt(t) {
  let lo = 0, hi = bars.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (bars[m].t <= t) lo = m; else hi = m - 1; }
  return lo;
}
function showRange(t0, t1) {
  if (!bars.length) return;
  const a = idxAt(t0), b = idxAt(t1), pad = Math.max(30, Math.round((b - a) * 0.6));
  chart.timeScale().setVisibleLogicalRange({ from: a - pad, to: b + pad });
  setAuto(true);
}
function focusTrade(market, symbol, t0, t1) {
  if (symbol === S.symbol) market = S.market;
  if (market === S.market && symbol === S.symbol && bars.length) { if (S.view !== 'chart') setView('chart'); showRange(t0, t1); return; }
  pendingFocus = { key: market + symbol, t0, t1 };
  go(market, symbol);
}
async function load() {
  const my = ++wsToken;
  closeWs(); stopPoll(); wsFails = 0;
  syncUi();
  overlay.load(S.symbol);
  patSel = null;
  if (htfKey !== S.market + S.symbol) { htf = {}; htfRaw = {}; }
  showMsg('Yükleniyor', `${S.symbol} · ${S.market === 'spot' ? 'Spot' : 'Vadeli'} · ${S.interval}`);
  setLive('wait', 'Yükleniyor');
  try {
    const data = await fetchBars(my);
    if (my !== wsToken) return;
    altTried = false;
    if (!data.length) throw Object.assign(new Error('Bu parite için veri yok'), { fatal: true });
    bars = data;
    const prec = SV.prec(bars[bars.length - 1].c);
    candle.applyOptions({ priceFormat: { type: 'price', precision: prec, minMove: 1 / 10 ** prec } });
    candle.setData(bars.map(toC));
    vol.setData(bars.map(toV));
    analyzeNow();
    SV.trades.render(); SV.trades.syncLines(); SV.trades.refreshTickers();
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(-2, bars.length - 200), to: bars.length + (bars.length < 200 ? 3 : 12) });
    setAuto(true);
    if (pendingFocus && pendingFocus.key === S.market + S.symbol) { showRange(pendingFocus.t0, pendingFocus.t1); pendingFocus = null; }
    hideMsg();
    header();
    setLive('wait', 'Canlı akışa bağlanıyor');
    connectWs(my);
    loadHtf();
  } catch (e) {
    if (my !== wsToken) return;
    if (e.fatal && S.market === 'spot' && !altTried) {
      altTried = true;
      const sym = S.symbol;
      S.market = 'futures'; save();
      SV.favs.fix(sym, 'spot', 'futures');
      if (pendingFocus) pendingFocus.key = 'futures' + sym;
      toast(`${sym} spotta yok`, 'Vadeli piyasaya geçildi.');
      load();
      return;
    }
    setLive('err', 'Hata');
    if (e.fatal) showMsg('Parite bulunamadı', `${S.symbol} ${S.market === 'spot' ? 'spot' : 'vadeli'} piyasada yok.${S.market === 'spot' ? ' Altın, gümüş, bakır ve Brent sadece Vadeli\'de var.' : ''} (${e.message})`);
    else showMsg('Binance verisine ulaşılamadı', `İnternet bağlantını kontrol et. Bazı ülkelerde Binance API'si (özellikle vadeli) engelli olabilir. Dosya açılışında sorun olursa klasörde "python -m http.server" çalıştırıp localhost:8000/seviye.html adresinden aç. (${e.message})`);
  }
}

const WSS = { spot: ['wss://stream.binance.com:9443/ws/', 'wss://stream.binance.com:443/ws/', 'wss://data-stream.binance.vision/ws/'], futures: ['wss://fstream.binance.com/ws/'] };
let wsIdx = 0, wsFails = 0, gotMsg = false, firstTimer = null, pollTimer = null, polling = false;

function ingest(b, closed) {
  lastMsg = Date.now();
  const last = bars[bars.length - 1];
  if (last && b.t === last.t) bars[bars.length - 1] = b;
  else if (!last || b.t > last.t) bars.push(b);
  else return;
  candle.update(toC(b));
  vol.update(toV(b));
  header();
  overlay.invalidate();
  if (closed) { if (document.hidden) analyzeNow(); else analyzeSoon(); }
  else { renderLevelTable(); renderPositions(); }
  checkAlerts();
  if (SV.trades) SV.trades.tick();
}

function closeWs() {
  clearTimeout(reTimer); clearTimeout(firstTimer);
  if (!ws) return;
  ws.onclose = ws.onmessage = ws.onerror = ws.onopen = null;
  try { ws.close(); } catch (e) {}
  ws = null;
}

async function poll() {
  const my = wsToken;
  if (!bars.length) return;
  try {
    const page = await fetchPage(API[S.market].rest[0], S.interval, 2, 0);
    if (my !== wsToken || !page.length) return;
    const lastT = bars[bars.length - 1].t;
    page.forEach((b, k) => { if (b.t >= lastT) ingest(b, k < page.length - 1 && b.t === lastT); });
  } catch (e) {}
}
function startPoll() {
  if (polling) return;
  polling = true;
  setLive('on', 'Canlı (yedek: 3 sn)');
  pollTimer = setInterval(poll, 3000);
  poll();
}
function stopPoll() { clearInterval(pollTimer); polling = false; }

function failWs(my) {
  closeWs();
  if (my !== wsToken) return;
  wsFails++; wsIdx++;
  startPoll();
  if (wsFails < WSS[S.market].length) connectWs(my);
  else reTimer = setTimeout(() => { wsFails = 0; connectWs(my); }, 300000);
}

function connectWs(my) {
  if (my !== wsToken) return;
  const list = WSS[S.market];
  gotMsg = false;
  try { ws = new WebSocket(`${list[wsIdx % list.length]}${S.symbol.toLowerCase()}@kline_${S.interval}`); }
  catch (e) { failWs(my); return; }
  firstTimer = setTimeout(() => { if (!gotMsg) failWs(my); }, 12000);
  ws.onopen = () => { if (!polling) setLive('wait', 'Bağlandı, veri bekleniyor'); };
  ws.onmessage = ev => {
    if (!gotMsg) { gotMsg = true; clearTimeout(firstTimer); wsFails = 0; retry = 0; stopPoll(); setLive('on', 'Canlı'); }
    let k;
    try { k = JSON.parse(ev.data).k; } catch (e) { return; }
    if (!k) return;
    ingest({ t: k.t / 1000, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v }, !!k.x);
  };
  ws.onclose = () => {
    if (!gotMsg) { failWs(my); return; }
    setLive('wait', 'Yeniden bağlanıyor'); startPoll(); scheduleReconnect(my);
  };
  ws.onerror = () => {};
}

function scheduleReconnect(my) {
  clearTimeout(reTimer);
  retry++;
  reTimer = setTimeout(() => connectWs(my), Math.min(30000, 1000 * 2 ** retry));
}

async function loadHtf(force) {
  const key = S.market + S.symbol;
  if (!force && htfKey === key && Date.now() - htfAt < 1800000) { computeHtf(); return; }
  htfKey = key; htfAt = Date.now();
  const base = API[S.market].rest[0];
  await Promise.all(HTF.map(async ([k]) => {
    try {
      const data = await fetchHistory(base, k, k === '1d' ? 2000 : 1000);
      if (htfKey === key) htfRaw[k] = data;
    } catch (e) {}
  }));
  if (htfKey === key) computeHtf();
}

function computeHtf() {
  if (!bars.length) return;
  const last = bars[bars.length - 1], now = last.t + STEP[S.interval];
  htf = {};
  const closedH = k => { const H = htfRaw[k]; return H && H.length > 1 && H[H.length - 1].t + STEP[k] > Date.now() / 1000 ? H.slice(0, -1) : H; };
  for (const [k, L, dist] of HTF) if (htfRaw[k]) htf[k] = SV.analysis.htfTrends(closedH(k), L, dist, now, last.c);
  htf.arcs = [];
  for (const [k, L, dist] of [['1M', 2, 0.35], ['1w', 3, 0.25]]) {
    if (htfRaw[k]) for (const a of SV.analysis.arcs(closedH(k), L, dist, now, last.c)) htf.arcs.push({ ...a, tf: k });
  }
  htf.arcs = ['sup', 'res'].map(kind => htf.arcs.filter(a => a.kind === kind).sort((x, y) => Math.abs(x.now - last.c) - Math.abs(y.now - last.c))[0]).filter(Boolean);
  scenHist = res && res.ctx && (htfRaw['1M'] || htfRaw['1w']) ? SV.scen.history(bars, res.ctx, htfPair(), closedCount(), S.interval, S.market + S.symbol) : null;
  if (res && res.ctx && htfRaw['1M'] && htfRaw['1w']) {
    const z = SV.zones.resistanceSells(bars, res.ctx, { '1M': htfRaw['1M'], '1w': htfRaw['1w'] });
    res.signals = res.signals.filter(s => s.type !== 'zsell').concat(z).sort((a, b) => a.i - b.i);
    res.stats = SV.analysis.evaluate(bars, res.ctx, res.signals);
    indexSignals();
    renderSignals();
    renderStats();
  }
  if (res && res.ctx && htfRaw['1d']) {
    const d = closedH('1d'), list = SV.orange.detect(d), step = STEP[S.interval], add = [], seen = new Set(), gap = S.interval === '1M' ? 3 : S.interval === '1w' ? 8 : 0, lastI = { 1: -1e9, '-1': -1e9 };
    for (const o of list) {
      const target = step >= 86400 ? o.t : o.t + 86400 - step;
      let lo = 0, hi = bars.length - 1, i = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (bars[m].t <= target) { i = m; lo = m + 1; } else hi = m - 1; }
      if (i < 0 || target >= bars[i].t + step || seen.has(i + ':' + o.dir) || i - lastI[o.dir] < gap) continue;
      seen.add(i + ':' + o.dir); lastI[o.dir] = i;
      add.push({ i, type: 'orange', dir: o.dir, why: o.why });
    }
    res.signals = res.signals.filter(s => s.type !== 'orange').concat(add).sort((a, b) => a.i - b.i);
    res.stats = { ...res.stats, orange: SV.orange.stats(d, list) };
    indexSignals();
    renderSignals();
    renderStats();
  }
  renderState();
  renderIdea();
  checkSignalAlerts();
  checkAlerts();
  overlay.invalidate();
}

const DIRS = { buy: 1, bull: 1, sell: -1, bear: -1 };
function indexSignals() {
  sigByIndex = new Map();
  for (const s of res.signals) {
    const rg = DIRS[s.type] && SV.scen ? SV.scen.regime(bars[s.i].t) : null;
    s.mk = rg && rg.dir ? (rg.dir === DIRS[s.type] ? 1 : -1) : 0;
    if (!sigByIndex.has(s.i)) sigByIndex.set(s.i, []);
    sigByIndex.get(s.i).push(s);
  }
}

let idea = null, scenHist = null, ideaAt = 0;
const TFN = { '5m': '5d', '15m': '15d', '1h': '1s', '4h': '4s', '1d': '1G', '1w': '1H', '1M': '1A' };
const closedCount = () => { const n = bars.length; return n && Date.now() / 1000 < bars[n - 1].t + STEP[S.interval] ? n - 1 : n; };
const htfPair = () => ({ '1M': htfRaw['1M'], '1w': htfRaw['1w'] });
const pctTxt = x => `%${(x * 100).toFixed(0)}`;
const usdTxt = x => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x))} $`;
let btcM = null, btcAt = 0;
async function loadBtcMonthly() {
  if (btcM && Date.now() - btcAt < 6 * 3600e3) return;
  for (const base of API.spot.rest) {
    try {
      const r = await fetch(`${base}?symbol=BTCUSDT&interval=1M&limit=200`);
      if (!r.ok) continue;
      btcM = (await r.json()).map(parse); btcAt = Date.now();
      SV.scen.setMarket(btcM);
      if (bars.length && res) { scenHist = null; indexSignals(); renderSignals(); computeHtf(); }
      return;
    } catch (e) {}
  }
}
function scenStateTxt(sc, key) {
  const sh = key === 'short';
  if (sc.state === 'triggered') return ['go', `Giriş oluştu · ${sc.ago ? sc.ago + ' mum önce' : 'son kapanan mumda'}, ${SV.fmt(sc.plan.entry)} fiyatından${sc.tier ? ` · ${['', '$50', '$100', '$200'][sc.tier]} kademesi görüldü` : ''}`];
  if (sc.state === 'inzone') return ['in', `Bölgede · mum bölgenin ${sh ? 'altında' : 'üstünde'} kapanırsa giriş oluşur`];
  if (sc.state === 'near') return ['near', `Yaklaşıyor · bölgeye ${sc.distA.toFixed(1).replace('.', ',')} ATR (${SV.pct(sc.distP * 100 * (sh ? 1 : -1))})`];
  if (sc.state === 'broken') return ['off', `Bölge kırıldı · fiyat bölgenin ${sh ? 'üstünde' : 'altında'}, senaryo geçersiz`];
  if (sc.state === 'late') return ['off', 'Ret mumu bölgeden çok uzakta kapattı · giriş için geç'];
  if (sc.state === 'stop') return ['off', `Son kurulum stop oldu (${sc.ago} mum önce)`];
  if (sc.state === 'be') return ['off', `Son kurulum kâr aldı, kalanı başabaşta kapandı (${sc.ago} mum önce)`];
  if (sc.state === 'full') return ['off', `Son kurulum +200 $ oldu (${sc.ago} mum önce)`];
  if (sc.distA == null) return ['wait', 'Bekleniyor'];
  return ['wait', `Bekleniyor · bölgeye ${sc.distA.toFixed(1).replace('.', ',')} ATR (${SV.pct(sc.distP * 100 * (sh ? 1 : -1))})`];
}
function scenCard(sc, key) {
  const sh = key === 'short', title = sh ? 'Short' : 'Long';
  if (!sc || !sc.plan) return `<div class="plan ${key}"><h3>${title}</h3><p class="note">Yakında (±%25) üst zaman dilimi ${sh ? 'direnci' : 'desteği'} yok.</p></div>`;
  const p = sc.plan, st = sc.stats, [stc, stt] = scenStateTxt(sc, key), good = SV.scen.good(sc);
  const h = scenHist && scenHist[key] && scenHist[key][sc.strong ? 'strong' : 'base'];
  const tier = good ? '<span class="tier ok">İyi kurulum</span>' : sc.strong ? `<span class="tier mid">Güçlü · ${sc.aligned ? (sc.stats.n < 60 ? 'az örnek' : 'doğrulamada zayıf') : 'piyasaya ters'}</span>` : '<span class="tier">Zayıf</span>';
  const tierName = ['', '+50 $', '+100 $', '+200 $'];
  const doneTxt = sc.done && sc.done.state === 'late' ? `<p class="note">Son ret mumu bölgeden çok uzakta kapattı; giriş için geç.</p>`
    : sc.done ? `<p class="note">Son kurulum: ${sc.done.state === 'full' ? '+200 $ oldu' : sc.done.state === 'be' ? `${tierName[sc.done.tier]} görüldü, kalanı başabaşta kapandı` : 'stop oldu'} (${sc.done.ago} mum önce).</p>` : '';
  const ck = { 0: 'Trend çizgisi' };
  const checks = sc.checks.map((c, k) => `<li class="${c.ok ? 'ok' : 'no'}" title="${c.text}">${c.ok ? '✓' : '✗'} ${c.market ? 'Piyasa yönünde' : ck[k]}</li>`).join('');
  const row = (lbl, px, pr, cls = '') => `<tr class="${cls}"><th>${lbl}</th><td class="num">${SV.fmt(px)}</td><td class="num">${pr == null ? '' : pctTxt(pr)}</td></tr>`;
  const split = st.tr != null ? ` Coin bölmesi: BTC/ETH/BNB ${pctTxt(st.tr)}, SOL/XRP ${pctTxt(st.te)}.` : '';
  const here = h && h.n ? ` Bu grafiğin geçmişinde aynı tür ${h.n} işlem: +50 $ ${pctTxt((h.n - h.t[0]) / h.n)}, ortalama ${usdTxt(h.usd / h.n)}.` : '';
  return `<div class="plan ${key}${sc.state === 'triggered' && good ? ' good' : ''}">
    <h3>${title} ${tier}</h3>
    <p class="st ${stc}">${stt}</p>${doneTxt}
    <p class="zn"><span class="num">${SV.fmt(sc.zone.lo)}${sc.zone.hi > sc.zone.lo ? '–' + SV.fmt(sc.zone.hi) : ''}</span> · ${sc.zone.names.join(' + ')}</p>
    <ul class="ck">${checks}</ul>${sc.strong && !sc.aligned ? `<p class="note down">Trend teması piyasa yönüne ters: geçmişte çoğunlukla kırıldı (+50 $ ${pctTxt(st.p50)}).</p>` : ''}
    <table class="lvt"><thead><tr><th></th><th>Fiyat</th><th>Olasılık</th></tr></thead><tbody>
      ${row(sc.state === 'triggered' ? 'Giriş' : 'Giriş ~', p.entry, null)}
      ${row('Stop −50 $', p.stop, null, 'down')}
      ${row('+50 $', p.lv[0], st.p50, 'up')}
      ${row('+100 $', p.lv[1], st.p100, 'up')}
      ${row('+200 $', p.lv[2], st.p200, 'up')}
    </tbody></table>
    <p class="meta">30 günde ort. ${usdTxt(st.usd)} / işlem · ${st.n.toLocaleString('tr-TR')} örnek${st.n < 60 ? ' · <b>az örnek</b>' : ''}${sc.tested ? '' : ` · <b>${TFN[S.interval]} test edilmedi</b>`}</p>
    <details class="how" data-k="${key}"><summary>Nasıl hesaplandı?</summary>
      <p>${sh ? 'Fiyat dirence gelip iğne bırakır ve bölgenin altında kapatırsa o mumun kapanışından short.' : 'Fiyat desteğe inip iğne bırakır ve bölgenin üstünde kapatırsa o mumun kapanışından long.'} Stop %5 (−50 $). +50 $'da üçte biri kapatılır ve stop girişe çekilir, +100 $'da üçte biri, +200 $'da kalanı. Bölgeden 1 ATR'dan ya da %4'ten uzak kapanan mumlar giriş sayılmaz.</p>
      <p>Backtest: BTC, ETH, BNB, SOL, XRP · 1s/4s/1G · 30 gün. Olasılık, o kademeye stoptan önce ulaşma oranı; rastgele girişte +%5'in −%5'ten önce gelme oranı ≈ %50. Bu grup: ${sc.strong ? 'güçlü' : 'zayıf'}, piyasa ${sc.aligned ? 'yönünde' : 'yönüne ters'}. Haftalık (7 gün) +50 $ oranı ${pctTxt(st.w7)}.${split}${here}${sc.tested ? '' : ' Bu kural sadece 1s, 4s ve 1G grafiklerde test edildi; bu zaman diliminde oranlar geçerli değil ve bildirim gönderilmez.'}</p>
    </details>
    <button class="btn sm" data-plan="${key}">Grafiğe çiz</button></div>`;
}
function marketBox() {
  const t = bars.length ? bars[bars.length - 1].t : Date.now() / 1000, rg = SV.scen.regime(t), M = SV.scen.STATS.market;
  if (!rg) return '<p class="note">Piyasa yönü: BTC aylık verisi yükleniyor…</p>';
  const bull = rg.dir > 0;
  const why = `BTC aylık ${rg.side > 0 ? 'ortalamanın üstünde' : 'ortalamanın altında'}, ortalama ${rg.slope > 0 ? 'yükseliyor' : 'düşüyor'}${rg.side !== rg.dir ? ` (${bull ? 'düzeltme' : 'tepki'} olabilir)` : ''}`;
  const warn = rg.next && rg.next.dir !== rg.dir ? `<span class="warn">Ay böyle kapanırsa ${bull ? 'ayıya' : 'boğaya'} döner.</span>` : '';
  return `<div class="mkt ${bull ? 'bull' : 'bear'}"><b>Piyasa: ${bull ? 'Boğa' : 'Ayı'} <small>· ${rg.since} aydır</small></b><span>${why}</span>${warn}
    <details class="how" data-k="mkt"><summary>Nasıl belirleniyor?</summary><p>BTC aylık kapanışı 10 aylık ortalamanın üstünde ve ortalama 2 ayda yükselmişse boğa, altında ve düşmüşse ayı; çelişirse önceki yön korunur. Sadece ay kapanışında değişir. Backtest (5 coin, 2018–2026): 90 günde o yönde %20'lik hareketin ters yöndekinden önce gelme oranı ${pctTxt(M.early.with)} / ${pctTxt(M.late.with)} (2018–22 / 2023–26), ters yön ${pctTxt(M.early.against)} / ${pctTxt(M.late.against)}. 8 yılda ${M.flips} kez yön değiştirdi.</p></details></div>`;
}
function renderIdea() {
  try { renderIdeaInner(); } catch (e) { $('idea').innerHTML = '<p class="empty">Senaryo hesaplanamadı.</p>'; idea = null; console.error(e); }
}
function renderIdeaInner() {
  const box = $('idea');
  if (!bars.length || !res) { box.innerHTML = '<p class="empty">Hesaplanıyor…</p>'; idea = null; return; }
  if (!res.ctx) { box.innerHTML = `${marketBox()}<p class="empty">Bu grafikte ${bars.length} mum var; senaryo için en az 60 mum gerekiyor. Daha kısa bir zaman dilimine geç.</p>`; idea = null; return; }
  if (!htfRaw['1M'] && !htfRaw['1w']) { box.innerHTML = '<p class="empty">Üst zaman dilimi verisi yükleniyor…</p>'; idea = null; return; }
  const n = bars.length, price = bars[n - 1].c;
  const L = SV.scen.live(bars, res.ctx, htfPair(), closedCount(), S.market + S.symbol, S.interval);
  if (!L) { box.innerHTML = '<p class="empty">Senaryo için yeterli geçmiş yok.</p>'; idea = null; return; }
  const a = L.atr;
  const mark = (c, sc, name) => c ? { ...c, label: name + (sc && sc.strong && sc.zone.lo === c.lo ? ' · güçlü' : '') } : null;
  idea = { res: mark(L.R1, L.short, 'Direnç bölgesi'), sup: mark(L.S1, L.long, 'Destek bölgesi'), atr: a, live: L, plans: {} };
  for (const k of ['short', 'long']) if (L[k] && L[k].plan) idea.plans[k] = { type: k, entry: L[k].plan.entry, stop: L[k].plan.stop, target: L[k].plan.lv[1] };
  const st = res.state || {}, since = t => { for (let k = res.signals.length - 1; k >= 0; k--) if (res.signals[k].type === t) return n - 1 - res.signals[k].i; return Infinity; };
  let score = 0; const why = [];
  if (st.main) { score += st.main === 'up' ? 1 : -1; why.push(`ana trend ${st.main === 'up' ? 'yukarı' : 'aşağı'}`); }
  if (st.short) { score += st.short === 'up' ? 0.5 : -0.5; }
  if (since('ltb') <= 150) { score -= 1; why.push('yakın zamanda P (uzun vadeli düşüş) uyarısı'); }
  if (since('bear') <= 20) { score -= 1; why.push('son 20 mumda mor çizgi'); }
  if (since('bull') <= 20) { score += 1; why.push('son 20 mumda yeşil çizgi'); }
  if (since('zsell') <= 10 || since('sell') <= 10) { score -= 1; why.push('son 10 mumda Sell/Direnç sinyali'); }
  if (since('buy') <= 10) { score += 1; why.push('son 10 mumda Buy sinyali'); }
  const bias = score >= 1.5 ? ['up', 'Yukarı eğilimli'] : score <= -1.5 ? ['down', 'Aşağı eğilimli'] : ['', 'Kararsız'];
  const band = c => `<span class="num">${SV.fmt(c.lo)}${c.hi > c.lo ? ' – ' + SV.fmt(c.hi) : ''}</span> <span class="num ${c.mid >= price ? 'up' : 'down'}">(${SV.pct((c.mid - price) / price * 100)})</span>`;
  ideaAt = Date.now();
  const openD = new Set([...box.querySelectorAll('details[open]')].map(d => d.dataset.k));
  box.innerHTML = `
    ${marketBox()}
    <p class="bias ${bias[0]}" title="${why.join(', ')}">Bu grafikte kısa vade: <b>${bias[1]}</b></p>
    ${orangeLine()}
    ${scenCard(L.short, 'short')}
    ${scenCard(L.long, 'long')}
    <p class="note">Yatırım tavsiyesi değildir · ${new Date(ideaAt).toLocaleTimeString('tr-TR')}</p>`;
  for (const d of box.querySelectorAll('details[data-k]')) if (openD.has(d.dataset.k)) d.open = true;
}
const notified = {};
let sigSeen = { key: '', i: Infinity };
function toast(title, body) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<b></b><span></span>`;
  el.firstChild.textContent = title; el.lastChild.textContent = body;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 9000);
  setTimeout(() => el.remove(), 9600);
}
function notify(title, body, key, coolMs = 3 * 3600e3) {
  if (!S.notify) return;
  const t = Date.now();
  if (notified[key] && t - notified[key] < coolMs) return;
  notified[key] = t;
  toast(title, body);
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, tag: key }); } catch (e) {}
}
function checkAlerts() {
  if (!S.notify || !idea || !idea.live || !bars.length) return;
  const L = idea.live, tf = TFN[S.interval];
  for (const key of ['short', 'long']) {
    const sc = L[key];
    if (!sc || !sc.plan) continue;
    const sh = key === 'short', p = sc.plan, st = sc.stats;
    if (sc.state === 'triggered' && SV.scen.good(sc)) {
      notify(`${S.symbol} ${tf}: iyi ${sh ? 'short' : 'long'} girişi`, `Giriş ${SV.fmt(p.entry)} · stop ${SV.fmt(p.stop)} (−50 $) · +50 $ ${SV.fmt(p.lv[0])} · +100 $ ${SV.fmt(p.lv[1])} · +200 $ ${SV.fmt(p.lv[2])}. Geçmişte +50 $ oranı %${Math.round(st.p50 * 100)}, piyasa yönünde.`, `e${S.symbol}${S.interval}${key}${bars[sc.i].t}`, 864e5);
    } else if (sc.state === 'near' || sc.state === 'inzone') {
      const edge = sh ? sc.zone.lo : sc.zone.hi;
      notify(`${S.symbol} ${tf}: ${sh ? 'dirence' : 'desteğe'} yaklaştı`, `Fiyat ${SV.fmt(L.price)}, bölge ${SV.fmt(edge)} (${sc.zone.names.join(' + ')}). ${SV.scen.good(sc) ? `İyi kurulum, geçmişte +50 $ oranı %${Math.round(st.p50 * 100)}.` : sc.strong ? 'Güçlü kurulum ama piyasa yönüne ters ya da örnek az.' : 'Zayıf kurulum.'} ${sh ? 'Bölgenin altında' : 'Bölgenin üstünde'} kapanış gelirse giriş oluşur.`, `z${S.symbol}${S.interval}${key}${Math.round(edge)}`);
    }
  }
}
function checkSignalAlerts() {
  if (!res || !bars.length) return;
  const key = S.symbol + S.interval, n = bars.length;
  if (sigSeen.key !== key) { sigSeen = { key, i: n - 1 }; return; }
  for (const s of res.signals) {
    if (s.i <= sigSeen.i || !SIG_NAME[s.type] || s.type === 'rev' && !S.layers.rev) continue;
    notify(`${S.symbol} ${S.interval}: ${SIG_NAME[s.type]} sinyali`, `${SV.fmt(bars[s.i].c)} · ${s.why.slice(0, 3).join(', ')}`, `g${key}${s.type}${bars[s.i].t}`, 864e5);
  }
  sigSeen.i = Math.max(sigSeen.i, n - 2);
}
function renderNotifyBtn() {
  $('notifyBtn').textContent = S.notify ? 'Bildirimler açık' : 'Bildirimleri aç';
  $('notifyBtn').setAttribute('aria-pressed', !!S.notify);
}
$('notifyBtn').addEventListener('click', async () => {
  S.notify = !S.notify; save(); renderNotifyBtn();
  if (!S.notify) return;
  let perm = 'denied';
  try { perm = 'Notification' in window ? (Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission) : 'denied'; } catch (e) {}
  toast('Bildirimler açık', perm === 'granted' ? 'Bölgelere yaklaşınca, iyi giriş oluşunca (açık grafik ve favoriler) ve yeni sinyal gelince haber vereceğim. Sayfa açık kalmalı.' : 'Tarayıcı bildirim izni yok; uyarılar sadece bu sayfada görünecek. baslat.bat ile açınca izin verilebilir.');
  checkAlerts();
});

$('idea').addEventListener('click', e => {
  const og = e.target.closest('[data-oi]');
  if (og) { const i = +og.dataset.oi; chart.timeScale().setVisibleLogicalRange({ from: i - 120, to: i + 60 }); return; }
  const b = e.target.closest('[data-plan]');
  if (!b || !idea || !idea.plans) return;
  const p = idea.plans[b.dataset.plan], last = bars[bars.length - 1];
  if (!p) return;
  overlay.add({ type: p.type, a: { t: last.t, p: p.entry }, t2: last.t + 30 * STEP[S.interval], stop: p.stop, target: p.target });
});

function analyzeNow() {
  res = SV.analysis.compute(bars, S);
  indexSignals();
  renderSma();
  renderLevels();
  renderState();
  renderSignals();
  renderStats();
  renderPatterns();
  renderPositions();
  computeHtf();
  overlay.invalidate();
}
function analyzeSoon() { clearTimeout(anTimer); anTimer = setTimeout(analyzeNow, 120); }

function renderSma() {
  const on = S.layers.sma && res && res.ctx;
  sma50.applyOptions({ visible: !!on });
  sma200.applyOptions({ visible: !!on });
  if (!res || !res.ctx) { sma50.setData([]); sma200.setData([]); return; }
  const line = arr => bars.map((b, i) => arr[i] == null ? { time: b.t + TZ } : { time: b.t + TZ, value: arr[i] });
  sma50.setData(line(res.ctx.s50));
  sma200.setData(line(res.ctx.s200));
}

function renderLevels() {
  priceLines.forEach(pl => candle.removePriceLine(pl));
  priceLines = [];
  if (res && S.layers.levels) {
    const last = bars[bars.length - 1].c;
    priceLines = res.levels.map(l => {
      const r = l.price >= last;
      return candle.createPriceLine({
        price: l.price,
        color: alpha(r ? C.down : C.up, (l.touches >= 4 ? 0.95 : 0.7) * S.opacity),
        lineWidth: 1,
        lineStyle: l.touches >= 3 ? LWC.LineStyle.Solid : LWC.LineStyle.Dashed,
        axisLabelVisible: true,
        title: ''
      });
    });
  }
  renderLevelTable();
}

function renderLevelTable() {
  if (!res || !bars.length) return;
  const last = bars[bars.length - 1].c;
  $('lvl').innerHTML = res.levels.length ? res.levels.map(l => {
    const dist = (l.price - last) / last * 100, r = l.price >= last;
    return `<tr><td><span class="tag ${r ? 'r' : 's'}">${r ? 'Direnç' : 'Destek'}</span></td><td class="num">${SV.fmt(l.price)}</td><td class="num">${l.touches}</td><td class="num ${dist >= 0 ? 'up' : 'down'}">${SV.pct(dist)}</td></tr>`;
  }).join('') : '<tr><td colspan="4" class="empty">Yeterli pivot yok. Pivot genişliğini düşürmeyi dene.</td></tr>';
}

const word = d => d === 'up' ? '<span class="up">Yükseliş</span>' : d === 'down' ? '<span class="down">Düşüş</span>' : '—';
function orangeLine() {
  const o = res && res.signals ? res.signals.filter(x => x.type === 'orange').pop() : null;
  if (!o) return '<p class="oline">Son turuncu: bu grafikte yok</p>';
  const t = bars[o.i].t, ago = Math.max(0, Math.round((Date.now() / 1000 - t) / 86400));
  return `<p class="oline">Son turuncu: <button class="ogo" data-oi="${o.i}"><span class="tag orange">${o.dir > 0 ? '↑ Dip' : '↓ Tepe'}</span> ${new Date(t * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })} · ${ago ? ago + ' gün önce' : 'bugün'}</button></p>`;
}
function renderState() {
  const st = res && res.state;
  if (!st) { $('state').innerHTML = '<p class="empty">Analiz için en az 60 mum gerekiyor.</p>'; return; }
  const last = bars[bars.length - 1].c;
  const rows = [
    ['Ana trend (SMA50/200)', word(st.main)],
    ['Kısa vade (fiyat/SMA50)', word(st.short)],
    ['SMA50 eğimi (10 mum)', st.slope == null ? '—' : `<span class="num ${st.slope >= 0 ? 'up' : 'down'}">${SV.pct(st.slope)}</span>`],
    ['RSI 14', st.rsi == null ? '—' : `<span class="num">${st.rsi.toFixed(1).replace('.', ',')}</span>`]
  ];
  const TFN = { '1M': 'Aylık', '1w': 'Haftalık', '1d': 'Günlük' };
  let any = false;
  for (const [k] of HTF) {
    for (const t of htf[k] || []) {
      any = true;
      const d = (t.now - last) / last * 100;
      rows.push([`${TFN[k]} ${t.dir < 0 ? 'düşen' : 'yükselen'} trend`, `<span class="num">${SV.fmt(t.now)}</span> <span class="num ${d >= 0 ? 'up' : 'down'}">${SV.pct(d)}</span>`]);
    }
  }
  if (!any) rows.push(['Trend çizgileri', Object.keys(htfRaw).length ? 'Fiyata yakın aktif çizgi yok' : 'Yükleniyor']);
  for (const a of htf.arcs || []) {
    const d = (a.now - last) / last * 100;
    rows.push([`${a.tf === '1M' ? 'Aylık' : 'Haftalık'} parabolik ${a.kind === 'sup' ? 'destek' : 'direnç'}${a.broken ? ' · <span class="' + (a.kind === 'sup' ? 'down' : 'up') + '">kırıldı</span>' : ''}`, `<span class="num">${SV.fmt(a.now)}</span> <span class="num ${d >= 0 ? 'up' : 'down'}">${SV.pct(d)}</span>`]);
  }
  if (!(htf.arcs || []).length) rows.push(['Parabolik yay', Object.keys(htfRaw).length ? 'Fiyata yakın yay yok' : 'Yükleniyor']);
  $('state').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

const SIG_NAME = { buy: 'Buy', sell: 'Sell', zsell: 'Direnç', bull: 'Yeşil', bear: 'Mor', rev: 'Sarı', react: 'Tepki', ltb: 'P', orange: 'Turuncu' };
const dtf = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const sigOn = s => (s.type === 'buy' || s.type === 'sell') ? S.layers.bs : s.type === 'rev' ? S.layers.rev : s.type === 'react' ? S.layers.react : s.type === 'ltb' ? S.layers.ltb : s.type === 'zsell' ? S.layers.zone : s.type === 'orange' ? S.layers.orange : S.layers.big;
function renderSignals() {
  const list = res ? res.signals.filter(sigOn).slice(-25).reverse() : [];
  $('sigs').innerHTML = list.length ? list.map(s => `<li><button data-i="${s.i}"><span class="tag ${s.type}">${SIG_NAME[s.type]}</span><span class="num">${SV.fmt(bars[s.i].c)}</span><time>${dtf.format(bars[s.i].t * 1000)}</time><span class="why">${s.why.join(' · ')}${s.mk < 0 ? ' · piyasa yönüne ters' : ''}</span></button></li>`).join('')
    : '<li class="empty">Bu aralıkta sinyal yok.</li>';
}
$('sigs').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]');
  if (!b) return;
  const i = +b.dataset.i;
  chart.timeScale().setVisibleLogicalRange({ from: i - 80, to: i + 80 });
});

const STAT_ROWS = [
  ['buy', 'Buy', 'Stop sinyal dibinin 0,2 ATR altında, hedef 1,5 × risk, en fazla 40 mum'],
  ['sell', 'Sell', 'Stop sinyal tepesinin 0,2 ATR üstünde, hedef 1,5 × risk, en fazla 40 mum'],
  ['zsell', 'Direnç', 'Üst zaman dilimi direncinden red. Stop red mumunun tepesinin 0,2 ATR üstünde, hedef 1,5 × risk, en fazla 40 mum'],
  ['ltb', 'P', '100 mum sonra fiyat daha aşağıda mı (sadece 4s ve üstü)'],
  ['bear', 'Mor', '40 mumda 4 ATR düşüş, önce 2 ATR yükseliş gelmeden'],
  ['bull', 'Yeşil', '40 mumda 4 ATR yükseliş, önce 2 ATR düşüş gelmeden'],
  ['react', 'Tepki', 'Aday işaret: 6 mumda 1 ATR, önce 0,7 ATR ters gelmeden'],
  ['orange', 'Turuncu', 'Günlük mumdan. Başarı: 90 gün içinde sinyal yönünde en az %30 hareket. Ortalama: 90 günlük getiri (sinyal yönünde). Fark: rastgele günlere göre']
];
function renderStats() {
  const st = (res && res.stats) || {};
  const num = (x, d = 2) => x.toFixed(d).replace('.', ',');
  $('stats').innerHTML = STAT_ROWS.map(([k, name, rule]) => {
    const o = st[k];
    if (!o || !o.n) return `<tr title="${rule}"><td><span class="tag ${k}">${name}</span></td><td class="num">0</td><td class="num">—</td><td class="num">—</td><td class="num">—</td></tr>`;
    const rate = o.win / o.n * 100, avg = o.r / o.n, edge = (o.r - o.base) / o.n, pct = o.unit === '%' || o.unit === 'g';
    const avgTxt = o.unit === 'g' ? `${avg >= 0 ? '+' : '−'}%${num(Math.abs(avg), 1)}` : pct ? `${avg >= 0 ? '−' : '+'}%${num(Math.abs(avg), 1)}` : `${avg >= 0 ? '+' : ''}${num(avg)}R`;
    const edgeTxt = pct ? `${edge >= 0 ? '+' : ''}${num(edge, 1)} puan` : `${edge >= 0 ? '+' : ''}${num(edge)}R`;
    return `<tr title="${rule}"><td><span class="tag ${k}">${name}</span></td><td class="num">${o.n}</td><td class="num ${rate >= 50 ? 'up' : ''}">%${rate.toFixed(0)}</td><td class="num">${avgTxt}</td><td class="num ${edge > 0 ? 'up' : 'down'}">${edgeTxt}</td></tr>`;
  }).join('');
}

function renderLayers() {
  const box = $('layersBox');
  box.classList.toggle('closed', !S.layersOpen);
  const anyOn = LAYERS.some(([k]) => S.layers[k]);
  box.innerHTML = `<div class="lhrow"><button class="lhead" data-x="toggle">${S.layersOpen ? '▾' : '▸'} Katmanlar</button><button class="lall" data-x="all" aria-pressed="${anyOn}" title="${anyOn ? 'Tümünü gizle' : 'Tümünü göster'}" aria-label="${anyOn ? 'Tüm katmanları gizle' : 'Tüm katmanları göster'}"><span class="eye">${anyOn ? EYE_ON : EYE_OFF}</span></button></div>` + (S.layersOpen ? LAYERS.map(([k, name, sw]) =>
    `<button class="lrow${S.layers[k] ? '' : ' off'}" data-l="${k}" aria-pressed="${!!S.layers[k]}" title="${S.layers[k] ? 'Gizle' : 'Göster'}"><span class="eye">${S.layers[k] ? EYE_ON : EYE_OFF}</span><i class="sw ${sw}"></i>${name}</button>`).join('')
    + `<label class="lop">Saydamlık <input type="range" id="opacity" min="0.15" max="1" step="0.05" value="${S.opacity}" aria-label="Otomatik çizimlerin görünürlüğü"></label>`
    + `<label class="lop">Hacim boyu <input type="range" id="volH" min="0.04" max="0.35" step="0.01" value="${S.volH}" aria-label="Hacim göstergesinin yüksekliği"></label>` : '');
}
function applyVol() {
  vol.applyOptions({ visible: !!S.layers.vol });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: 1 - S.volH, bottom: 0 } });
  candle.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: S.layers.vol ? S.volH + 0.04 : 0.05 } });
  overlay.invalidate();
}
function setAuto(on) {
  candle.priceScale().applyOptions({ autoScale: on });
  $('autoBtn').setAttribute('aria-pressed', on);
}
$('autoBtn').addEventListener('click', () => setAuto(!candle.priceScale().options().autoScale));
setInterval(() => $('autoBtn').setAttribute('aria-pressed', !!candle.priceScale().options().autoScale), 800);
$('layersBox').addEventListener('input', e => {
  if (e.target.id === 'volH') { S.volH = +e.target.value; save(); applyVol(); return; }
  if (e.target.id !== 'opacity') return;
  S.opacity = +e.target.value; save();
  renderLevels();
  sma50.applyOptions({ color: `rgba(247,166,0,${S.opacity})` });
  sma200.applyOptions({ color: `rgba(142,154,175,${S.opacity})` });
  overlay.invalidate();
});
$('layersBox').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.x === 'toggle') { S.layersOpen = !S.layersOpen; save(); renderLayers(); return; }
  const k = b.dataset.l;
  if (b.dataset.x === 'all') {
    if (LAYERS.some(([q]) => S.layers[q])) { S.layersPrev = { ...S.layers }; for (const [q] of LAYERS) S.layers[q] = false; }
    else S.layers = { ...DEF.layers, ...(S.layersPrev || DEF.layers) };
    save();
  } else { S.layers[k] = !S.layers[k]; save(); }
  const all = b.dataset.x === 'all';
  if (all || k === 'levels') renderLevels();
  if (all || k === 'sma') renderSma();
  if (all || k === 'pos') SV.trades.syncLines();
  if (all || k === 'vol') applyVol();
  renderSignals();
  renderLayers();
  overlay.invalidate();
});
for (const ev of ['mousedown', 'touchstart', 'pointerdown', 'wheel']) $('layersBox').addEventListener(ev, e => e.stopPropagation());

const DNAME = { trend: 'Trend çizgisi', hline: 'Yatay çizgi', fib: 'Fibonacci', long: 'Long', short: 'Short' };
function renderDrawings() {
  const list = overlay.list();
  $('draws').innerHTML = list.length ? list.map(d => {
    const v = d.type === 'hline' ? SV.fmt(d.p) : d.type === 'long' || d.type === 'short' ? SV.fmt(d.a.p) : `${SV.fmt(d.a.p)} → ${SV.fmt(d.b.p)}`;
    return `<li class="${d.hidden ? 'off' : ''}${overlay.selected() === d.id ? ' sel' : ''}"><button class="eye" data-eye="${d.id}" title="${d.hidden ? 'Göster' : 'Gizle'}">${d.hidden ? EYE_OFF : EYE_ON}</button><button class="dname" data-sel="${d.id}">${DNAME[d.type]} <span class="num">${v}</span></button><button class="del" data-del="${d.id}" title="Sil">✕</button></li>`;
  }).join('') : '<li class="empty">Henüz çizim yok. Soldaki araçlarla çizebilirsin.</li>';
}
$('draws').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.eye) overlay.toggle(b.dataset.eye);
  else if (b.dataset.del) overlay.remove(b.dataset.del);
  else if (b.dataset.sel) overlay.select(b.dataset.sel);
});

const PST = { forming: 'Oluşuyor', confirmed: 'Kırıldı', target: 'Hedefe ulaştı ✓', failed: 'Başarısız ✗', expired: 'Süresi doldu' };
function renderPatterns() {
  const all = res ? res.patterns.map((p, i) => ({ p, i })) : [];
  const act = all.filter(x => x.p.active).reverse(), old = all.filter(x => !x.p.active).slice(-12).reverse();
  const row = ({ p, i }) => {
    const o = p.outlook, live = p.status === 'forming' || p.status === 'confirmed';
    const lc = bars[bars.length - 1].c, tg = x => `${SV.fmt(x)} (${SV.pct((x - lc) / lc * 100)})`;
    const out = o && live && p.brk == null && o.pDir < 0.6 ? `<span class="why"><b>Yön belirsiz</b> · aşağı %${Math.round((o.dir < 0 ? o.pDir : 1 - o.pDir) * 100)} / yukarı %${Math.round((o.dir > 0 ? o.pDir : 1 - o.pDir) * 100)} (geçmişte ${o.n} örnek)</span>`
      : o && live ? `<span class="why"><b class="${o.dir > 0 ? 'up' : 'down'}">${o.dir > 0 ? '↑' : '↓'} Hedef ${tg(o.target)} · olasılık %${Math.round(o.prob * 100)}</b>${o.weak ? ' (zayıf örnek)' : ''}<br>${o.text}</span>` : p.target != null ? `<span class="why">Hedef ${tg(p.target)}</span>` : '';
    return `<li><button data-p="${i}"${patSel === i ? ' aria-current="true"' : ''}><span class="tag ${p.bull === true ? 'buy' : p.bull === false ? 'sell' : 'neu'}">${p.name}</span><span class="st ${p.active ? 'act' : ''}">${p.active ? 'Aktif · ' : ''}${PST[p.status]}</span><time>${dtf.format(bars[p.last].t * 1000)}</time>${out}</button></li>`;
  };
  $('pats').innerHTML = (act.length ? act.map(row).join('') : '<li class="empty">Şu an aktif formasyon yok.</li>') + old.map(row).join('');
}
$('pats').addEventListener('click', e => {
  const b = e.target.closest('button[data-p]');
  if (!b) return;
  const i = +b.dataset.p, p = res.patterns[i];
  patSel = patSel === i && !p.active ? null : i;
  if (!S.layers.pat) { S.layers.pat = true; save(); syncUi(); }
  chart.timeScale().setVisibleLogicalRange({ from: p.start - 30, to: Math.max(p.end ?? p.last, p.last) + 40 });
  renderPatterns();
  overlay.invalidate();
});

function renderPositions() {
  const list = overlay.list().filter(d => d.type === 'long' || d.type === 'short');
  if (!list.length) { $('pos').innerHTML = '<li class="empty">Soldaki long/short aracıyla grafiğe tıklayarak pozisyon ekle.</li>'; return; }
  $('pos').innerHTML = list.map(d => {
    const st = overlay.stats(d), o = st.outcome;
    const res = o.k === 'target' ? '<span class="up">Hedef ✓</span>' : o.k === 'stop' ? '<span class="down">Stop ✗</span>'
      : o.k === 'wait' ? 'Bekliyor' : `<span class="${o.pnl >= 0 ? 'up' : 'down'}">${o.k === 'open' ? 'Açık' : 'Süre doldu'} ${SV.pct(o.pnl)}</span>`;
    const qty = st.qty >= 100 ? st.qty.toFixed(0) : st.qty >= 1 ? st.qty.toFixed(2) : st.qty.toPrecision(3);
    return `<li data-id="${d.id}"><span><span class="tag ${d.type === 'long' ? 'buy' : 'sell'}">${d.type === 'long' ? 'Long' : 'Short'}</span> <span class="num">${SV.fmt(d.a.p)}</span></span><span>${res}</span><small>Hedef ${SV.fmt(d.target)} · Stop ${SV.fmt(d.stop)} · R:R ${st.rr.toFixed(2).replace('.', ',')} · Miktar ${qty} (${Math.round(st.value).toLocaleString('tr-TR')} USDT)</small></li>`;
  }).join('');
}
$('pos').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  const d = overlay.list().find(x => x.id === li.dataset.id);
  if (!d) return;
  overlay.select(d.id);
  let lo = 0;
  while (lo < bars.length - 1 && bars[lo].t < d.a.t) lo++;
  chart.timeScale().setVisibleLogicalRange({ from: lo - 60, to: lo + 80 });
});

function header() {
  if (!bars.length) return;
  const last = bars[bars.length - 1];
  const ref = bars.find(b => b.t >= last.t - 86400) || bars[0];
  const ch = (last.c - ref.o) / ref.o * 100;
  $('px').textContent = SV.fmt(last.c);
  $('chg').textContent = `${SV.pct(ch)} 24s`;
  $('chg').className = 'chg num ' + (ch >= 0 ? 'up' : 'down');
  document.title = `${SV.fmt(last.c)} · ${S.symbol}`;
}

chart.subscribeCrosshairMove(p => {
  const d = p.time && p.seriesData.get(candle);
  if (!d) { $('legend').innerHTML = ''; return; }
  const v = p.seriesData.get(vol);
  const parts = [['A', d.open], ['Y', d.high], ['D', d.low], ['K', d.close]].map(([k, x]) => `<span>${k} <b class="num">${SV.fmt(x)}</b></span>`);
  if (v) parts.push(`<span>Hacim <b class="num">${v.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</b></span>`);
  const sigs = (sigByIndex.get(Math.round(p.logical)) || []).filter(sigOn);
  for (const s of sigs) parts.push(`<span class="why"><span class="tag ${s.type}">${SIG_NAME[s.type]}</span> ${s.why.join(' · ')}</span>`);
  $('legend').innerHTML = parts.join('');
});

const HINTS = {
  trend: 'Trend çizgisi: başlangıç noktasına tıkla, sonra bitiş noktasına tıkla',
  fib: 'Fibonacci: önce 1 seviyesine (dip/tepe), sonra 0 seviyesine tıkla',
  hline: 'Yatay çizgi: istediğin fiyata tıkla',
  long: 'Long: giriş fiyatına tıkla; hedef, stop ve süreyi sürükleyerek ayarla',
  short: 'Short: giriş fiyatına tıkla; hedef, stop ve süreyi sürükleyerek ayarla'
};
overlay.onTool(t => {
  for (const b of $('tools').querySelectorAll('[data-t]')) b.setAttribute('aria-pressed', b.dataset.t === t);
  $('hint').textContent = HINTS[t] || '';
  $('hint').classList.toggle('show', !!HINTS[t]);
});
overlay.onChange(() => {
  $('delSel').disabled = !overlay.selected();
  renderPositions();
  renderDrawings();
});
$('tools').addEventListener('click', e => {
  const b = e.target.closest('[data-t]');
  if (b) overlay.setTool(overlay.tool() === b.dataset.t && b.dataset.t !== 'cursor' ? 'cursor' : b.dataset.t);
});
$('delSel').addEventListener('click', () => overlay.removeSelected());
let clearTimer = null;
$('clearAll').addEventListener('click', () => {
  const b = $('clearAll');
  if (!overlay.count()) return;
  if (b.classList.contains('armed')) { overlay.clearAll(); b.classList.remove('armed'); b.title = 'Tüm çizimleri sil'; return; }
  b.classList.add('armed'); b.title = 'Silmek için tekrar tıkla';
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => { b.classList.remove('armed'); b.title = 'Tüm çizimleri sil'; }, 3000);
});
document.addEventListener('keydown', e => {
  if (!e.altKey || e.target.closest('input, textarea, select')) return;
  const t = { t: 'trend', h: 'hline', f: 'fib', l: 'long', s: 'short' }[e.key.toLowerCase()];
  if (t) { e.preventDefault(); overlay.setTool(t); }
});

let tvFor = '';
function mountTv() {
  const cfg = {
    autosize: true, symbol: S.dom, interval: TV_INT[S.interval], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    theme: isDark() ? 'dark' : 'light', style: '1', locale: 'tr', allow_symbol_change: true,
    hide_side_toolbar: false, withdateranges: true, support_host: 'https://www.tradingview.com'
  };
  const sig = JSON.stringify(cfg);
  if (sig === tvFor) return;
  tvFor = sig;
  const box = $('tvBox');
  box.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div>';
  const s = document.createElement('script');
  s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  s.async = true;
  s.innerHTML = sig;
  box.firstElementChild.appendChild(s);
}

function setView(v) {
  S.view = v; save();
  $('chartView').hidden = v !== 'chart';
  $('domView').hidden = v !== 'dom';
  if (v === 'dom') mountTv();
  syncQuick();
}

async function loadDominance() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/global');
    if (!r.ok) return;
    const m = (await r.json()).data.market_cap_percentage;
    $('qBtcD').textContent = `${m.btc.toFixed(2).replace('.', ',')}%`;
    $('qUsdtD').textContent = `${m.usdt.toFixed(2).replace('.', ',')}%`;
  } catch (e) {}
}

function syncQuick() {
  for (const b of $('quick').querySelectorAll('button[data-s], button[data-d]')) {
    const on = b.dataset.d ? S.view === 'dom' && S.dom === b.dataset.d : S.view === 'chart' && S.symbol === b.dataset.s && S.market === b.dataset.m;
    b.setAttribute('aria-pressed', on);
  }
  for (const b of $('domSeg').children) b.setAttribute('aria-pressed', b.dataset.d === S.dom);
  SV.favs.sync();
}

function syncUi() {
  $('title').textContent = S.symbol;
  $('sym').value = S.symbol;
  for (const b of $('mkt').children) b.setAttribute('aria-pressed', b.dataset.v === S.market);
  for (const b of $('tf').children) b.setAttribute('aria-pressed', b.dataset.v === S.interval);
  for (const k of ['pivot', 'levels', 'tol']) { $(k).value = S[k]; $('o_' + k).textContent = S[k]; }
  $('depth').value = String(S.depth);
  $('logBtn').setAttribute('aria-pressed', !!S.log);
  candle.priceScale().applyOptions({ mode: S.log ? LWC.PriceScaleMode.Logarithmic : LWC.PriceScaleMode.Normal });
  $('account').value = S.account;
  $('riskPct').value = S.riskPct;
  renderLayers();
  syncQuick();
}

function go(market, symbol) {
  const changed = market !== S.market || symbol !== S.symbol;
  if (changed) patSel = null;
  S.market = market; S.symbol = symbol; save();
  setView('chart');
  if (changed || !bars.length) load();
}

$('mkt').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v && v !== S.market) go(v, S.symbol); });
$('tf').addEventListener('click', e => {
  const v = e.target.closest('button')?.dataset.v;
  if (!v || v === S.interval) return;
  S.interval = v; save();
  if (S.view === 'dom') mountTv();
  load();
});
$('quick').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || b.id === 'openGuide') return;
  if (b.dataset.d) { S.dom = b.dataset.d; setView('dom'); }
  else go(b.dataset.m, b.dataset.s);
});
$('domSeg').addEventListener('click', e => { const d = e.target.closest('button')?.dataset.d; if (d) { S.dom = d; setView('dom'); } });
$('domBack').addEventListener('click', () => setView('chart'));
function setSym() {
  const v = $('sym').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v && v !== S.symbol) go(S.market, v);
  else $('sym').value = S.symbol;
}
$('sym').addEventListener('change', setSym);
$('sym').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('sym').blur(); setSym(); } });
$('logBtn').addEventListener('click', () => { S.log = !S.log; save(); syncUi(); overlay.invalidate(); });
$('depth').addEventListener('change', () => { S.depth = +$('depth').value; save(); load(); });
for (const k of ['pivot', 'levels', 'tol']) {
  $(k).addEventListener('input', () => {
    S[k] = +$(k).value;
    $('o_' + k).textContent = S[k];
    save();
    if (bars.length) analyzeSoon();
  });
}
for (const k of ['account', 'riskPct']) {
  $(k).addEventListener('input', () => {
    const v = parseFloat($(k).value.replace(',', '.'));
    if (!(v > 0)) return;
    S[k] = v; save();
    renderPositions(); overlay.invalidate();
  });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && patSel != null) { patSel = null; renderPatterns(); overlay.invalidate(); } });
let guideReady = false;
$('openGuide').addEventListener('click', () => {
  if (!guideReady) { SV.guide.render($('guideGrid')); guideReady = true; }
  $('guide').showModal();
});
$('closeGuide').addEventListener('click', () => $('guide').close());
$('guide').addEventListener('click', e => { if (e.target === $('guide')) $('guide').close(); });
setInterval(() => { if (bars.length && S.view === 'chart') loadHtf(); }, 600000);
setInterval(() => { if (bars.length && res && res.ctx && Date.now() - ideaAt >= 14000) { renderIdea(); checkAlerts(); overlay.invalidate(); } }, 15000);
async function catchUp() {
  const my = wsToken;
  if (!bars.length) return;
  try {
    const page = await fetchPage(API[S.market].rest[0], S.interval, 100, 0);
    if (my !== wsToken || !page.length) return;
    if (page[0].t > bars[bars.length - 1].t) { load(); return; }
    let added = false;
    for (const b of page) {
      const last = bars[bars.length - 1];
      if (b.t === last.t) bars[bars.length - 1] = b;
      else if (b.t > last.t) { bars.push(b); added = true; }
      else continue;
      candle.update(toC(b)); vol.update(toV(b));
    }
    header();
    if (added) analyzeNow(); else { renderLevelTable(); overlay.invalidate(); }
    checkAlerts();
  } catch (e) {}
}
function revive() {
  if (!bars.length) return;
  if (polling) return;
  const dead = !ws || ws.readyState > 1, stale = lastMsg && Date.now() - lastMsg > 90000;
  if (dead || stale) { closeWs(); retry = 0; connectWs(wsToken); catchUp(); }
}
setInterval(revive, 20000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  overlay.invalidate();
  if (!ws || ws.readyState > 1 || Date.now() - lastMsg > 30000) { revive(); catchUp(); }
});
window.addEventListener('online', revive);
try { if (navigator.locks) navigator.locks.request('seviye-canli', () => new Promise(() => {})); } catch (e) {}

$('storeInfo').textContent = SV.store.isServer() ? 'Kayıt: seviye.db (yerel sunucu). Çizimler ve ayarlar bu dosyada saklanır.' : 'Kayıt: bu tarayıcı. Kalıcı dosya kaydı için klasördeki baslat.bat ile aç.';
applyVol();
SV.trades.init({
  candle,
  bars: () => bars,
  cur: () => ({ symbol: S.symbol, market: S.market }),
  layer: () => !!S.layers.pos,
  goTo: (m, s) => go(m, s),
  focus: focusTrade,
  resized: () => overlay.invalidate()
});
function openTf(m, s, tf) {
  const same = m === S.market && s === S.symbol, ch = tf !== S.interval;
  S.interval = tf; save();
  if (same) { setView('chart'); if (ch) load(); }
  else go(m, s);
}
loadBtcMonthly();
setInterval(loadBtcMonthly, 3600e3);
SV.scan.init({ cur: () => ({ symbol: S.symbol, market: S.market, interval: S.interval }), notify, open: openTf });
SV.favs.init({ cur: () => ({ symbol: S.symbol, market: S.market, view: S.view }), toast: t => toast(t, '') });
renderNotifyBtn();
theme();
syncUi();
renderDrawings();
setView(S.view);
load();
loadDominance();
setInterval(loadDominance, 300000);
})();
