window.SV = window.SV || {};

SV.favs = (() => {
  const SEED = [['BTCUSDT', 'spot'], ['ETHUSDT', 'spot'], ['SOLUSDT', 'spot'], ['HYPEUSDT', 'futures'], ['LDOUSDT', 'spot'], ['AVAXUSDT', 'spot'], ['XRPUSDT', 'spot']];
  const BASE = { spot: 'https://api.binance.com/api/v3/ticker/24hr?symbol=', futures: 'https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=' };
  let D = null, list = [], chg = {}, timer = null;
  const $ = id => document.getElementById(id);
  const key = (m, s) => m + ':' + s;
  const label = s => s.replace(/(USDT|USDC|FDUSD|BUSD)$/, '') || s;
  const save = () => SV.store.set('seviye.favoriler', list);
  const has = (m, s) => list.some(f => f.m === m && f.s === s);

  function render() {
    const box = $('favs');
    box.innerHTML = list.map(f => {
      const c = chg[key(f.m, f.s)];
      return `<button class="fav" data-m="${f.m}" data-s="${f.s}" title="${f.s} · ${f.m === 'spot' ? 'Spot' : 'Vadeli'}">${label(f.s)}${c != null ? ` <span class="num ${c >= 0 ? 'up' : 'down'}">${c >= 0 ? '+' : '−'}${Math.abs(c).toFixed(1).replace('.', ',')}%</span>` : ''}</button>`;
    }).join('');
    sync();
  }

  function sync() {
    if (!D) return;
    const cur = D.cur(), on = cur.view === 'chart' && has(cur.market, cur.symbol);
    const b = $('favBtn');
    b.setAttribute('aria-pressed', on);
    b.title = on ? 'Favorilerden çıkar' : 'Favorilere ekle';
    b.setAttribute('aria-label', b.title);
    for (const x of $('favs').children) x.setAttribute('aria-pressed', cur.view === 'chart' && x.dataset.s === cur.symbol && x.dataset.m === cur.market);
  }

  function toggle() {
    const { market: m, symbol: s } = D.cur();
    if (has(m, s)) { list = list.filter(f => !(f.m === m && f.s === s)); D.toast(`${label(s)} favorilerden çıkarıldı`); }
    else { list.push({ s, m }); D.toast(`${label(s)} favorilere eklendi`); refresh(); }
    save(); render();
  }

  function fix(s, from, to) {
    const f = list.find(x => x.s === s && x.m === from);
    if (!f || has(to, s)) return;
    f.m = to; save(); render(); refresh();
  }

  async function refresh() {
    await Promise.all(list.map(async f => {
      try {
        const r = await fetch(BASE[f.m] + f.s);
        if (!r.ok) return;
        const j = await r.json();
        chg[key(f.m, f.s)] = +j.priceChangePercent;
      } catch (e) {}
    }));
    render();
  }

  function init(deps) {
    D = deps;
    const saved = SV.store.get('seviye.favoriler', null);
    list = Array.isArray(saved) ? saved.filter(f => f && f.s && BASE[f.m]) : SEED.map(([s, m]) => ({ s, m }));
    if (!Array.isArray(saved)) save();
    $('favBtn').addEventListener('click', toggle);
    render();
    refresh();
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) refresh(); }, 30000);
  }

  return { init, sync, fix, has, list: () => list };
})();
