window.SV = window.SV || {};

SV.scan = (() => {
  const TFS = ['4h', '1d'];
  const STEP = { '4h': 14400, '1d': 86400 };
  const TFN = { '4h': '4s', '1d': '1G' };
  const REST = { spot: ['https://api.binance.com/api/v3/klines', 'https://data-api.binance.vision/api/v3/klines'], futures: ['https://fapi.binance.com/fapi/v1/klines'] };
  const EVERY = 15 * 60e3, KEY = 'seviye.tarama';
  let D = null, timer = null, busy = false, at = 0, rows = [], htfCache = {}, err = 0, favN = 0;
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
    if (c && Date.now() - c.at < 3600e3) return c.data;
    const [M, W, Dd] = await Promise.all([klines(m, s, '1M', 300), klines(m, s, '1w', 500), klines(m, s, '1d', 600)]);
    const data = { '1M': M || [], '1w': W || [], '1d': Dd || [] };
    htfCache[key] = { at: Date.now(), data };
    return data;
  }

  async function one(f, tf) {
    const bars = await klines(f.m, f.s, tf, 500);
    if (!bars || bars.length < 260) return [];
    const H = await htf(f.m, f.s);
    const ctx = SV.analysis.indicators(bars), n = bars.length;
    const closedN = Date.now() / 1000 < bars[n - 1].t + STEP[tf] ? n - 1 : n;
    const L = SV.scen.live(bars, ctx, { '1M': H['1M'], '1w': H['1w'] }, closedN, 'scan' + f.m + f.s, tf);
    const Dd = H['1d'], Dc = Dd.length > 1 && Dd[Dd.length - 1].t + 86400 > Date.now() / 1000 ? Dd.slice(0, -1) : Dd;
    const out = [];
    const { patterns } = SV.patterns.detect(bars, ctx, { pivot: 5 });
    for (const x of [...SV.scen.patLive(patterns, bars, ctx, closedN, tf), ...SV.scen.trendLive(bars, ctx, { '1M': H['1M'], '1w': H['1w'] }, Dc, closedN, tf, 'scan' + f.m + f.s)]) {
      if (!['triggered', 'near', 'trying'].includes(x.state)) continue;
      out.push({ f, tf, key: x.dir < 0 ? 'short' : 'long', sc: x, pat: true, price: bars[n - 1].c, t: null });
    }
    if (!L) return out;
    for (const key of ['short', 'long']) {
      const sc = L[key];
      if (!sc || !sc.plan || !['triggered', 'near'].includes(sc.state)) continue;
      out.push({ f, tf, key, sc, price: L.price, t: sc.i != null ? bars[sc.i].t : null });
    }
    return out;
  }

  async function run() {
    if (busy || !D) return;
    busy = true;
    if (!at) render();
    const cur = D.cur(), list = SV.favs.list(), found = [];
    let fails = 0;
    for (const f of list) for (const tf of TFS) {
      try { found.push(...await one(f, tf)); } catch (e) { fails++; }
    }
    const rank = r => (r.sc.state === 'triggered' ? 0 : r.sc.state === 'inzone' || r.sc.state === 'trying' ? 1 : 2) + (r.pat ? (patStrong(r.sc) ? 0 : 3) : SV.scen.good(r.sc) ? 0 : r.sc.strong ? 3 : 6);
    rows = found.sort((a, b) => rank(a) - rank(b) || SV.scen.score(b.sc.stats) - SV.scen.score(a.sc.stats) || (a.sc.distP || 0) - (b.sc.distP || 0));
    err = fails; at = Date.now(); busy = false;
    try { favN = list.length; SV.store.set(KEY, { at, err, favN, rows: rows.map(r => ({ ...r, sc: { ...r.sc, checks: undefined } })) }); } catch (e) {}
    render();
    alerts(cur);
  }

  const patStrong = sc => SV.scen.strongSt(sc.stats);

  function alerts(cur) {
    for (const r of rows) {
      if (r.pat) continue;
      const sh = r.key === 'short', p = r.sc.plan, name = `${r.f.s.replace(/USDT$/, '')} ${TFN[r.tf]}`;
      const same = r.f.s === cur.symbol && r.f.m === cur.market && r.tf === cur.interval;
      if (same) continue;
      const pct = `%${Math.round(r.sc.stats.p50 * 100)}`;
      if (r.sc.state === 'triggered' && SV.scen.good(r.sc)) {
        D.notify(`${name}: güçlü ${sh ? 'short' : 'long'} limiti doldu`, `Giriş ${SV.fmt(p.entry)} · stop ${SV.fmt(p.stop)} (−50 $) · +50 $ ${SV.fmt(p.lv[0])} · +100 $ ${SV.fmt(p.lv[1])} · +200 $ ${SV.fmt(p.lv[2])}. Geçmişte +50 $ oranı ${pct}, piyasa yönünde.`, `e${r.f.s}${r.tf}${r.key}${r.t}`, 864e5, { m: r.f.m, s: r.f.s, tf: r.tf });
      } else if (SV.scen.good(r.sc) && r.sc.state === 'near') {
        const edge = sh ? r.sc.zone.lo : r.sc.zone.hi;
        D.notify(`${name}: güçlü ${sh ? 'short' : 'long'} limitine yaklaştı`, `Fiyat ${SV.fmt(r.price)}, ${sh ? 'limit satış' : 'limit alış'} ${SV.fmt(edge)} (${r.sc.zone.names.join(' + ')}), stop ${SV.fmt(r.sc.plan.stop)}. Geçmişte ${pct}.`, `z${r.f.s}${r.tf}${r.key}${Math.round(edge)}`, undefined, { m: r.f.m, s: r.f.s, tf: r.tf });
      }
    }
  }

  function stateTxt(sc) {
    if (sc.state === 'trying') return 'kırılıyor, kapanış bekleniyor';
    if (sc.state === 'triggered') { const w = sc.kind ? 'giriş oluştu' : 'limit doldu'; return sc.ago ? `${w} · ${sc.ago} mum önce` : w; }
    return `yaklaşıyor · ${SV.pct(sc.distP * 100).replace('+', '')}`;
  }

  function render() {
    const box = $('scan');
    if (!box) return;
    const note = $('scanNote');
    const hm = t => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    note.textContent = at ? `· ${hm(at)} → ${hm(Math.max(at + EVERY, Date.now()))}${err ? ` · ${err} hata` : ''}` : busy ? '…' : '';
    if (!at) { box.innerHTML = ''; return; }
    const show = rows.filter(r => r.pat || SV.scen.good(r.sc));
    box.innerHTML = (show.length ? show.map(r => {
      const k = rows.indexOf(r);
      const sh = r.key === 'short', g = !r.pat && SV.scen.good(r.sc);
      return `<li><button data-k="${k}" class="${r.sc.state === 'triggered' && (g || (r.pat && patStrong(r.sc))) ? 'hot' : ''}">
        <span class="tag ${sh ? 'sell' : 'buy'}">${sh ? 'Short' : 'Long'}</span>
        <b>${r.f.s.replace(/USDT$/, '')} ${TFN[r.tf]}</b>
        <span class="why">${r.pat ? `${stateTxt(r.sc)} · ${r.sc.name} · ${patStrong(r.sc) ? 'güçlü' : 'orta'}` : `${stateTxt(r.sc)} · ${g ? 'güçlü' : r.sc.aligned ? 'orta' : 'piyasa yönüne ters'}`} · +50 $ %${Math.round(r.sc.stats.p50 * 100)}</span>
      </button></li>`;
    }).join('') : '<li class="empty">—</li>');
  }

  function init(deps) {
    D = deps;
    $('scan').addEventListener('click', e => {
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      const r = rows[+b.dataset.k];
      if (r) D.open(r.f.m, r.f.s, r.tf);
    });
    const saved = SV.store.get(KEY, null);
    if (saved && saved.at && Array.isArray(saved.rows)) { at = saved.at; err = saved.err || 0; rows = saved.rows; favN = saved.favN || 0; }
    render();
    SV.favs.onChange(render);
    clearTimeout(timer);
    const tick = () => { timer = setTimeout(tick, EVERY); run(); };
    timer = setTimeout(tick, at ? Math.max(5000, at + EVERY - Date.now()) : 5000);
  }

  return { init, run, rows: () => rows };
})();
