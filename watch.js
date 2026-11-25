window.SV = window.SV || {};

SV.watch = (() => {
  const IND = {
    'USDT.D+USDC.D': { tv: 'CRYPTOCAP:USDT.D+CRYPTOCAP:USDC.D', name: 'Stablecoin dominansı', pct: true },
    'USDT.D': { tv: 'CRYPTOCAP:USDT.D', name: 'USDT dominansı', pct: true },
    'USDC.D': { tv: 'CRYPTOCAP:USDC.D', name: 'USDC dominansı', pct: true },
    'BTC.D': { tv: 'CRYPTOCAP:BTC.D', name: 'BTC dominansı', pct: true },
    'ETH.D': { tv: 'CRYPTOCAP:ETH.D', name: 'ETH dominansı', pct: true },
    'TOTAL': { tv: 'CRYPTOCAP:TOTAL', name: 'Toplam kripto piyasa değeri' },
    'TOTAL2': { tv: 'CRYPTOCAP:TOTAL2', name: 'BTC hariç piyasa değeri' },
    'TOTAL3': { tv: 'CRYPTOCAP:TOTAL3', name: 'BTC ve ETH hariç piyasa değeri' }
  };
  const SEED = ['USDT.D+USDC.D', 'USDT.D', 'BTC.D', 'TOTAL3', 'TOTAL'];
  const GROUPS = [['ind', 'Göstergeler'], ['crypto', 'Kripto'], ['tradfi', 'Hisse ve emtia'], ['bist', 'BIST'], ['tv', 'Diğer']];
  const BIST0 = ['XU100', 'AKBNK', 'YKBNK', 'PGSUS', 'THYAO', 'MGROS', 'MAVI', 'MPARK'].map(x => 'BIST:' + x);
  let D = null, list = [], q = {}, timer = null, gAt = 0, adding = false, open = false;
  const $ = id => document.getElementById(id);
  const save = () => SV.store.set('seviye.izleme', list);
  const keyOf = x => x.k === 'b' ? x.m + ':' + x.s : x.id;
  const bist = x => x.k === 't' && x.id.startsWith('BIST:');
  const label = x => x.k === 'b' ? x.s : x.k === 't' ? x.id.replace(/^BIST:/, '') : x.id;
  const tr = (x, d) => x.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const big = x => { const a = Math.abs(x); return a >= 1e12 ? tr(x / 1e12, 2) + ' T' : a >= 1e9 ? tr(x / 1e9, 2) + ' B' : a >= 1e6 ? tr(x / 1e6, 2) + ' M' : tr(x, 2); };
  const sgn = (x, s) => (x >= 0 ? '+' : '−') + s.replace('-', '');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const all = () => [...list, ...(SV.favs ? SV.favs.list() : []).map(f => ({ k: 'b', s: f.s, m: f.m }))];

  function group(x) {
    if (x.k === 'g') return 'ind';
    if (x.k === 't') return x.id.startsWith('BIST:') ? 'bist' : 'tv';
    return D.kind(x.s) ? 'tradfi' : 'crypto';
  }

  function cell(x) {
    const v = q[keyOf(x)];
    if (!v || v.last == null) return '<td class="num">—</td><td class="num">—</td><td class="num">—</td>';
    const isBig = x.k === 'g' && !IND[x.id].pct, isPct = x.k === 'g' && IND[x.id].pct, dec = x.k === 't' ? (v.dec ?? 2) : null;
    const lastTxt = isBig ? big(v.last) : isPct ? tr(v.last, 2) + '%' : dec != null ? tr(v.last, dec) : SV.fmt(v.last);
    const c = v.chg, cp = v.chgPct, cls = cp == null ? '' : cp >= 0 ? 'up' : 'down';
    const chgTxt = c == null ? '—' : sgn(c, isBig ? big(c) : isPct ? tr(c, 2) : dec != null ? tr(Math.abs(c), dec) : SV.fmt(Math.abs(c)));
    const pctTxt = cp == null ? '—' : sgn(cp, tr(cp, 2)) + '%';
    return `<td class="num">${lastTxt}</td><td class="num ${cls}">${chgTxt}</td><td class="num ${cls}">${pctTxt}</td>`;
  }

  function render() {
    const box = $('watch');
    if (!box) return;
    const cur = D.cur();
    let html = '';
    for (const [g, name] of GROUPS) {
      const items = all().filter(x => group(x) === g);
      if (!items.length) continue;
      html += `<tr class="wg"><td colspan="5">${name}</td></tr>` + items.map(x => {
        const tv = x.k === 't' ? x.id : x.k === 'g' ? IND[x.id].tv : null;
        const on = x.k === 'b' ? cur.view === 'chart' && cur.symbol === x.s && cur.market === x.m : x.k === 'g' ? cur.view === 'chart' && cur.market === 'cap' && cur.symbol === x.id : bist(x) ? cur.view === 'chart' && cur.market === 'bist' && cur.symbol === label(x) : cur.view === 'dom' && cur.dom === tv;
        const title = x.k === 'b' ? `${x.s} · ${x.m === 'spot' ? 'Spot' : 'Vadeli'}` : x.k === 't' ? ((q[x.id] && q[x.id].name) || x.id) : IND[x.id].name;
        return `<tr class="wr${on ? ' on' : ''}" data-w="${esc(keyOf(x))}" title="${esc(title)}"><td><span class="ws">${esc(label(x))}</span>${x.k === 'b' && x.m === 'futures' ? '<small>V</small>' : ''}${x.k === 't' && q[x.id] && q[x.id].delayed ? '<small title="15 dk gecikmeli">G</small>' : ''}</td>${cell(x)}<td class="wx"><button class="del" data-wdel="${esc(keyOf(x))}" title="${x.k === 'b' ? 'Favorilerden çıkar' : 'Listeden çıkar'}" aria-label="${x.k === 'b' ? 'Favorilerden çıkar' : 'Listeden çıkar'}">✕</button></td></tr>`;
      }).join('');
    }
    box.innerHTML = html || '<tr><td colspan="5" class="empty">Liste boş. + ile sembol ekle.</td></tr>';
  }

  async function refreshBinance() {
    const items = all(), spot = items.filter(x => x.k === 'b' && x.m === 'spot').map(x => x.s), fut = items.filter(x => x.k === 'b' && x.m === 'futures').map(x => x.s);
    try {
      if (spot.length) {
        const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(spot)));
        if (r.ok) for (const t of await r.json()) q['spot:' + t.symbol] = { last: +t.lastPrice, chg: +t.priceChange, chgPct: +t.priceChangePercent };
        else if (r.status === 400) for (const s of spot) { const one = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=' + s); if (one.ok) { const t = await one.json(); q['spot:' + s] = { last: +t.lastPrice, chg: +t.priceChange, chgPct: +t.priceChangePercent }; } else if (one.status === 400 && SV.favs) SV.favs.fix(s, 'spot', 'futures'); }
      }
      await Promise.all(fut.map(async s => {
        const r = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=' + s);
        if (r.ok) { const t = await r.json(); q['futures:' + s] = { last: +t.lastPrice, chg: +t.priceChange, chgPct: +t.priceChangePercent }; }
      }));
    } catch (e) {}
  }

  let snap = null, gWait = 300000;
  const calc = c => ({
    'BTC.D': c.btc / c.tot * 100, 'ETH.D': c.eth / c.tot * 100, 'USDT.D': c.usdt / c.tot * 100, 'USDC.D': c.usdc / c.tot * 100,
    'USDT.D+USDC.D': (c.usdt + c.usdc) / c.tot * 100, 'TOTAL': c.tot, 'TOTAL2': c.tot - c.btc, 'TOTAL3': c.tot - c.btc - c.eth
  });

  async function prices() {
    const r = await fetch('https://api.binance.com/api/v3/ticker/price');
    if (!r.ok) return null;
    const out = {};
    for (const t of await r.json()) if (t.symbol.endsWith('USDT')) out[t.symbol] = +t.price;
    return out;
  }

  async function refreshSnap() {
    if (!list.some(x => x.k === 'g') || Date.now() - gAt < gWait) return;
    gAt = Date.now();
    try {
      const get = async (k, url) => { try { const r = await fetch('/api/cg?k=' + k); if (r.ok) return r; } catch (e) {} return fetch(url); };
      const [r, mk] = await Promise.all([
        get('global', 'https://api.coingecko.com/api/v3/global'),
        get('markets', 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1')
      ]);
      if (!r.ok) { gWait = 120000; return; }
      const d = (await r.json()).data, m = d.market_cap_percentage, tot = d.total_market_cap.usd;
      const cap = { tot, btc: tot * m.btc / 100, eth: tot * m.eth / 100, usdt: tot * (m.usdt || 0) / 100, usdc: tot * (m.usdc || 0) / 100 };
      let prev = null, coins = [];
      const arr = mk.ok ? await mk.json().catch(() => null) : null;
      if (Array.isArray(arr)) {
        const f = {}, seen = new Set();
        let sn = 0, sp = 0;
        for (const c of arr) {
          const n = c.market_cap || 0, ch = c.market_cap_change_24h || 0, sym = String(c.symbol || '').toUpperCase() + 'USDT';
          sn += n; sp += n - ch; f[c.id] = n > 0 ? (n - ch) / n : 1;
          if (n > 0 && !seen.has(sym) && !['tether', 'usd-coin'].includes(c.id)) { seen.add(sym); coins.push({ id: c.id, sym, cap: n }); }
        }
        if (sn > 0 && f.bitcoin && f.ethereum) prev = calc({ tot: tot * sp / sn, btc: cap.btc * f.bitcoin, eth: cap.eth * f.ethereum, usdt: cap.usdt * (f.tether || 1), usdc: cap.usdc * (f['usd-coin'] || 1) });
      }
      const px = await prices().catch(() => null);
      coins = px ? coins.filter(c => px[c.sym] > 0).map(c => ({ ...c, b: px[c.sym] })) : [];
      snap = { cap, prev, coins, at: Date.now() };
      SV.store.set('seviye.izlemeSnap', snap);
      gWait = 300000;
      live(px);
    } catch (e) { gWait = 120000; }
  }

  function live(px) {
    if (!snap) return;
    const c = { ...snap.cap };
    if (px) for (const k of snap.coins) {
      const p = px[k.sym];
      if (!(p > 0)) continue;
      const d = k.cap * (p / k.b - 1);
      c.tot += d;
      if (k.id === 'bitcoin') c.btc += d;
      else if (k.id === 'ethereum') c.eth += d;
    }
    const v = calc(c), p = snap.prev || {};
    for (const id in v) {
      if (!isFinite(v[id])) continue;
      const b = p[id], chg = b != null && isFinite(b) ? v[id] - b : null;
      q[id] = { last: v[id], chg, chgPct: chg != null ? chg / b * 100 : null };
    }
  }

  async function scan(tickers) {
    const r = await fetch('https://scanner.tradingview.com/global/scan', { method: 'POST', body: JSON.stringify({ symbols: { tickers }, columns: ['close', 'change', 'change_abs', 'description', 'pricescale', 'update_mode'] }) });
    if (!r.ok) return null;
    const out = {};
    for (const x of (await r.json()).data || []) {
      const [c, cp, ca, name, ps, um] = x.d;
      if (isFinite(c)) out[x.s] = { last: c, chg: isFinite(ca) ? ca : null, chgPct: isFinite(cp) ? cp : null, name, dec: ps > 0 ? Math.max(0, Math.round(Math.log10(ps))) : 2, delayed: /delayed/.test(um || '') };
    }
    return out;
  }

  async function refreshTV() {
    const ids = list.some(x => x.k === 'g') ? ['TOTAL', 'TOTAL2', 'TOTAL3', 'USDT.D', 'USDC.D', 'BTC.D', 'ETH.D'] : [], tv = list.filter(x => x.k === 't').map(x => x.id);
    if (!ids.length && !tv.length) return true;
    try {
      const res = await scan([...ids.map(x => 'CRYPTOCAP:' + x), ...tv]);
      if (!res) return false;
      for (const id of tv) if (res[id]) q[id] = res[id];
      if (!ids.length) return true;
      const got = {};
      for (const id of ids) { const v = res['CRYPTOCAP:' + id]; if (v) got[id] = { last: v.last, chg: v.chg, chgPct: v.chgPct }; }
      if (!got.TOTAL) return false;
      Object.assign(q, got);
      const a = got['USDT.D'], b = got['USDC.D'];
      if (a && b) { const last = a.last + b.last, chg = a.chg != null && b.chg != null ? a.chg + b.chg : null; q['USDT.D+USDC.D'] = { last, chg, chgPct: chg != null ? chg / (last - chg) * 100 : null }; }
      return true;
    } catch (e) { return false; }
  }

  async function refreshGlobal() {
    if (await refreshTV() || !list.some(x => x.k === 'g')) return;
    await refreshSnap();
    if (!snap) { const o = SV.store.get('seviye.izlemeSnap', null); if (o && o.cap && Array.isArray(o.coins) && Date.now() - o.at < 864e5) snap = o; }
    if (!snap || Date.now() - snap.at < 5000) return;
    try { live(await prices()); } catch (e) {}
  }

  function setOpen(v) {
    open = v;
    SV.store.set('seviye.izlemeAcik', open);
    $('watchBody').hidden = !open;
    $('watchToggle').setAttribute('aria-expanded', open);
    $('watchToggle').querySelector('.wcaret').textContent = open ? '▾' : '▸';
    if (open) { render(); refresh(); }
  }

  async function refresh() {
    if (document.hidden || !open) return;
    await Promise.all([refreshBinance(), refreshGlobal()]);
    render();
  }

  function parse(raw) {
    const v = raw.toUpperCase().replace(/\s+/g, '');
    if (!v) return null;
    if (IND[v]) return { k: 'g', id: v };
    if (v.includes(':')) return { k: 't', id: v };
    let s = v.replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{2,}(USDT|USDC|FDUSD|BTC|ETH|BNB|TRY|EUR)$/.test(s)) s += 'USDT';
    return { k: 'b', s, m: D.kind(s) ? 'futures' : 'spot' };
  }

  async function add(raw) {
    let x = parse(raw);
    if (!x) return;
    const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (x.k === 'b' && /^[A-Z][A-Z0-9]{2,5}$/.test(v) && !document.querySelector(`#syms option[value="${v}USDT"]`)) {
      try { const r = await scan(['BIST:' + v]); if (r && r['BIST:' + v]) { x = { k: 't', id: 'BIST:' + v }; q[x.id] = r[x.id]; } } catch (e) {}
    }
    if (x.k === 'b') SV.favs.add(x.m, x.s);
    else if (!list.some(y => keyOf(y) === keyOf(x))) { list.push(x); save(); }
    gAt = 0;
    refresh();
  }

  function init(deps) {
    D = deps;
    const saved = SV.store.get('seviye.izleme', null);
    list = Array.isArray(saved) ? saved.filter(x => x && ((x.k === 'g' && IND[x.id]) || (x.k === 't' && x.id))) : SEED.map(id => ({ k: 'g', id }));
    if (!SV.store.get('seviye.izlemeBist', false)) { for (const id of BIST0) if (!list.some(y => y.id === id)) list.push({ k: 't', id }); SV.store.set('seviye.izlemeBist', true); }
    if (Array.isArray(saved) && SV.favs) for (const x of saved) if (x && x.k === 'b' && x.s && x.m && !SV.favs.has(x.m, x.s)) SV.favs.add(x.m, x.s);
    save();
    if (SV.favs) SV.favs.onChange(() => { render(); if (open) refreshBinance().then(render); });
    $('watchToggle').addEventListener('click', () => setOpen(!open));
    $('watchAddBtn').addEventListener('click', () => {
      if (!open) setOpen(true);
      adding = !adding;
      $('watchForm').hidden = !adding;
      if (!adding) return;
      const syms = [...document.querySelectorAll('#syms option')].map(o => `<option value="${esc(o.value)}"${o.label && o.label !== o.value ? ` label="${esc(o.label)}"` : ''}></option>`).join('');
      $('watchOpts').innerHTML = Object.keys(IND).map(id => `<option value="${id}" label="${esc(IND[id].name)}"></option>`).join('') + syms;
      $('watchIn').value = ''; $('watchIn').focus();
    });
    $('watchForm').addEventListener('submit', e => {
      e.preventDefault();
      add($('watchIn').value);
      $('watchIn').value = '';
      adding = false; $('watchForm').hidden = true;
    });
    $('watchIn').addEventListener('keydown', e => { if (e.key === 'Escape') { adding = false; $('watchForm').hidden = true; } });
    $('watch').addEventListener('click', e => {
      const del = e.target.closest('[data-wdel]');
      if (del) {
        const x = all().find(y => keyOf(y) === del.dataset.wdel);
        if (x && x.k === 'b') SV.favs.remove(x.m, x.s);
        else { list = list.filter(y => keyOf(y) !== del.dataset.wdel); save(); render(); }
        return;
      }
      const row = e.target.closest('[data-w]');
      if (!row) return;
      const x = all().find(y => keyOf(y) === row.dataset.w);
      if (!x) return;
      if (x.k === 'b') D.go(x.m, x.s); else if (x.k === 'g') D.go('cap', x.id); else if (bist(x)) D.go('bist', label(x)); else D.dom(x.k === 't' ? x.id : IND[x.id].tv);
    });
    setOpen(SV.store.get('seviye.izlemeAcik', false) === true);
    clearInterval(timer);
    timer = setInterval(refresh, 10000);
  }

  const hasTv = id => list.some(x => (x.k === 't' || x.k === 'g') && x.id === id);
  function toggleTv(id) {
    const k = IND[id] ? 'g' : 't';
    if (hasTv(id)) list = list.filter(x => x.id !== id);
    else list.push({ k, id });
    save(); render(); refresh();
    return hasTv(id);
  }

  return { init, render, list: all, hasTv, toggleTv };
})();
