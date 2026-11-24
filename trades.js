window.SV = window.SV || {};

SV.trades = (() => {
  const HL = 'https://api.hyperliquid.xyz/info';
  const XYZ = { 'xyz:GOLD': 'XAUUSDT', 'xyz:SILVER': 'XAGUSDT', 'xyz:COPPER': 'COPPERUSDT', 'xyz:BRENTOIL': 'BZUSDT', 'xyz:CL': 'CLUSDT' };
  let D = null, manual = [], hl = { address: '', positions: [], orders: [], mids: {}, fee: 0.00045, err: '', at: 0, busy: false, acct: null, spot: null, spotAt: 0, spotMeta: null, spotMetaAt: 0, mode: '', modeAt: 0, open: [] };
  let tabNow = 'pos', closeFor = null, tickers = {}, lines = [], linesKey = '', hlTimer = null, tkTimer = null, lastTick = 0, open = true, form = null;
  const $ = id => document.getElementById(id);
  const num = (x, d = 2) => (x >= 0 ? '+' : '−') + Math.abs(x).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const usd = x => `${num(x)} $`;
  const qtyTxt = q => q >= 100 ? q.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : q >= 1 ? q.toLocaleString('tr-TR', { maximumFractionDigits: 3 }) : q.toPrecision(3);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function mapCoin(coin) {
    if (XYZ[coin]) return { symbol: XYZ[coin], market: 'futures' };
    if (/^xyz:[A-Z0-9]+$/.test(coin)) return { symbol: coin.slice(4) + 'USDT', market: 'futures' };
    if (coin.includes(':') || coin.startsWith('@')) return null;
    if (/^k[A-Z]/.test(coin)) return { symbol: '1000' + coin.slice(1) + 'USDT', market: 'futures' };
    return { symbol: coin + 'USDT', market: 'futures' };
  }

  async function hlPost(body) {
    const opt = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    try {
      const r = await fetch(HL, opt);
      if (r.ok) return await r.json();
      throw new Error('HTTP ' + r.status);
    } catch (e) {
      if (SV.store.isServer()) {
        const r = await fetch('/api/hl', opt);
        if (r.ok) return await r.json();
      }
      throw e;
    }
  }

  async function refreshHL() {
    if (!hl.address || hl.busy) return;
    hl.busy = true;
    try {
      const u = hl.address;
      const [main, xyz, orders, mids, midsX, fees] = await Promise.all([
        hlPost({ type: 'clearinghouseState', user: u }),
        hlPost({ type: 'clearinghouseState', user: u, dex: 'xyz' }).catch(() => null),
        hlPost({ type: 'frontendOpenOrders', user: u }).catch(() => []),
        hlPost({ type: 'allMids' }).catch(() => ({})),
        hlPost({ type: 'allMids', dex: 'xyz' }).catch(() => ({})),
        hlPost({ type: 'userFees', user: u }).catch(() => null)
      ]);
      const ordersX = await hlPost({ type: 'frontendOpenOrders', user: u, dex: 'xyz' }).catch(() => []);
      const fills = await hlPost({ type: 'userFills', user: u }).catch(() => []);
      const pos = [];
      for (const st of [main, xyz]) {
        for (const ap of (st && st.assetPositions) || []) {
          const p = ap.position, szi = +p.szi;
          if (!szi) continue;
          const m = mapCoin(p.coin);
          const seg = realizedSince(fills, p.coin, szi);
          pos.push({
            realized: seg.closed, fees: seg.fees, fills: seg.n, partial: seg.partial,
            id: 'hl:' + p.coin, src: 'Hyperliquid', coin: p.coin, symbol: m ? m.symbol : null, market: m ? m.market : null,
            side: szi > 0 ? 'long' : 'short', qty: Math.abs(szi), entry: +p.entryPx, liq: p.liquidationPx ? +p.liquidationPx : null,
            lev: p.leverage ? +p.leverage.value : null, levType: p.leverage ? p.leverage.type : '', funding: p.cumFunding ? +p.cumFunding.sinceOpen : 0,
            upnl: +p.unrealizedPnl, margin: +p.marginUsed
          });
        }
      }
      hl.positions = pos;
      const acc = { value: 0, ntl: 0, margin: 0, maint: 0, withdraw: 0, upnl: 0, posMargin: 0, iso: 0 };
      for (const st of [main, xyz]) {
        if (!st) continue;
        if (st.marginSummary) {
          acc.value += +st.marginSummary.accountValue || 0;
          acc.ntl += +st.marginSummary.totalNtlPos || 0;
          acc.margin += +st.marginSummary.totalMarginUsed || 0;
        }
        acc.maint += +st.crossMaintenanceMarginUsed || 0;
        acc.withdraw += +st.withdrawable || 0;
        for (const ap of st.assetPositions || []) {
          acc.upnl += +ap.position.unrealizedPnl || 0;
          acc.posMargin += +ap.position.marginUsed || 0;
          if (ap.position.leverage && ap.position.leverage.type === 'isolated') acc.iso += +ap.position.marginUsed || 0;
        }
      }
      hl.acct = acc;
      if (!hl.mode || Date.now() - hl.modeAt > 600000) { hl.modeAt = Date.now(); hlPost({ type: 'userAbstraction', user: u }).then(m => { hl.mode = typeof m === 'string' ? m : ''; render(); }).catch(() => {}); }
      if (Date.now() - hl.spotAt > (/unified|portfolio/i.test(hl.mode) ? 8000 : 40000)) refreshSpot(u);
      hl.open = [...(orders || []), ...(ordersX || [])].map(o => {
        const m = mapCoin(o.coin), trig = +o.triggerPx || 0, lim = +o.limitPx || 0;
        return { coin: o.coin, symbol: m ? m.symbol : null, market: m ? m.market : null, buy: o.side === 'B', type: o.orderType || 'Limit', px: o.isTrigger && trig ? trig : lim, limit: lim, trigger: o.isTrigger ? trig : null, cond: o.triggerCondition || '', sz: +o.sz, orig: +o.origSz || +o.sz, reduce: !!o.reduceOnly, tpsl: !!o.isPositionTpsl, t: o.timestamp, oid: o.oid };
      }).sort((a, b) => b.t - a.t);
      hl.orders = [...(orders || []), ...(ordersX || [])].filter(o => o.isTrigger || o.isPositionTpsl).map(o => ({
        coin: o.coin, px: +(o.triggerPx || o.limitPx), kind: /take profit/i.test(o.orderType || '') ? 'TP' : /stop/i.test(o.orderType || '') ? 'SL' : (o.orderType || 'Emir')
      }));
      hl.mids = { ...(mids || {}), ...(midsX || {}) };
      if (fees && fees.userCrossRate) hl.fee = +fees.userCrossRate;
      hl.err = ''; hl.at = Date.now();
    } catch (e) {
      hl.err = 'Hyperliquid verisi alınamadı (' + e.message + '). ' + (SV.store.isServer() ? '' : 'Sayfayı baslat.bat ile açmak bağlantıyı düzeltebilir.');
    }
    hl.busy = false;
    render(); syncLines();
  }

  async function refreshSpot(u) {
    hl.spotAt = Date.now();
    try {
      if (!hl.spotMeta || Date.now() - hl.spotMetaAt > 600000) { hl.spotMeta = await hlPost({ type: 'spotMetaAndAssetCtxs' }); hl.spotMetaAt = Date.now(); }
      const st = await hlPost({ type: 'spotClearinghouseState', user: u });
      const [meta, ctxs] = hl.spotMeta || [{ tokens: [], universe: [] }, []];
      const idx = {}, px = {};
      for (const t of meta.tokens || []) idx[t.name] = t.index;
      (meta.universe || []).forEach((m, j) => { if (m.tokens && m.tokens[1] === 0 && ctxs[j]) px[m.tokens[0]] = +(ctxs[j].markPx || ctxs[j].midPx) || 0; });
      let usdc = 0, other = 0, hold = 0;
      for (const b of (st && st.balances) || []) {
        const q = +b.total || 0;
        if (!q) continue;
        if (b.coin === 'USDC') { usdc += q; hold += +b.hold || 0; }
        else other += q * (px[idx[b.coin]] || 0);
      }
      hl.spot = { usdc, other, hold };
    } catch (e) {}
    render();
  }

  function acctHtml(list) {
    const k = (h, v, sub, c = '') => `<div class="kpi"><span>${h}</span><b class="num ${c}">${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const plain = x => `${x.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
    const cls = v => v >= 0 ? 'up' : 'down';
    if (hl.address && hl.acct && !hl.mode && Date.now() - hl.modeAt < 6000) return '<div class="kpis acct"><div class="kpi"><span>Toplam bakiye</span><b>…</b><small>yükleniyor</small></div></div>';
    if (hl.address && hl.acct) {
      const a = hl.acct, hp = list.filter(p => p.src === 'Hyperliquid');
      let live = 0, ntl = 0;
      for (const p of hp) { const s = stats(p); live += s.px != null ? s.open : p.upnl || 0; ntl += (s.px != null ? s.px : p.entry) * p.qty; }
      const pct = x => `%${(x * 100).toFixed(1).replace('.', ',')}`;
      if (/unified|portfolio/i.test(hl.mode)) {
        if (!hl.spot) return '<div class="kpis acct"><div class="kpi"><span>Toplam bakiye</span><b>…</b><small>yükleniyor</small></div></div>';
        const sp = hl.spot, total = sp.usdc + sp.other + live - a.upnl, ordHold = Math.max(0, sp.hold - a.posMargin), free = Math.max(0, sp.usdc - sp.hold);
        const coll = sp.usdc - a.iso, base = total - live, nOrd = hl.open.filter(o => !o.tpsl && !o.reduce).length;
        return `<div class="kpis acct">
          ${k('Toplam bakiye', plain(total), `birleşik hesap${sp.other ? ` · USDC ${plain(sp.usdc)} + diğer ${plain(sp.other)}` : ''}`)}
          ${k('Açık K/Z', usd(live), base > 0 && hp.length ? `${num(live / base * 100)}% (bakiyeye göre)` : 'açık pozisyon yok', cls(live))}
          ${k('Pozisyon teminatı', plain(a.posMargin), total > 0 ? `bakiyenin ${pct(a.posMargin / total)}` : '')}
          ${k('Emirlere ayrılan', plain(ordHold), nOrd ? `${nOrd} açık emir · bakiyeden düşülmez` : 'açık emir yok')}
          ${k('Kullanılabilir', plain(free), 'teminat ve emirler dışında')}
          ${k('Pozisyon büyüklüğü', plain(ntl), total > 0 && ntl ? `efektif kaldıraç ${(ntl / total).toFixed(2).replace('.', ',')}x` : '')}
          ${k('Teminat oranı', coll > 0 && a.maint ? pct(a.maint / coll) : '—', 'bakım teminatı / teminat; %100 olursa likidasyon', coll > 0 && a.maint / coll >= 0.5 ? 'down' : '')}
        </div>`;
      }
      const perp = a.value - a.upnl + live, sp = hl.spot ? hl.spot.usdc + hl.spot.other : 0, total = perp + sp;
      const base = perp - live;
      return `<div class="kpis acct">
        ${k('Toplam bakiye', plain(total), hl.spot ? `perp ${plain(perp)} + spot ${plain(sp)}` : `perp hesabı · spot yükleniyor`)}
        ${k('Açık K/Z', usd(live), base > 0 ? `${num(live / base * 100)}% (bakiyeye göre)` : '', cls(live))}
        ${k('Kullanılan teminat', plain(a.margin), perp > 0 ? `perp bakiyesinin %${(a.margin / perp * 100).toFixed(1).replace('.', ',')}` : '')}
        ${k('Çekilebilir', plain(a.withdraw), 'perp hesabından')}
        ${k('Pozisyon büyüklüğü', plain(ntl), perp > 0 ? `efektif kaldıraç ${(ntl / perp).toFixed(2).replace('.', ',')}x` : '')}
        ${k('Teminat oranı', perp > 0 ? `%${(a.maint / perp * 100).toFixed(1).replace('.', ',')}` : '—', 'bakım teminatı / bakiye; %100 olursa likidasyon', perp > 0 && a.maint / perp >= 0.5 ? 'down' : '')}
      </div>`;
    }
    return '';
  }

  function renderOrders() {
    const box = $('ordView');
    if (!box) return;
    const list = hl.open || [];
    const n = list.length, tb = $('tradesTabs').querySelector('[data-v="ord"]');
    if (tb) tb.textContent = n ? `Açık emirler (${n})` : 'Açık emirler';
    if (!hl.address) { box.innerHTML = '<p class="note">Açık emirler Hyperliquid adresinden okunur. "Hyperliquid" düğmesiyle adresini bağla.</p>'; return; }
    if (!n) { box.innerHTML = `<p class="note">${hl.at ? 'Açık emir yok.' : 'Yükleniyor…'}</p>`; return; }
    const TYPE = { Limit: 'Limit', 'Stop Market': 'Stop market', 'Stop Limit': 'Stop limit', 'Take Profit Market': 'Kâr al (market)', 'Take Profit Limit': 'Kâr al (limit)' };
    const dt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    let tot = 0;
    const rows = list.map(o => {
      const mid = +hl.mids[o.coin] || null, val = o.sz * (o.limit || o.px);
      if (!o.reduce) tot += val;
      const dist = mid ? (o.px - mid) / mid * 100 : null;
      return `<tr${o.symbol ? ` class="oclick" data-ogo="${esc(o.coin)}" tabindex="0" title="Grafiği aç"` : ''}>
        <td><span class="lnk">${esc(o.coin)}</span></td>
        <td><span class="tag ${o.buy ? 'buy' : 'sell'}">${o.buy ? 'Alış' : 'Satış'}</span></td>
        <td>${esc(TYPE[o.type] || o.type)}${o.tpsl ? ' <small>poz. TP/SL</small>' : ''}${o.reduce ? ' <small>sadece azalt</small>' : ''}</td>
        <td class="num">${SV.fmt(o.px)}${o.trigger && o.limit && Math.abs(o.limit - o.trigger) > 1e-12 ? `<small>limit ${SV.fmt(o.limit)}</small>` : ''}</td>
        <td class="num">${qtyTxt(o.sz)}${o.orig > o.sz ? `<small>ilk ${qtyTxt(o.orig)}</small>` : ''}</td>
        <td class="num">${val.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} $</td>
        <td class="num">${mid ? SV.fmt(mid) : '—'}</td>
        <td class="num">${dist != null ? num(dist) + '%' : '—'}</td>
        <td>${o.t ? dt.format(o.t) : ''}</td>
      </tr>`;
    }).join('');
    box.innerHTML = `<p class="note">Bekleyen emirler; gerçekleşmedikçe bakiyeyi ve K/Z'yi etkilemez. Yeni pozisyon açabilecek emirlerin toplam değeri: <b class="num">${tot.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} $</b></p>
      <div class="tscroll"><table class="ttable"><thead><tr><th>Sembol</th><th>Yön</th><th>Tür</th><th>Fiyat</th><th>Miktar</th><th>Değer</th><th>Güncel</th><th>Uzaklık</th><th>Zaman</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  async function refreshTickers() {
    const cur = D.cur(), need = {};
    for (const t of manual) if (t.symbol !== cur.symbol) (need[t.market] = need[t.market] || new Set()).add(t.symbol);
    try {
      if (need.spot && need.spot.size) {
        const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=' + encodeURIComponent(JSON.stringify([...need.spot])));
        if (r.ok) for (const x of await r.json()) tickers['spot:' + x.symbol] = +x.price;
      }
      for (const s of (need.futures || [])) {
        const r = await fetch('https://fapi.binance.com/fapi/v1/ticker/price?symbol=' + s);
        if (r.ok) { const x = await r.json(); tickers['futures:' + s] = +x.price; }
      }
    } catch (e) {}
    render();
  }

  function realizedSince(fills, coin, szi) {
    const list = (fills || []).filter(f => f.coin === coin).sort((a, b) => b.time - a.time);
    let closed = 0, fees = 0, n = 0, partial = false;
    for (const f of list) {
      const start = +f.startPosition;
      if (start !== 0 && Math.sign(start) !== Math.sign(szi)) break;
      closed += +f.closedPnl || 0;
      fees += +f.fee || 0;
      n++;
      if (+f.closedPnl) partial = true;
      if (start === 0) break;
    }
    return { closed, fees, n, partial };
  }

  function view(t) {
    const closes = t.closes || [], f = (t.fee ?? 0.045) / 100, dir = t.side === 'long' ? 1 : -1;
    const closedQty = closes.reduce((a, c) => a + c.q, 0);
    const gross = closes.reduce((a, c) => a + dir * (c.px - t.entry) * c.q, 0);
    const fees = t.entry * t.qty * f + closes.reduce((a, c) => a + c.px * c.q * f, 0);
    return { ...t, origQty: t.qty, qty: Math.max(0, t.qty - closedQty), realized: gross, fees, partial: closes.length > 0, done: t.qty - closedQty <= t.qty * 1e-9 };
  }

  function price(p) {
    const cur = D.cur(), bars = D.bars();
    if (p.src === 'Hyperliquid' && hl.mids[p.coin]) return +hl.mids[p.coin];
    if (bars.length && p.symbol === cur.symbol) return bars[bars.length - 1].c;
    return tickers[p.market + ':' + p.symbol] ?? null;
  }

  function stats(p) {
    const px = price(p), dir = p.side === 'long' ? 1 : -1, f = p.src === 'Hyperliquid' ? hl.fee : (p.fee ?? 0.045) / 100;
    const realizedNet = (p.realized || 0) - (p.fees || 0) - (p.funding || 0);
    const q = p.qty;
    const be = q > 0 ? (dir > 0 ? (p.entry * q - realizedNet) / (q * (1 - f)) : (p.entry * q + realizedNet) / (q * (1 + f))) : null;
    const beSimple = q > 0 ? (dir > 0 ? p.entry * (1 + f) / (1 - f) : p.entry * (1 - f) / (1 + f)) : null;
    let liq = p.liq;
    if (liq == null && p.lev && q > 0) liq = dir > 0 ? p.entry * (1 - 1 / p.lev + 0.005) : p.entry * (1 + 1 / p.lev - 0.005);
    if (px == null) return { px: null, be, beSimple, liq, realizedNet };
    const open = dir * (px - p.entry) * q;
    const pct = dir * (px - p.entry) / p.entry * 100;
    const total = open + realizedNet - px * q * f;
    return { px, be, beSimple, liq, realizedNet, open, pct, roe: p.lev ? pct * p.lev : null, net: total, value: px * q, beDist: be != null ? (be - px) / px * 100 : null };
  }

  function withHistory(p) {
    const oi = SV.history.openInfo(p.coin);
    return oi ? { ...p, realized: oi.pnl, fees: oi.fee, partial: oi.pnl !== 0, funding: -oi.funding, opened: oi.start } : p;
  }

  const all = () => [...hl.positions.map(withHistory), ...manual.map(view)];

  function closedManual() {
    return manual.map(view).filter(v => v.done && v.closes && v.closes.length).map(v => {
      const cq = v.closes.reduce((a, c) => a + c.q, 0), m = v.closes.reduce((a, c) => a + c.px * c.q, 0) / (cq || 1);
      const dir = v.side === 'long' ? 1 : -1, t1 = Math.max(...v.closes.map(c => c.t)) * 1000;
      return { src: 'Elle', coin: v.symbol, symbol: v.symbol, market: v.market, side: v.side, start: (v.t || t1 / 1000) * 1000, end: t1, entry: v.entry, exit: m, ret: dir * (m - v.entry) / v.entry * 100, size: v.origQty * v.entry, maxQ: v.origQty, pnl: v.realized, fee: v.fees, funding: 0, net: v.realized - v.fees, fills: v.closes.length + 1 };
    });
  }

  let panelH = null;
  const wide = () => matchMedia('(min-width: 901px)').matches;

  function applyHeight() {
    const box = $('trades'), col = box.parentElement;
    const on = open && panelH && wide();
    if (on) {
      const max = Math.max(120, col.clientHeight - 340);
      box.style.height = Math.round(Math.min(max, Math.max(90, panelH))) + 'px';
    } else box.style.height = '';
    box.classList.toggle('sized', !!on);
    if (D) D.resized();
  }

  function initResize() {
    const h = $('tradesResize'), box = $('trades');
    let y0 = 0, h0 = 0, id = null;
    panelH = SV.store.get('seviye.islemYukseklik', null);
    h.addEventListener('pointerdown', e => {
      if (!wide()) return;
      e.preventDefault();
      id = e.pointerId; h.setPointerCapture(id); h.classList.add('drag');
      y0 = e.clientY; h0 = box.getBoundingClientRect().height;
    });
    h.addEventListener('pointermove', e => {
      if (id !== e.pointerId) return;
      panelH = h0 + (y0 - e.clientY);
      applyHeight();
    });
    const end = e => {
      if (id !== e.pointerId) return;
      id = null; h.classList.remove('drag');
      panelH = box.getBoundingClientRect().height;
      SV.store.set('seviye.islemYukseklik', Math.round(panelH));
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
    h.addEventListener('dblclick', () => { panelH = null; SV.store.set('seviye.islemYukseklik', null); applyHeight(); });
    h.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      panelH = box.getBoundingClientRect().height + (e.key === 'ArrowUp' ? 30 : -30);
      applyHeight();
      SV.store.set('seviye.islemYukseklik', Math.round(box.getBoundingClientRect().height));
    });
    addEventListener('resize', () => { if (panelH) applyHeight(); });
    applyHeight();
  }

  function setTab(t, quiet) {
    tabNow = t;
    SV.store.set('seviye.islemSekme', t);
    for (const b of $('tradesTabs').children) b.setAttribute('aria-pressed', b.dataset.v === t);
    $('posView').hidden = t !== 'pos';
    $('histView').hidden = t !== 'hist';
    $('ordView').hidden = t !== 'ord';
    $('notView').hidden = t !== 'not';
    $('kurView').hidden = t !== 'kur';
    $('anaView').hidden = t !== 'ana';
    $('tradesTotal').hidden = t !== 'pos';
    if (!open && !quiet) { open = true; SV.store.set('seviye.islemlerAcik', true); $('tradesToggle').textContent = '▾'; applyHeight(); }
    render(true);
    SV.history.render();
    if (D.onTab && (open || !quiet)) D.onTab(t);
  }

  function render(force) {
    if (!D) return;
    const box = $('trades');
    box.classList.toggle('closed', !open);
    if (closeFor && !force) return;
    const list = all(), cur = D.cur();
    let total = 0, have = 0;
    const rows = list.map(p => {
      const s = stats(p), on = p.symbol === cur.symbol;
      if (s.px != null || p.done) { total += s.px != null ? s.net : s.realizedNet; have++; }
      const cls = v => v == null ? '' : v >= 0 ? 'up' : 'down';
      const beNote = p.partial && s.beSimple != null && s.be != null ? `<small>kısmi satış öncesi ${SV.fmt(s.beSimple)}</small>` : (s.beDist != null ? `<small>${num(s.beDist)}%</small>` : '');
      return `<tr class="${on ? 'cur' : ''}${p.done ? ' done' : ''}" data-id="${esc(p.id)}">
        <td><span class="src">${p.src === 'Hyperliquid' ? 'HL' : 'Elle'}</span> <button class="lnk" data-go="${esc(p.id)}" ${p.symbol ? '' : 'disabled'}>${esc(p.coin || p.symbol)}</button></td>
        <td><span class="tag ${p.side === 'long' ? 'buy' : 'sell'}">${p.side === 'long' ? 'Long' : 'Short'}${p.lev ? ' ' + p.lev + 'x' : ''}</span></td>
        <td class="num">${p.done ? 'Kapandı' : qtyTxt(p.qty)}${p.origQty && p.origQty !== p.qty && !p.done ? `<small>ilk ${qtyTxt(p.origQty)}</small>` : ''}</td>
        <td class="num">${SV.fmt(p.entry)}</td>
        <td class="num">${s.px != null && !p.done ? SV.fmt(s.px) : '—'}</td>
        <td class="num ${cls(s.open)}">${s.px != null && !p.done ? usd(s.open) + `<small>${num(s.pct)}%${s.roe != null ? ' · ROE ' + num(s.roe, 1) + '%' : ''}</small>` : '—'}</td>
        <td class="num ${cls(s.realizedNet)}">${p.partial || p.fees || p.funding ? usd(s.realizedNet) + `<small>${p.partial ? 'kısmi satış dahil' : 'komisyon/fonlama'}</small>` : '—'}</td>
        <td class="num ${cls(s.px != null ? s.net : s.realizedNet)}"><b>${s.px != null || p.done ? usd(p.done ? s.realizedNet : s.net) : '—'}</b></td>
        <td class="num">${!p.done && s.be != null ? `<b>${SV.fmt(s.be)}</b>${beNote}` : '—'}</td>
        <td class="num">${s.liq && !p.done ? (p.src === 'Hyperliquid' ? '' : '~') + SV.fmt(s.liq) : '—'}</td>
        <td class="acts">${p.src === 'Hyperliquid' ? '' : `${p.done ? '' : `<button class="chip" data-close="${esc(p.id)}">Kısmi kapat</button>`}<button class="del" data-del="${esc(p.id)}" title="Sil">✕</button>`}</td>
      </tr>${closeFor === p.id ? closeRow(p, s) : ''}`;
    }).join('');
    $('acct').innerHTML = acctHtml(list);
    renderOrders();
    $('tradesTotal').innerHTML = have ? `Toplam net: <b class="num ${total >= 0 ? 'up' : 'down'}">${usd(total)}</b>` : '';
    $('tradesBody').innerHTML = rows || `<tr><td colspan="11" class="empty">Henüz işlem yok. "İşlem ekle" ile elle girebilir ya da Hyperliquid adresini bağlayabilirsin.</td></tr>`;
    const st = $('hlStatus');
    st.textContent = !hl.address ? '' : hl.err ? hl.err : hl.at ? `Hyperliquid: ${hl.address.slice(0, 6)}…${hl.address.slice(-4)} · ${hl.positions.length} pozisyon · ${new Date(hl.at).toLocaleTimeString('tr-TR')}` : 'Hyperliquid yükleniyor…';
    st.className = 'note' + (hl.err ? ' down' : '');
  }


  function closeRow(p, s) {
    const pxv = s.px != null ? s.px : p.entry;
    return `<tr class="closerow"><td colspan="11"><form class="cform" data-cform="${esc(p.id)}">
      <span>Kalan ${qtyTxt(p.qty)}. Satılan:</span>
      <button type="button" class="chip" data-pct="25">%25</button><button type="button" class="chip" data-pct="50">%50</button><button type="button" class="chip" data-pct="75">%75</button><button type="button" class="chip" data-pct="100">%100</button>
      <label>Miktar<input type="number" name="q" step="any" min="0" inputmode="decimal" value="${+(p.qty / 2).toPrecision(6)}"></label>
      <label>Fiyat<input type="number" name="px" step="any" min="0" inputmode="decimal" value="${pxv}"></label>
      <button class="btn sm" type="submit">Kaydet</button><button class="link" type="button" data-cancel="1">Vazgeç</button>
      <span class="note" data-prev></span>
    </form></td></tr>`;
  }
  function previewClose(form) {
    const t = manual.find(x => x.id === form.dataset.cform), q = parseFloat(form.q.value), px = parseFloat(form.px.value);
    if (!t || !(q > 0) || !(px > 0)) { form.querySelector('[data-prev]').textContent = ''; return; }
    const sim = view({ ...t, closes: [...(t.closes || []), { q, px, t: 0 }] }), st = stats({ ...sim, liq: null });
    form.querySelector('[data-prev]').textContent = sim.qty > 0 ? `Yeni başabaş: ${SV.fmt(st.be)} · gerçekleşen ${usd(st.realizedNet)}` : `Pozisyon kapanır · gerçekleşen ${usd(st.realizedNet)}`;
  }

  function syncLines() {
    if (!D) return;
    const cur = D.cur(), on = D.layer();
    const mine = on ? all().filter(p => p.symbol === cur.symbol && !p.done && p.qty > 0) : [];
    const ords = on ? (hl.open || []).filter(o => o.symbol === cur.symbol) : [];
    const key = JSON.stringify(mine.map(p => [p.id, p.entry, p.qty, p.side, p.liq, Math.round(stats(p).be * 1e6)])) + JSON.stringify(ords.map(o => [o.oid, o.px, o.sz]));
    if (key !== linesKey) {
      lines.forEach(l => D.candle.removePriceLine(l.pl));
      lines = [];
      linesKey = key;
      for (const p of mine) {
        const s = stats(p), col = p.side === 'long' ? '#26a69a' : '#ef5350';
        lines.push({ p, role: 'entry', pl: D.candle.createPriceLine({ price: p.entry, color: col, lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: '' }) });
        if (s.be != null && isFinite(s.be)) lines.push({ p, role: 'be', pl: D.candle.createPriceLine({ price: s.be, color: '#e6c229', lineWidth: 1, lineStyle: 1, axisLabelVisible: true, title: 'Başabaş' }) });
        if (s.liq) lines.push({ p, role: 'liq', pl: D.candle.createPriceLine({ price: s.liq, color: '#ff1744', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: (p.src === 'Hyperliquid' ? '' : '~') + 'Likidasyon' }) });
      }
      const KIND = { Limit: 'Limit', 'Stop Market': 'Stop', 'Stop Limit': 'Stop limit', 'Take Profit Market': 'TP', 'Take Profit Limit': 'TP limit' };
      for (const o of ords) {
        const k = KIND[o.type] || o.type, val = o.sz * (o.limit || o.px);
        lines.push({ role: 'ord', pl: D.candle.createPriceLine({ price: o.px, color: o.buy ? '#26a69a' : '#ef5350', lineWidth: 1, lineStyle: o.trigger ? 3 : 2, axisLabelVisible: true, title: `HL ${o.buy ? 'Alış' : 'Satış'} ${k} ${qtyTxt(o.sz)} · ${Math.round(val).toLocaleString('tr-TR')} $` }) });
      }
    }
    for (const l of lines) {
      if (!l.p) continue;
      const s = stats(l.p);
      if (l.role === 'be') { l.pl.applyOptions({ title: `Başabaş${l.p.src === 'Hyperliquid' ? ' (HL)' : ''}${s.beDist != null ? ' · ' + num(s.beDist) + '%' : ''}` }); continue; }
      if (l.role !== 'entry') continue;
      l.pl.applyOptions({ title: `${l.p.side === 'long' ? 'Long' : 'Short'} ${qtyTxt(l.p.qty)}${s.px != null ? ' · ' + usd(s.net) + ' (' + num(s.pct) + '%)' : ''}` });
    }
  }

  function tick() {
    const t = Date.now();
    if (t - lastTick < 500) return;
    lastTick = t;
    render(); syncLines();
  }

  function saveManual() { SV.store.set('seviye.islemler', manual); SV.history.render(); }

  function showForm(kind) {
    form = form === kind ? null : kind;
    const cur = D.cur(), bars = D.bars();
    $('tradeForm').hidden = form !== 'add';
    $('hlForm').hidden = form !== 'hl';
    if (form === 'add') {
      $('tfSym').value = cur.symbol;
      $('tfMkt').value = 'futures';
      $('tfUnit').value = 'usd';
      $('tfLev').value = 1;
      $('tfEntry').value = bars.length ? bars[bars.length - 1].c : '';
      $('tfQty').focus();
    }
    if (form === 'hl') $('hlAddr').value = hl.address;
  }

  function addManual(e) {
    e.preventDefault();
    const val = id => parseFloat(String($(id).value).replace(',', '.'));
    const entry = val('tfEntry'), amount = val('tfQty'), lev = val('tfLev'), fee = val('tfFee');
    const symbol = $('tfSym').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!symbol || !(entry > 0) || !(amount > 0)) { $('tfErr').textContent = 'Sembol, giriş fiyatı ve miktar gerekli.'; return; }
    const qty = $('tfUnit').value === 'usd' ? amount / entry : amount;
    manual.push({
      id: 'm:' + Date.now().toString(36), src: 'Elle', symbol, market: $('tfMkt').value, side: $('tfSide').value,
      entry, qty, lev: lev > 1 ? lev : lev === 1 ? 1 : null, fee: fee >= 0 ? fee : 0.045, t: Math.floor(Date.now() / 1000)
    });
    saveManual();
    $('tfErr').textContent = '';
    showForm(null);
    refreshTickers(); render(); syncLines();
  }

  function setAddress(e) {
    e.preventDefault();
    const a = $('hlAddr').value.trim();
    if (a && !/^0x[0-9a-fA-F]{40}$/.test(a)) { $('hlErr').textContent = 'Geçerli bir cüzdan adresi gir (0x ile başlayan 42 karakter). Özel anahtar değil, sadece adres.'; return; }
    hl.address = a.toLowerCase(); hl.positions = []; hl.orders = []; hl.at = 0; hl.err = '';
    SV.store.set('seviye.hl', { address: hl.address });
    SV.history.setAddress(hl.address);
    $('hlErr').textContent = '';
    showForm(null);
    clearInterval(hlTimer);
    if (hl.address) { refreshHL(); hlTimer = setInterval(refreshHL, 8000); }
    render(); syncLines();
  }

  function init(deps) {
    D = deps;
    manual = SV.store.get('seviye.islemler', []);
    hl.address = (SV.store.get('seviye.hl', {}) || {}).address || '';
    open = SV.store.get('seviye.islemlerAcik', true);
    $('tradesToggle').addEventListener('click', () => { open = !open; SV.store.set('seviye.islemlerAcik', open); $('tradesToggle').textContent = open ? '▾' : '▸'; render(); applyHeight(); });
    $('tradesToggle').textContent = open ? '▾' : '▸';
    $('tradeAddBtn').addEventListener('click', () => showForm('add'));
    $('hlBtn').addEventListener('click', () => showForm('hl'));
    $('tradeForm').addEventListener('submit', addManual);
    $('hlForm').addEventListener('submit', setAddress);
    $('tfCancel').addEventListener('click', () => showForm(null));
    $('hlCancel').addEventListener('click', () => showForm(null));
    $('tfSideSeg').addEventListener('click', e => {
      const b = e.target.closest('button[data-v]');
      if (!b) return;
      $('tfSide').value = b.dataset.v;
      for (const x of $('tfSideSeg').children) x.setAttribute('aria-pressed', x === b);
    });
    $('tradesBody').addEventListener('click', e => {
      const del = e.target.closest('[data-del]'), go = e.target.closest('[data-go]');
      const cl = e.target.closest('[data-close]'), pc = e.target.closest('[data-pct]'), cancel = e.target.closest('[data-cancel]');
      if (cl) { closeFor = closeFor === cl.dataset.close ? null : cl.dataset.close; render(true); const f = $('tradesBody').querySelector('[data-cform]'); if (f) previewClose(f); return; }
      if (pc) { const f = pc.closest('form'), v = view(manual.find(x => x.id === f.dataset.cform)); f.q.value = +(v.qty * pc.dataset.pct / 100).toPrecision(8); previewClose(f); return; }
      if (cancel) { closeFor = null; render(true); return; }
      if (del) { manual = manual.filter(t => t.id !== del.dataset.del); if (closeFor === del.dataset.del) closeFor = null; saveManual(); render(true); syncLines(); }
      else if (go) { const p = all().find(x => x.id === go.dataset.go); if (p && p.symbol) D.goTo(p.market, p.symbol); }
    });
    $('tradesBody').addEventListener('input', e => { const f = e.target.closest('[data-cform]'); if (f) previewClose(f); });
    $('tradesBody').addEventListener('submit', e => {
      const f = e.target.closest('[data-cform]');
      if (!f) return;
      e.preventDefault();
      const t = manual.find(x => x.id === f.dataset.cform), v = t && view(t);
      const q = Math.min(parseFloat(f.q.value), v ? v.qty : 0), px = parseFloat(f.px.value);
      if (!t || !(q > 0) || !(px > 0)) return;
      t.closes = [...(t.closes || []), { q, px, t: Math.floor(Date.now() / 1000) }];
      saveManual(); closeFor = null; render(true); syncLines();
    });
    $('tradesTabs').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) setTab(b.dataset.v); });
    SV.history.init({ focus: D.focus, redraw: D.resized });
    initResize();
    tabNow = SV.store.get('seviye.islemSekme', 'pos');
    setTab(['pos', 'ord', 'hist', 'ana', 'kur', 'not'].includes(tabNow) ? tabNow : 'pos', true);
    $('ordView').addEventListener('click', e => { const b = e.target.closest('[data-ogo]'); if (!b) return; const m = mapCoin(b.dataset.ogo); if (m) D.goTo(m.market, m.symbol); });
    $('ordView').addEventListener('keydown', e => { if (e.key !== 'Enter') return; const b = e.target.closest('[data-ogo]'); if (!b) return; const m = mapCoin(b.dataset.ogo); if (m) D.goTo(m.market, m.symbol); });
    if (hl.address) { SV.history.setAddress(hl.address); refreshHL(); hlTimer = setInterval(refreshHL, 8000); }
    refreshTickers(); tkTimer = setInterval(refreshTickers, 10000);
    render();
  }

  return { init, tick, render, syncLines, refreshTickers, stats, mapCoin, closedManual, post: hlPost, tab: () => tabNow, show: t => setTab(t), isOpen: () => open, util: { num, usd, esc, qtyTxt }, _state: () => ({ manual, hl }) };
})();
