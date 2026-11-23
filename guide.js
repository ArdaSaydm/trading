window.SV = window.SV || {};

SV.guide = (() => {
  const flip = pts => pts.map(([x, y]) => [x, 60 - y]);
  const flipL = ls => ls.map(flip);
  const P = {
    hs: { path: [[0, 52], [14, 30], [24, 40], [40, 10], [55, 40], [68, 28], [80, 42], [96, 58]], lines: [[[18, 40], [88, 42]]] },
    dtop: { path: [[0, 56], [22, 12], [40, 36], [60, 12], [76, 36], [96, 56]], lines: [[[28, 36], [88, 36]]] },
    asc: { path: [[0, 56], [16, 16], [26, 46], [42, 16], [52, 36], [66, 16], [74, 28], [86, 16], [97, 3]], lines: [[[10, 16], [92, 16]], [[22, 48], [82, 23]]] },
    sym: { path: [[0, 30], [12, 8], [24, 52], [38, 16], [50, 44], [62, 22], [72, 36], [82, 26], [97, 9]], lines: [[[10, 6], [90, 28]], [[20, 54], [90, 33]]] },
    flag: { path: [[0, 57], [24, 10], [31, 21], [37, 14], [45, 25], [51, 19], [59, 30], [65, 24], [80, 6], [97, 2]], lines: [[[24, 10], [66, 23]], [[30, 22], [60, 32]]] },
    pennant: { path: [[0, 57], [24, 9], [32, 22], [38, 13], [44, 20], [49, 15], [54, 18], [70, 4], [80, 1]], lines: [[[24, 8], [57, 16]], [[30, 23], [57, 18]]] },
    fwedge: { path: [[0, 8], [14, 30], [22, 18], [38, 40], [46, 30], [60, 46], [66, 40], [76, 50], [86, 30], [97, 12]], lines: [[[0, 7], [76, 44]], [[10, 28], [80, 51]]] },
    cup: { path: [[0, 10], [8, 28], [20, 44], [35, 51], [50, 45], [62, 30], [70, 12], [76, 20], [82, 17], [88, 10], [97, 2]], lines: [[[0, 10], [92, 10]]] },
    chan: { path: [[0, 50], [12, 34], [20, 44], [34, 26], [42, 36], [56, 18], [64, 28], [78, 10], [86, 20]], lines: [[[10, 33], [82, 9]], [[0, 50], [90, 21]]] },
    ttop: { path: [[0, 56], [15, 14], [28, 34], [45, 14], [58, 34], [75, 14], [85, 34], [97, 56]], lines: [[[22, 34], [92, 34]]] },
    rect: { path: [[0, 52], [10, 15], [22, 45], [34, 15], [46, 45], [58, 15], [70, 45], [82, 15], [97, 2]], lines: [[[6, 15], [86, 15]], [[16, 45], [76, 45]]] },
    round: { path: [[0, 8], [10, 22], [22, 36], [36, 46], [50, 48], [64, 44], [76, 34], [86, 20], [97, 5]], lines: [] },
    para: { path: [[0, 56], [30, 53], [50, 47], [65, 37], [75, 25], [82, 13], [86, 5], [90, 15], [97, 42]], lines: [] },
    broad: { path: [[0, 30], [12, 24], [22, 36], [34, 16], [46, 44], [60, 8], [74, 52], [88, 4]], lines: [[[8, 26], [90, 2]], [[18, 35], [80, 55]]] },
    diamond: { path: [[0, 52], [12, 30], [22, 38], [34, 12], [46, 46], [58, 18], [68, 38], [78, 27], [86, 32], [97, 56]], lines: [[[10, 31], [36, 10]], [[36, 10], [88, 31]], [[10, 31], [46, 48]], [[46, 48], [88, 33]]] }
  };
  const mk = (k, f) => f ? { path: flip(P[k].path), lines: flipL(P[k].lines) } : P[k];

  const ITEMS = [
    { name: 'Omuz-baş-omuz', en: 'Head and Shoulders', kind: 'Dönüş', bias: -1, shape: mk('hs'), auto: true,
      see: 'Yükseliş sonunda üç tepe: ortadaki (baş) en yüksek, iki yandaki (omuzlar) yaklaşık eşit. Dipler boyun çizgisini oluşturur.',
      trade: 'Giriş: boyun çizgisinin altında kapanış. Stop: sağ omuzun üstü. Hedef: baş ile boyun arası mesafe, kırılım noktasından aşağı.' },
    { name: 'Ters omuz-baş-omuz', en: 'Inverse Head and Shoulders', kind: 'Dönüş', bias: 1, shape: mk('hs', true), auto: true,
      see: 'Düşüş sonunda üç dip: ortadaki en derin. Aradaki tepeler boyun çizgisini oluşturur.',
      trade: 'Giriş: boyun çizgisinin üstünde kapanış. Stop: sağ omuzun altı. Hedef: baş ile boyun arası mesafe, kırılımdan yukarı.' },
    { name: 'İkili tepe', en: 'Double Top (M)', kind: 'Dönüş', bias: -1, shape: mk('dtop'), auto: true,
      see: 'Yükselişten sonra fiyat aynı seviyeyi iki kez test edip geçemez, "M" harfi çizer.',
      trade: 'Giriş: iki tepe arasındaki dibin (boyun) altında kapanış. Stop: tepelerin üstü. Hedef: tepe–boyun yüksekliği kadar aşağı.' },
    { name: 'İkili dip', en: 'Double Bottom (W)', kind: 'Dönüş', bias: 1, shape: mk('dtop', true), auto: true,
      see: 'Düşüşten sonra aynı destek iki kez tutar, "W" harfi oluşur.',
      trade: 'Giriş: aradaki tepenin üstünde kapanış. Stop: diplerin altı. Hedef: dip–boyun yüksekliği kadar yukarı.' },
    { name: 'Yükselen üçgen', en: 'Ascending Triangle', kind: 'Devam (çoğunlukla)', bias: 1, shape: mk('asc'), auto: true,
      see: 'Yatay bir direnç ve giderek yükselen dipler. Alıcılar her seferinde daha erken giriyor.',
      trade: 'Giriş: direncin üstünde kapanış. Stop: son yükselen dibin altı. Hedef: üçgenin başlangıçtaki yüksekliği kadar yukarı.' },
    { name: 'Alçalan üçgen', en: 'Descending Triangle', kind: 'Devam (çoğunlukla)', bias: -1, shape: mk('asc', true), auto: true,
      see: 'Yatay bir destek ve giderek alçalan tepeler. Satıcılar baskın.',
      trade: 'Giriş: desteğin altında kapanış. Stop: son alçalan tepenin üstü. Hedef: başlangıç yüksekliği kadar aşağı.' },
    { name: 'Simetrik üçgen', en: 'Symmetrical Triangle', kind: 'Devam', bias: 0, shape: mk('sym'), auto: true,
      see: 'Alçalan tepeler ve yükselen dipler birbirine yaklaşır. Yön kırılımla belli olur, genelde önceki trend yönünde.',
      trade: 'Giriş: hangi yöne kapanışla kırılırsa. Stop: üçgenin karşı kenarı. Hedef: başlangıç yüksekliği kadar kırılım yönünde.' },
    { name: 'Boğa bayrağı', en: 'Bull Flag', kind: 'Devam', bias: 1, shape: mk('flag'), auto: true,
      see: 'Sert yükseliş (direk) ardından hafif aşağı eğimli dar bir konsolidasyon (bayrak).',
      trade: 'Giriş: bayrağın üst kenarının kırılması. Stop: bayrağın dibi. Hedef: direk uzunluğu kadar kırılımdan yukarı.' },
    { name: 'Ayı bayrağı', en: 'Bear Flag', kind: 'Devam', bias: -1, shape: mk('flag', true), auto: true,
      see: 'Sert düşüş ardından hafif yukarı eğimli dar bir tepki.',
      trade: 'Giriş: bayrağın alt kenarının kırılması. Stop: bayrağın tepesi. Hedef: direk uzunluğu kadar aşağı.' },
    { name: 'Flama', en: 'Pennant', kind: 'Devam', bias: 1, shape: mk('pennant'), auto: false,
      see: 'Bayrağa benzer ama konsolidasyon küçük bir simetrik üçgen şeklindedir. Genelde kısa sürer.',
      trade: 'Giriş: direk yönündeki kırılım. Stop: flamanın karşı ucu. Hedef: direk uzunluğu kadar.' },
    { name: 'Düşen kama', en: 'Falling Wedge', kind: 'Dönüş / devam', bias: 1, shape: mk('fwedge'), auto: true,
      see: 'Tepeler ve dipler düşer ama tepeler daha hızlı düşer, çizgiler daralır. Satış baskısı azalıyor.',
      trade: 'Giriş: üst çizginin yukarı kırılması. Stop: son dibin altı. Hedef: kamanın başlangıç yüksekliği.' },
    { name: 'Yükselen kama', en: 'Rising Wedge', kind: 'Dönüş / devam', bias: -1, shape: mk('fwedge', true), auto: true,
      see: 'Tepeler ve dipler yükselir ama dipler daha hızlı yükselir, çizgiler daralır. Alım gücü zayıflıyor.',
      trade: 'Giriş: alt çizginin aşağı kırılması. Stop: son tepenin üstü. Hedef: kamanın başlangıç yüksekliği.' },
    { name: 'Fincan-kulp', en: 'Cup and Handle', kind: 'Devam', bias: 1, shape: mk('cup'), auto: false,
      see: 'Yuvarlak "U" şeklinde dip (fincan), ardından kenarda küçük bir geri çekilme (kulp). Uzun vadeli grafiklerde sık görülür.',
      trade: 'Giriş: fincan kenarının (direnç) kırılması. Stop: kulpun dibi. Hedef: fincan derinliği kadar yukarı.' },
    { name: 'Kanal', en: 'Channel', kind: 'Devam', bias: 0, shape: mk('chan'), auto: true,
      see: 'Tepeler ve dipler aynı eğimde paralel iki çizgi arasında ilerler. Yükselen ya da düşen olabilir.',
      trade: 'Kanal içinde: alt bantta al, üst bantta sat. Kanal kırılırsa kırılım yönünde, kanal genişliği kadar hedef.' },
    { name: 'Üçlü tepe', en: 'Triple Top', kind: 'Dönüş', bias: -1, shape: mk('ttop'), auto: true,
      see: 'Aynı direnç üç kez test edilir ve geçilemez. İkili tepeden daha nadir ama daha güçlü kabul edilir.',
      trade: 'Giriş: diplerden geçen boyun çizgisinin kırılması. Stop: tepelerin üstü. Hedef: formasyon yüksekliği kadar aşağı.' },
    { name: 'Üçlü dip', en: 'Triple Bottom', kind: 'Dönüş', bias: 1, shape: mk('ttop', true), auto: true,
      see: 'Aynı destek üç kez tutar.',
      trade: 'Giriş: tepelerden geçen boyun çizgisinin kırılması. Stop: diplerin altı. Hedef: formasyon yüksekliği kadar yukarı.' },
    { name: 'Dikdörtgen', en: 'Rectangle / Range', kind: 'Devam', bias: 0, shape: mk('rect'), auto: true,
      see: 'Fiyat yatay bir destek ile direnç arasında gidip gelir.',
      trade: 'Aralık içinde: destekte al, dirençte sat. Kırılımda kırılım yönünde, aralık genişliği kadar hedef.' },
    { name: 'Yuvarlak dip', en: 'Rounding Bottom', kind: 'Dönüş', bias: 1, shape: mk('round'), auto: false,
      see: 'Uzun süren, yavaş ve kavisli bir dip. Düşüş yavaşça yükselişe döner.',
      trade: 'Giriş: formasyonun başladığı seviyenin (kenar) kırılması. Stop: dibin ortası. Hedef: derinlik kadar.' },
    { name: 'Parabolik yay', en: 'Parabolic Curve / Arc', kind: 'Trend', bias: 0, shape: mk('para'), auto: true,
      see: 'Uzun vadeli diplerden geçen kavisli bir destek (U) ya da tepelerden geçen kavisli bir direnç (∩). Fiyat yayın üstünde hızlanarak yükselir ya da yay altında tepe yapar. Logaritmik grafikte daha net görünür.',
      trade: 'Destek yayı aşağı kırılırsa sert düzeltme sık görülür; kırılım sonrası yaya yapılan geri test kısa fırsatı olabilir. Direnç yayının üstünde kalıcı kapanış güç işaretidir, altına dönüş ise düşüş işaretidir.' },
    { name: 'Genişleyen formasyon', en: 'Broadening / Megaphone', kind: 'Dönüş', bias: 0, shape: mk('broad'), auto: true,
      see: 'Tepeler yükselir, dipler alçalır; oynaklık artar. Kararsız, duygusal bir piyasa.',
      trade: 'Riskli formasyon. Uç noktalardan dönüş ya da kenar kırılımı beklenir; stoplar geniş tutulmalı.' },
    { name: 'Elmas', en: 'Diamond', kind: 'Dönüş', bias: -1, shape: mk('diamond'), auto: false,
      see: 'Önce genişleyen sonra daralan, elmas şekilli bir yapı. Genelde tepelerde, nadir görülür.',
      trade: 'Giriş: elmasın alt sağ kenarının kırılması. Stop: elmasın ortası. Hedef: elmasın en geniş yeri kadar.' }
  ];

  const color = b => b > 0 ? '#26a69a' : b < 0 ? '#ef5350' : '#f5a623';
  const pts = a => a.map(p => p.join(',')).join(' ');
  function svg(it) {
    const c = color(it.bias), path = it.shape.path, [x1, y1] = path[path.length - 2], [x2, y2] = path[path.length - 1];
    const ang = Math.atan2(y2 - y1, x2 - x1), h = 6;
    const ah = [[x2, y2], [x2 - h * Math.cos(ang - 0.5), y2 - h * Math.sin(ang - 0.5)], [x2 - h * Math.cos(ang + 0.5), y2 - h * Math.sin(ang + 0.5)]];
    return `<svg viewBox="-2 -2 104 64" aria-hidden="true">${it.shape.lines.map(l => `<polyline points="${pts(l)}" class="gl"/>`).join('')}<polyline points="${pts(path)}" class="gp" style="stroke:${c}"/><polygon points="${pts(ah)}" style="fill:${c}"/></svg>`;
  }

  function render(el) {
    el.innerHTML = ITEMS.map((it, k) => `
      <article class="gcard">
        <div class="gfig">${svg(it)}<span class="grank num">${k + 1}</span></div>
        <div class="gbody">
          <h3>${it.name} <span class="gen">${it.en}</span></h3>
          <p class="gmeta"><span class="tag ${it.bias > 0 ? 'buy' : it.bias < 0 ? 'sell' : 'neu'}">${it.bias > 0 ? 'Boğa' : it.bias < 0 ? 'Ayı' : 'İki yönlü'}</span> <span>${it.kind}</span>${it.auto ? ' <span class="gauto">Grafikte otomatik aranır</span>' : ''}</p>
          <p>${it.see}</p>
          <p class="gtrade">${it.trade}</p>
        </div>
      </article>`).join('');
  }

  return { render, ITEMS };
})();
