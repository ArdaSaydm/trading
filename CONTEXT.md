# Seviye: Proje Bağlamı

Tarayıcıda çalışan bir grafik ve analiz uygulaması. Kripto paritelerini ve emtiaları (altın, gümüş, bakır, Brent) Binance'ten çeker. Grafikte şunları otomatik gösterir:
- Buy/Sell sinyalleri ve iğne tepkileri
- Büyük hareket uyarıları (mor/yeşil dikey çizgi) ve dönüş uyarıları (sarı dikey çizgi)
- Aylık, haftalık ve günlük trend çizgileri
- Formasyonlar ve parabolik yaylar (uzun vadeli kavisli destek/direnç)
- Destek/direnç seviyeleri

Kullanıcının kendi analizi için çizim araçları da var: trend çizgisi, yatay çizgi, Fibonacci, long/short pozisyon. Ayarlar ve çizimler SQLite dosyasında (`seviye.db`) saklanır.

## Kullanıcının istekleri ve kısıtlar

- Kullanıcının TradingView'de kullandığı, formülü bilinmeyen bir sinyal göstergesine benzemesi isteniyor. Göstergedeki anlamlar:
  - **Buy / Sell:** Salınım dip ve tepeleri.
  - **Mor çizgi:** Yakında büyük düşüş.
  - **Yeşil çizgi:** Yakında büyük yükseliş.
  - **Sarı çizgi:** Yön değişebilir.
- Kullanıcının örnek ekran görüntüleri (Haz–Kas 2026, günlük grafik) şunları gösteriyor:
  - Buy/Sell neredeyse her zaman yerel dip/tepede (RSI aşırı bölgede). 24 Kasım'da kullanıcı "bizimkinde Buy/Sell çok nadir, dikey çizgiler çok fazla, referansa baya benzer olsun" dedi; kurallar buna göre değişti (aşağıda).
  - BTC ve ETH'de 20 Ağustos civarındaki büyük pompa mumunda mor çizgi var. Backtest'te bu "ters klimaks" mantığı rastgeleden kötü çıktı, ama kullanıcı benzerlik istediği için 24 Kasım'da geri getirildi (aşağıda).
  - ETH'de Haziran başındaki kapitülasyon dibinde yeşil çizgi var.
  - BTC'de Haziran sonu düşüş trendi içinde mor "P" etiketleri var. Kullanıcıya göre anlamı: uzun vadeli sert düşüş olabilir.
  - Orijinal göstergenin ETH'de 3 Kasım'da düşüş ortasında verdiği Buy kötü bir sinyal. Bizim algoritmanın bundan iyi olması isteniyor.
- **Ekran sade kalmalı.** Her şey sadece gerekli yerde görünür. Formasyonlarda sadece aktif olanlar çizilir, trend çizgilerinde sadece fiyata yakın olanlar. Her katman göz ikonuyla kapatılabilir.
- Dikey çizgiler **sadece mor/yeşil/sarı sinyaller için**. Hacim patlaması, seviye kırılımı ve gün açılışı çizgileri istenmedi, geri eklenmemeli.
- Grafiğin bulunduğu zaman diliminden çizilen trend çizgileri anlamsız bulundu ve kaldırıldı. Trendler aylık, haftalık ve günlük mumlardan hesaplanır.
- Uzun vadeli veri tercih ediliyor: ne kadar uzun geçmiş, o kadar anlamlı.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `seviye.html` | Sayfa iskeleti: üst şerit, hızlı seçim çipleri, çizim araç çubuğu, grafik alanı, katman kutusu, dominans görünümü, sağ panel, formasyon rehberi (`<dialog>`) |
| `style.css` | Tüm stiller. Açık/koyu tema `light-dark()` ile |
| `store.js` | `SV.store`: kalıcı kayıt. Sunucu varsa `/api/state` (SQLite), yoksa `localStorage` |
| `indicators.js` | `SV.ind`: SMA, EMA, standart sapma, RSI, ATR, MACD, pivotlar, medyan. Ayrıca `SV.fmt`, `SV.pct`, `SV.prec` |
| `patterns.js` | `SV.patterns.detect(bars, ctx, S)`: formasyonlar ve parabolik trend |
| `analysis.js` | `SV.analysis.compute` (seviyeler, sinyaller, başarı istatistikleri, formasyonlar, durum), `htfTrends`, `arcs`, `signals`, `evaluate`, `indicators` |
| `turn.js` | `SV.turn`: Sarı üçgen (ön uyarı + teyit) piyasa dönüşü (`detect`, `stats`), haftalık mumlardan |
| `otomatik_baslat.bat` / `otomatik_kaldir.bat` | Windows açılışında sunucuyu arka planda başlatma / kaldırma |
| `zz.js` | `SV.zz`: Turuncu yuvarlak, haftalık sabit %20 zigzag dönüşleri (`detect` → `{list, now}`, `stats`) |
| `watch.js` | `SV.watch`: izleme listesi (göstergeler CoinGecko, semboller = favoriler, Binance) |
| `orange.js` | `SV.orange`: Turuncu büyük dönüş deseni (`detect`, `stats`), günlük mumlardan |
| `zones.js` | `SV.zones`: üst zaman dilimi (aylık/haftalık) direnç-destek motoru. `timeline` her yeni haftalık/aylık mumda bölgeleri yeniden hesaplar (geçmişe dönük değişmez). Ayrıca `resistanceSells` (Direnç sinyali), `now` ve `clusters` (İşlem fikri paneli) |
| `scenario.js` | `SV.scen`: İşlem fikri senaryoları. HTF bölgeleri, tetik, plan (stop/TP1/TP2), güçlü kurulum koşulları, canlı durum (`live`), grafiğin geçmişindeki sonuç (`history`), gömülü backtest sonuçları (`STATS`) |
| `scan.js` | `SV.scan`: Favorileri 4s ve 1G'de 5 dakikada bir tarar, güçlü kurulumları listeler ve bildirir |
| `trades.js` | `SV.trades`: İşlemler paneli. Elle girilen işlemler ve Hyperliquid pozisyonları; K/Z, başabaş, likidasyon; grafikte fiyat çizgileri |
| `history.js` | `SV.history`: Hyperliquid işlem geçmişi. Dolum ve fonlama geçmişini çeker, dolumlardan kapanmış işlemleri kurar, Geçmiş ve Analiz sekmelerini çizer, grafikteki geçmiş dolum işaretlerini sağlar, açık pozisyonun gerçekleşen K/Z ve fonlamasını başabaş hesabına verir |
| `favs.js` | `SV.favs`: Favori listesi. Yıldız düğmesi, üst şeritteki favori çipleri ve 24 saatlik değişim |
| `guide.js` | `SV.guide.render`: formasyon rehberi kartları ve SVG şemaları |
| `drawings.js` | `SV.overlay(...)`: grafiğin üstündeki canvas katmanı. Sinyalleri, trendleri, formasyonları, parabolik eğriyi ve kullanıcı çizimlerini çizer, etkileşimi yönetir |
| `app.js` | Veri çekme, canlı akış, grafik serileri, panel, katmanlar, ayarlar. Tamamı `(async () => { await SV.store.init(); ... })()` içinde |
| `server.py` | Python standart kütüphanesiyle yerel sunucu (127.0.0.1:8000). Dosyaları sunar, `seviye.db` SQLite'ı yönetir, `POST /api/hl` ile Hyperliquid `info` isteklerine aracılık eder (tarayıcı doğrudan erişemezse yedek) |
| `baslat.bat` | Windows'ta çift tıklayınca `server.py`'yi çalıştırır, tarayıcıyı açar |
| `seviye.db` | Sunucu ilk çalıştığında oluşur. Tablo: `state(key, value JSON, updated)` |

Yükleme sırası: `store.js` → `indicators.js` → `patterns.js` → `analysis.js` → `zones.js` → `scenario.js` → `guide.js` → `drawings.js` → `trades.js` → `history.js` → `favs.js` → `scan.js` → `app.js`.

## Kod kuralları

- CSS ve JS ayrı dosyalarda. HTML içinde `<style>` ya da satır içi `<script>` yok.
- Hiçbir dosyada yorum satırı yok (HTML, CSS, JS, Python, BAT).
- Arayüz Türkçe. "Buy" ve "Sell" etiketleri bilerek İngilizce bırakıldı.
- Derleme aracı ya da npm yok. Kütüphaneler CDN'den, sabit sürümle yüklenir. Python tarafı sadece standart kütüphane kullanır.
- ES modülü yok (`file://` ile çalışmazlar). Ortak ad alanı `window.SV`.

## Çalıştırma

- **Önerilen:** `baslat.bat` (ya da `python server.py`). Tarayıcıda `http://localhost:8000/seviye.html` açılır. Kayıt `seviye.db` dosyasına yapılır.
- **Sunucusuz:** `seviye.html` dosyasını doğrudan açmak da çalışır. Bu durumda kayıt sadece o tarayıcının `localStorage`'ına yapılır.

## Kayıt anahtarları

| Anahtar | İçerik |
|---|---|
| `seviye` | Tüm ayarlar (aşağıdaki tablo) |
| `seviye.islemler` | Elle girilen işlemler: `[{id, src:'Elle', symbol, market, side, entry, qty, lev, fee, t}]` |
| `seviye.hl` | `{address}` Hyperliquid cüzdan adresi (sadece herkese açık adres) |
| `seviye.islemlerAcik` | İşlemler paneli açık mı |
| `seviye.islemYukseklik` | İşlemler panelinin kullanıcı ayarlı yüksekliği (px). `null` ise varsayılan (en fazla sol sütunun %42'si) |
| `seviye.islemSekme` | İşlemler panelinin açık sekmesi: `pos`, `hist`, `ana` |
| `seviye.gecmis` | `{period}` Geçmiş/Analiz dönemi: `7`, `30`, `90`, `365`, `all` |
| `seviye.favoriler` | Favoriler: `[{s, m}]` (sembol, `spot`/`futures`). Anahtar yoksa BTC, ETH, SOL, LDO, AVAX, XRP (spot) ve HYPE (vadeli) ile başlar |
| `seviye.cizim.<PARİTE>` | O paritenin çizimleri: `[{id, type, a:{t,p}, b?, p?, t2?, stop?, target?, hidden?}]` |

## Veri kaynakları

Hiçbiri API anahtarı istemez.

| Veri | Kaynak |
|---|---|
| Spot | `https://api.binance.com/api/v3/klines` (yedek `data-api.binance.vision`), canlı `wss://stream.binance.com:9443/ws/<parite>@kline_<aralık>` |
| Vadeli ve emtia | `https://fapi.binance.com/fapi/v1/klines`, canlı `wss://fstream.binance.com/ws/...`. Emtia kontratları: `XAUUSDT`, `XAGUSDT`, `COPPERUSDT`, `BZUSDT` (`CLUSDT` WTI). Sadece Vadeli'de, 24/5 işlem görür |
| BTC.D / USDT.D güncel | `https://api.coingecko.com/api/v3/global` |
| BTC.D / USDT.D grafik | TradingView ücretsiz gömülü grafik (`CRYPTOCAP:BTC.D`, `CRYPTOCAP:USDT.D`). Anahtarsız geçmiş dominans verisi bulunamadığı için. Bu görünümde uygulamanın sinyalleri çalışmaz |

- **Uzun geçmiş:** `fetchHistory` sayfa sayfa çeker. Spot'ta sayfa başına 1000, vadelide 1500 mum alınır. Her sayfada `endTime = ilk mumun açılışı − 1` kullanılır. Varsayılan 3000 mum, seçenekler 1000/3000/5000.
- **Zaman dilimleri:** 5d, 15d, 1s, 4s, 1G, 1H (hafta), 1A (ay). Varsayılan 4s.
- **Üst zaman dilimleri:** Trend çizgileri için aylık ve haftalık 1000 mum, günlük 2000 mum çekilir. 30 dakika önbelleklenir, 10 dakikada bir yenilenir.
- **Canlı akış:** WebSocket koparsa üstel beklemeyle (en fazla 30 sn) yeniden bağlanılır.
- **Arka planda çalışma** (kullanıcı isteği: sayfa arka plandayken grafik durmasın):
  - 20 saniyede bir canlılık kontrolü yapılır. Bağlantı kapalıysa ya da 90 saniyedir mesaj gelmediyse yeniden bağlanılır. Ardından `catchUp` son 100 mumu çekip aradaki boşluğu doldurur; boşluk daha büyükse tam yükleme yapılır.
  - Sekmeye dönünce ve internet geri gelince de aynı kontrol çalışır.
  - Sayfa gizliyken mum kapanışında analiz beklemeden hemen yapılır; böylece bildirimler gecikmez.
  - Sekmenin dondurulma ihtimalini azaltmak için `navigator.locks` ile kalıcı bir kilit tutulur.
  - Tarayıcı, arka plandaki sekmede çizimi (requestAnimationFrame) durdurur ama veri ve analiz güncellenmeye devam eder. Sekmeye dönünce grafik güncel hâliyle çizilir. Sekme başlığında canlı fiyat görünür.
  - Chrome'un "Bellek Tasarrufu" özelliği sekmeyi tamamen kapatabilir. Kullanıcının `localhost:8000` adresini Chrome Ayarlar > Performans > "Bu siteleri her zaman etkin tut" listesine eklemesi önerilir.

## İşlemler paneli (`trades.js`)

Kullanıcının isteği: Hyperliquid'de açtığı işlemi grafikte görmek, kâr/zarar ve başabaş seviyesini izlemek.

**Konum:** Grafiğin altında, katlanabilir. Kaynaklar:
- **Elle:** "İşlem ekle" formu. Sembol, piyasa (varsayılan Vadeli), yön, giriş, miktar (varsayılan USD, adet de seçilebilir), kaldıraç (varsayılan 1), tek yön komisyon % (varsayılan 0,045).
- **Hyperliquid:** Sadece cüzdan adresi (0x…). Özel anahtar ya da API anahtarı istenmez, işlem açılamaz. 8 saniyede bir `https://api.hyperliquid.xyz/info` POST istekleri yapılır:
  - `clearinghouseState` (ana borsa ve `dex: 'xyz'` HIP-3)
  - `frontendOpenOrders` (TP/SL tetik emirleri)
  - `allMids` (anlık orta fiyat)
  - `userFees` (`userCrossRate` = taker komisyonu)
  - Tarayıcıdan doğrudan erişilemezse sunucu üzerindeki `/api/hl` aracısı kullanılır.

**Hesaplar:**
- **Fiyat:** Hyperliquid pozisyonunda HL orta fiyatı. Elle girilen işlemde grafik aynı sembolse grafiğin canlı fiyatı, değilse 10 saniyede bir Binance ticker.
- **Brüt K/Z** = yön × (fiyat − giriş) × miktar − ödenen fonlama.
- **Net K/Z** = brüt − (giriş + fiyat) × miktar × komisyon.
- **Gerçekleşen net** = kısmi satışlardan gelen kâr/zarar − ödenen komisyonlar − ödenen fonlama.
  - Hyperliquid'de önce `history.js`'in kurduğu açık işlemden (`openInfo`) alınır: pozisyon sıfırdan açıldığından beri `closedPnl`, tüm komisyonlar ve `userFunding` toplamı (`usdc` negatifse ödenmiş). Geçmiş henüz yüklenmediyse yedek: `userFills`'te pozisyonu sıfırdan açan dolum (`startPosition` 0) bulunana kadar geriye gidilir, fonlama `cumFunding.sinceOpen`'dan alınır (pozitif = ödenmiş varsayımı).
  - Elle girilen işlemde `closes: [{q, px, t}]` listesinden hesaplanır. Komisyonlar: giriş × ilk miktar × k ve her kısmi satış için fiyat × miktar × k.
- **Başabaş** (kalan miktar q için, çıkış komisyonu dahil):
  - Long: (giriş × q − gerçekleşen net) / (q × (1 − k)).
  - Short: (giriş × q + gerçekleşen net) / (q × (1 + k)).
  - Örnek (kullanıcının sorusu): 1 $'dan 1000 adet, 500 adet 1,5 $'dan satıldı, komisyon 0 → başabaş 0,50 $. Test edildi.
  - Kısmi satış varsa tabloda "kısmi satış öncesi" başabaş da küçük yazıyla gösterilir.
- **Toplam net** = açık K/Z + gerçekleşen net − tahmini çıkış komisyonu.
- **Kısmi kapat** (elle girilen işlemler): satır düğmesi bir form açar. Kısayollar %25/50/75/100; miktar ve fiyat girilir. Form kaydetmeden önce yeni başabaşı gösterir. Miktar sıfıra inerse satır "Kapandı" olur ve gerçekleşen sonucu gösterir. Form açıkken tablo canlı güncellemede yeniden çizilmez, yoksa girilen değerler silinirdi.
- **Likidasyon:** Hyperliquid'den gelir. Elle girilen işlemde kaldıraç varsa yaklaşık hesap: giriş × (1 ∓ 1/kaldıraç ± %0,5); başında "~" işareti olur.

**Sembol eşleme:**
- HL ana coinleri: COIN → COINUSDT (vadeli). `kPEPE` gibi coinler → 1000PEPEUSDT.
- xyz: GOLD → XAUUSDT, SILVER → XAGUSDT, COPPER → COPPERUSDT, BRENTOIL → BZUSDT, CL → CLUSDT.
- Grafikte sadece sembol eşleşmesine bakılır (spot/vadeli fark etmez).

**Grafik çizgileri:** Açık paritenin pozisyonları için fiyat çizgileri çizilir (katman: İşlemlerim):
- Giriş: başlığında canlı net K/Z.
- Başabaş: sarı noktalı. Başlığında Hyperliquid pozisyonunda "(HL)" ve fiyata uzaklık % yazar. Fonlama ve kısmi satışlar dahildir.
- Likidasyon: kırmızı kesikli.
- TP ve SL: noktalı.

**Tablo:** Sembole tıklayınca grafik o pariteye geçer.

**Boyut:** Panelin üst kenarı sürüklenerek büyütülür/küçültülür (klavyede ok tuşları, çift tıklama varsayılana döner). Grafiğe en az 340 piksel bırakılır. 900 pikselden dar ekranlarda devre dışı.

**Katmanlar kutusu:** Başlıktaki göz düğmesi tüm katmanları gizler; tekrar basınca önceki açık/kapalı durumları (`layersPrev`) geri gelir. Grafik alanının yüksekliğine sığar (zaman ekseninin üstünde biter), sığmazsa kendi içinde kaydırılır; başlığı yapışkandır.

**Sekmeler:** Pozisyonlar, Geçmiş, Analiz. Geçmiş ve Analiz aynı dönem (7G/30G/90G/1Y/Tümü) ve sembol filtresini kullanır.

### Hesap özeti (Pozisyonlar sekmesi, 24 Kasım 2026)

`#acct` (tablonun üstü), `trades.js` `acctHtml`. Hyperliquid bağlıysa:
- `clearinghouseState` (ana + xyz dex) `marginSummary.accountValue / totalMarginUsed`, `crossMaintenanceMarginUsed`, `withdrawable` toplanır (her 8 sn).
- Spot: `spotClearinghouseState` + `spotMetaAndAssetCtxs` (40 sn'de bir, meta 10 dk önbellek). USDC birebir, diğer tokenlar USDC çiftinin `markPx`'i ile.
- Canlı: açık K/Z tablo satırlarındaki fiyatla (`stats().open`) hesaplanır; perp bakiyesi = accountValue − HL'nin K/Z'si + canlı K/Z.
- Kutular: Toplam bakiye (perp + spot), Açık K/Z, Kullanılan teminat, Çekilebilir, Pozisyon büyüklüğü (efektif kaldıraç), Teminat oranı (bakım teminatı / bakiye).
- **Birleşik hesap (unified account / portfolio margin):** `userAbstraction` ile anlaşılır (10 dk'da bir). Bu modda Hyperliquid tüm bakiye ve blokajları spot durumunda gösterir; perp `clearinghouseState` özetleri anlamsızdır (resmî belge). Kullanıcının hesabı bu modda: açık limit emir varken perp `accountValue` dolu geliyordu ve spot ile toplanınca bakiye emir kadar şişiyordu (gerçek 1.804,82 $). Düzeltme: toplam = spot (USDC total + diğer tokenlar) + (canlı K/Z − HL K/Z); spot 8 sn'de bir yenilenir. "Emirlere ayrılan" = USDC hold − pozisyon teminatı; "Kullanılabilir" = USDC total − hold; teminat oranı = Σ crossMaintenanceMarginUsed / (USDC total − izole teminat). Varsayım: spot USDC total açık K/Z'yi içerir (NautilusTrader ve perp-cli uygulamaları böyle kabul ediyor); kullanıcıda açık pozisyonla henüz doğrulanmadı.
- **Açık emirler grafikte (24 Kasım 2026):** Açık grafiğin sembolüne ait tüm HL emirleri fiyat çizgisi olarak çizilir (`syncLines`; "İşlemlerim" katmanı açıkken): alış yeşil, satış kırmızı; limit kesikli, tetikli (stop/TP) noktalı; başlık "HL Satış Limit 0,0162 · 1.000 $". Pozisyona bağlı TP/SL çizgileri de buradan gelir. `mapCoin` artık `xyz:MSTR` gibi HIP-3 hisselerini `MSTRUSDT` vadeliye eşler. Emir satırının tamamı tıklanabilir (Enter da), grafiği açar.
- **Açık emirler sekmesi** (`#ordView`, `renderOrders`): `frontendOpenOrders` (ana + xyz) tüm emirler; sembol, yön, tür (limit / stop / kâr al, poz. TP/SL, sadece azalt), fiyat (tetik ve limit), miktar, değer, güncel fiyat, uzaklık, zaman. Sekme başlığında emir sayısı. Sembole tıklayınca grafik açılır.
- HL bağlı değilse özet gösterilmez. Sağ paneldeki "Pozisyon hesabı" bölümü (hesap, işlem başı risk %, çizilen long/short listesi) kullanıcı isteğiyle kaldırıldı (24 Kasım 2026). Long/short çizim aracı miktarı hâlâ kayıtlı `account` (varsayılan 1000) ve `riskPct` (varsayılan 1) ile hesaplar.

## İşlem geçmişi (`history.js`)

Kullanıcının isteği: Hyperliquid hesabındaki geçmiş işlemleri ve kâr/zarar analizini görmek.

- **İstekler** (`SV.trades.post` ile, aynı `/api/hl` yedeği): `userFillsByTime` (`aggregateByTime: true`, yanıt başına 2000, Hyperliquid en fazla son 10.000 dolumu verir), `userFunding` (yanıt başına 500), `portfolio`. Yanıt dolu gelirse aralık en eski ve en yeni dolum zamanından ikiye bölünüp tekrar istenir (sıralama varsayımı yok), `tid` ile tekrarlar atılır. Bağlanınca tam çekim, sonra 60 saniyede bir sadece yeni kayıtlar.
- **İşlem kurma:** Sadece vadeli dolumlar (`dir` içinde Long/Short; `@` ve `/` içeren spot coinler hariç). Her coin için zaman sırasıyla: `startPosition` 0'dan açılan pozisyon tekrar 0'a inince ya da yön değiştirince (`Long > Short`) bir işlem kapanır. Yön değiştiren dolum, kapanan kısım ve yeni açılan kısım olarak bölünür, komisyon miktara göre paylaştırılır. Geçmişin başında açılışı görünmeyen pozisyonlar "açılış geçmişte yok" olarak işaretlenir, ortalama girişi `closedPnl`'den geri hesaplanır.
- **İşlem alanları:** açılış/kapanış zamanı, yön, en büyük pozisyon (adet ve $), ortalama giriş/çıkış, getiri %, brüt K/Z (`closedPnl` toplamı), komisyon, fonlama (o coin için açılış-kapanış arası `userFunding`), net = brüt − komisyon + fonlama.
- **Elle girilen** ve tamamen kapatılmış işlemler de geçmişe eklenir (kaynak "Elle").
- **Geçmiş sekmesi:** en yeni 400 işlem. Sembole tıklayınca grafik o pariteye geçer ve işlemin açılış-kapanış aralığını gösterir (grafik aynı sembolde ise piyasa değişmez).
- **Kâr kademeleri (Analiz):** her kapanmış işlemin 1.000 $'lık pozisyon başına neti (net / en büyük pozisyon × 1000): Süper ≥ +200 $, Çok başarılı ≥ +100 $, Başarılı ≥ +50 $, Küçük kâr 0–50 $, Zarar; tümü, ≤ 7 gün, 7–30 gün, > 30 gün sütunlarıyla.
- **Analiz sekmesi:** net K/Z, kazanma oranı, kâr faktörü, işlem başına ortalama, ortalama kazanç/kayıp, en iyi/en kötü işlem, komisyon + fonlama, en büyük geri çekilme ve en uzun kayıp serisi, ortalama tutma süresi (kazanan/kaybeden), kümülatif net K/Z eğrisi (SVG), long/short ve sembol tabloları, otomatik gözlemler (en az 5 işlemde: tutma süresi farkı, kazanma oranı-ortalama kayıp uyumsuzluğu, long/short farkı, komisyon payı, fonlama payı, en iyi/en kötü sembol, kayıp serisi). Üstte `portfolio`'dan hesap değeri ve 1 gün/1 hafta/1 ay/tümü K/Z (açık pozisyonlar dahil).
- **Grafikte:** "Geçmiş işlemlerim" katmanı açık paritedeki dolumları üçgenle gösterir (yeşil alış, kırmızı satış; aynı mum ve yöndeki dolumlar birleşir, kapanışlarda net K/Z yazar).

## Favoriler (`favs.js`)

- Parite kutusunun yanındaki yıldız açık pariteyi (sembol + piyasa) favorilere ekler ya da çıkarır.
- Favoriler üst şeritte çip olarak durur, yanında 30 saniyede bir güncellenen 24 saatlik değişim (Binance `ticker/24hr`).
- Bir sembol spotta yoksa (`Invalid symbol`) grafik otomatik olarak vadeliye geçer ve favorideki piyasa da düzeltilir.

## Sağ panel düzeni (24 Kasım 2026)

Kullanıcı isteğiyle:
- Sağ paneldeki açıklamalar kaldırıldı: "Sinyal başarısı" altındaki ölçüm notu, "Sinyaller ne anlama geliyor?" bölümü (gösterge sözlüğü ve test notu), kayıt/veri notları ve Lightweight Charts metin atfı. Atıf artık grafiğin içindeki TradingView logosuyla veriliyor (`layout.attributionLogo: true`; kütüphanenin lisansı atıf istiyor). "Ayarlar" (geçmiş veri, pivot, seviye, tolerans) duruyor. "Yatırım tavsiyesi değildir" notu İşlem fikri bölümünde duruyor.
- Short/long kurulum kartları (`scenCard`) sağ panelden İşlemler panelindeki **Kurulumlar** sekmesine taşındı (`#kurIdea`; kartlar yan yana, kart içinde solda bilgi, sağda kademe tablosu, kaydırmadan sığacak kadar sıkı). Aynı sekmede sağda favori taraması. Sağ panelde İşlem fikri bölümü: piyasa kutusu, kısa vade eğilimi, son dönüş/turuncu satırları ve Kurulumlar sekmesine bağlantı.
- İzleme listesi iç kaydırma olmadan tam boy.
- Sağ panel genişliği sürüklenebilir: `#sideResize` (grafik ile panel arasında 6 px'lik sütun), 260 px ile (pencere − 520 px) arası. `--side` CSS değişkeni, `seviye.sagGenislik`; çift tık sıfırlar, ←/→ tuşları 30 px.

## BIST piyasası (25 Kasım 2026)

Kullanıcı BIST hisselerini (XU100, AKBNK, YKBNK, PGSUS, THYAO, MGROS, MAVI, MPARK) takip ediyor; TradingView gömülü grafiği BIST'i göstermiyor ("Sembol sadece TradingView'de bulunabilir") ve kullanıcı "bizim indikatörlerle analiz edilmiş olması lazım" dedi.
- Veri: Yahoo Finance grafik API'si (`SEMBOL.IS`), tarayıcıdan CORS'a takıldığı için `server.py` `/api/yf?s=&i=&r=` vekili (20 sn önbellek, parametreler beyaz listede); "max" için `range=max` yerine `period1=0&period2=şimdi` (range=max günlük/haftalıkta seyrek veri döndürüyor: THYAO 1G 319 mum yerine 6.824). baslat.bat yeniden başlatılmalı; eski sunucuda kartta "Sunucu eski" hatası.
- `S.market = 'bist'` (piyasa düğmelerinde "BIST"). Aralıklar: 5d/15d 60 gün, 1s 730 gün (60m), 4s = 60m'den gün içi seans başından 4 saatlik gruplar (`agg4`), 1G/1H/1A tüm geçmiş. Üst zaman dilimleri (1A, 1H, 1G) de Yahoo'dan. Canlı: WebSocket yok, 60 sn'de bir kısa aralık çekilir (`poll`), durum "15 dk gecikmeli".
- Arama: BIST hisse/fon listesi TradingView tarayıcısından (`turkey/scan`, borsa BIST, piyasa değerine göre, ~650), günde bir yenilenir (`seviye.bistListe`); XU100, XU030, XBANK elle eklenir. `#syms`'e "BIST:KOD" değeri ve "Şirket adı · BIST" etiketiyle girer (izleme listesi "+ Ekle" de aynı listeyi kullanır).
- Sembol kutusu: "BIST:THYAO", "THYAO.IS" ya da BIST piyasasındayken düz kod. BIST'ten Spot/Vadeli'ye geçince BTCUSDT, tersinde XU100 açılır.
- İzleme listesindeki BIST satırına tıklayınca bizim grafikte açılır; yıldız BIST'te izleme listesine ekler/çıkarır (favoriler ve favori taraması sadece Binance).
- Kurulum oranları kripto backtest'inden ve "Piyasa yönü" BTC aylık rejimi; BIST için test edilmedi.

## Gösterge grafikleri (TOTAL, BTC.D…, 25 Kasım 2026)

Kullanıcı: "Bunları da başka yerden çekemez miyiz? TradingView'de analiz edemiyoruz." `S.market = 'cap'`, semboller `CAPS`: TOTAL, TOTAL2, TOTAL3 (milyar $), BTC.D, ETH.D, USDT.D, USDC.D, USDT.D+USDC.D.
- Kaynak: CoinMarketCap'in grafik verisi (`api.coinmarketcap.com/data-api/v3/global-metrics/quotes/historical?format=chart&interval=5m|15m|1h|1d` → toplam piyasa değeri, BTC/ETH dominansı; istek başına en çok ~2.200 nokta; günlük 2013'ten beri, saatlik yıllar geriye) ve USDT/USDC piyasa değeri (`cryptocurrency/historical?id=825|3408&interval=1d|1h`, istek başına ~730–770 nokta, 1h aslında 2 saatte bir). Tarayıcıdan CORS'a takıldığı için `server.py` `/api/cmc` vekili (60 sn önbellek, beyaz liste).
- Mumlar noktalardan: 5d←5m, 15d←15m, 1s←1h, 4s←1h (4 saatlik UTC grupları), 1G←1d, 1H/1A←1d (Pazartesi / ay başı). Açılış = önceki kapanış, yüksek/düşük = açılış ve içindeki noktalar. Hacim = toplam 24 saatlik hacim (son nokta). Stablecoin değeri en yakın önceki noktadan.
- Değerler TradingView CRYPTOCAP ile birebir aynı değil (CMC toplamı biraz farklı); izleme listesi değerleri TradingView'den.
- Canlı: 60 sn'de bir son 3 gün çekilir. Üst çubuktaki BTC.D / USDT.D, izleme listesindeki gösterge satırları ve aramada "BTC.D" gibi kodlar bu grafiği açar; yıldız izleme listesine ekler/çıkarır.

## Otomatik başlatma ve telefondan erişim (25 Kasım 2026)

Kullanıcı: "Bilgisayar açıldığında otomatik çalışsın, telefondan da erişebileyim, responsive olsun."
- `server.py` bayrakları: `--lan` (0.0.0.0'a bağlanır, ev ağından erişilir), `--bg` (tarayıcı açmaz). Port doluysa (sunucu zaten çalışıyorsa) yeni süreç çıkar; `--bg` değilse tarayıcıyı açar. `/api/info` → `{lan, port, ips}` (yerel IP'ler; UDP 8.8.8.8 hilesi + hostname). `baslat.bat` artık `--lan` ile.
- `otomatik_baslat.bat`: Başlangıç klasörüne `Seviye.vbs` yazar (`pyw -3` ya da `pythonw` ile `server.py --lan --bg`, gizli pencere) ve hemen başlatır. `otomatik_kaldir.bat`: VBS'yi siler, komut satırında `server.py … --bg` olan süreci kapatır. İlk çalışmada Windows Güvenlik Duvarı sorar: sadece "Özel ağlar" işaretlenmeli.
- Ayarlar bölümünde (LAN modunda) "Telefon: http://192.168.x.x:8000". Sadece varsayılan ağ arabiriminin IP'si gösterilir (kullanıcının bilgisayarında VirtualBox 192.168.56.1 ve WSL 172.27.80.1 de vardı; doğru adres 192.168.1.8). `telefon_izni.bat`: yönetici olarak TCP 8000 için Özel ağ gelen izni kuralı ("Seviye 8000") ekler, ağ profillerini gösterir, onay alırsa internete bağlı ağı Özel yapar.
- Telefon düzeni (≤600 px): İşlemler sekmeleri tek satır, yatay kaydırmalı; kurulum kartlarında tablo bilginin altına iner. 390 px'te yatay taşma yok (üst hızlı çubuk zaten kaydırmalı).
- Güvenlik: sunucuda şifre yok; modemden port yönlendirme yapılmamalı.

## Sade arayüz (25 Kasım 2026)

Kullanıcı: "Gereksiz yazı istemiyorum hiçbir yerde, sadece ben kullanacağım." Kaldırılanlar: kurulum kartlarındaki "Nasıl hesaplandı?" ve piyasa kutusundaki "Nasıl belirleniyor?" bölümleri, piyasa açıklama satırı, "Kurulumlar sekmesinde… Yatırım tavsiyesi değildir" notu (kullanıcı isteğiyle), veri yoksa "Son dönüş teyidi / ön uyarı / turuncu" satırları (satır hiç çıkmaz), formasyon/trend kartı açıklama cümleleri, son kurulum ve "piyasaya ters" notları, bölgesi olmayan boş kurulum kartı, başlık parantez notları, izleme listesi notu, bildirim sekmesi açıklaması, açık emir/geçmiş/analiz açıklama paragrafları, HL bağlantı penceresi ve dominans görünümü notları, formasyon rehberi giriş notu, favori taraması "zayıf … listelenmedi" satırı. Boş durumlar "—". Sinyal listesinde sadece ilk gerekçe; formasyon listesinde sadece hedef ve olasılık. Tarama notu "· 13:30 → 13:45".

Sağ paneldeki bölümler (İşlem fikri, Durum, Formasyonlar, Son sinyaller, Destek ve direnç, Çizimler, Sinyal başarısı) başlığa tıklayınca açılır/kapanır (`section[data-sec]`, `.shut`), durum `seviye.bolumler`; varsayılan kapalı (kullanıcı isteği). İzleme listesi varsayılan kapalı. Ayarlar zaten `details`.

## Canlı veri koruması (24 Kasım 2026)

Kullanıcının NVDAUSDT 1s grafiğinde son mum 0,2345'e indi (−%99,83), otomatik ölçek bozuldu. Binance REST'te veri normaldi (fiyat ~156, 24 saatlik dip 134); kaynak bulunamadı, tekrar üretilemedi. Koruma eklendi:
- WebSocket mesajı sadece `k.s` = açık sembol ve `k.i` = açık zaman dilimi ise ve bağlantı güncelse (`wsToken`) kabul edilir; uymayan mesaj "canlı" sayılmaz.
- `ingest`: sıfır/negatif/sonsuz fiyat ya da son kapanışın 4 katı üstü / 4'te biri altı mum güncellemesi atılır.

## İzleme listesi (`watch.js`, 24 Kasım 2026)

Kullanıcı TradingView tarzı bir izleme listesi istedi (ekran görüntüsü: USDT.D+USDC.D, USDT.D, BTC.D, VIX, TOTAL3, TOTAL, BTCUSD, ETHUSDT, SOLUSDT, HYPEUSDT…). Sağ panelin en üstünde.
- Sütunlar: Sembol, Son, Değ., Değ.% (24 saatlik). Gruplar: Göstergeler, Kripto, Hisse ve emtia (TradFi kontratları `TRADFI`'den). 10 sn'de bir güncellenir.
- Kaynaklar:
  - Binance 24 saatlik ticker: spot toplu, vadeli tek tek; spotta yoksa kendiliğinden vadeliye geçer.
  - CoinGecko `global` (60 sn): BTC.D, ETH.D, USDT.D, USDC.D, USDT.D+USDC.D, TOTAL, TOTAL2, TOTAL3.
- Değişim: CoinGecko `coins/markets` (ilk 250 coin) `market_cap_change_24h` ile önceki değerler: önceki toplam = toplam × Σönceki ÷ Σşimdiki; BTC/ETH/USDT/USDC kendi oranlarıyla. İlk denemede `global.market_cap_change_percentage_24h_usd` kullanıldı ama gerçek veride −%4,13 verdi (TradingView −%1,26); ilk 250 toplamı −%1,16 verdi. Kullanıcının TradingView görüntüsüne yakın: BTC.D −0,17 ↔ −0,19, USDT.D +0,10 ↔ +0,107.
- "+ Ekle": BTC.D, TOTAL3, VIX gibi göstergeler ya da sembol ("sol", "nvda"). Satırın üstüne gelince ✕ ile çıkarılır. Satıra tıklayınca grafik açılır; göstergeler TradingView görünümünde açılır (`S.dom` = `CRYPTOCAP:…`, `TVC:VIX` vb.).
- **Kullanıcı isteği (VIX'e gerek yok, statik olmasın):** Kripto/hisse satırları doğrudan favori listesidir (`SV.favs.list()`, `onChange` ile canlı). "+ Ekle" ile eklenen sembol favorilere, satırdaki ✕ favorilerden çıkarır; yıldız da aynı listeyi değiştirir. `seviye.izleme` sadece göstergeleri saklar (USDT.D+USDC.D, USDT.D, BTC.D, TOTAL3, TOTAL; eklenebilir: ETH.D, USDC.D, TOTAL2). Eski kayıttaki sembol satırları ilk açılışta favorilere taşınır. VIX ve Yahoo vekili (`/api/quote`) kaldırıldı.
- "Favori taraması" sağ panelden İşlemler panelinde Analiz'in yanındaki **Kurulumlar** sekmesine taşındı (`#kurView`, `scan.js` aynı `#scan` / `#scanNote` öğelerine yazar).

- **TradingView verisi (25 Kasım 2026, kullanıcı: "göstergeler hâlâ eski, TradingView'den veri akmıyor"):** CoinGecko değerleri TradingView'den farklı (ör. USDT.D 8,54 / +%2,69 ↔ TV 8,71 / +%1,46; TOTAL 2,04 T ↔ 2,00 T). Göstergeler artık TradingView tarayıcısından: `POST https://scanner.tradingview.com/global/scan` `{symbols:{tickers:['CRYPTOCAP:TOTAL',…]}, columns:['close','change','change_abs']}` (CORS açık, ~10 sn'de güncelleniyor, tek istek). Değişim TradingView gibi günlük (UTC gün başından). USDT.D+USDC.D = toplam; değişim = mutlak değişimler toplamı. TradingView yanıt vermezse eski CoinGecko + Binance yolu yedek.
- **BIST ve TradingView sembolleri (25 Kasım 2026):** Listede `k: 't'` öğeleri (`id` = TradingView sembolü, ör. `BIST:THYAO`). Göstergelerle aynı `global/scan` isteğinde (sütunlar close, change, change_abs, description, pricescale, update_mode); ondalık `pricescale`'den, gecikmeliyse (BIST ücretsiz veri 15 dk) "G" etiketi. Grup "BIST" (diğer borsalar "Diğer"). "+ Ekle": `BORSA:SEMBOL` doğrudan; 3–6 harfli kod `#syms`'te `…USDT` olarak yoksa önce `BIST:` denenir, yoksa kripto. Tıklayınca TradingView görünümü açılır. Kullanıcının takip ettikleri (XU100, AKBNK, YKBNK, PGSUS, THYAO, MGROS, MAVI, MPARK) bir kez eklendi (`seviye.izlemeBist`). Üst çubuktaki BTC.D / USDT.D de artık TradingView'den, 30 sn'de bir.
- **Katlanabilir (25 Kasım 2026, kullanıcı isteği):** başlık düğmesi (`#watchToggle`, ▸/▾) `#watchBody`'yi açar/kapar; varsayılan kapalı, durum `seviye.izlemeAcik`. Kapalıyken veri çekilmez (Binance/CoinGecko), açılınca hemen yenilenir. "+ Ekle" kapalı listeyi açar.
- **Canlı göstergeler (24 Kasım 2026, kullanıcı: "bu veriler değişmiyor"):** CoinGecko `global` birkaç dakikada bir güncelleniyor (ölçüm: `updated_at` 3+ dk aynı) ve sık istekte 429 veriyor ("Failed to fetch"). Artık CoinGecko anlık görüntüsü 5 dk'da bir (hatada 2 dk sonra) alınır; o anda Binance `ticker/price` (tüm USDT pariteleri) taban fiyat olarak kaydedilir. 10 sn'de bir Binance fiyatlarıyla ilk 250 coinin piyasa değeri ölçeklenir (değer × fiyat/taban; USDT ve USDC sabit, Binance'te olmayanlar sabit): TOTAL, BTC/ETH payı ve dominanslar canlı. 24 saatlik değişim tabanı `coins/markets` `market_cap_change_24h`'tan. İlk denemede CoinGecko istekleri 429 (tarayıcıda CORS hatası olarak) döndü; artık `server.py` `/api/cg?k=global|markets` ile 4 dk önbellekli vekil (hata olursa eski veriyi verir), dosyadan açılışta doğrudan CoinGecko'ya düşer. Son anlık görüntü `seviye.izlemeSnap`'ta saklanır (açılışta hemen gösterilir, 1 günden eskiyse kullanılmaz). `server.py` değişikliği için baslat.bat yeniden başlatılmalı.

## Hisseler (24 Kasım 2026)

Kullanıcı ABD hisselerinin aramaya eklenmesini istedi ve sadece Binance kaynağını seçti (Yahoo geçmişi teklif edildi, istemedi).
- `app.js` `loadTradfi`: açılışta `fapi/v1/exchangeInfo` çekilir; `underlyingType` COIN olmayan USDT kontratları (EQUITY, KR/HK/CN_EQUITY, PREMARKET, COMMODITY, FX, INDEX; Kasım 2026'da 238 hisse) `TRADFI`'ye ve arama listesine (`#syms`) eklenir. Etiket: bilinen adlar (`STOCK_NAMES`) + tür + "vadeli".
- `setSym`: "nvda" yazınca NVDAUSDT'ye tamamlanır; TradFi sembolünde piyasa otomatik Vadeli olur. Kote para eki yoksa USDT eklenir.
- Sınır: hisse kontratlarının geçmişi kısa (TSLA Ocak 2026, NVDA 26 Mart 2026'dan). Haftalık/aylık trendler, işlem fikri bölgeleri ve Turuncu (365 gün ister) çalışmaz ya da kısıtlı kalır. Kontratlar 7/24 işlem görür.

## Canlı fiyat yedeği

- WebSocket adresleri sırayla denenir:
  - spot: `stream.binance.com:9443`, `stream.binance.com:443`, `data-stream.binance.vision`
  - vadeli: `fstream.binance.com`
- Bir adres 12 saniye içinde mesaj getirmezse sıradakine geçilir. Bu arada REST yoklama başlar: 3 saniyede bir son 2 mum çekilir (durum: "Canlı (yedek: 3 sn)").
- Hepsi başarısızsa 5 dakikada bir WebSocket tekrar denenir. Bir WebSocket mesaj getirdiği an yoklama durur.
- Kullanıcının ağında WebSocket'in çalışmadığı bildirildi (fiyat donuk kalıyordu). Konsoldaki `contentscript.js` / `ObjectMultiplex` uyarıları bir tarayıcı cüzdan eklentisine (MetaMask) ait, uygulamayla ilgisiz.

## Analiz kuralları

Sinyaller geçmişe dönük değişmez: her mum için sadece o ana kadarki veri kullanılır. Buy ve Sell onay mumu kapanınca çıkar; etiket onay mumundadır.

### Backtest (23 Kasım 2026)

**Veri:** Binance spot, BTC/ETH/SOL/BNB/XRP.
- 1s: 8.000 mum (Ara 2025'ten itibaren)
- 4s: 6.000 mum (Şub 2024'ten itibaren)
- 1G: 2018'den itibaren (SOL 2020'den)

**Yöntem:**
- Parametreler BTC/ETH/SOL'de seçildi, BNB/XRP'de doğrulandı.
- Her sonuç, aynı kuralla her 2 mumda bir rastgele açılan işleme göre "fark" olarak ölçüldü. Bu, piyasanın genel yön etkisini ayıklar.

**Sonuçlar (rastgeleye göre fark):**

| Sinyal | Eski kurallar | Yeni kurallar (tüm veri) | Yeni kurallar (sadece doğrulama seti BNB/XRP) |
|---|---|---|---|
| Buy | −0,08R | **+0,29R** (157 sinyal) | +0,15R |
| Sell | +0,04R (1G'de −0,32R) | **+0,28R** (264 sinyal) | +0,32R |
| Mor çizgi | −0,04R | **+0,16R** | — |
| Yeşil çizgi | −0,08R | **+0,08R** | — |
| P (100 mum sonra) | 100 mum −%2,0 (taban +%0,8) | **4s ve 1G'de %65 daha aşağıda, ortalama +7,8 puan** | — |

- Tepki işareti tek başına bir avantaj sağlamıyor (yaklaşık 0R). Bu yüzden sadece "onay bekleyen aday" olarak gösteriliyor.
- Kullanıcının ekran görüntüsündeki hatalı Buy'lar (BTC 4s, 7 ve 13 Ekim, 13 Kasım 2026) yeni kurallarla çıkmıyor. 25 Ekim'deki P doğruydu (fiyat 80,9 binden 55 bine düştü). Eski ölçüm kuralı bunu yanlışlıkla başarısız sayıyordu.

**Önemli bulgular:**
- "Aşırı satımda dip yakala" türü Buy (RSI, Bollinger, destek puanlaması) her varyasyonda rastgeleden iyi değildi. Ne trend filtresi, ne puan eşiği, ne yükseliş trendindeki geri çekilme kurtardı.
- Mor/yeşilde "ters klimaks" (pompa mumundan sonra düşüş beklemek) rastgeleden kötüydü. Yerine trend yönündeki kırılım ve klimaks konuldu.
- Parite bazında otomatik ayar, eğitim setinde iyi görünüp doğrulama setinde tutmadı (ezberleme). Bu yüzden kaldırıldı.

### Buy / Sell (24 Kasım 2026, referans göstergeye benzetildi)

Kullanıcının isteği: Buy/Sell çok seyrek çıkıyordu, dikey çizgiler çok fazlaydı; TradingView'deki referans göstergeye (ETH 4s, Haz–Kas 2026) benzemesi isteniyor. Referansta 6 ayda yaklaşık 11 Buy/Sell (Buy dipte, Sell tepede, yükseliş trendinde de Sell var) ve 3 dikey çizgi olayı var. Referans noktalarında RSI: diplerde 14–34, tepelerde 68–96.

**Buy:** Dip mumu j, son 5 mum içinde. j'nin dibi son 20 mumun (`S.ext`) en düşüğü ve o zamandan beri kırılmamış. j ve önceki 2 mumda en düşük RSI ≤ 30. Onay: kapanış j mumunun tepesinin üstünde. Etiket onay mumunda.
**Sell:** Aynısı tersten: son 20 mumun en yükseği, RSI ≥ 70, kapanış tepe mumunun dibinin altında. SMA200 şartı yok.
- Aynı türden iki sinyal arasında en az 5 mum. 30 mumdan yakınsa yeni dip/tepe öncekinden daha uç olmalı (düşüşte art arda Buy'lar giderek aşağıda).
- Stop (istatistik için): dip/tepe mumunun ucu.
- **Piyasa yönü:** `app.js` `indexSignals` her sinyale `mk` ekler (BTC aylık rejimi, `SV.scen.regime`). Piyasa yönüne ters Buy/Sell içi boş (çerçeveli) etiketle çizilir, listede "piyasa yönüne ters" yazar.
- ETH 4s referans eşleşmesi: 9 referans noktasından 7'si (±4 mum), toplam 14 sinyal. Eski kurallar: 10 Buy (çoğu kırılım alımı, tepede), 1 Sell.

**Backtest** (rastgeleye göre fark, BTC/ETH/BNB/SOL/XRP, 1s/4s/1G):

| | Yeni: piyasa yönünde | Yeni: ters | Yeni: tümü | Eski: tümü |
|---|---|---|---|---|
| Buy | +0,12R (198) | −0,15R (439) | −0,07R (648) | +0,18R (634) |
| Sell | +0,23R (384) | −0,11R (302) | +0,07R (703) | +0,28R (264) |

Yeni kurallar referansa benzer ama tümüyle eskiden zayıf. Avantaj sadece piyasa yönündekilerde var; bu yüzden terstekiler çerçeveli çizilir. Eski kurallar: dip/tepe süpürmesi (iğne ≥ 0,6 ATR, hacim ≥ 1,3×, 3 mumda onay), SMA200 üstünde kırılım alımı, Sell sadece SMA200 altında.

### Direnç (üst zaman dilimi direnç reddi, `zsell`)

Kullanıcının isteği: uzun vadeli trend çizgileri, parabolik yaylar ve haftalık/aylık dirençler sinyallerde kullanılsın. Örnek: BTC Ekim 2026 tepesi (aylık düşen trend ile haftalık parabolik direncin kesiştiği yer).

**Bölgeler** (`zones.build`): Her aylık ve haftalık mum kapandığında, o ana kadarki veriyle hesaplanır. Henüz kapanmamış üst zaman dilimi mumu kullanılmaz.
- `htfTrends`: en iyi düşen ve yükselen trend çizgisi (fiyatın ±%60'ı içinde).
- `arcs`: parabolik destek/direnç yayı.
- Yatay seviyeler: son 40 pivot, %1,2 içinde kümelenir, en az 2 temas.
- Bir bölge, fiyatın altındaysa destek, üstündeyse direnç sayılır. Kırılan destek dirence döner.

**Sinyal:**
- Mumun tepesi, bir direnç bölgesine tolerans içinde değer. Tolerans max(0,5 ATR, fiyatın %0,4'ü).
- Kapanış bölgenin altında kalır ve mumun en az %50'si üst fitildir.
- Onay mumu beklenmez; backtest'te onay beklemek sonucu kötüleştirdi.
- İki sinyal arasında en az 10 mum olur.
- Haftalık yatay seviyeler kullanılmaz; zayıf çıktılar.

**Backtest** (rastgeleye göre fark):
- Toplam +0,15R (1.580 sinyal). Eğitim +0,15R, test +0,13R.
- Zaman dilimine göre: 1s +0,17R, 4s +0,15R, 1G +0,09R.
- Bölge türüne göre: aylık trend +0,21R, aylık seviye +0,19R, haftalık parabolik +0,15R, aylık parabolik +0,12R, haftalık trend +0,11R.

**Ne denendi, neden alınmadı:**
- Destekten Buy tepkileri (aynı mantık, ters yön) rastgeleden iyi değildi (−0,07 ile +0,04R). Bu yüzden destekler sinyal değil, sadece İşlem fikri panelinde senaryo olarak gösterilir.
- Mevcut Sell ile birleştirince Sell başına getiri +0,28R'den +0,15R'ye düşüyordu. Bu yüzden Direnç ayrı bir etiket ("Direnç", koyu kırmızı) ve ayrı bir katman olarak gösterilir.

### İşlem fikri paneli (`scenario.js`)

Sağ panelin en üstünde. Kullanıcının istekleri: senaryolar backtest ile desteklenmeli, grafik ilerledikçe güncellenmeli, iyi giriş oluşunca bildirim gelmeli; piyasa yönü (ayı/boğa) belirlenmeli; başarı 1.000 $'lık girişte +50 $ (başarılı), +100 $ (çok başarılı), +200 $ (süper başarılı) olarak ölçülmeli, haftalık işlemlerde +50–100 $ yeterli.

- **Piyasa yönü:** BTC aylık (spot BTCUSDT 1M, 6 saatte bir). Kapanış 10 aylık ortalamanın üstünde ve ortalama 2 ay öncesine göre yükselmişse boğa; altında ve düşmüşse ayı; ikisi çelişirse önceki yön korunur. Sadece ay kapanışında değişir. Ay içinde güncel fiyatla yön dönecekse uyarı çıkar.
  - Kullanıcı itirazı (2026-11): "ayı piyasasındayız ama boğa görünüyor". BTC 2025-10-06'da 126.200 zirve, 2026-11'de 61.362 (−%51). Sadece ortalamaya bakan eski kural 2026 Ağustos–Ekim tepkisini boğa saydı. Eğim şartı eklenince 2025-12'den beri kesintisiz ayı.
  - Test (`/home/claude/bt/regime_v2.js`, 5 coin günlük, 90 gün ±%20 simetrik): yön tarafı / ters taraf %60 / %39 (2018–22), %48 / %40 (2023–26). 8 yılda 3 yön değişimi (eski kural 9). Kendi grafiğine göre yön (SMA200, 50/200, haftalık 20/50) 2023 sonrası işe yaramadı.
- **Bölgeler:** Sadece aylık ve haftalık grafikten (`SV.zones.build`). Fiyatın ±%25'i içinde %1,2 aralıkla kümelenir. Grafik seviyeleri senaryoya katılmaz.
- **Tetik:** Short: mum bölgenin alt kenarına 0,25 ATR yaklaşır ya da içine girer ve bölgenin altında kapatır; giriş o mumun kapanışı. Long tersi. Aynı yönde 6 mumdan sık sayılmaz. **Kapanış bölge kenarından 1 ATR'dan ya da %4'ten uzaksa "giriş için geç"** (kullanıcının haftalık grafikte 76.303'teki bölgeden %14 aşağıda 65.351 girişi görmesi üzerine eklendi; backtest'te bu girişler +50 $ %46, ortalama negatif).
- **Plan (kullanıcının kademeleri):** stop girişin %5 ötesi (−50 $). +%5'te 1/3 kapatılır ve stop girişe çekilir, +%10'da 1/3, +%20'de kalan. 30 gün ufuk. Henüz tetiklenmemiş planda giriş bölge kenarından 0,4 ATR içeride tahmin edilir.
- **Güçlü kurulum** = bölgede aylık ya da haftalık trend çizgisi (3 temaslı). İkinci satır piyasa yönü. Piyasa yönüne ters güçlü kurulumda kartta uyarı çıkar. **İyi kurulum** (bildirim) = güçlü + piyasa yönünde + test edilmiş zaman dilimi (1s/4s/1G) + +50 $ ≥ %60 + n ≥ 60 + iki coin grubunda da ≥ %60.
- **Backtest sonuçları** (30 gün, yukarıdaki plan, 1s/4s/1G, 5 coin; `/home/claude/bt/regime12.js` V=T, protokol kontrolü `trendtest3.js`). Rastgele girişte ±%5'te önce hedef ≈ %50:
  | Grup | n | +50 $ | +100 $ | +200 $ | ort. $/işlem | 7 gün +50 $ | BTC/ETH/BNB · SOL/XRP |
  |---|---|---|---|---|---|---|---|
  | Short güçlü (trend teması) · piyasa yönünde | 117 | %66 | %38 | %32 | +28 | %59 | %68 · %63 |
  | Short güçlü · piyasaya ters | 88 | %36 | %27 | %17 | −4 | %33 | %28 · %61 |
  | Short zayıf · yönünde | 598 | %56 | %36 | %21 | +16 | %49 | |
  | Short zayıf · ters | 367 | %52 | %24 | %8 | −1 | %45 | |
  | Long güçlü (trend teması) · yönünde | 133 | %68 | %45 | %23 | +31 | %50 | %72 · %55 |
  | Long güçlü · ters | 176 | %38 | %19 | %9 | −12 | %32 | %40 · %35 |
  | Long zayıf · yönünde | 436 | %53 | %28 | %16 | +7 | %43 | |
  | Long zayıf · ters | 598 | %46 | %20 | %9 | −2 | %35 | |
  - (Tablo parabolik yay yakınlık şartından sonra yeniden hesaplandı, 2026-11-24.)
  - **Kullanıcının gözlemi doğrulandı (2026-11-24):** "Trend çizgisine alttan değenler %70 civarı tutuyor, düşen piyasada %20–30; piyasa yönüne bağlı." Trend teması + piyasa yönünde: long %71, short %67; piyasaya ters: %38 / %37. Parabolik yay temaslarında belirgin kenar yok (sadece parabolik dirençten short, yönünde %62). Yatay seviyeye temas (trend yok) short %51.
  - SMA200 şartı trend temasında sonucu kötüleştirdi (short %62), güçlü tanımından çıkarıldı.
  - Sıkı protokol (Grok önerisi: aynı aylardan rastgele, hafta+yön tekilleştirme, SOL/XRP'de n ≥ 30 ve ≥ %60, komisyon): short trend · yönünde **geçti** (SOL/XRP n 49 %67, rastgele %56; tekil n 27 %63; net +29 $). Long trend · yönünde SOL/XRP'de %52 ile geçmedi (tekil n 61 %66).
  - "İyi kurulum" şu an sadece short (trend teması + piyasa yönünde).
- **Grok turu (2026-11-24) geri alındı:** `GROK_ONERILER.md`'deki filtreler (fitil/hacim, aylık trend şartı, yapısal stop, zaman çıkışı, günlük yapı, ATR) ve bölge düzeltmeleri (kırık yay, sırayı bozan temas, delinmiş seviye) sonucu iyileştirmediği için kullanıcı isteğiyle geri alındı. Sonuçlar `GROK_SONUCLAR.md`'de. Kalıcı ders: eski "%72" (2+ kaynak + SMA200) hafta bazında tekilleştirince %52'ye iniyordu.
- **Durumlar:** Bekleniyor, Yaklaşıyor (≤ %1,2 ya da ≤ 1,5 ATR ve ≤ %5), Bölgede, Giriş oluştu (son 3 kapanmış mumda; görülen kademe yazar), Bölge kırıldı; son kurulum için not (kademe/başabaş/stop/geç kalındı). 1s/4s/1G dışındaki zaman dilimlerinde "test edilmedi" uyarısı.
- Bekleyen senaryonun bölgeleri güncel fiyata göre seçilir (aylık grafikte açık ay %20 hareket edebildiği için). Tetik kontrolü backtest'teki gibi önceki kapanışa göredir. Senaryo en az 30 kapanmış mumla çalışır; SMA200 yoksa o koşul ✗ ve açıklamalı (aylık grafik).
- Panel bu grafiğin geçmişindeki aynı kuralın sonucunu da gösterir (`SV.scen.history`, aynı plan). 15 saniyede bir yeniden çizilir.
- "Bu grafikte kısa vade" satırı (eğilim puanı): ana trend ±1, kısa vade ±0,5, son 150 mumda P −1, son 20 mumda mor −1 / yeşil +1, son 10 mumda Sell/Direnç −1, Buy +1.
- **Kart düzeni (kullanıcı: "gereksiz yazıları kaldır"):** başlık + etiket (İyi kurulum / Güçlü · az örnek / Güçlü · piyasaya ters / Zayıf), durum satırı, bölge satırı, kısa koşul etiketleri (2+ kaynak, Trend/parabolik, SMA200, Piyasa yönünde), Kademe | Fiyat | Olasılık tablosu, tek satır özet (30 günde ort. $/işlem · örnek sayısı · uyarılar). Kural ve backtest ayrıntısı kapalı "Nasıl hesaplandı?" bölümünde; açık bırakılan bölüm 15 saniyelik yenilemede açık kalır. Piyasa kutusu da kısa; ayrıntı "Nasıl belirleniyor?" içinde. "En yakın direnç/destek" listesi kaldırıldı (bölge kartta).
- "Grafiğe çiz" stop ve +100 $ hedefiyle long/short çizimi oluşturur. Grafikteki bölge bantlarında güçlüyse "· güçlü" yazar.

### Formasyon kurulumları (24 Kasım 2026)

Kullanıcı NVDA 4s'te boğa bayrağı varken long önerilmediğini sordu; Kurulumlar sadece aylık/haftalık bölgelerden üretiliyordu. İstek: formasyonlardan da kurulum, başarı oranı yüksekse çok sayıda; short solda, long sağda, karıştırmadan; her sütun güce göre sıralı.

- **Backtest (tarayıcıda, `localhost:8000/indicators.js` sekmesinde çalıştırıldı):** 30 Binance spot coini (BTC, ETH, BNB, XRP, SOL, ADA, DOGE, TRX, LTC, LINK, DOT, AVAX, BCH, XLM, ATOM, ETC, FIL, UNI, NEAR, AAVE, ALGO, VET, HBAR, ICP, INJ, EOS, XTZ, THETA, SAND, MANA) · 1s 8000, 4s 6000, 1G 3000 mum. Her kapanan mumda son 300 mumda `SV.patterns.detect` (pivot 5, nedensel) çalıştırıldı; kırılımın o mumda olduğu formasyon = giriş, o mumun kapanışı. Plan bölge kurulumlarıyla aynı (stop %5, +5/+10/+20 kademeler, +50 $'da stop girişe, 30 gün). 5.937 olay.
- **Sonuç:** Rastgele girişte (4s+1G, her 5. mum) +50 $ oranı %49,2. Bütün formasyon kırılımları %51 (4s+1G %54, 1s %49 → 1s'te kurulum yok). Boğa bayrağı 4s+1G 314 olayda %48, ayı bayrağı %53, OBO %52, ters OBO %54, ikili tepe/dip %50/%49: kurulum olarak gösterilmez.
- **Kurulum yapılan tipler (`SV.scen.PST`, 4s+1G):** Düşen kama ↑ %64 (190; coin yarıları %57/%70), Düşen kanal ↑ %62 (123; %69/%56), Alçalan üçgen ↑ %65 (40, az örnek), Yükselen kama ↓ %61 (121; %54/%67), Yükselen kanal ↓ %59 (116; %63/%53), Düşen kama ↓ %60 (40, az örnek), Yükselen üçgen ↓ %66 (32, az örnek). Piyasa yönü (BTC aylık) bu tiplerde tutarlı fark yaratmadı; kartta bilgi olarak gösterilir.
- **Canlı (`SV.scen.patLive`):** sadece 4s ve 1G. Oluşan formasyon: kırılım seviyesi = sınır çizgisi ± 0,25 ATR (son mumda), "Bekleniyor / Yaklaşıyor (≤1,5 ATR)"; kapanmamış mum seviyeyi geçtiyse "Kırılıyor"; kırılım son 5 kapanan mumdaysa "Giriş oluştu" ve sonrası (stop / başabaş / +200 $) `follow` ile.
- **Güç sırası:** `SV.scen.score` = (p50·n + 0,5·50) / (n + 50), örneği az olan aşağı iner. Bölge kartı da aynı puanla aynı sütunda sıralanır; bölgesi olmayan kart en altta. Etiket: p50 ≥ %60 ve n ≥ 100 "Güçlü", diğerleri "Orta" (n < 60 "az örnek").
- **Düzen:** `#kurIdea` iki sütun (`.kcol.short` solda, `.kcol.long` sağda), dar ekranda tek sütun. 4s/1G dışı grafikte not satırı.
- **Favori taraması:** aynı tipler 4s/1G'de taranır (Giriş oluştu / Kırılıyor / Yaklaşıyor), listede formasyon adıyla; bildirim gönderilmez (sadece bölge "iyi kurulum"larına bildirim).

### Limit giriş ve trend kırılımı kurulumları (24 Kasım 2026)

Kullanıcı: "Kurulumlar mevcut fiyattan giriş gösteriyor, dirençlerden ya da formasyona göre girmek gerekmiyor mu? Trend kırılımlarını da görebilirsek iyi olur." (BTC 4s: aylık trend direnci 61.485, kart girişi 60.246 = bölge − 0,4 ATR, yüksek oynaklıkta fiyatın yanı.)

- **Backtest (tarayıcıda, 30 Binance coini, 1s 8000 / 4s 6000 / 1G 3000 mum, aylık+haftalık+günlük veri Binance'ten, 28.718 olay; plan aynı: %5 stop, +5/+10/+20, 30 gün; rastgele ≈ %49):**
  - Bölgeye **limit** (kenara değince dolar, mum kenarın ötesinde açılırsa açılıştan; aynı mumda stop görülürse stop) ile eski **ret kapanışı** girişi neredeyse aynı: short trend+yönünde %59 (685) / %61 (584); long trend+yönünde %50 / %51.
  - **Önemli düzeltme:** Eski STATS 5 coinden geliyordu (short güçlü-yönünde %66, long %68). 30 coinde long güçlü-yönünde %50'ye iniyor (rastgele düzeyi); short %59 tutuyor. STATS 30 coin limit sonuçlarıyla değiştirildi (tr/te = coin yarıları).
  - Trend kırılımı (alt zaman diliminde kapanış çizginin 0,25 ATR ötesinde, önceki kapanış diğer tarafta; çizgi başına bir kez): günlük düşen çizgi yukarı (1s/4s) %56 (942; yarılar %61/%52), günlük yükselen çizgi aşağı %59 (468; %61/%57), haftalık yükselen aşağı + piyasa ayı %59 (104). Haftalık düşen yukarı %46, aylık çizgiler %40–44, günlük grafikte günlük çizgi kırılımı %48–49: gösterilmez. Kırılım sonrası çizgiye geri test limiti: günlük long %57, short %53 (kullanılmadı).
- **Kod:** `scenario.js` `eventAt` artık bölge kenarına değmeyi limit dolumu sayar (`lim: true`, `follow` dolum mumunda stopu kontrol eder); bekleyen planın girişi kenarın kendisi (önceden kenar ± 0,4 ATR). Canlı mum da taranır ("bu mumda" doldu). Durumlar: Bekleniyor / Yaklaşıyor (limite) / Limit doldu / stop / başabaş / +200. `inzone`, `late`, `broken` artık üretilmez.
- `good` = trend çizgisi + piyasa yönünde + p50 ≥ %58, n ≥ 100, iki yarı ≥ %55 (`strongSt`). Kart etiketi: Güçlü / Orta / Zayıf. Şu an sadece short güçlü-yönünde "Güçlü".
- Formasyon "Kırılıyor" durumunda giriş artık kırılım seviyesi (önceden anlık fiyat).
- **`SV.scen.trendLive`** (`TST`): 1s/4s grafikte günlük trend çizgileri (`SV.zones.build` son 500 kapanmış günlük mum, bugün ve 2 gün önceki anlık görüntü; kırılım sonrası çizgi düşse de 2 gün görünür), her grafikte haftalık yükselen çizgi (sadece piyasa ayıyken, short). Son 5 kapanan + canlı mumda kırılım → Giriş oluştu / Kırılıyor; yoksa her yön için en yakın çizgi 4 ATR içindeyse Bekleniyor / Yaklaşıyor (giriş = çizgi ± 0,25 ATR). Kartlar formasyon kartlarıyla aynı (`patCard`, `kind: 'trend'`), güce göre sıralı.
- Favori taraması: trend kırılımları da taranır (günlük veri 600 mum, HTF önbelleği 1 saat). Listede bölge kurulumlarından sadece Güçlü olanlar görünür.

### Sembol geçişi bildirimi hatası (24 Kasım 2026)

Kullanıcı: "BTCUSDT 4s: dirence yaklaştı · Fiyat 714,540 (SPY fiyatı)". Sebep: `load()` sırasında `S.symbol` yeni sembole geçmiş, `bars`/`idea` hâlâ eskiydi; 15 sn'lik yenileme ya da `checkAlerts` eski veriyi yeni adla bildirdi. Düzeltme: `barsKey` (verinin ait olduğu market+sembol+aralık) `bars` atanırken yazılır; `load()` başında `idea = null`; `idea.key = barsKey`; `checkAlerts`, `checkSignalAlerts` ve `renderIdeaInner` anahtar güncel sembolle eşleşmezse çalışmaz ("Hesaplanıyor…").

### Kırılım kartı metni (24 Kasım 2026)

Kullanıcı fiyatın altındaki short kırılım girişini (ETH, haftalık yükselen trend 1.584,81, fiyat 1.690) "mevcut fiyatın altına short" diye yanlış anladı. Trend/formasyon kartları artık açıkça kapanış tetiklidir: durum "Bekleniyor · fiyat X altında kapanırsa short", bilgi satırı "Aşağı kırılım kurulumu: … altında kapanışta giriş, şimdiden emir yok", tablo satırı "Altında kapanış / Üstünde kapanış".

### Favori taraması (`scan.js`)

- Her favori için 4s ve 1G grafikte 15 dakikada bir 500 mum çekilir (kullanıcı isteği, 24 Kasım 2026: sayfa her açıldığında taramasın). Son tarama `seviye.tarama` anahtarında (zaman, sonuçlar, favori sayısı) saklanır; açılışta kayıtlı sonuç gösterilir, sonraki tarama son taramadan 15 dk sonra (en erken 5 sn). Not satırında son ve sonraki tarama saati, aylık/haftalık veri 6 saat önbellekte tutulur, `SV.scen.live` çalıştırılır.
- Listede sadece güçlü kurulumlar (Giriş oluştu / Bölgede / Yaklaşıyor) görünür, "iyi kurulum" / "örnek az" / "piyasa yönüne ters" diye işaretlenir; zayıflar sayı olarak yazılır. Tıklayınca o parite ve zaman dilimi açılır. Bildirim sadece iyi kurulumlar için.
- Açık grafikteki parite/zaman dilimi için bildirimi `app.js` verir, tarayıcı tekrar etmez.

### Bildirimler

Panel başlığındaki "Bildirimleri aç" düğmesiyle açılır, ayar `notify`'da saklanır. Bildirimler sadece İşlemler panelindeki "Bildirimler" sekmesine ve zil ikonunun sayacına düşer. Sağ alttaki açılır kutular ve Windows/tarayıcı bildirimleri kullanıcı isteğiyle kaldırıldı (24 Kasım 2026).

- **İyi giriş:** İyi kurulum (güçlü + piyasa yönünde + +50 $ oranı ≥ %60) tetiklendiğinde; giriş, stop ve +50/+100/+200 $ fiyatlarıyla. Açık grafik ve favoriler (4s, 1G) için. Aynı mum için bir kez.
- **Bölgeye yaklaşma:** Açık grafikte senaryo "Yaklaşıyor" ya da "Bölgede" olunca (güçlü/zayıf yazar); favorilerde sadece güçlü kurulumlar için. Aynı bölge için en fazla 3 saatte bir.
- **Yeni sinyal:** Sayfa açıldıktan sonra kapanan mumlarda çıkan her sinyal.
- **Tekrar yok:** Gönderilen her bildirimin anahtarı ve başlık+metni `seviye.bildirimAnahtar`'da saklanır (son 3000). Aynısı sayfa yenilense ya da bekleme süresi dolsa da tekrar gönderilmez; "Temizle" bu kaydı silmez.
- **Bildirim geçmişi (24 Kasım 2026):** Her `notify` çağrısı ekrandaki kutuya ek olarak `seviye.bildirimler`'e kaydedilir (en fazla 200; zaman, başlık, metin, piyasa/sembol/zaman dilimi). Üst şeritteki zil (`#bellBtn`) okunmamış sayısını gösterir ve İşlemler panelinde "Bildirimler" sekmesini açar. Sekme görülünce okundu sayılır (`seviye.bildirimOkundu`). "Grafiği aç" bildirimin grafiğini o zaman diliminde açar; "Temizle" listeyi siler. `scan.js` bildirimleri kendi sembol/zaman dilimini iletir.
- **Sınır:** Sayfa açık olmalı. Tarayıcı bildirimi `localhost` (baslat.bat) ile güvenilir çalışır; `file://` açılışında genelde sadece sayfa içi uyarı görünür.

### Mor P (uzun vadeli düşüş)

- **Şart:** kapanış < SMA200 ve SMA50 < SMA200.
- **Tetikleyici:** SMA200'ün 20 mumluk eğimi negatife döner. Son 30 mumda büyük ölçekli RSI ayı uyumsuzluğu da varsa açıklamaya eklenir.
- İki P arasında en az 150 mum olur. Ayrıca son P'den sonra ya fiyat SMA200 üstüne çıkmış olmalı ya da 400 mum geçmiş olmalı.
- **Sadece 4s, 1G, 1H ve 1A grafiklerde gösterilir.** 1s'de test edildi ve anlamsız çıktı.
- Diğer tetikleyiciler (150 mumluk destek kırılımı, ölüm kesişimi, SMA200 geri testi) test edildi ve P'yi zayıflattıkları için çıkarıldı.

### Mor / yeşil çizgi (klimaks, referansa benzetildi)

40 mumda en fazla bir tane. Hacim ≥ 2,5 × 20 mumluk ortalama şart.
- **Yeşil:** RSI ≤ 22 ve kırmızı mum (satış klimaksı / kapitülasyon). Tümü +0,11R; piyasa yönünde +0,19R.
- **Mor:** RSI ≥ 85 ve yeşil mum (alım klimaksı / aşırı ısınma). Backtest −0,41R: sonrasında büyük düşüş rastgeleden seyrek. Referansa benzerlik için duruyor; rehberde "short sinyali değildir" yazar.
- ETH 4s Haz–Kas: yeşil 2 Haz, 8 Eki, 14 Kas; mor 19 Ağu (referansla aynı yerler, +8 Eki).

### Tepki (aday)

Bu mum son 20 mumun en düşüğü/en yükseği ve RSI ≤ 30 / ≥ 70 ise, onay gelmeden işaretlenir. Aynı yönde iki tepki arasında en az 15 mum. Onay 5 mum içinde gelirse Buy/Sell olur.

### Sarı

60 mumda en fazla bir tane. Sadece güçlü RSI uyumsuzluğu: önceki tepede RSI ≥ 70 (dipte ≤ 30) ve fark > 8 puan. SMA50/200 kesişimi çıkarıldı (SMA çizgileri zaten gösteriyor).

Dikey çizgi sayısı (ETH, Haz–Kas 2026): 4s'te 24 → 6, 1s'te 105 → 21.

### Turuncu (büyük dönüş deseni, `orange.js`, 24 Kasım 2026)

Kullanıcının isteği: 2 ay ve üstü süren büyük yükseliş/düşüşlerin çoğundan önce yanan, geçmiş desenlere dayalı turuncu sinyal. Yükselişte mumun altında (↑), düşüşte üstünde (↓).

- **Hesap:** Günlük kapanmış mumlardan (`htfRaw['1d']`, 2000 mum, 364 gün ısınma). `app.js` `computeHtf` sinyalleri açık grafiğin mumuna yerleştirir (gün içi grafikte o günün son mumu, haftalık/aylıkta içeren mum). Aynı yönde 30 günde en fazla bir kez.
- **Alt (↑), 24 Kasım'dan itibaren (Grok önerisi 2, kullanıcı onayladı):** fiyat 1 yıllık tepenin en az %40 altında, son 15 günde (bugün hariç) günlük RSI(14) ≤ 25 ve günlük kapanış 10 günlük ortalamayı yukarı kesiyor. Önceki kural: 1 yıllık dip son 30 günde + aynı %40 ve ortalama şartı.
- Bağımsız doğrulama (26 coin): yakalama 2018–22 %49 / 2023+ %48 / büyük 5 %50 (önceki %49 / %45 / %35); isabet %46 / %44 / %53 (önceki %37 / %39 / %54); 90 g medyan +%3 / +%8 / +%15 (önceki −%3 / +%9 / +%18; rastgele −%4 / −%5 / +%4). 2023+'da 90 günde ≥ %30 lehte hareket oranı %44 (önceki %52, rastgele %40). Grok'un sonuç dosyası: `GROK_TURUNCU_SONUC.md`.
- **Üst (↓):** Fiyat 1 yıllık dibin en az %50 üstündeyken günlük kapanış 50 günlük ortalamayı aşağı kesiyor.
- **İstatistik satırı:** Başarı = 90 gün içinde sinyal yönünde ≥ %30 hareket. Ortalama = 90 günlük getiri (sinyal yönünde). Fark = rastgele günlere göre puan.

**Araştırma** (26 coin, günlük, 2017–2026; büyük hareket = %30 zigzag, ≥ 60 gün, ≥ %30; yakalandı = bacak başından 45 gün önce ile 20 gün sonrası arasında sinyal):

| | Yakalanan 2018+ / 2023+ | İsabet / rastgele | 90 g medyan getiri (sinyal / rastgele) |
|---|---|---|---|
| Alt | %46 / %45 | %38 / %17 | +%4 / −%5 (2023+: +%9 / −%5) |
| Üst | %54 / %56 | %11 / %11 | +%12 / +%5 (2023+: +%14 / +%5) |

- "Çoğunu" (%75–90) yakalayan kurallar (50 günlük ortalamanın %17 altı, RSI ≤ 30, dip kırılımı, geri çekilme toparlanması) rastgeleden iyi değil. Yükselişlerin yaklaşık yarısı 1 yıllık dibe yakın başlamıyor; bunlar için rastgeleden iyi desen bulunamadı.
- Gradyan artırma modeli coin ayrımında iyi, zaman ayrımında (2022'ye kadar eğit, 2023+ test) rastgeleden kötü çıktı; kullanılmadı.
- BTC'de üst sinyal boğa piyasasında sık çıkıyor (2024–2025'te her 50 günlük ortalama kırılımı). Filtreler yakalamayı düşürüp getiri farkını artırmadığı için eklenmedi.
- Grok için görev: `GROK_TURUNCU.md`; test betiği `turuncu_test.js` (`node turuncu_test.js`, Binance'ten çeker).

### Sarı üçgen (piyasa dönüşü, `turn.js`, 24 Kasım 2026)

Kullanıcının isteği: piyasa ayıdan boğaya dönecekse altta, boğadan ayıya dönecekse üstte sarı üçgen; birkaç ay önceden uyarsın, bütün piyasalarda çalışsın. İlk sürümden sonra "uyuşmayan çok yer var, daha seçici ve isabetli olsun" ve "bütün tepe ve diplerle eşleşmesi zorunlu" dedi. Test, önceden uyaran kurallarda isabet ile yakalamanın zıt gittiğini gösterdi; tüm dönüşleri yüksek isabetle yakalamak ancak dönüşten sonra teyitle mümkün. Kullanıcı iki katmanı birlikte seçti (AskUserQuestion).

Her ikisi o grafiğin kendi haftalık kapanmış mumlarından (`htfRaw['1w']`). `S` = o haftaya kadarki 52 haftalık yıllık oynaklıkların medyanı (nedensel). z = (log kapanış − log 40 haftalık ortalama) ÷ bu farkın son 156 haftalık standart sapması.

**Ön uyarı (içi boş üçgen, tür `tri`):** Aynı yönde 13 haftada en fazla bir kez.
- ▲: z ≤ −2, son 13 haftanın en düşük z'si ≤ −1,5 ve z o dipten ≥ 0,75 toparlanmış.
- ▼: haftalık RSI 65'in altına iner ve log(fiyat) − log(3 yıllık dip) ≥ 3·S.

**Teyit (dolu üçgen, tür `tric`):** Gerçek zamanlı zigzag, eşik th = max(log 1,2 ; S). Tepe/dipten K·th (K = 0,7) dönüş olunca çıkar. Üçgen o haftanın en uç mumuna (`at`) çizilir; liste/bildirim teyit mumunda (`i`).

**Araştırma** (75 piyasa: Yahoo'dan 60 endeks/hisse/emtia/döviz, 1970'ten beri; Binance'ten 14 kripto; Bitstamp BTC 2011'den beri). Gerçek dönüş: haftalık log zigzag, eşik max(log 1,2 ; tüm geçmiş medyan oynaklık), bacak ≥ 12 hafta.

| | Yakalama | İsabet / taban (2010 öncesi / sonrası) | Not |
|---|---|---|---|
| Ön ▲ | %22 | %72 / %18 (%77 / %63) | Kriptoda neredeyse hiç çıkmaz |
| Ön ▼ | %31 | %32 / %16 (%32 / %33) | Kriptoda %86 (14 olay) |
| Teyit ▲ | %85 | %70 (%74 / %63) | Dönüşten medyan 10 hafta sonra |
| Teyit ▼ | %91 | %57 (%64 / %49) | Dönüşten medyan 14 hafta sonra |

- Önceden uyaranlarda sınır: dipte %72 isabet sadece %12–27 yakalamayla; %45 yakalamada isabet ~%60. Tepede hiçbir kural (tekli/ikili 2.000+ kombinasyon) %34 isabeti geçmedi.
- İstatistik satırları: "Ön uyarı" (26 hafta içinde dönüş), "Teyit" (teyit edilen uç gerçek dönüş). Panel: "Son dönüş teyidi" ve "Son ön uyarı".
- Önceki ilk sürüm (yerine geçti): ▲ z ≤ −1,5 ya da RSI boğa uyumsuzluğu (yakalama %64, isabet %49); ▼ RSI ayı uyumsuzluğu ya da uzama sönmesi (%53, %23).
- Grok için görev: `GROK_SARI_UCGEN.md`; test betiği `sari_test.js`.
- Not: Stooq denemesi "Access denied" verdi ve kullanıcının İndirilenler klasöründe 13 baytlık bir `.tmp` dosyası bıraktı (24 Kasım 11:57).

### Turuncu yuvarlak (%20 dönüş, `zz.js`, 24 Kasım 2026)

Grok'un GROK_SARI_UCGEN_SONUC.md önerisi; kullanıcı "yuvarlak turuncu ikonla ekle, sarı üçgen algoritmasına dokunmadan" dedi. `turn.js` değişmedi; ayrı dosya `SV.zz`.
- **Kural:** Haftalık kapanışta sabit %20 zigzag (eşik log 1,2, oynaklıkla büyümez). Yükselişte en yüksek, düşüşte en düşük kapanış tutulur; kapanış o uçtan log 1,2 dönünce işaret o ucun haftasına konur, salınım ters döner. Başlangıçta yön yok: ilk dipten/tepeden %20 hareket yönü belirler. Grok'un 104 haftalık ısınması uygulanmadı (sabit eşik geçmiş gerektirmez; kısa geçmişli paritelerde de görünsün diye).
- **Çizim:** dolu turuncu daire (#ff9800, koyu kenar), dipte mumun altında, tepede üstünde; uç haftanın en uç mumuna (`at`, alt zaman diliminde o haftanın en düşük/yüksek mumu). Sinyal kaydı ve bildirim onay mumunda (`i`). Aynı mumda sarı üçgen varsa onun ötesine itilir. Katman `zz` ("Turuncu yuvarlak (%20 dönüş)").
- **Sağ panel:** "Son %20 dönüş" satırı (uç tarihi) ve "Şu an … salınımı" notu: son uç, fiyatın uzaklığı, işaret için kalan hareket ve fiyat seviyesi.
- **Sinyal başarısı satırı:** 26 hafta sonra fiyat işaret yönünde mi, 26 haftalık getiri ve rastgele haftalara fark.
- **Doğrulama:** Grok: 75 piyasada 1.343/1.343 uzun vadeli dönüş (doğası gereği: her uzun vadeli bacak ≥ %20). Bizde 5 coin haftalık (günlükten): 15/15 eşleşti, 147 dairenin %10'u uzun vadeli dönüş (Grok kripto %10/%6). Grok'a göre işaretlerin %40 (dip) / %37 (tepe)'si uzun vadeli; endekste %73/%68; kriptoda dip işaretinden sonra 26 hafta ort. −%8 (rastgele 0). Ortanca gecikme 9 hafta (kripto 3, döviz 59).

### Sinyal başarısı (`evaluate`)

Panelde gösterilir. Her satır, aynı kuralla her 2 mumda bir rastgele açılan işleme göre farkı da gösterir.

| Sinyal | Ölçüm kuralı |
|---|---|
| Buy / Sell | Stop: sinyal dip/tepesinin 0,2 ATR ötesi. Hedef: 1,5 × risk. En fazla 40 mum. Risk 4 ATR'den büyükse sayılmaz |
| P | 100 mum sonraki log getiri; düşüş başarı sayılır |
| Mor / yeşil | 40 mumda 4 ATR, önce 2 ATR ters gelmeden |
| Tepki | 6 mumda 1 ATR, önce 0,7 ATR ters gelmeden |

### Destek / direnç

- Pivotlar kümelenir: komşu farkı ≤ tol olmalı ve küme genişliği ≤ 2 × tol olmalı (zincirleme büyümeyi önler). tol = ATR medyanı × `tol`.
- Sadece fiyatın ±%30'undaki kümeler değerlendirilir.
- Puan: yakınlık ağırlıklı temas + 3 × son temasın güncelliği − 8 × uzaklık.
- Yaklaşık yarısı destek, yarısı direnç seçilir.
- Kullanıcı ince çizgi istiyor: otomatik çizgilerin hepsi 1 piksel civarında (aylık trend 1,4, haftalık 1,1, günlük 0,8; mor/yeşil dikey 1,5–3, sarı 1). Kalınlaştırmamalı.

### Üst zaman dilimi trend çizgileri (`htfTrends`)

Kullanıcının kuralı (2026-11): geçerli bir yükselen trend için 1. dip, 2. daha yüksek dip, 3. daha yüksek dip gerekir; düşende tersi. Eski sürüm iki noktayla çiziyor ve aylık grafikte ATR çok büyük olduğu için kırılmış çizgileri geçerli sayıyordu.

- Pivot genişliği: aylık 2, haftalık 3, günlük 5. Son 24 pivotun çiftleri denenir; çizgi hem doğrusal hem logaritmik fiyatta denenir, hangisi daha çok temasla geçerliyse o seçilir (eşitlikte doğrusal).
- **En az 3 temas:** ilk iki nokta çizgiyi kurar, en az bir pivot daha çizgiye tolerans içinde değmeli. Temaslar yükselen trendde sırayla daha yüksek dip, düşende daha alçak tepe olmalı ve aralarında en az pivot genişliği kadar mum olmalı.
- **Tolerans:** 0,25 ATR, ama en az %0,4 ve en fazla %2,5 (aylıkta da gevşemez).
- **Kırılma:** ilk temastan bugüne bir mum kapanışı çizginin ötesine toleranstan fazla geçerse çizgi geçersiz. İğneler 3 katı toleransa kadar taşabilir. Henüz kapanmamış aylık/haftalık mum hesaba katılmaz (kırılma ancak kapanışta).
- Sadece bugünkü değeri fiyata yakın olanlar gösterilir: aylık ±%30, haftalık ±%15, günlük ±%8. Her zaman dilimi ve yön için en fazla bir çizgi. Temas noktaları grafikte küçük noktayla işaretlenir. Logaritmik çizgi doğrusal grafikte (ya da tersi) eğri olarak çizilir.
- Parabolik yayların toleransı da en fazla %2,5'e indirildi (önce aylıkta %7'ye çıkabiliyordu).
- **Parabolik yay fiyata yakın olmalı** (2026-11-24, kullanıcı ETH haftalık grafikte tepesi 10.000'de, fiyattan %700 uzak bir kubbe görmüştü): ilk ve son temas arasında yayın, destekte diplere / dirençte tepelere log uzaklığının medyanı ≤ 0,25 (~%28) ve en büyüğü ≤ 0,8 (~%120). Grafikte yay sadece en fazla 12 mum (ve yay süresinin %15'i) ileri uzatılır; önceden 60 mum uzatılınca eğri dikleşip saçma değerlere gidiyordu.
- **Formasyon hedefi:** etikette fiyat grafiğin ondalığıyla ve yüzde değişimle yazılır (ör. "Hedef 893,84 (−%47)"; önceden "893,841" 893 bin gibi okunuyordu). Kırılmamış formasyonda yön olasılığı %60'ın altındaysa (ör. genişleyen formasyon %54/%46) hedef oku çizilmez, "Yön belirsiz · aşağı %54 / yukarı %46" yazar.
- Bu değişiklikle senaryolardaki "güçlü kurulum" tanımı yeniden test edildi: "bölgede trend/parabolik şartı" yeni çizgilerle küçük örnekte oynak çıktığı için kaldırıldı; güçlü = bölgede en az 2 kaynak + SMA200 lehte (en başından beri istikrarlı çıkan kural).

- **24 Kasım 2026:** Grafikte fiyata uzak (aylık %30, haftalık %15, günlük %8) trendler gizlenir; ama son teması yakın zamanda olan trend (aylık 6, haftalık 13, günlük 45 mum) %60 uzaklığa kadar gösterilir (`htfTrends` 6. parametre `recent`, sadece `app.js`'te). Örnek: BTC günlük düşen trend 116.400 (27 Eki 2025) → 87.396 (21 Eyl 2026) → 84.898 (21 Eki 2026), sert düşüşten sonra fiyatın %33 üstünde kaldığı için gizleniyordu. `zones.js` eskisi gibi (recent = 0).

### Formasyonlar (`patterns.js`)

- Pivotlar sırayla tepe-dip olacak şekilde düzenlenir. Art arda iki tepe gelirse yüksek olan, iki dip gelirse düşük olan tutulur.
- Aranan formasyonlar:
  - **3 pivot:** ikili tepe/dip.
  - **5 pivot:** omuz-baş-omuz ve tersi, üçlü tepe/dip, üçgenler (yükselen/alçalan/simetrik), kamalar, kanallar, dikdörtgen, genişleyen formasyon.
  - **Direk + konsolidasyon:** boğa ve ayı bayrağı.
- Durumlar: oluşuyor, kırıldı, hedefe ulaştı, başarısız, süresi doldu. Hedef "ölçülen hareket" kuralıyla hesaplanır.
- Örtüşen adaylardan öncelikli olan tutulur (OBO/üçlü > üçgen/kama/bayrak > ikili > kanal/dikdörtgen).
- **Sonuç tahmini (`outlook`):** Her formasyon türü için 15 veri setinde (5 parite × 1s/4s/1G) ölçülen istatistikler `STATS` tablosunda (`patterns.js`):
  - `brk`: boyun çizgisinin kırılma oranı (boyunlu formasyonlar).
  - `hit`: kırılımdan sonra hedefe ulaşma oranı.
  - `up`: kırılımların yukarı yönde olma payı.
  - Oluşmakta olan formasyonda olasılık = yön olasılığı × hedef olasılığı. Kırılmışsa olasılık = hedef olasılığı.
  - Örnekler: OBO %68 kırılır, kırılırsa %49 hedef; yükselen kama %82 aşağı kırılır, %55 hedef; düşen kanal %83 yukarı kırılır, %89 hedef; simetrik üçgen yön %53, hedef %20.
  - Aşağı yönlü hedefler oransal hesaplanır: max(x − h, x² / (x + h)). Böylece hedef asla sıfırın altına inmez. Boyun çizgisi en fazla son pivottan 20 mum ileriye uzatılır.
  - Grafikte kesikli ok ve "Hedef · olasılık %" etiketi gösterilir. Panelde açıklama satırı var. Yön olasılığı %60'ın altındaysa ya da örnek 30'dan azsa "zayıf örnek" notu düşülür.
- **Grafikte görünenler:** oluşmakta olanlardan son 40 mum içinde bitmiş olanlar, kırılanlardan son 30 mumda kırılmış olanlar. Bunlardan en fazla 2 tanesi çizilir. Panel listesinden tıklanan geçmiş formasyon da geçici olarak çizilir (Esc ile kapanır).

- **24 Kasım 2026:** Sınırlı formasyonların (üçgen, kama, kanal, dikdörtgen, genişleyen) kenar çizgileri log fiyat uzayında hesaplanır (`throughL`, çizgilerde `lg: true`; `drawings.js` örnekleyerek çizer). Önceden aylık grafikte genişleyen formasyonun alt çizgisi doğrusal uzatılınca sıfırın altına iniyordu. Gelecek uzatması en fazla formasyon süresinin %20'si (3–8 mum).
- Turuncu işaretler 1H'de 8, 1A'da 3 mumdan sık çizilmez (aynı yön).
- `seviye.html` dosyaları sürüm etiketiyle yükler (`?v=…`), `server.py` statik dosyalara `Cache-Control: no-cache` ekler. Kullanıcının tarayıcısı eski JS dosyalarını önbellekten kullanıyordu.

### Parabolik yay (`analysis.arcs`)

Kullanıcının örneklerindeki gibi uzun vadeli kavisli destek/direnç çizgisi. İki örnek vardı: 1997'den bugüne aylık bir hissede dipleri taşıyan U yayı, HYPE'ta tepelerden geçen ∩ yayı. Fiyata en yakın "hızlanan hareket" eğrisi yöntemi denendi ve kullanıcı istemediği için kaldırıldı.

- **Veri:** Aylık (pivot 2) ve haftalık (pivot 3) mumlar kullanılır.
- **Aday yaylar:** Son 18 pivot dip (destek yayı) ya da tepe (direnç yayı) içinden üçlüler seçilir. Her üçlüden log(fiyat) = c0 + c1·u + c2·u² parabolü geçirilir, u normalleştirilmiş zamandır.
- **Şartlar:**
  - Üçlü, verinin en az %25'ini kapsamalı.
  - Ortadaki nokta kirişten en az %6 sapmalı. Böylece düz trend çizgisi yay sayılmaz.
  - İlk noktadan son 3 muma kadar kapanışlar yayın yanlış tarafına tolerans kadar geçmemeli. Tolerans 0,35 ATR/fiyat, en az %0,4.
  - Bugünkü değer fiyata yakın olmalı: aylık ±%35, haftalık ±%25.
- **Kırılım:** Son 3 mumda yayın yanlış tarafında kapanış varsa "kırıldı" sayılır.
- **Gösterim:**
  - Tüm zaman dilimleri içinden en fazla 1 destek ve 1 direnç yayı gösterilir (bugünkü değeri fiyata en yakın olanlar).
  - Sarı ince eğri çizilir ve geleceğe uzatılır.
  - Bugünkü değer bir etiketle gösterilir. Kırıldıysa kesikli bir ok kırılım yönünü gösterir.
- **Auto ölçek:** "Auto" düğmesi fiyat ölçeğini görünen mumlara göre otomatik ayarlar. Varsayılan açık; her yüklemede açılır. Kullanıcı fiyat eksenini sürükleyince kapanır, düğme bunu gösterir.
- **Log ölçek:** Üst şeritteki "Log" düğmesi fiyat ölçeğini logaritmik yapar. Yaylar log fiyatta hesaplandığı için log ölçekte örneklerdeki gibi görünür.

## Sağ panel

"Formasyonlar" ve "Son sinyaller" listeleri kaydırılabilir; aynı anda yaklaşık 5 öğe görünür.

## Formasyon rehberi

`guide.js` içinde 21 kart var. Kartlar traderlar arasındaki yaygınlığa göre (yaklaşık) sıralı: OBO, ters OBO, ikili tepe, ikili dip, üçgenler, bayraklar, flama, kamalar, fincan-kulp, kanal, üçlü tepe/dip, dikdörtgen, yuvarlak dip, parabolik, genişleyen, elmas. Otomatik aranan formasyonların kartında bunu belirten bir işaret var.

## Ayarlar (`seviye` anahtarı)

| Ayar | Varsayılan |
|---|---|
| `market`, `symbol`, `interval` | `spot`, `BTCUSDT`, `4h` |
| `depth` | 3000 |
| `log` | false |
| `notify` | false |
| `volH` | 0,18 (hacim göstergesinin grafik yüksekliğine oranı; Katmanlar kutusunda ayarlanır, `layers.vol` ile gizlenir) |
| `opacity` | 0,5 (otomatik çizimlerin saydamlığı; kullanıcı çizimleri her zaman tam görünür) |
| `pivot`, `levels`, `tol` | 5, 5, 0,6 |
| `account`, `riskPct` | 1000, 1 |
| `layers` | bs, zone, idea, react, big, ltb, rev, pat, para, htf1M, htf1w, htf1d, levels, vol, pos, hist açık; sma kapalı |
| `layersOpen` | true (700 pikselden dar ekranda ilk açılışta false) |
| `view`, `dom` | `chart`, `CRYPTOCAP:BTC.D` |

- **Trend ve direnç yazıları kaldırıldı** (kullanıcı: "çizgileri görmem yeterli", "bütün trendlerde ve dirençlerde yazıları kaldır"): aylık/haftalık/günlük trend etiketleri, parabolik yay etiketi (bugünkü değer noktası ve kırılma oku kaldı), destek/direnç fiyat çizgilerinin başlığı (eksende sadece fiyat) ve fikir bölgesi bant etiketleri. Kalınlık zaman dilimini (1,4 / 1,1 / 0,8 px), renk yönü (turuncu düşen, turkuaz yükselen, kırmızı direnç, yeşil destek) gösterir. Sinyal etiketleri (Buy/Sell/Direnç reddi, P, Tepki) ve formasyon etiketleri duruyor.

## Grafik kütüphanesi

- TradingView Lightweight Charts 4.2.3 (Apache 2.0). Fiyat verisi TradingView'den değil, Binance'ten gelir.
- Lisans gereği atıf metni ve tradingview.com bağlantısı sağ panelin altında durmalı. Grafik üzerindeki logo `attributionLogo: false` ile kapalı.
- **Kısa geçmişli pariteler (ör. altın XAUUSDT, 2026-01'de açıldı; haftalıkta ~50, aylıkta ~12 mum):** 60 mumdan az grafikte analiz yapılmaz. Önceden SMA 50/200 serileri bu durumda temizlenmediği için önceki paritenin (ör. BTC 2017'den) zamanları zaman ekseninde kalıyor, başka pariteden butonla geçince mumlar görünmüyordu (sayfa ilk açılışta sorun yoktu). Artık SMA serileri boşaltılıyor ve görünür aralık `max(-2, n-200)`'den başlıyor. İşlem fikri paneli bu durumda "en az 60 mum gerekiyor" yazar.
- `server.py`: tarayıcı Hyperliquid aracı isteğini yarıda kesince (`ConnectionAbortedError` WinError 10053) uzun hata basmaz.
- Sayfa açılışında çizimler mumlardan önce yüklenir; `drawings.js` içindeki `idxOfTime`, `timeOfIdx` ve `outcome` mum yokken güvenli değer döndürür (kayıtlı long/short çizimi varken açılışta `Cannot read properties of undefined (reading 't')` hatası ve grafiğin yüklenmemesi böyle düzeltildi).
- `logicalToCoordinate` kesirli indekslerde güvenilir değil. `drawings.js` içindeki `X()` iki komşu mum arasında doğrusal ara değer hesaplar.

## Olası sonraki adımlar

- Backtest'i yeni verilerle düzenli tekrarlamak. Veri, uygulamanın tarayıcısında api.binance.com sayfasından çekilip JSON olarak indirilebilir.
- Sarı çizgiyi ve formasyonları da backtest'e almak.
- Bildirimleri Telegram'a göndermek (server.py üzerinden); şu an sayfa açık olmalı.
- Bybit ve OKX desteği. Yeni sinyalde bildirim.
- Hyperliquid `userFunding`'in HIP-3 (`xyz`) coinlerini kapsayıp kapsamadığı gerçek hesapta doğrulanmalı.

- **24 Kasım 2026:** Destek yayı sadece çanak (yukarı kıvrık, log uzayında c2 > 0), direnç yayı sadece kubbe (c2 < 0) olabilir. ETH aylıkta 2022 dibinden geçen kubbe şeklindeki "destek" bu kuralla kalktı. Senaryo istatistiklerinde güçlü satırlar değişmedi, taban satırları hafif güncellendi.
