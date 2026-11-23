# Seviye · Bağımsız inceleme dosyası

Bu dosya, "Seviye" adlı tarayıcı tabanlı kripto grafik ve analiz uygulamasının **mantığını, backtest yöntemini ve sonuçlarını** dışarıdan kontrol ettirmek için hazırlandı. Kod parçaları uygulamanın şu anki sürümünden birebir alındı.

**Senden istenen:** (1) Aşağıdaki kuralların teknik analiz açısından doğru olup olmadığını, backtest yönteminde hata ya da yanlılık (bias) olup olmadığını ve sonuçların ne kadar güvenilir olduğunu değerlendirmen (sorular bölüm 9'da). (2) Başarı oranını artırabilecek geliştirme önerilerini ayrı bir `GROK_ONERILER.md` dosyasında, bölüm 10'daki şablonla yazman.

---

## 1. Uygulama ne yapıyor?

- Binance'ten (spot ve vadeli) mum verisi çeker, TradingView Lightweight Charts ile çizer. Kod düz JavaScript (modül yok), Python ile küçük bir yerel sunucu (SQLite kayıt + Hyperliquid API aracısı).
- Grafiğin üstüne otomatik olarak çizer: üst zaman dilimi (aylık/haftalık/günlük) trend çizgileri, parabolik yaylar, destek/direnç seviyeleri, formasyonlar, Buy/Sell ve benzeri sinyaller.
- Sağ panelde **İşlem fikri**: piyasa yönü (boğa/ayı), short ve long senaryosu, giriş/stop/hedef kademeleri ve backtest'ten gelen olasılıklar. İyi bir giriş oluşunca bildirim gönderir; favori coinleri arka planda tarar.
- Hyperliquid cüzdan adresinden (sadece herkese açık adres, anahtar yok) pozisyonları, işlem geçmişini ve kâr/zarar analizini gösterir.

Kullanıcının hedefi: haftalık, aylık ve 3 aylık işlemler. 1.000 $'lık işlemde **+50 $ = başarılı, +100 $ = çok başarılı, +200 $ = süper başarılı**. %60'ın altındaki başarı oranlarını kabul etmiyor.

---

## 2. Veri ve backtest altyapısı

- **Veri:** Binance gerçek mumları. BTC, ETH, BNB, SOL, XRP.
  - 1G: 2018-09 → 2026-11 (SOL 2020-08'den), 3.000 mum
  - 4s: 2024-02 → 2026-11, 6.000 mum
  - 1s: 2025-12 → 2026-11, 8.000 mum
  - Haftalık ve aylık mumlar 1G verisinden birleştirilerek üretilir (hafta Pazartesi başlar).
- **Eğitim / doğrulama ayrımı:** Kurallar BTC, ETH, BNB'de seçilir; SOL ve XRP'de doğrulanır. Ayrıca 2018–22 / 2023–26 dönem ayrımı da raporlanır.
- **Nedensellik:** Tüm hesaplar o ana kadarki veriyle yapılır. Üst zaman dilimi bölgeleri sadece **kapanmış** aylık/haftalık mumlardan kurulur ve yeni bir aylık/haftalık mum kapanınca yeniden hesaplanır (`zones.timeline`). Sinyaller sonradan değişmez.
- **Rastgele karşılaştırma:** Her sonuç, aynı stop/hedef mesafesiyle rastgele mumlarda açılan işlemlerle karşılaştırılır. ±%5 simetrik stop/hedefte rastgele girişin önce hedefe ulaşma oranı ≈ %50.
- **Komisyon ve fonlama backtest'e dahil değil.** Kaldıraç yok; sonuçlar 1.000 $'lık pozisyon başına.

---

## 3. Piyasa yönü (boğa / ayı)

Kural: BTC **aylık** kapanışı 10 aylık kapanış ortalamasının üstünde **ve** ortalama 2 ay öncesine göre yükselmişse boğa; altında ve düşmüşse ayı; ikisi çelişirse önceki yön korunur. Sadece ay kapanışında değişir. Tüm coinler için BTC'nin yönü kullanılır.

Neden eğim şartı: Sadece "kapanış > 10 aylık ortalama" kuralı 2026 Ağustos–Ekim'deki tepki yükselişini boğa saydı (BTC 2025-10-06'da 126.200 zirve, 2026-11'de 61.362, zirveden −%51). Eğim şartıyla 2025-12'den beri kesintisiz ayı.

```js
  function regime(t) {
    const M = btcM;
    if (!M) return null;
    let k = M.length - 1;
    while (k >= 0 && M[k].t > t) k--;
    const c = k - 1;
    if (c < 12) return null;
    const avg = (j, last) => { let s = last != null ? last : M[j].c; for (let q = j - 9; q < j; q++) s += M[q].c; return s / 10; };
    let dir = 0, since = 0;
    for (let j = 11; j <= c; j++) {
      const s = avg(j), s2 = avg(j - 2), a = M[j].c > s ? 1 : -1, b = s > s2 ? 1 : -1, nd = a === b ? a : dir || a;
      since = nd === dir ? since + 1 : 1; dir = nd;
    }
    const sm = avg(c), sm2 = avg(c - 2);
    const out = { dir, close: M[c].c, sma: sm, dist: (M[c].c - sm) / sm, slope: (sm - sm2) / sm2, side: M[c].c > sm ? 1 : -1, since, month: M[c].t };
    if (k > c) {
      const ns = avg(k, M[k].c), ns2 = avg(k - 2), a = M[k].c > ns ? 1 : -1, b = ns > ns2 ? 1 : -1;
      out.next = { dir: a === b ? a : dir, price: M[k].c, sma: ns, side: a };
    }
    return out;
  }
```

Test (5 coin günlük, her gün için; o yönde %20 hareketin aynı büyüklükteki ters hareketten önce 90 gün içinde gelme oranı):

| Kural | 2018–22 yönde / ters | 2023–26 yönde / ters | 8 yılda yön değişimi |
|---|---|---|---|
| Kapanış > 10 aylık ortalama | %54 / %45 | %50 / %37 | 9 |
| **+ ortalama 2 ayda aynı yönde (seçilen)** | **%60 / %39** | **%48 / %40** | **3** |
| + 3 ay eğim | %60 / %38 | %46 / %42 | 3 |
| 12 aylık ortalama + eğim | %62 / %37 | %45 / %42 | 3 |

Kendi grafiğine göre yön (SMA200, SMA50/200 kesişimi, haftalık 20/50) 2023 sonrasında rastgeleden kötü çıktı. 7–30 günlük hareketlerde hiçbir yön kuralı belirgin fark yaratmadı.

---

## 4. Üst zaman dilimi trend çizgileri

Kullanıcının kuralı: geçerli yükselen trend için 1. dip, 2. daha yüksek dip, 3. daha yüksek dip; düşende tersi.

- Pivot genişliği: aylık 2, haftalık 3, günlük 5 mum. Son 24 pivotun çiftleri denenir.
- Çizgi hem doğrusal hem logaritmik fiyatta denenir.
- En az 3 temas (ilk ikisi çizgiyi kurar), temaslar sıralı olarak daha yüksek dip / daha alçak tepe.
- Tolerans: 0,25 ATR, en az %0,4, en fazla %2,5.
- Kırılma: ilk temastan sonra bir kapanış çizginin ötesine toleranstan fazla geçerse geçersiz. İğne 3 × toleransa kadar serbest. Kapanmamış aylık/haftalık mum hesaba katılmaz.
- Sadece bugünkü değeri fiyata yakın olanlar gösterilir: aylık ±%30, haftalık ±%15, günlük ±%8. Her zaman dilimi ve yön için en iyi tek çizgi (puan = 2 × temas + uzunluk + yenilik).

```js
  function htfTrends(bars, L, maxDist, nowT, lastPrice) {
    const n = bars.length;
    if (n < L * 6 + 6) return [];
    const A = atr(bars), piv = pivots(bars, L);
    const tolAt = k => Math.min(0.025, Math.max(0.004, 0.25 * (A[k] || 0) / bars[k].c));
    const pick = (list, dir) => {
      const P = list.filter(x => x.i + L < n).slice(-24);
      let best = null;
      for (const log of [false, true]) {
        const Y = log ? Math.log : v => v, inv = log ? Math.exp : v => v;
        for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
          const pa = P[a], pb = P[b];
          if (pb.i - pa.i < L * 2) continue;
          if (dir > 0 ? pb.p <= pa.p : pb.p >= pa.p) continue;
          const ta = bars[pa.i].t, ya = Y(pa.p), m = (Y(pb.p) - ya) / (bars[pb.i].t - ta);
          const at = t => inv(ya + m * (t - ta));
          let ok = true;
          for (let k = pa.i + 1; k < n && ok; k++) {
            const v = at(bars[k].t), tol = tolAt(k);
            if (!(v > 0)) { ok = false; break; }
            const cl = (bars[k].c - v) / v, wk = ((dir > 0 ? bars[k].l : bars[k].h) - v) / v;
            if (dir > 0 ? cl < -tol : cl > tol) ok = false;
            else if (dir > 0 ? wk < -3 * tol : wk > 3 * tol) ok = false;
          }
          if (!ok) continue;
          const now = at(nowT);
          if (!(now > 0) || Math.abs(now - lastPrice) / lastPrice > maxDist) continue;
          const pts = [];
          for (const x of P) {
            if (x.i < pa.i) continue;
            const v = at(bars[x.i].t);
            if (Math.abs(x.p - v) / v > tolAt(x.i)) continue;
            if (pts.length && x.i - pts[pts.length - 1].i < L) continue;
            if (pts.length && (dir > 0 ? x.p <= pts[pts.length - 1].p : x.p >= pts[pts.length - 1].p)) continue;
            pts.push(x);
          }
          if (pts.length < 3) continue;
          const last = pts[pts.length - 1].i;
          const score = pts.length * 2 + (last - pa.i) / n + last / n - (log ? 0.01 : 0);
          if (!best || score > best.score) best = { dir, log, t1: ta, t2: bars[last].t, y1: ya, m, touches: pts.length, pts: pts.map(x => ({ t: bars[x.i].t, p: x.p })), score, now, at };
        }
      }
      return best;
    };
    return [pick(piv.highs, -1), pick(piv.lows, 1)].filter(Boolean);
  }
```

Şu anki örnek (2026-11-23): BTC aylık yükselen trend 2022-11 (15.476) → 2023-09 (24.901) → 2026-07 (57.800), bugün 61.454; fiyat 61.362.

Parabolik yaylar: logaritmik fiyatta 3 pivottan geçen ikinci derece eğri; kapanışlar ihlal etmemeli (tolerans en fazla %2,5), en az %25 zaman aralığı ve belirgin kavis şartı var.

---

## 5. Senaryo kuralı (İşlem fikri paneli)

**Bölgeler:** Sadece aylık ve haftalık grafikten: trend çizgileri, parabolik yaylar ve yatay seviyeler (son 40 pivotta %1,2 içinde en az 2 temas). Her birinin o anki değeri hesaplanır, fiyatın ±%25'i dışındakiler atılır, %1,2 içindekiler kümelenir. En yakın direnç: önceki kapanışın 0,2 ATR üstünde başlayan ilk küme; destek tersi.

```js
  function pick(zs, t, pc, a) {
    const list = [];
    for (const z of zs) { const v = z.f(t); if (isFinite(v) && v > 0 && Math.abs(v - pc) / pc <= 0.25) list.push({ name: z.name, tf: z.tf, kind: z.kind, v }); }
    if (!list.length) return { R1: null, S1: null };
    const cl = SV.zones.clusters(list, pc);
    for (const c of cl) c.trends = c.items.filter(x => x.kind === 'trend' || x.kind === 'arc').length;
    return {
      R1: cl.filter(c => c.lo > pc + 0.2 * a).sort((x, y) => x.lo - y.lo)[0] || null,
      S1: cl.filter(c => c.hi < pc - 0.2 * a).sort((x, y) => y.hi - x.hi)[0] || null
    };
  }
```

**Tetik (giriş):** Short: mum bölgenin alt kenarına 0,25 ATR yaklaşır ya da içine girer ve **bölgenin altında kapatır** → giriş o mumun kapanışı. Long tersi. Aynı yönde 6 mumdan sık sayılmaz. Kapanış bölge kenarından 1 ATR'dan ya da %4'ten uzaksa "giriş için geç" sayılır (bu girişler backtest'te +50 $'a %46 ulaştı, ortalama negatif).

```js
  function touched(dir, b, zone, a) {
    return dir < 0 ? b.h >= zone.lo - 0.25 * a && b.c < zone.lo : b.l <= zone.hi + 0.25 * a && b.c > zone.hi;
  }
  function eventAt(bars, ctx, htf, i, id) {
    const b = bars[i], pc = bars[i - 1].c, a = ctx.atr[i - 1];
    if (!a) return [];
    const zs = zonesAt(htf, b.t, b.o, id), { R1, S1 } = pick(zs, b.t, pc, a), out = [];
    for (const dir of [-1, 1]) {
      const zone = dir < 0 ? R1 : S1, opp = dir < 0 ? S1 : R1;
      if (!zone || !touched(dir, b, zone, a)) continue;
      const ck = checks(dir, zone, b.c, ctx.s200[i], b.t), gap = dir < 0 ? zone.lo - b.c : b.c - zone.hi;
      const p = plan(dir, b.c);
      if (p) out.push({ i, dir, zone, strong: ck.strong, aligned: ck.aligned, checks: ck.list, plan: p, gap: gap / b.c, late: gap > a || gap / b.c > 0.04 });
    }
    return out;
  }
```

**Güçlü kurulum:** bölgede en az 2 farklı kaynak + fiyat SMA200'ün lehte tarafında. Piyasa yönü ayrı bir koşul.

```js
  function checks(dir, zone, close, s200, t) {
    const below = s200 != null && (dir < 0 ? close < s200 : close > s200);
    const list = [
      { ok: zone.names.length >= 2, text: 'Bölgede en az 2 üst zaman dilimi kaynağı (trend, parabolik yay ya da seviye)' },
      { ok: below, text: (dir < 0 ? 'Fiyat SMA200 altında' : 'Fiyat SMA200 üstünde') + (s200 == null ? ' (bu grafikte SMA200 için yeterli mum yok)' : '') }
    ];
    const strong = list.every(c => c.ok), rg = regime(t), aligned = !!rg && rg.dir === dir;
    list.push({ ok: aligned, market: true, text: rg ? `Piyasa yönüyle aynı (BTC aylık: ${rg.dir > 0 ? 'boğa' : 'ayı'})` : 'Piyasa yönü bilinmiyor (BTC aylık veri yok)' });
    return { list, strong, aligned };
  }
  const statsFor = (key, ck) => STATS[key][ck.strong ? 'strong' : 'base'][ck.aligned ? 'with' : 'against'];
```

**Plan (kullanıcının kademeleri):** stop girişten %5 (−50 $). +%5'te 1/3 kapatılır ve stop girişe çekilir, +%10'da 1/3, +%20'de kalan. 30 gün ufuk; süre dolarsa kalan kapanış fiyatından kapatılır. Aynı mumda hem stop hem hedef görülürse önce stop sayılır (muhafazakâr).

```js
  function plan(dir, entry) {
    if (!(entry > 0)) return null;
    return { dir, entry, stop: entry * (1 - dir * STOP), lv: LV.map(x => entry * (1 + dir * x)) };
  }
  function follow(bars, ev, upto) {
    const p = ev.plan, d = p.dir;
    let k = 0, pnl = 0, size = 1, st = p.stop;
    for (let m = ev.i + 1; m <= upto; m++) {
      const b = bars[m];
      if (d < 0 ? b.h >= st : b.l <= st) { pnl += size * d * (st - p.entry) / p.entry; return { k: k ? 'be' : 'stop', tier: k, pnl, at: m, done: true }; }
      while (k < 3 && (d < 0 ? b.l <= p.lv[k] : b.h >= p.lv[k])) { const part = k < 2 ? 1 / 3 : size; pnl += part * LV[k]; size -= part; k++; if (k === 1) st = p.entry; }
      if (k === 3) return { k: 'full', tier: 3, pnl, at: m, done: true };
    }
    return { k: 'open', tier: k, pnl: pnl + size * d * (bars[upto].c - p.entry) / p.entry, done: false };
  }
```

**"İyi kurulum" (bildirim gönderilen):**

```js
  const good = s => !!s && s.tested && s.strong && s.aligned && s.stats.p50 >= MIN_WIN && s.stats.n >= 60 && (s.stats.tr == null || (s.stats.tr >= MIN_WIN && s.stats.te >= MIN_WIN));
```

---

## 6. Senaryo backtest sonuçları

5 coin, 1s / 4s / 1G, 30 gün, yukarıdaki plan. "+50 $" = stoptan önce +%5'e ulaşma oranı. Rastgele giriş ±%5'te ≈ %50.

| Grup | n | +50 $ | +100 $ | +200 $ | ort. $/işlem | 7 gün +50 $ | BTC/ETH/BNB · SOL/XRP |
|---|---|---|---|---|---|---|---|
| Short güçlü · piyasa yönünde | 110 | %72 | %45 | %37 | +38 | %70 | %74 · %61 |
| Short güçlü · piyasaya ters | 40 | %55 | %23 | %15 | +4 | %50 | %54 · %58 |
| Short zayıf · yönünde | 915 | %54 | %35 | %22 | +14 | %46 | |
| Short zayıf · ters | 724 | %47 | %24 | %9 | −3 | %42 | |
| Long güçlü · yönünde | 78 | %64 | %38 | %21 | +25 | %45 | %69 · %47 |
| Long güçlü · ters | 68 | %46 | %18 | %3 | −10 | %41 | %52 · %32 |
| Long zayıf · yönünde | 805 | %54 | %30 | %15 | +7 | %45 | |
| Long zayıf · ters | 1058 | %42 | %18 | %6 | −9 | %33 | |

Eski ölçümle (1R hedef, yapısal stop) güçlü short piyasa yönünde 116 işlemde %61 (rastgele %49).

---

## 7. Diğer ölçülmüş sonuçlar (özet)

- **Uygulamanın kısa vadeli sinyalleri** (Buy/Sell/Direnç/Mor/Yeşil/P), 4.130 varyasyonluk ızgarada 1R hedefte: sadece bazı Sell varyasyonları %60'ı iki grupta geçti (en iyisi %67 / %65). Hiçbir Buy varyasyonu güvenilir değil.
- **Uzun vade (7/30/90 gün, +%10/+%20 hedef), 26.352 test:** mevcut sinyaller rastgeleye yakın. Kriteri geçen 8 varyasyon (n 10–30) çıktı ama rastgele zamanlı kopyalar da 4.392 testte 1–5 kez geçti; kanıt zayıf.
- **Haftalık grafiğe özel kurallar:** "Haftalık kapanış 20H SMA altına indi ve 20H < 50H" short: 30 günde ±%10 %71 (rastgele %44, n 28). "200 haftalık SMA'ya %5 yakın" long: 90 günde ±%20 %72 (rastgele %53, n 100). Sinyaller birbirine bağımlı (aynı ayı dipleri, aynı anda birkaç coin).
- **Formasyonlar:** 15 veri setinde ölçülen kırılım ve hedefe ulaşma oranları formasyon başına `patterns.js`'te tabloda (ör. OBO n 256, kırılım %68, hedef %49).

---

## 8. Bilinen zayıflıklar (kendi değerlendirmem)

1. **Çoklu test:** Senaryo için 1.264+, uzun vade için 26.352 varyasyon denendi. "Güçlü" tanımının küçük değişiklikleri (ör. "bölgede trend/parabolik şartı", kaynak sayısı) oranları %56 ile %85 arasında oynattı. Seçilen tanım en baştan beri istikrarlı çıkan olduğu için seçildi, ama yine de seçim yanlılığı var.
2. **Küçük ve bağımlı örnekler:** Güçlü gruplarda n 40–110. Aynı bölge reddi birkaç coin ve zaman diliminde aynı anda oluşabilir (BTC/ETH korelasyonu); etkin örnek sayısı daha küçük.
3. **Dönem yoğunluğu:** 1s ve 4s verisi sadece 2024–2026. Güçlü kurulumların çoğu 2023–26'dan; tek bir ayı dönemi (2025-10 → 2026-11) baskın olabilir.
4. **Piyasa yönü kuralı az sayıda rejim değişimine dayanıyor** (8 yılda 3 değişim → aslında 3–4 bağımsız dönem).
5. **Komisyon, fonlama, kayma (slippage) dahil değil.** +%5 hedefte etkisi küçük ama sıfır değil.
6. **Aynı mumda stop ve hedef:** önce stop sayılıyor (muhafazakâr) ama 1G mumlarda bu belirsizlik büyük.
7. **Kapanmamış mum:** Tetik sadece kapanmış mumda; ama canlı panelde açık mumun durumu ("bölgede, kapanış bekleniyor") gösteriliyor.
8. **Trend çizgisi seçimi:** her zaman dilimi ve yön için tek "en iyi" çizgi seçiliyor; puanlama keyfi (2 × temas + uzunluk + yenilik).

---

## 9. Senden istenen kontroller

1. **Trend çizgisi kuralı** (bölüm 4): 3 temas, daha yüksek dip / daha alçak tepe, %2,5 tolerans, kapanışla kırılma, kapanmamış mumun dışlanması teknik analiz pratiğine uygun mu? Doğrusal ve logaritmik çizgiyi birlikte denemek doğru mu, yoksa yüksek zaman diliminde sadece logaritmik mi kullanılmalı?
2. **Piyasa yönü kuralı** (bölüm 3): 10 aylık ortalama + 2 aylık eğim + histerezis makul mü? Daha iyi bilinen alternatifler var mı (ör. 50/200 haftalık, 4 yıllık döngü, zirveden düşüş yüzdesi)? 3 değişimlik geçmişle bu kurala ne kadar güvenilebilir?
3. **Backtest'te ileriye bakma (lookahead) var mı?** Özellikle: bölgelerin kapanmış HTF mumlarından kurulması, pivotların doğrulanması (pivot ancak L mum sonra bilinir), SMA200'ün o anki değeri, piyasa yönünün kapanmış aya göre alınması.
4. **İstatistiksel geçerlilik:** n = 110 ve %72 (rastgele %50) sonucunun çoklu test sonrası anlamlılığı nedir? Hangi düzeltme (ör. permütasyon testi, Bonferroni, walk-forward) önerirsin?
5. **Plan:** %5 sabit stop + 1/3 kademeli çıkış + ilk kademeden sonra stopu girişe çekme yapısı mantıklı mı? Yapısal stop (bölgenin ötesi) ile karşılaştırıldığında hangisi daha savunulabilir?
6. **"İyi kurulum" eşiği:** "güçlü + piyasa yönünde + %60 + n ≥ 60 + iki coin grubunda da ≥ %60" kuralı yeterince muhafazakâr mı?
7. **Gözden kaçan riskler:** Kullanıcının bu senaryolarla gerçek para ile işlem açması düşünüldüğünde eksik gördüğün bir şey var mı?

---

## 10. Geliştirme önerileri (ayrı dosyaya)

İnceleme cevabından ayrı olarak, **başarı oranını artırabilecek önerilerini `GROK_ONERILER.md` adlı ayrı bir Markdown dosyasına** yaz. Bu dosyadaki her öneri uygulamaya eklenmeden önce yukarıdaki veriyle backtest edilecek ve sadece doğrulama grubunda (SOL/XRP) da işe yarayanlar kabul edilecek. Bu yüzden önerilerin elle değil, **kodla test edilebilecek kadar net** olması önemli.

Özellikle aradığımız konular:
- Giriş isabetini artırabilecek **indikatörler ya da filtreler** (ör. hacim profili, VWAP / anchored VWAP, funding rate, open interest, likidasyon haritası, RSI uyumsuzluğu, piyasa yapısı kırılımı (BOS/CHoCH), order block / fair value gap, Ichimoku, ADX, volatilite rejimi, BTC dominansı, USDT.D).
- **Piyasa yönünü** daha iyi belirleyecek yöntemler (makro, döngü, on-chain göstergeler, birden fazla zaman dilimi uyumu).
- **Çıkış yönetimi**: stop yerleşimi, kademeli kâr alma, iz süren stop (trailing), zaman bazlı çıkış.
- **Bölge kalitesi**: hangi destek/direnç ve trend çizgilerinin daha güvenilir olduğu (temas sayısı, yaş, zaman dilimi, hacim).
- **Backtest yöntemi**: walk-forward, permütasyon testi, korelasyonlu örnekleri ayıklama, işlem maliyeti modeli.
- Kullanıcının hedefi için (haftalık/aylık işlemlerde 1.000 $'da +50/+100/+200 $, en az %60 başarı) daha uygun olabilecek **tamamen farklı kurulumlar**.

Her öneri için şu şablonu kullan:

```markdown
### Öneri N: <kısa ad>

- **Tür:** indikatör / filtre / giriş kuralı / çıkış kuralı / piyasa yönü / backtest yöntemi
- **Neyi iyileştirmeyi hedefliyor:** (ör. güçlü long'un doğrulama grubundaki %47 oranı, zayıf short'lar, piyasa yönü değişim gecikmesi)
- **Kesin kural:** formül ve eşikler; hangi zaman diliminde, hangi mumun kapanışında hesaplanacağı
- **Parametreler ve denenecek aralık:** (ör. RSI periyodu 14, eşik 30/35/40)
- **Gereken veri:** Binance mumları yeterli mi, yoksa funding / open interest / on-chain gibi ek veri mi gerekiyor (kaynağıyla)
- **İleriye bakma riski:** nasıl önlenir (ör. pivot ancak L mum sonra bilinir)
- **Beklenen etki ve gerekçe:** neden işe yarayabilir; varsa literatür ya da bilinen sonuçlar
- **Nasıl test edilmeli:** hangi gruba uygulanacak, rastgele karşılaştırma ve başarı ölçütü
- **Öncelik:** yüksek / orta / düşük (beklenen fayda ÷ uygulama zorluğu)
```

Lütfen önerileri öncelik sırasına koy ve en fazla 10–15 öneriyle sınırla. Sadece "şunu dene" demek yerine yukarıdaki şablonu doldur. Bildiğin ama emin olmadığın sonuçları "tahmin" olarak işaretle.

Not: Bu analizler yatırım tavsiyesi değildir.
