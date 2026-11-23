window.SV = window.SV || {};

SV.scan = (() => {
  const TFS = ['4h', '1d'];
  const STEP = { '4h': 14400, '1d': 86400 };
  const TFN = { '4h': '4s', '1d': '1G' };
  const REST = { spot: ['https://api.binance.com/api/v3/klines', 'https://data-api.binance.vision/api/v3/klines'], futures: ['https://fapi.binance.com/fapi/v1/klines'] };
  let D = null, timer = null, busy = false, at = 0, rows = [], htfCache = {}, err = 0;
  const $ = id => document.getElementById(id);

  async function klines(m, s, iv, limit) {
    let last;
    for (const base of REST[m]) {
      try {
        const r = await fetch(`${base}?symbol=${s}&interval=${iv}&limit=${limit}`);
        if (r.status === 400) return null;
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return (await r.json()).map(k => ({ t: k[0] / 1000, o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
      } catch (e) { last = e; }
    }
    throw last;
  }

  async function htf(m, s) {
    const key = m + s, c = htfCache[key];
    if (c && Date.now() - c.at < 6 * 3600e3) return c.data;
    const [M, W] = await Promise.all([klines(m, s, '1M', 300), klines(m, s, '1w', 500)]);
    const data = { '1M': M || [], '1w': W || [] };
    htfCache[key] = { at: Date.now(), data };
    return data;
  }

  async function one(f, tf) {
    const bars = await klines(f.m, f.s, tf, 500);
    if (!bars || bars.length < 260) return [];
    const H = await htf(f.m, f.s);
    const ctx = SV.analysis.indicators(bars), n = bars.length;
    const closedN = Date.now() / 1000 < bars[n - 1].t + STEP[tf] ? n - 1 : n;
    const L = SV.scen.live(bars, ctx, H, closedN, 'scan' + f.m + f.s, tf);
    if (!L) return [];
    const out = [];
    for (const key of ['short', 'long']) {
      const sc = L[key];
      if (!sc || !sc.plan || !['triggered', 'near', 'inzone'].includes(sc.state)) continue;
      out.push({ f, tf, key, sc, price: L.price, t: sc.i != null ? bars[sc.i].t : null });
    }
    return out;
  }

  async function run() {
    if (busy || !D) return;
    busy = true;
    const cur = D.cur(), list = SV.favs.list(), found = [];
    let fails = 0;
    for (const f of list) for (const tf of TFS) {
      try { found.push(...await one(f, tf)); } catch (e) { fails++; }
    }
    const rank = r => (r.sc.state === 'triggered' ? 0 : r.sc.state === 'inzone' ? 1 : 2) + (SV.scen.good(r.sc) ? 0 : r.sc.strong ? 3 : 6);
    rows = found.sort((a, b) => rank(a) - rank(b) || a.sc.distP - b.sc.distP);
    err = fails; at = Date.now(); busy = false;
    render();
    alerts(cur);
  }

  function alerts(cur) {
    for (const r of rows) {
      const sh = r.key === 'short', p = r.sc.plan, name = `${r.f.s.replace(/USDT$/, '')} ${TFN[r.tf]}`;
      const same = r.f.s === cur.symbol && r.f.m === cur.market && r.tf === cur.interval;
      if (same) continue;
      const pct = `%${Math.round(r.sc.stats.p50 * 100)}`;
      if (r.sc.state === 'triggered' && SV.scen.good(r.sc)) {
        D.notify(`${name}: iyi ${sh ? 'short' : 'long'} girişi`, `Giriş ${SV.fmt(p.entry)} · stop ${SV.fmt(p.stop)} (−50 $) · +50 $ ${SV.fmt(p.lv[0])} · +100 $ ${SV.fmt(p.lv[1])} · +200 $ ${SV.fmt(p.lv[2])}. Geçmişte +50 $ oranı ${pct}, piyasa yönünde.`, `e${r.f.s}${r.tf}${r.key}${r.t}`, 864e5);
      } else if (SV.scen.good(r.sc) && (r.sc.state === 'near' || r.sc.state === 'inzone')) {
        const edge = sh ? r.sc.zone.lo : r.sc.zone.hi;
        D.notify(`${name}: iyi ${sh ? 'short' : 'long'} bölgesine yaklaştı`, `Fiyat ${SV.fmt(r.price)}, bölge ${SV.fmt(edge)} (${r.sc.zone.names.join(' + ')}). Geçmişte ${pct}. ${sh ? 'Bölgenin altında' : 'Bölgenin üstünde'} kapanış gelirse giriş oluşur.`, `z${r.f.s}${r.tf}${r.key}${Math.round(edge)}`);
      }
    }
  }

  function stateTxt(sc) {
    if (sc.state === 'triggered') return sc.ago ? `giriş oluştu · ${sc.ago} mum önce` : 'giriş oluştu';
    if (sc.state === 'inzone') return 'bölgede, kapanış bekleniyor';
    return `yaklaşıyor · ${SV.pct(sc.distP * 100).replace('+', '')}`;
  }

  function render() {
    const box = $('scan');
    if (!box) return;
    const note = $('scanNote');
    note.textContent = at ? `${SV.favs.list().length} favori · 4s ve 1G · son tarama ${new Date(at).toLocaleTimeString('tr-TR')}${err ? ` · ${err} istek başarısız` : ''}` : 'Taranıyor…';
    if (!at) { box.innerHTML = ''; return; }
    const show = rows.filter(r => r.sc.strong), weak = rows.length - show.length;
    box.innerHTML = (show.length ? show.map(r => {
      const k = rows.indexOf(r);
      const sh = r.key === 'short', g = SV.scen.good(r.sc);
      return `<li><button data-k="${k}" class="${r.sc.state === 'triggered' && g ? 'hot' : ''}">
        <span class="tag ${sh ? 'sell' : 'buy'}">${sh ? 'Short' : 'Long'}</span>
        <b>${r.f.s.replace(/USDT$/, '')} ${TFN[r.tf]}</b>
        <span class="why">${stateTxt(r.sc)} · ${g ? 'iyi kurulum' : r.sc.aligned ? 'güçlü, örnek az' : 'güçlü, piyasa yönüne ters'} · +50 $ %${Math.round(r.sc.stats.p50 * 100)}</span>
      </button></li>`;
    }).join('') : '<li class="empty">Şu an favorilerde güçlü kurulum yok.</li>') + (weak ? `<li class="empty">${weak} zayıf kurulum (koşulların hepsi tutmayan) listelenmedi.</li>` : '');
  }

  function init(deps) {
    D = deps;
    $('scan').addEventListener('click', e => {
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      const r = rows[+b.dataset.k];
      if (r) D.open(r.f.m, r.f.s, r.tf);
    });
    render();
    setTimeout(run, 4000);
    clearInterval(timer);
    timer = setInterval(run, 300000);
  }

  return { init, run, rows: () => rows };
})();
