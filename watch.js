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
  const GROUPS = [['ind', 'Göstergeler'], ['crypto', 'Kripto'], ['tradfi', 'Hisse ve emtia']];
  let D = null, list = [], q = {}, timer = null, gAt = 0, adding = false;
  const $ = id => document.getElementById(id);
  const save = () => SV.store.set('seviye.izleme', list);
  const keyOf = x => x.k === 'b' ? x.m + ':' + x.s : x.id;
  const label = x => x.k === 'b' ? x.s : x.id;
  const tr = (x, d) => x.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const big = x => { const a = Math.abs(x); return a >= 1e12 ? tr(x / 1e12, 2) + ' T' : a >= 1e9 ? tr(x / 1e9, 2) + ' B' : a >= 1e6 ? tr(x / 1e6, 2) + ' M' : tr(x, 2); };
  const sgn = (x, s) => (x >= 0 ? '+' : '−') + s.replace('-', '');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const all = () => [...list, ...(SV.favs ? SV.favs.list() : []).map(f => ({ k: 'b', s: f.s, m: f.m }))];

  function group(x) {
    if (x.k === 'g') return 'ind';
    return D.kind(x.s) ? 'tradfi' : 'crypto';
  }

  function cell(x) {
    const v = q[keyOf(x)];
    if (!v || v.last == null) return '<td class="num">—</td><td class="num">—</td><td class="num">—</td>';
    const isBig = x.k === 'g' && !IND[x.id].pct, isPct = x.k === 'g' && IND[x.id].pct;
    const lastTxt = isBig ? big(v.last) : isPct ? tr(v.last, 2) + '%' : SV.fmt(v.last);
    const c = v.chg, cp = v.chgPct, cls = cp == null ? '' : cp >= 0 ? 'up' : 'down';
    const chgTxt = c == null ? '—' : sgn(c, isBig ? big(c) : isPct ? tr(c, 2) : SV.fmt(Math.abs(c)));
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
        const on = x.k === 'b' ? cur.view === 'chart' && cur.symbol === x.s && cur.market === x.m : cur.view === 'dom' && cur.dom === IND[x.id].tv;
        const title = x.k === 'b' ? `${x.s} · ${x.m === 'spot' ? 'Spot' : 'Vadeli'}` : IND[x.id].name;
        return `<tr class="wr${on ? ' on' : ''}" data-w="${esc(keyOf(x))}" title="${esc(title)}"><td><span class="ws">${esc(label(x))}</span>${x.k === 'b' && x.m === 'futures' ? '<small>V</small>' : ''}</td>${cell(x)}<td class="wx"><button class="del" data-wdel="${esc(keyOf(x))}" title="${x.k === 'b' ? 'Favorilerden çıkar' : 'Listeden çıkar'}" aria-label="${x.k === 'b' ? 'Favorilerden çıkar' : 'Listeden çıkar'}">✕</button></td></tr>`;
      }).join('');
    }
    box.innerHTML = html || '<tr><td colspan="5" class="empty">Liste boş. + ile sembol ekle.</td></tr>';
    $('watchNote').textContent = 'Değişimler 24 saatlik. Kripto ve hisseler favori listenle aynı: yıldızla eklenen burada da görünür.';
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

  async function refreshGlobal() {
    if (!list.some(x => x.k === 'g') || Date.now() - gAt < 60000) return;
    gAt = Date.now();
    try {
      const [r, mk] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/global'),
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1')
      ]);
      if (!r.ok) return;
      const d = (await r.json()).data, m = d.market_cap_percentage, tot = d.total_market_cap.usd;
      const cap = { tot, btc: tot * m.btc / 100, eth: tot * m.eth / 100, usdt: tot * (m.usdt || 0) / 100, usdc: tot * (m.usdc || 0) / 100 };
      let prev = null;
      const arr = mk.ok ? await mk.json().catch(() => null) : null;
      if (Array.isArray(arr)) {
        const f = {};
        let sn = 0, sp = 0;
        for (const c of arr) { const n = c.market_cap || 0, ch = c.market_cap_change_24h || 0; sn += n; sp += n - ch; f[c.id] = n > 0 ? (n - ch) / n : 1; }
        if (sn > 0 && f.bitcoin && f.ethereum) prev = { tot: tot * sp / sn, btc: cap.btc * f.bitcoin, eth: cap.eth * f.ethereum, usdt: cap.usdt * (f.tether || 1), usdc: cap.usdc * (f['usd-coin'] || 1) };
      }
      const calc = c => ({
        'BTC.D': c.btc / c.tot * 100, 'ETH.D': c.eth / c.tot * 100, 'USDT.D': c.usdt / c.tot * 100, 'USDC.D': c.usdc / c.tot * 100,
        'USDT.D+USDC.D': (c.usdt + c.usdc) / c.tot * 100, 'TOTAL': c.tot, 'TOTAL2': c.tot - c.btc, 'TOTAL3': c.tot - c.btc - c.eth
      });
      const v = calc(cap), p = prev ? calc(prev) : {};
      for (const id in v) {
        if (!isFinite(v[id])) continue;
        const b = p[id], chg = b != null && isFinite(b) ? v[id] - b : null;
        q[id] = { last: v[id], chg, chgPct: chg != null ? chg / b * 100 : null };
      }
    } catch (e) {}
  }

  async function refresh() {
    if (document.hidden) return;
    await Promise.all([refreshBinance(), refreshGlobal()]);
    render();
  }

  function parse(raw) {
    const v = raw.toUpperCase().replace(/\s+/g, '');
    if (!v) return null;
    if (IND[v]) return { k: 'g', id: v };
    let s = v.replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{2,}(USDT|USDC|FDUSD|BTC|ETH|BNB|TRY|EUR)$/.test(s)) s += 'USDT';
    return { k: 'b', s, m: D.kind(s) ? 'futures' : 'spot' };
  }

  function add(raw) {
    const x = parse(raw);
    if (!x) return;
    if (x.k === 'b') SV.favs.add(x.m, x.s);
    else if (!list.some(y => keyOf(y) === keyOf(x))) { list.push(x); save(); }
    gAt = 0;
    refresh();
  }

  function init(deps) {
    D = deps;
    const saved = SV.store.get('seviye.izleme', null);
    list = Array.isArray(saved) ? saved.filter(x => x && x.k === 'g' && IND[x.id]) : SEED.map(id => ({ k: 'g', id }));
    if (Array.isArray(saved) && SV.favs) for (const x of saved) if (x && x.k === 'b' && x.s && x.m && !SV.favs.has(x.m, x.s)) SV.favs.add(x.m, x.s);
    save();
    if (SV.favs) SV.favs.onChange(() => { render(); refreshBinance().then(render); });
    $('watchAddBtn').addEventListener('click', () => {
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
      if (x.k === 'b') D.go(x.m, x.s); else D.dom(IND[x.id].tv);
    });
    render();
    refresh();
    clearInterval(timer);
    timer = setInterval(refresh, 10000);
  }

  return { init, render, list: all };
})();
