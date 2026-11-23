window.SV = window.SV || {};

SV.history = (() => {
  const DAY = 864e5;
  let D = null, addr = '', fills = [], funding = [], portfolio = null, trips = [], openTrips = {}, marksCache = {};
  let busy = false, err = '', at = 0, timer = null, period = '30', coinF = '', loaded = false;
  const $ = id => document.getElementById(id);
  const U = () => SV.trades.util;

  const fkey = f => f.tid != null ? 't' + f.tid : [f.time, f.coin, f.oid, f.px, f.sz, f.side].join('|');
  const isPerp = f => /Long|Short/.test(f.dir || '') && !String(f.coin).startsWith('@') && !String(f.coin).includes('/');

  async function range(body, s, e, limit, depth, out) {
    if (depth > 14) return;
    const page = await SV.trades.post({ ...body, startTime: s, endTime: e });
    if (!Array.isArray(page) || !page.length) return;
    out.push(...page);
    if (page.length < limit) return;
    let mn = Infinity, mx = -Infinity;
    for (const x of page) { mn = Math.min(mn, x.time); mx = Math.max(mx, x.time); }
    if (mn > s) await range(body, s, mn, limit, depth + 1, out);
    if (mx < e) await range(body, mx, e, limit, depth + 1, out);
  }

  async function refresh(full) {
    if (!addr || busy) return;
    busy = true;
    const me = addr;
    try {
      const now = Date.now();
      const fStart = !full && fills.length ? fills[fills.length - 1].time : 0;
      const nf = [];
      await range({ type: 'userFillsByTime', user: me, aggregateByTime: true }, fStart, now, 2000, 0, nf);
      if (me !== addr) return;
      const seen = new Set(fills.map(fkey));
      for (const f of nf) { const k = fkey(f); if (!seen.has(k)) { seen.add(k); fills.push(f); } }
      fills.sort((a, b) => a.time - b.time || (a.tid || 0) - (b.tid || 0));
      const first = fills.length ? fills[0].time : now;
      const uStart = !full && funding.length ? funding[funding.length - 1].time : first;
      const nu = [];
      await range({ type: 'userFunding', user: me }, uStart, now, 500, 0, nu).catch(() => {});
      if (me !== addr) return;
      const useen = new Set(funding.map(x => x.time + '|' + (x.delta && x.delta.coin)));
      for (const x of nu) { const k = x.time + '|' + (x.delta && x.delta.coin); if (x.delta && !useen.has(k)) { useen.add(k); funding.push(x); } }
      funding.sort((a, b) => a.time - b.time);
      portfolio = await SV.trades.post({ type: 'portfolio', user: me }).catch(() => portfolio);
      build();
      err = ''; at = Date.now(); loaded = true;
    } catch (e) {
      err = 'İşlem geçmişi alınamadı (' + e.message + ').';
    }
    busy = false;
    render();
    SV.trades.render(); SV.trades.syncLines();
    if (D) D.redraw();
  }

  function fundSum(coin, t0, t1) {
    let s = 0;
    for (const x of funding) if (x.delta.coin === coin && x.time >= t0 && x.time <= t1) s += +x.delta.usdc || 0;
    return s;
  }

  function trip(coin, side, t, partial) {
    return { coin, side, start: t, end: t, entQ: 0, entN: 0, exitQ: 0, exitN: 0, pnl: 0, fee: 0, maxQ: 0, fills: 0, partial: !!partial, src: 'Hyperliquid' };
  }

  function finish(c) {
    const dir = c.side === 'long' ? 1 : -1, m = SV.trades.mapCoin(c.coin);
    c.entry = c.entQ ? c.entN / c.entQ : null;
    c.exit = c.exitQ ? c.exitN / c.exitQ : null;
    c.ret = c.entry && c.exit ? dir * (c.exit - c.entry) / c.entry * 100 : null;
    c.size = c.maxQ * (c.entry || c.exit || 0);
    c.funding = fundSum(c.coin, c.start, c.end);
    c.net = c.pnl - c.fee + c.funding;
    c.symbol = m ? m.symbol : null; c.market = m ? m.market : null;
    return c;
  }

  function build() {
    const by = {};
    for (const f of fills) if (isPerp(f)) (by[f.coin] = by[f.coin] || []).push(f);
    trips = []; openTrips = {}; marksCache = {};
    for (const coin in by) {
      let cur = null;
      for (const f of by[coin]) {
        const sz = +f.sz, px = +f.px, sgn = f.side === 'B' ? 1 : -1, start = +f.startPosition, end = start + sgn * sz;
        const fee = +f.fee || 0, pnl = +f.closedPnl || 0, eps = Math.max(sz, Math.abs(start)) * 1e-7;
        let closeQ = 0, openQ = sz;
        if (Math.abs(start) > eps && Math.sign(start) !== sgn) { closeQ = Math.min(sz, Math.abs(start)); openQ = sz - closeQ; }
        if (closeQ > 0) {
          if (!cur) { cur = trip(coin, start > 0 ? 'long' : 'short', f.time, true); cur.maxQ = Math.abs(start); }
          const dir = cur.side === 'long' ? 1 : -1;
          if (cur.partial) { cur.entQ += closeQ; cur.entN += closeQ * (px - pnl / (dir * closeQ)); }
          cur.exitQ += closeQ; cur.exitN += closeQ * px; cur.pnl += pnl; cur.fee += fee * closeQ / sz; cur.end = f.time; cur.fills++;
          if (Math.abs(end) <= eps || (openQ > eps)) { trips.push(finish(cur)); cur = null; }
        }
        if (openQ > eps) {
          if (!cur) cur = trip(coin, sgn > 0 ? 'long' : 'short', f.time, Math.abs(start) > eps && Math.sign(start) === sgn);
          if (!cur.partial) { cur.entQ += openQ; cur.entN += openQ * px; }
          cur.fee += fee * openQ / sz; cur.maxQ = Math.max(cur.maxQ, Math.abs(end)); cur.fills++; cur.end = f.time;
        }
      }
      if (cur) openTrips[coin] = cur;
    }
    trips.sort((a, b) => b.end - a.end);
  }

  function openInfo(coin) {
    const c = openTrips[coin];
    if (!c || !loaded) return null;
    return { start: c.start, pnl: c.pnl, fee: c.fee, funding: fundSum(coin, c.start, Date.now()) };
  }

  function marks(symbol) {
    if (!loaded) return null;
    if (marksCache[symbol]) return marksCache[symbol];
    const out = [];
    for (const f of fills) {
      if (!isPerp(f)) continue;
      const m = SV.trades.mapCoin(f.coin);
      if (!m || m.symbol !== symbol) continue;
      out.push({ t: f.time / 1000, px: +f.px, side: f.side === 'B' ? 1 : -1, sz: +f.sz, pnl: (+f.closedPnl || 0) - (+f.fee || 0), close: /Close|>/.test(f.dir) });
    }
    return (marksCache[symbol] = out);
  }

  function all() {
    const man = SV.trades.closedManual();
    return [...trips, ...man].sort((a, b) => b.end - a.end);
  }

  function selected() {
    const lim = period === 'all' ? 0 : Date.now() - (+period) * DAY;
    return all().filter(t => t.end >= lim && (!coinF || t.coin === coinF));
  }

  function summary(list) {
    const s = { n: list.length, win: 0, loss: 0, net: 0, gross: 0, fee: 0, fund: 0, sw: 0, sl: 0, best: null, worst: null, hw: 0, hl: 0, streak: 0, dd: 0 };
    let run = 0, eq = 0, peak = 0;
    const asc = [...list].sort((a, b) => a.end - b.end);
    s.curve = [];
    for (const t of asc) {
      s.net += t.net; s.gross += t.pnl; s.fee += t.fee; s.fund += t.funding || 0;
      if (t.net > 0) { s.win++; s.sw += t.net; s.hw += t.end - t.start; run = 0; }
      else { s.loss++; s.sl += t.net; s.hl += t.end - t.start; run++; s.streak = Math.max(s.streak, run); }
      if (!s.best || t.net > s.best.net) s.best = t;
      if (!s.worst || t.net < s.worst.net) s.worst = t;
      eq += t.net; peak = Math.max(peak, eq); s.dd = Math.min(s.dd, eq - peak);
      s.curve.push([t.end, eq]);
    }
    s.rate = s.n ? s.win / s.n : 0;
    s.avgW = s.win ? s.sw / s.win : 0;
    s.avgL = s.loss ? s.sl / s.loss : 0;
    s.pf = s.sl ? s.sw / -s.sl : s.sw > 0 ? Infinity : 0;
    s.exp = s.n ? s.net / s.n : 0;
    s.holdW = s.win ? s.hw / s.win : 0;
    s.holdL = s.loss ? s.hl / s.loss : 0;
    return s;
  }

  const dur = ms => ms < 36e5 ? Math.max(1, Math.round(ms / 6e4)) + ' dk' : ms < 48 * 36e5 ? (ms / 36e5).toFixed(ms < 10 * 36e5 ? 1 : 0).replace('.', ',') + ' sa' : Math.round(ms / DAY) + ' gün';
  const when = t => new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const cls = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
  const pct = v => (v * 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + '%';

  function bar() {
    const coins = [...new Set(all().map(t => t.coin))].sort();
    if (coinF && !coins.includes(coinF)) coinF = '';
    const P = [['7', '7G'], ['30', '30G'], ['90', '90G'], ['365', '1Y'], ['all', 'Tümü']];
    return `<div class="hbar">
      <div class="seg sm" data-hp>${P.map(([v, l]) => `<button data-v="${v}" aria-pressed="${period === v}">${l}</button>`).join('')}</div>
      <select data-hc aria-label="Sembol filtresi"><option value="">Tüm semboller</option>${coins.map(c => `<option ${c === coinF ? 'selected' : ''}>${U().esc(c)}</option>`).join('')}</select>
      <button class="chip" data-hr ${busy ? 'disabled' : ''}>${busy ? 'Yükleniyor…' : 'Yenile'}</button>
      <span class="note">${status()}</span>
    </div>`;
  }

  function status() {
    if (!addr) return 'Hyperliquid bağlı değil; sadece elle girilen kapanmış işlemler görünür.';
    if (err) return err;
    if (!loaded) return 'Hyperliquid geçmişi yükleniyor…';
    const old = fills.length ? new Date(fills[0].time).toLocaleDateString('tr-TR') : '';
    return `${trips.length} kapanmış işlem · ${fills.length.toLocaleString('tr-TR')} dolum${old ? ' · ' + old + "'den beri" : ''}${fills.length >= 9990 ? ' (Hyperliquid son 10.000 dolumu verir)' : ''} · ${new Date(at).toLocaleTimeString('tr-TR')}`;
  }

  function histHtml() {
    const { usd, num, esc, qtyTxt } = U(), list = selected();
    if (!list.length) return bar() + `<p class="empty">Bu dönemde kapanmış işlem yok.</p>`;
    const rows = list.slice(0, 400).map((t, k) => `<tr data-hi="${k}">
      <td>${when(t.end)}</td>
      <td><span class="src">${t.src === 'Hyperliquid' ? 'HL' : 'Elle'}</span> <button class="lnk" ${t.symbol ? '' : 'disabled'}>${esc(t.coin)}</button>${t.partial ? '<small>açılış geçmişte yok</small>' : ''}</td>
      <td><span class="tag ${t.side === 'long' ? 'buy' : 'sell'}">${t.side === 'long' ? 'Long' : 'Short'}</span></td>
      <td class="num">${dur(t.end - t.start)}</td>
      <td class="num">${t.size ? Math.round(t.size).toLocaleString('tr-TR') + ' $' : '—'}<small>${qtyTxt(t.maxQ)}</small></td>
      <td class="num">${t.entry ? SV.fmt(t.entry) : '—'}</td>
      <td class="num">${t.exit ? SV.fmt(t.exit) : '—'}</td>
      <td class="num ${cls(t.ret)}">${t.ret != null ? num(t.ret) + '%' : '—'}</td>
      <td class="num ${cls(t.pnl)}">${usd(t.pnl)}</td>
      <td class="num">${usd(-t.fee)}</td>
      <td class="num ${cls(t.funding)}">${t.funding ? usd(t.funding) : '—'}</td>
      <td class="num ${cls(t.net)}"><b>${usd(t.net)}</b></td>
    </tr>`).join('');
    return bar() + `<div class="tscroll"><table class="ttable htable"><thead><tr><th>Kapanış</th><th>Sembol</th><th>Yön</th><th>Süre</th><th>Büyüklük</th><th>Ort. giriş</th><th>Ort. çıkış</th><th>Getiri</th><th>Brüt K/Z</th><th>Komisyon</th><th>Fonlama</th><th>Net</th></tr></thead><tbody>${rows}</tbody></table></div>${list.length > 400 ? `<p class="note">İlk 400 işlem gösteriliyor (toplam ${list.length}).</p>` : ''}`;
  }

  function curve(s) {
    if (s.curve.length < 2) return '';
    const W = 640, H = 120, pts = [[s.curve[0][0] - 1, 0], ...s.curve];
    const t0 = pts[0][0], t1 = pts[pts.length - 1][0], vs = pts.map(p => p[1]);
    const lo = Math.min(0, ...vs), hi = Math.max(0, ...vs), sp = hi - lo || 1;
    const x = t => 4 + (t - t0) / ((t1 - t0) || 1) * (W - 8), y = v => 6 + (hi - v) / sp * (H - 12);
    const d = pts.map((p, k) => (k ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(' ');
    const col = s.net >= 0 ? 'var(--up)' : 'var(--down)';
    return `<figure class="eq"><figcaption>Kümülatif net K/Z <span class="note">(kapanış sırasına göre)</span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Kümülatif net kâr zarar eğrisi">
        <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)" stroke-dasharray="4 4"/>
        <path d="${d} L${x(t1).toFixed(1)} ${y(0)} L${x(t0)} ${y(0)} Z" fill="${col}" opacity=".12"/>
        <path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="eqax note"><span>${new Date(t0).toLocaleDateString('tr-TR')}</span><span>${new Date(t1).toLocaleDateString('tr-TR')}</span></div></figure>`;
  }

  function insights(list, s) {
    const out = [], { usd } = U();
    if (s.n < 5) return out;
    if (s.loss >= 3 && s.win >= 3 && s.holdL > s.holdW * 1.5) out.push(`Kaybeden işlemleri ortalama ${dur(s.holdL)}, kazananları ${dur(s.holdW)} tutmuşsun. Zararda olan pozisyonlar kârdakilerden ${(s.holdL / s.holdW).toFixed(1).replace('.', ',')} kat uzun açık kalıyor.`);
    else if (s.loss >= 3 && s.win >= 3 && s.holdW > s.holdL * 2) out.push(`Kazananları kaybedenlerden ${(s.holdW / s.holdL).toFixed(1).replace('.', ',')} kat uzun tutuyorsun; zararı erken kesiyorsun.`);
    if (s.rate >= 0.5 && s.avgL && Math.abs(s.avgL) > s.avgW) out.push(`Kazanma oranın %${Math.round(s.rate * 100)} ama ortalama kayıp (${usd(s.avgL)}) ortalama kazançtan (${usd(s.avgW)}) büyük.`);
    if (s.rate < 0.5 && s.avgW > Math.abs(s.avgL) && s.net > 0) out.push(`Kazanma oranın %${Math.round(s.rate * 100)}, ama kazançlar kayıplardan büyük olduğu için toplam kârdasın.`);
    const L = summary(list.filter(t => t.side === 'long')), Sh = summary(list.filter(t => t.side === 'short'));
    if (L.n >= 3 && Sh.n >= 3 && Math.sign(L.net) !== Math.sign(Sh.net)) out.push(`Long işlemlerin toplam ${usd(L.net)} (%${Math.round(L.rate * 100)} kazanan), short işlemlerin ${usd(Sh.net)} (%${Math.round(Sh.rate * 100)} kazanan).`);
    if (s.gross > 0 && s.fee > s.gross * 0.25) out.push(`Komisyonlar brüt kârın %${Math.round(s.fee / s.gross * 100)}'i kadar (${usd(-s.fee)}).`);
    if (Math.abs(s.fund) > Math.max(5, Math.abs(s.net) * 0.1)) out.push(`Fonlama toplamı ${usd(s.fund)}; net sonucun önemli bir kısmı.`);
    const by = coins(list).filter(c => c.s.n >= 3);
    const worst = by.filter(c => c.s.net < 0).sort((a, b) => a.s.net - b.s.net)[0], best = by.filter(c => c.s.net > 0).sort((a, b) => b.s.net - a.s.net)[0];
    if (best) out.push(`En kârlı sembol ${best.c}: ${best.s.n} işlemde ${usd(best.s.net)}.`);
    if (worst) out.push(`En çok kaybettiren sembol ${worst.c}: ${worst.s.n} işlemde ${usd(worst.s.net)}.`);
    if (s.streak >= 4) out.push(`Üst üste en uzun kayıp serisi ${s.streak} işlem.`);
    return out;
  }

  function coins(list) {
    const g = {};
    for (const t of list) (g[t.coin] = g[t.coin] || []).push(t);
    return Object.entries(g).map(([c, l]) => ({ c, s: summary(l) })).sort((a, b) => b.s.net - a.s.net);
  }

  const per1k = t => t.size > 0 ? t.net / t.size * 1000 : t.ret != null ? t.ret * 10 : null;
  const CATS = [['Süper', 200, 'up'], ['Çok başarılı', 100, 'up'], ['Başarılı', 50, 'up'], ['Küçük kâr', 0, ''], ['Zarar', -Infinity, 'down']];
  const catOf = v => CATS.findIndex(c => v >= c[1] && (c[1] !== 0 || v > 0) || c[1] === -Infinity);

  function tiersHtml(list) {
    const rows = list.map(t => ({ v: per1k(t), d: (t.end - t.start) / DAY })).filter(r => r.v != null);
    if (!rows.length) return '';
    const B = [['Tümü', () => true], ['≤ 7 gün', r => r.d <= 7], ['7–30 gün', r => r.d > 7 && r.d <= 30], ['> 30 gün', r => r.d > 30]];
    const cnt = B.map(([, f]) => { const g = rows.filter(f), c = [0, 0, 0, 0, 0]; for (const r of g) c[catOf(r.v)]++; return { n: g.length, c }; });
    const cell = (x, k) => x.n ? `${x.c[k]} <small>${Math.round(x.c[k] / x.n * 100)}%</small>` : '—';
    const ok = cnt[0].c[0] + cnt[0].c[1] + cnt[0].c[2];
    return `<div class="tiers"><h3>Kâr kademeleri <span class="note">(1.000 $'lık pozisyon başına net: başarılı +50 $, çok başarılı +100 $, süper +200 $)</span></h3>
      <table><thead><tr><th>Kademe</th>${B.map(b => `<th>${b[0]}</th>`).join('')}</tr></thead><tbody>
      ${CATS.map((c, k) => `<tr><td class="${c[2]}">${c[0]}${c[1] > 0 ? ` <small>≥ +${c[1]} $</small>` : c[1] === 0 ? ' <small>0–50 $</small>' : ''}</td>${cnt.map(x => `<td class="num">${cell(x, k)}</td>`).join('')}</tr>`).join('')}
      <tr><td>İşlem</td>${cnt.map(x => `<td class="num">${x.n}</td>`).join('')}</tr></tbody></table>
      <p class="note">${ok} işlem (%${Math.round(ok / cnt[0].n * 100)}) en az başarılı (+50 $) seviyesinde. Kısa süreli (≤ 7 gün) işlemlerde +50–100 $ yeterli kabul edilir. Net = fiyat farkı − komisyon + fonlama; kaldıraç hesaba katılmaz, 1.000 $'lık pozisyon büyüklüğüne göredir.</p></div>`;
  }

  function pfTxt(v) { return v === Infinity ? '∞' : v.toFixed(2).replace('.', ','); }

  function portfolioHtml() {
    if (!Array.isArray(portfolio)) return '';
    const P = Object.fromEntries(portfolio), { usd } = U();
    const last = k => { const h = P[k] && P[k].pnlHistory; return h && h.length ? +h[h.length - 1][1] - +h[0][1] : null; };
    const av = P.day && P.day.accountValueHistory && P.day.accountValueHistory.length ? +P.day.accountValueHistory[P.day.accountValueHistory.length - 1][1] : null;
    const items = [['day', '1 gün'], ['week', '1 hafta'], ['month', '1 ay'], ['allTime', 'Tümü']].map(([k, l]) => { const v = last(k); return v == null ? '' : `<span>${l}: <b class="num ${cls(v)}">${usd(v)}</b></span>`; }).join('');
    return `<p class="note hlacc">Hyperliquid hesabı${av != null ? `: değer <b class="num">${Math.round(av).toLocaleString('tr-TR')} $</b>` : ''} · K/Z (açık pozisyonlar dahil) ${items}</p>`;
  }

  function anaHtml() {
    const { usd } = U(), list = selected(), s = summary(list);
    if (!s.n) return bar() + portfolioHtml() + `<p class="empty">Bu dönemde analiz edilecek kapanmış işlem yok.</p>`;
    const k = (h, v, sub, c = '') => `<div class="kpi"><span>${h}</span><b class="num ${c}">${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const L = summary(list.filter(t => t.side === 'long')), Sh = summary(list.filter(t => t.side === 'short'));
    const side = (n, x) => `<tr><td>${n}</td><td class="num">${x.n}</td><td class="num">${x.n ? pct(x.rate) : '—'}</td><td class="num ${cls(x.net)}">${x.n ? usd(x.net) : '—'}</td><td class="num">${x.n ? usd(x.exp) : '—'}</td></tr>`;
    const cs = coins(list), ins = insights(list, s);
    return bar() + portfolioHtml() + `<div class="ana">
      <div class="kpis">
        ${k('Net K/Z', usd(s.net), `brüt ${usd(s.gross)}`, cls(s.net))}
        ${k('Kazanma oranı', pct(s.rate), `${s.win} kazanan · ${s.loss} kaybeden`)}
        ${k('Kâr faktörü', pfTxt(s.pf), 'toplam kazanç / toplam kayıp')}
        ${k('İşlem başına', usd(s.exp), `${s.n} işlem`, cls(s.exp))}
        ${k('Ort. kazanç / kayıp', `${usd(s.avgW)}`, `kayıp ${usd(s.avgL)}`)}
        ${k('En iyi işlem', usd(s.best.net), `${U().esc(s.best.coin)} · en kötü: ${U().esc(s.worst.coin)} ${usd(s.worst.net)}`, cls(s.best.net))}
        ${k('Komisyon + fonlama', usd(-s.fee + s.fund), `komisyon ${usd(-s.fee)} · fonlama ${usd(s.fund)}`, cls(-s.fee + s.fund))}
        ${k('En büyük geri çekilme', usd(s.dd), `en uzun kayıp serisi ${s.streak}`, s.dd < 0 ? 'down' : '')}
        ${k('Ort. tutma süresi', s.win ? dur(s.holdW) : '—', `kaybedenler ${s.loss ? dur(s.holdL) : '—'}`)}
      </div>
      ${tiersHtml(list)}
      ${curve(s)}
      <div class="anagrid">
        <table><thead><tr><th>Yön</th><th>Adet</th><th>Kazanan</th><th>Net</th><th>İşlem başı</th></tr></thead><tbody>${side('Long', L)}${side('Short', Sh)}</tbody></table>
        <table><thead><tr><th>Sembol</th><th>Adet</th><th>Kazanan</th><th>Net</th><th>İşlem başı</th></tr></thead><tbody>${cs.slice(0, 12).map(c => side(U().esc(c.c), c.s)).join('')}</tbody></table>
      </div>
      ${ins.length ? `<h3>Gözlemler</h3><ul class="ins">${ins.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
      <p class="note">Net = kapanış K/Z − komisyon + fonlama. Hesaplar Hyperliquid dolum geçmişinden yapılır; bir pozisyon sıfırlanınca işlem kapanmış sayılır. Yatırım tavsiyesi değildir.</p>
    </div>`;
  }

  function render() {
    if (!D) return;
    const tab = SV.trades.tab();
    if (tab === 'hist') $('histView').innerHTML = histHtml();
    if (tab === 'ana') $('anaView').innerHTML = anaHtml();
  }

  function onClick(e) {
    const p = e.target.closest('[data-hp] button'), r = e.target.closest('[data-hr]'), row = e.target.closest('[data-hi]');
    if (p) { period = p.dataset.v; SV.store.set('seviye.gecmis', { period }); render(); return; }
    if (r) { refresh(true); render(); return; }
    if (row && e.target.closest('.lnk')) {
      const t = selected()[+row.dataset.hi];
      if (t && t.symbol) D.focus(t.market, t.symbol, t.start / 1000, t.end / 1000);
    }
  }

  function setAddress(a) {
    addr = a; fills = []; funding = []; portfolio = null; trips = []; openTrips = {}; marksCache = {}; loaded = false; err = ''; at = 0;
    clearInterval(timer);
    if (addr) { refresh(true); timer = setInterval(() => refresh(false), 60000); }
    render();
    if (D) D.redraw();
  }

  function init(deps) {
    D = deps;
    period = (SV.store.get('seviye.gecmis', {}) || {}).period || '30';
    for (const id of ['histView', 'anaView']) {
      $(id).addEventListener('click', onClick);
      $(id).addEventListener('change', e => { if (e.target.matches('[data-hc]')) { coinF = e.target.value; render(); } });
    }
  }

  return { init, setAddress, refresh, render, marks, openInfo, summary, _state: () => ({ fills, funding, trips, openTrips }) };
})();
