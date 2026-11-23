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
  - Buy/Sell seyrek çıkıyor ve neredeyse her zaman yerel dip/tepede.
  - BTC ve ETH'de 20 Ağustos civarındaki büyük pompa mumunda mor çizgi var. Backtest'te bu "ters klimaks" mantığı rastgeleden kötü çıktı. Bu yüzden mor çizgi artık trend yönündeki düşüş kırılımlarını gösteriyor; pompa mumunda çıkmaz.
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

### Buy

Aşağıdaki üç kurulumdan biri yeterli. İki Buy arasında en az 5 mum olur.

1. **Dip süpürme:**
   - Bu mumun dibi son onaylı pivot dibinin (en fazla 60 mum önce) altına iner, kapanış ise yine üstünde olur.
   - Alt fitil ≥ 0,6 ATR ve ≥ mumun %30'u.
   - Hacim ≥ 1,3 × 20 mumluk ortalama.
2. **Trend içi süpürme:** Aynı yapı, ama alt fitil ≥ 0,3 ATR yeterli. Şart: kapanış > SMA200.
3. **Kırılım alımı:** Yeşil çizgi (daralmadan yukarı kırılım ya da trend yönünde güçlü alım mumu) çıktığı mumda, kapanış > SMA200 ise. Onay beklenmez. Stop: bu mumun ve öncekinin en düşüğü.

**Onay** (1 ve 2 için): Süpürme mumundan sonraki 3 mum içinde, süpürme mumunun tepesinin üstünde yeşil kapanış gelmeli. Bundan önce süpürme mumunun dibi kırılırsa aday iptal olur.

**Stop** (istatistik için): süpürmeden onaya kadarki en düşük dip − 0,2 ATR.

**Buy sayısını artırma çalışması** (kullanıcının isteği: Solana'da Buy çok az). Rastgeleye göre fark, eğitim BTC/ETH/BNB, test SOL/XRP:

| Kurulum | Eğitim | Test | Solana | Karar |
|---|---|---|---|---|
| Eski kurallar (fitil ≥ 1 ATR, iki Buy arası 10 mum) | +0,35R | +0,17R | 26 sinyal, +0,44R | — |
| Kırılım alımı | +0,12R | +0,24R | +0,28R | Eklendi |
| Süpürme fitili 0,6 ATR | +0,22R | +0,07R | +0,35R | Eklendi |
| Kırılım sonrası geri test | ~0R | ~0R | — | Alınmadı |
| Üst zaman dilimi desteğinden onaylı tepki | ~0R | ~0R | — | Alınmadı |
| Hacim şartını 1,0'a indirmek | — | ~0R | — | Alınmadı |

**Sonuç:**
- Tüm veri: 157 Buy (+0,29R) → 634 Buy (+0,18R).
- Solana: 26 Buy → 112 Buy, +0,36R.
- Zaman dilimine göre: 1s +0,15R, 4s +0,14R, 1G +0,42R.
- Toplam beklenen kazanç yaklaşık 2,4 kat arttı.

### Sell

Sadece düşüş rejiminde (kapanış < SMA200). Aşağıdaki iki kurulumdan biri yeterli. İki Sell arasında en az 10 mum olur.

1. **Tepe süpürme:**
   - Son 3 onaylı pivot tepeden biri (en fazla 60 mum önce) aşılır, kapanış altında kalır.
   - Üst fitil ≥ 0,6 ATR ve ≥ mumun %30'u.
   - Hacim ≥ 1,3 × ortalama.
2. **Dönüş:**
   - Tepe, son 20 mumun en yükseğine 0,25 ATR yakın olmalı.
   - Şu koşullardan en az 4'ü sağlanmalı: RSI ≥ 65, son 3 mumda RSI ≥ 70, üst Bollinger teması, onaylı pivot direncine 0,5 ATR yakınlık (kapanış altında), hacim ≥ 1,5 × ortalama, RSI ayı uyumsuzluğu.
   - SMA200 şartı onay mumunda kontrol edilir.

**Onay:** 3 mum içinde süpürme/dönüş mumunun dibinin altında kırmızı kapanış gelmeli.

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
- **Güçlü kurulum** = bölgede en az 2 kaynak + en az biri trend/parabolik + fiyat SMA200'ün lehte tarafında. Dördüncü satır piyasa yönü. **İyi kurulum** (bildirim) = güçlü + piyasa yönünde + backtest +50 $ oranı ≥ %60 + en az 60 örnek + test edilmiş zaman dilimi (1s/4s/1G).
- **Backtest sonuçları** (30 gün, yukarıdaki plan, 1s/4s/1G, 5 coin, yeni piyasa yönü kuralıyla; `regime8b.js`, coin bölmesi `regime10b.js`). Rastgele girişte ±%5'te önce hedef ≈ %50:
  | Grup | n | +50 $ | +100 $ | +200 $ | ort. $/işlem | 7 gün +50 $ |
  |---|---|---|---|---|---|---|
  | Short güçlü · piyasa yönünde | 120 | %63 | %37 | %26 | +21 | %61 |
  | Short güçlü · ters | 27 | %63 | %19 | %15 | +9 | %63 |
  | Short zayıf · yönünde | 1076 | %56 | %35 | %21 | +16 | %47 |
  | Short zayıf · ters | 840 | %48 | %25 | %11 | −1 | %44 |
  | Long güçlü · yönünde | 59 | %66 | %42 | %14 | +23 | %49 |
  | Long güçlü · ters | 47 | %77 | %51 | %21 | +47 | %38 |
  | Long zayıf · yönünde | 873 | %54 | %29 | %17 | +8 | %46 |
  | Long zayıf · ters | 1168 | %40 | %17 | %5 | −12 | %32 |
  - Zayıf kurulumlarda piyasa yönü belirgin fark yaratıyor (short %56 / %48, long %54 / %40). Güçlülerde örnek az ve coin bölmesi tutarsız: short güçlü yönünde BTC/ETH/BNB %54, SOL/XRP %82; long güçlü yönünde %74 / %38. Veri çoğunlukla 2023–26.
  - "İyi kurulum" şu an sadece short (güçlü + yönünde, n 120); long güçlü yönünde 59 örnekle 60 eşiğinin altında.
- **Durumlar:** Bekleniyor, Yaklaşıyor (≤ %1,2 ya da ≤ 1,5 ATR ve ≤ %5), Bölgede, Giriş oluştu (son 3 kapanmış mumda; görülen kademe yazar), Bölge kırıldı; son kurulum için not (kademe/başabaş/stop/geç kalındı). 1s/4s/1G dışındaki zaman dilimlerinde "test edilmedi" uyarısı.
- Bekleyen senaryonun bölgeleri güncel fiyata göre seçilir (aylık grafikte açık ay %20 hareket edebildiği için). Tetik kontrolü backtest'teki gibi önceki kapanışa göredir. Senaryo en az 30 kapanmış mumla çalışır; SMA200 yoksa o koşul ✗ ve açıklamalı (aylık grafik).
- Panel bu grafiğin geçmişindeki aynı kuralın sonucunu da gösterir (`SV.scen.history`, aynı plan). 15 saniyede bir yeniden çizilir.
- "Bu grafikte kısa vade" satırı (eğilim puanı): ana trend ±1, kısa vade ±0,5, son 150 mumda P −1, son 20 mumda mor −1 / yeşil +1, son 10 mumda Sell/Direnç −1, Buy +1.
- **Kart düzeni (kullanıcı: "gereksiz yazıları kaldır"):** başlık + etiket (İyi kurulum / Güçlü · az örnek / Güçlü · piyasaya ters / Zayıf), durum satırı, bölge satırı, kısa koşul etiketleri (2+ kaynak, Trend/parabolik, SMA200, Piyasa yönünde), Kademe | Fiyat | Olasılık tablosu, tek satır özet (30 günde ort. $/işlem · örnek sayısı · uyarılar). Kural ve backtest ayrıntısı kapalı "Nasıl hesaplandı?" bölümünde; açık bırakılan bölüm 15 saniyelik yenilemede açık kalır. Piyasa kutusu da kısa; ayrıntı "Nasıl belirleniyor?" içinde. "En yakın direnç/destek" listesi kaldırıldı (bölge kartta).
- "Grafiğe çiz" stop ve +100 $ hedefiyle long/short çizimi oluşturur. Grafikteki bölge bantlarında güçlüyse "· güçlü" yazar.

### Favori taraması (`scan.js`)

- Her favori için 4s ve 1G grafikte 5 dakikada bir (ilk tarama açılıştan 4 sn sonra) 500 mum çekilir, aylık/haftalık veri 6 saat önbellekte tutulur, `SV.scen.live` çalıştırılır.
- Listede sadece güçlü kurulumlar (Giriş oluştu / Bölgede / Yaklaşıyor) görünür, "iyi kurulum" / "örnek az" / "piyasa yönüne ters" diye işaretlenir; zayıflar sayı olarak yazılır. Tıklayınca o parite ve zaman dilimi açılır. Bildirim sadece iyi kurulumlar için.
- Açık grafikteki parite/zaman dilimi için bildirimi `app.js` verir, tarayıcı tekrar etmez.

### Bildirimler

Panel başlığındaki "Bildirimleri aç" düğmesiyle açılır, ayar `notify`'da saklanır. Bildirimler hem tarayıcı bildirimi (izin verildiyse) hem sayfa içi uyarı kutusu olarak gelir.

- **İyi giriş:** İyi kurulum (güçlü + piyasa yönünde + +50 $ oranı ≥ %60) tetiklendiğinde; giriş, stop ve +50/+100/+200 $ fiyatlarıyla. Açık grafik ve favoriler (4s, 1G) için. Aynı mum için bir kez.
- **Bölgeye yaklaşma:** Açık grafikte senaryo "Yaklaşıyor" ya da "Bölgede" olunca (güçlü/zayıf yazar); favorilerde sadece güçlü kurulumlar için. Aynı bölge için en fazla 3 saatte bir.
- **Yeni sinyal:** Sayfa açıldıktan sonra kapanan mumlarda çıkan her sinyal.
- **Sınır:** Sayfa açık olmalı. Tarayıcı bildirimi `localhost` (baslat.bat) ile güvenilir çalışır; `file://` açılışında genelde sadece sayfa içi uyarı görünür.

### Mor P (uzun vadeli düşüş)

- **Şart:** kapanış < SMA200 ve SMA50 < SMA200.
- **Tetikleyici:** SMA200'ün 20 mumluk eğimi negatife döner. Son 30 mumda büyük ölçekli RSI ayı uyumsuzluğu da varsa açıklamaya eklenir.
- İki P arasında en az 150 mum olur. Ayrıca son P'den sonra ya fiyat SMA200 üstüne çıkmış olmalı ya da 400 mum geçmiş olmalı.
- **Sadece 4s, 1G, 1H ve 1A grafiklerde gösterilir.** 1s'de test edildi ve anlamsız çıktı.
- Diğer tetikleyiciler (150 mumluk destek kırılımı, ölüm kesişimi, SMA200 geri testi) test edildi ve P'yi zayıflattıkları için çıkarıldı.

### Mor / yeşil çizgi

40 mumda en fazla bir tane çıkar. İki kurulumun birleşimi:

1. **Sıkışma kırılımı:** Bollinger genişliği, son 120 mumun medyanının 0,65 katının altına iner (sıkışma). Sıkışma bittikten sonraki 20 mum içinde kapanış bandın dışına çıkarsa: üstüne çıkarsa yeşil, altına inerse mor.
2. **Trend yönünde klimaks:** Hacim ≥ 2,5 × ortalama ve mum boyu ≥ 2 ATR.
   - SMA200 üstünde yeşil mum: yeşil çizgi.
   - SMA200 altında kırmızı mum: mor çizgi.

### Tepki (aday)

Buy kurulumu 1–2 ya da Sell kurulumu 1 (süpürme) oluştuğu anda, onay gelmeden işaretlenir. İki tepki arasında en az 5 mum olur. Onay gelirse aynı yerde 1–3 mum sonra Buy/Sell çıkar.

### Sarı

20 mumda en fazla bir tane çıkar.

- **RSI uyumsuzluğu:** Önceki tepede RSI ≥ 62 ve fark > 5 puan. Dipte RSI ≤ 38 ve fark > 5 puan.
- **SMA50 / SMA200 kesişimi.**

Sarı çizgi backtest'e dahil edilmedi.

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

- Pivot genişliği: aylık 2, haftalık 3, günlük 5. Son 14 pivotun çiftleri denenir. Eğim zamana göre hesaplanır (fiyat/saniye), bu yüzden çizgi her grafik zaman diliminde doğru yerde çizilir.
- Geçerlilik: ilk pivottan bugüne kapanışlar çizgiyi 0,3 ATR'den fazla geçmemiş olmalı.
- Sadece bugünkü değeri fiyata yakın olanlar gösterilir: aylık ±%30, haftalık ±%15, günlük ±%8. Her zaman dilimi ve yön için en fazla bir çizgi.

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

## Grafik kütüphanesi

- TradingView Lightweight Charts 4.2.3 (Apache 2.0). Fiyat verisi TradingView'den değil, Binance'ten gelir.
- Lisans gereği atıf metni ve tradingview.com bağlantısı sağ panelin altında durmalı. Grafik üzerindeki logo `attributionLogo: false` ile kapalı.
- Sayfa açılışında çizimler mumlardan önce yüklenir; `drawings.js` içindeki `idxOfTime`, `timeOfIdx` ve `outcome` mum yokken güvenli değer döndürür (kayıtlı long/short çizimi varken açılışta `Cannot read properties of undefined (reading 't')` hatası ve grafiğin yüklenmemesi böyle düzeltildi).
- `logicalToCoordinate` kesirli indekslerde güvenilir değil. `drawings.js` içindeki `X()` iki komşu mum arasında doğrusal ara değer hesaplar.

## Olası sonraki adımlar

- Backtest'i yeni verilerle düzenli tekrarlamak. Veri, uygulamanın tarayıcısında api.binance.com sayfasından çekilip JSON olarak indirilebilir.
- Sarı çizgiyi ve formasyonları da backtest'e almak.
- Bildirimleri Telegram'a göndermek (server.py üzerinden); şu an sayfa açık olmalı.
- Bybit ve OKX desteği. Yeni sinyalde bildirim.
- Hyperliquid `userFunding`'in HIP-3 (`xyz`) coinlerini kapsayıp kapsamadığı gerçek hesapta doğrulanmalı.
