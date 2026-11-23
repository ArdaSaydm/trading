# Seviye · Başarı oranını artırmak için test edilebilir öneriler

Bu dosya `GROK_INCELEME.md` bölüm 10'a cevaptır. Öneriler uygulama koduna eklenmez. Her biri aşağıdaki protokolle backtest edilir. Doğrulama grubunda (SOL/XRP) da tutmayanlar reddedilir.

Buradaki gerekçelerin bir kısmı bu veri setinde ölçülmedi. Onlar **tahmin** diye işaretlidir. Bu metin yatırım tavsiyesi değildir.

Kaynak kod: `scenario.js` (`regime`, `checks`, `eventAt`, `follow`, `good`), `zones.js` (`timeline`, `levels`, `clusters`), `analysis.js` (`htfTrends`, `arcs`). Yayındaki oranlar `scenario.js` içindeki `STATS` tablosudur. Bu dosyayı yazarken backtest yeniden koşulmadı.

---

## Ortak test protokolü

Tüm öneriler aynı iskeleti kullanır. "Nasıl test edilmeli" satırı sadece o önerinin eklediği ölçümü yazar.

**Evren.** BTC, ETH, BNB, SOL, XRP. Zaman dilimleri 1s, 4s, 1G. Plan, ufuk (30 gün) ve "+50 $" tanımı bugünkü `follow` ile aynı kalır: stoptan önce +%5. Eğitim coinleri BTC, ETH, BNB. Doğrulama coinleri SOL, XRP. Dönem kilidi: parametre ve kural seçimi yalnızca giriş zamanı **2022-12-31 ve öncesi** olan BTC/ETH/BNB işlemlerinde yapılır. 2023–2026, eğim kuralını eklerken görülen 2026 tepkisi dahil, seçimde kullanılmaz.

**Dört hücre, hepsi yazılır.**

| Hücre | Ne |
|---|---|
| A | BTC/ETH/BNB, giriş ≤ 2022-12-31 |
| B | BTC/ETH/BNB, giriş ≥ 2023-01-01 |
| C | SOL/XRP, tüm yıllar |
| D | SOL/XRP, giriş ≥ 2023-01-01 |

**Boş hipotez.** Öneri 1 hesaplanmadan hiçbir filtre "kabul" edilemez. Karşılaştırma, simetrik ±%5'in koşulsuz %50'si değildir. Rastgele girişler, gerçek işlemle aynı sembol, aynı zaman dilimi, aynı yön ve **aynı piyasa yönünün açık olduğu aylar** içinden çekilir. Stop, hedef ve 30 gün kuralı aynıdır.

**Tekilleştirme.** Öneri 2'nin katı anahtarı ayrıca raporlanır. Kabul satırı o sayıya bakar.

**Kabul, hepsi birlikte.**

1. Hücre C'de +50 $ oranı ≥ %60 ve n ≥ 30. n < 30 ise sonuç "yetersiz"dir, geçmez.
2. Katı tekilleştirmeden sonra hücre C'de oran ≥ %55 ve n ≥ 15.
3. Hücre C, rejim koşullu rastgele oranın en az 8 puan üstündedir.
4. Öneri 4'teki maliyet düşüldükten sonra işlem başına net dolar pozitiftir.
5. Izgara varsa kazanan yalnız hücre A'da seçilir. Hücre C veya D'deki en iyi eşik alınmaz.
6. Hücre B ve D de yazılır. İkisi %50'nin altındaysa kural, C şartını sağlasa bile kabul edilmez. 2023 sonrası bozulma, eğitimin görmediği rejimdir.

**Aynı mum yolu.** Günlük işlemde, 2024-02 ve sonrası için yol 1s mumlarla yeniden oynatılır. Daha eski günlük işlemler "yol belirsiz" diye ayrılır ve kabul hesabına katılmaz. Ayrıntı öneri 4'tedir.

---

### Öneri 1: Rejim koşullu rastgele hipotez ve küme güven aralığı

- **Tür:** backtest yöntemi
- **Neyi iyileştirmeyi hedefliyor:** Güçlü short · piyasa yönünde hücresinin %72'sinin, ayı driftinden mi yoksa bölge retinden mi geldiğinin ayrılması. Bugünkü karşılaştırma koşulsuz ±%5 ≈ %50'dir. Shortlar zaten ayı aylarında açıldığı için boş oran %50'nin üstünde olabilir.
- **Kesin kural:** Her gerçek işlem için aynı sembol ve zaman diliminde, `regime(t).dir` gerçek işlemle aynı olan mumlar bulunur. Giriş, bu mumların kapanışından, gerçek işlemin ±30 günü dışından, yerine koyarak 20 kez çekilir. Plan `follow` ile aynıdır. Boş +50 $ oranı bu 20'liğin ortancasıdır. Güven aralığı, işlemin düştüğü takvim ayı bloklarıyla 2.000 tekrarlı bootstrap'tir: her tekrarda aylar yerine konularak örneklenir, ayın içindeki işlemlerin hepsi birlikte girer veya birlikte çıkmaz.
- **Parametreler ve denenecek aralık:** Çekim sayısı 20 sabit. Blok = takvim ayı, sabit. Ek bir eşik yok.
- **Gereken veri:** Mevcut Binance mumları ve bugünkü `regime`.
- **İleriye bakma riski:** Rastgele mum, kendi kapanışından sonraki 30 güne bakar; seçim o kapanışta bilinen rejimle yapılır. Gelecekteki rejim ayı örneklemeye katılmaz.
- **Beklenen etki ve gerekçe:** %72 ile %50 arasındaki farkın bir kısmı "ayı ayında short açmak"tır. Rejim testi 2023–2026'da yön lehine yalnızca %48 / ters %40 vermiş durumda (±%20, 90 gün). ±%5 ve 30 günde drift payı bundan büyük olabilir. **Tahmin:** koşullu boş oran %55–65 bandındadır. Öyleyse bölge retinin kendisi küçük bir eklerdir ve sonraki filtreler bu ekin üstüne konmalıdır.
- **Nasıl test edilmeli:** Güçlü short · yönünde, güçlü long · yönünde ve zayıf short · yönünde hücrelerinde koşullu boş oran, ham oran ve ay-blok %95 aralığı. Kabul protokolündeki 8 puan, bu boş orana göre ölçülür.
- **Öncelik:** yüksek

### Öneri 2: Aynı haftadaki korelasyonlu işlemleri tek saymak

- **Tür:** backtest yöntemi
- **Neyi iyileştirmeyi hedefliyor:** n = 110'un etkin örnek sayısını şişirmesi. Aynı direnç reddi BTC ve ETH'de, 1s, 4s ve 1G'de aynı hafta oluşabilir. `eventAt` soğuması seri başına 6 mumdur; semboller ve zaman dilimleri arasında sayaç yoktur.
- **Kesin kural:** İki rapor, ikisi de önceden kilitli.
  - **Katı:** Anahtar = yön + giriş kapanışının düştüğü Binance haftası (haftalık mum Pazartesi 00:00 UTC'de açılır). O hafta ve yönde tüm sembol ve zaman dilimlerinden yalnız ilk giriş kalır. Aynı zamandaki bağlarda sıra BTC, ETH, BNB, SOL, XRP ve zaman diliminde 1G, 4s, 1s.
  - **Yumuşak:** Anahtar = sembol + yön + aynı hafta. Zaman dilimleri birleşir, semboller ayrı kalır.
- **Parametreler ve denenecek aralık:** Aralık yok. İki anahtar da yazılır, doğrulama setine göre biri seçilmez.
- **Gereken veri:** Mevcut mumlar.
- **İleriye bakma riski:** "İlk giriş" zaman sırasıyla belirlenir. Haftanın sonraki sinyali, öncekini silmek için kullanılmaz.
- **Beklenen etki ve gerekçe:** Bağımsız varsayılan 79/110 için tek taraflı binom p ≈ 2,7×10⁻⁶ ve Wilson aralığı yaklaşık %63–79'dur. Aylar birbirine bağlıysa etkin n 30–50 civarına iner. **Tahmin.** O aralıkta %72'nin %95 bandı kabaca %55–89 olur ve %60 eşiği bandın içinde kalır. Tekilleştirme bu tahmini ölçüme çevirir.
- **Nasıl test edilmeli:** Ham tabloya dokunulmaz. Yanına katı ve yumuşak n, +50 $, +100 $, +200 $ ve ortalama dolar yazılır. Hücre C'nin katı hali kabul protokolünün 2. maddesidir.
- **Öncelik:** yüksek

### Öneri 3: 2022 sonunda kilitlenmiş walk-forward

- **Tür:** backtest yöntemi
- **Neyi iyileştirmeyi hedefliyor:** Eğim şartının 2026 Ağustos–Ekim tepkisini ayı saymak için eklenmesi. Bu, test penceresinin içinden kural seçmektir. Coin bölmesi (SOL/XRP) aynı ayı yılını paylaşır, bu seçimi korumaz.
- **Kesin kural:** 2022-12-31'de kilitlenebilecek yön kuralı yalnız şudur: kapanmış ay kapanışı 10 aylık kapanış ortalamasının üstündeyse boğa, altındaysa ayı. Eğim ve histerezis yoktur. Bugünkü eğimli kural aynı pencerede ayrıca raporlanır ama "2023 öncesi kilitli" diye etiketlenemez. Yeni filtrelerin eşikleri de yalnız hücre A'da seçilir.
- **Parametreler ve denenecek aralık:** Bu öneride yeni eşik yok. Ortalama uzunluğu 10, bugünkü kuraldır, burada oynatılmaz.
- **Gereken veri:** BTCUSDT aylık mumlar.
- **İleriye bakma riski:** Ay yönü `regime` ile aynı şekilde, açık ay hariç, kapanmış aydan alınır. 2023–2026 sonuçlarına bakıp eşik değiştirilmez.
- **Beklenen etki ve gerekçe:** Eğimsiz kural 8 yılda 9 kez dönmüş ve 2026 tepkisini boğa saymış. O kural 2023–2026'da zayıfsa, bugünkü %72 eğim yamasına bağlıdır ve tekrar edilebilir bir kenar değildir. **Tahmin:** eğimsiz kuralın 2023–2026 güçlü short oranı, eğimli kuralın altındadır. Fark, yamanın getirisidir; doğrulanmış getiri değildir.
- **Nasıl test edilmeli:** Güçlü short ve güçlü long için iki yön kuralının A/B/C/D hücreleri. Bundan sonraki her öneri, kabul kararında bu kilitli (eğimsiz) yönü kullanır. Eğimli yön ayrıca "tanımlayıcı" sütun olarak durur.
- **Öncelik:** yüksek

### Öneri 4: Komisyon, fonlama, gap ve saatlik yol

- **Tür:** backtest yöntemi
- **Neyi iyileştirmeyi hedefliyor:** +38 $ ortalamanın maliyetsiz ve günlük mumda iyimser olması. Güçlü shortlar ayı rejiminde açılır. Vadeli ayıda fonlama çoğu zaman negatiftir; short fonlama öder. Günlük mumda +%5 fitili ile kapanışın girişe dönmesi aynı barda olabilir. `follow` hedefi yazdıktan sonra aynı barda yeni stopu (girişi) tekrar kontrol etmez.
- **Kesin kural:**
  - Dolum: giriş ve her parça, mum kapanışı veya limit fiyatı. Stop, mumun stopun ötesinde açılması halinde açılışta, değilse stop fiyatında.
  - Komisyon: her dolumda notionelin %0,05'i. 1.000 $ girişte giriş yaklaşık 0,50 $'dır. Izgara hücre A'da %0,02 ve %0,04 ile de yazılır; kabul %0,05 sütununa bakar.
  - Fonlama: Binance USDⓈ-M `fundingRate`, giriş kapanışından çıkışa kadar, pozisyon yönüyle. Oran negatifse short öder. Zamanı girişten önce açıklanmış yerleşmeler kullanılır.
  - Yol: 2024-02 sonrasındaki 1G işlemleri 1s mumlarla oynatılır. +%5 görüldükten sonra aynı saatlik mum girişi de keserse kalan, girişte kapanır. 2024 öncesi 1G işlemleri "yol belirsiz"dir.
- **Parametreler ve denenecek aralık:** Komisyon %0,02 / %0,04 / %0,05. Başka serbest parametre yok.
- **Gereken veri:** Mumlar mevcut. Fonlama: `GET https://fapi.binance.com/fapi/v1/fundingRate` veya `data.binance.vision` `data/futures/um/monthly/fundingRate/`. İkisi de yıllarca geri gider. Spot grafikte işlem açılıyorsa bile maliyet vadeli varsayımıyla yazılır; spot short bu evrende yoktur.
- **İleriye bakma riski:** Fonlama satırı, `fundingTime` giriş kapanışından sonra olanlar tutulur, girişten önce bilinen oranla pozisyon açılmış sayılır. Saatlik yol yalnız işlemin açılışından sonraki saatleri kullanır.
- **Beklenen etki ve gerekçe:** +%5 bariyeri fiyattır; komisyon bu oranı pek değiştirmez. 30 günde fonlama kabaca günde 3 yerleşmedir. Ayıda shortun ödediği fonlama, **tahmin**, işlem başına birkaç dolardan 15 $'a kadar çıkabilir. +38 $'ın önemli bir dilimidir. Gap ve aynı saat BE düzeltmesi +50 $ oranını da birkaç puan indirebilir. **Tahmin.**
- **Nasıl test edilmeli:** Ham +50 $ ve net dolar, maliyetli +50 $ ve net dolar. "Yol belirsiz" payı ayrıca yazılır. Kabul protokolünün 4. maddesi bu net dolardır.
- **Öncelik:** yüksek

### Öneri 5: Ret mumunun fitili, kapanış yeri ve hacmi

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** Güçlü shortun doğrulama payı (%61) ve bölgeye değip zayıf kapatan mumlar. Bugün `touched` yüksek bölgenin 0,25 ATR yakınına gelmesini ve kapanışın bölge altında olmasını ister. Kapanış mumun neresinde, fitil var mı, hacim artmış mı bakılmaz. Uygulamanın kendi Sell kuralında fitil ve 1,3× hacim ölçülmüş ve işe yaramış bir ailedir; bu cümle o ölçümün bu sete taşınacağı anlamına gelmez.
- **Kesin kural:** Short giriş mumunda üçü birden. Long simetriktir.
  - Üst fitil: `(b.h - max(b.o, b.c)) / (b.h - b.l) ≥ W`. Aralık sıfırsa mum elenir.
  - Kapanış mumun alt yarısında: `(b.c - b.l) / (b.h - b.l) ≤ 0,50`.
  - Hacim: `b.v ≥ V × volAvg[i - 1]`. Ortalama, sinyal mumunu içermeyen 20 mumluk SMA'dır (`indicators` içindeki `volAvg`).
- **Parametreler ve denenecek aralık:** W = 0,25 / 0,30 / 0,40. V = 1,0 / 1,3 / 1,5. Dokuz kombinasyon. Kazanan yalnız hücre A'da, kabul protokolünün boş hipotez farkına göre seçilir. Beraberlikte daha küçük W ve daha küçük V (daha çok örnek) alınır.
- **Gereken veri:** Binance mumları, hacim dahil. Yeterli.
- **İleriye bakma riski:** Fitil, kapanış ve hacim giriş mumunun kapanışında bellidir. Hacim ortalaması `i - 1`'de biter.
- **Beklenen etki ve gerekçe:** Bölgenin altında kapanan ama gövdesi yukarıda biten mum, retten çok kırılım denemesidir. Hacimsiz iğne, likiditesiz sapmadır. **Tahmin:** ham oranı birkaç puan yükseltir, n'yi belirgin düşürür. n hücre C'de 30'un altına inerse protokol zaten reddeder.
- **Nasıl test edilmeli:** Güçlü short · yönünde ve güçlü long · yönünde. Zayıf hücreye de aynı filtre uygulanır; zayıf hücre kabul için kullanılmaz, sadece "filtre her şeyi kurtarıyor mu" diye yazılır.
- **Öncelik:** yüksek

### Öneri 6: Güçlü tanımına kilitli tek bir aylık yapı şartı

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** İki yatay seviyenin ("Aylık seviye" + "Haftalık seviye") trend olmadan güçlü sayılması. `checks` güçlü için `zone.names.length >= 2` ve SMA200 ister. `pick` içindeki `zone.trends` hesaplanır ve hiçbir kararda kullanılmaz. Eski "trend veya yay şartı" %56–%85 bandında gezdiği için kaldırılmış. O gezinti çoklu testtir. Burada tek tanım, gezinti olmadan, bir kez ölçülür.
- **Kesin kural:** İki kilitli tanım, ikisi de raporlanır, hücre C'ye göre birleştirilmez.
  - **S6a:** Bugünkü güçlü şartlara ek olarak kümede en az bir öğe `kind === 'trend'` veya `kind === 'arc'` ve `tf === '1M'`.
  - **S6b:** Aynı şart, zaman dilimi aylık veya haftalık olabilir.
  SMA200 şartı ve "en az iki farklı ad" aynen kalır. Ad kümesi bugünkü gibi `Set(name)` ile kalır; aynı adlı iki seviye iki kaynak sayılmaz.
- **Parametreler ve denenecek aralık:** Aralık yok.
- **Gereken veri:** Mevcut mumlar.
- **İleriye bakma riski:** Trend ve yay, `zonesAt` ile aynı dilimde, yalnız kapanmış aylık veya haftalık mumlardan kurulur. Pivot `i + L < n` şartı durur.
- **Beklenen etki ve gerekçe:** İki yatay seviye aynı fiyatta sık çakışır ve "2 kaynak" kolay dolar. Aylık trend, kullanıcının asıl kuralıdır (üç yükselen dip / üç alçalan tepe). **Tahmin:** S6a n'yi düşürür, koşullu boş hipoteze göre farkı büyütür. Hücre C'de n < 30 ise "yetersiz" yazılır, eşik gevşetilmez.
- **Nasıl test edilmeli:** Her iki tanımın A/B/C/D hücreleri, ham güçlü tanımın yanında. Kabul protokolü her tanıma ayrı uygulanır.
- **Öncelik:** yüksek

### Öneri 7: Aynı dolar hedefler, stop bölgenin hemen ötesi

- **Tür:** çıkış kuralı
- **Neyi iyileştirmeyi hedefliyor:** %5 stopun, ret fikrinin bozulduğu yerden geniş olması. Küme %1,2 genişliğindedir. Short kapanışı bölgenin altındadır. Bölgenin üstüne yerleşmek çoğu işlemde %1–3 arasındadır. Fiyat bölgeyi geri alıp fikir bozulduktan sonra −%5'e kadar bekleyen işlem, ayı driftinden +%5 görebilir. Bu, +50 $ oranını yapısal olarak şişirir. Eski 1R ve yapısal stop ölçümü (n 116, %61, rastgele %49) başka bir hedeftir; burada hedefler kullanıcının +%5 / +%10 / +%20'si olarak kalır.
- **Kesin kural:** Shortta yapısal stop = `zone.hi × (1 + buf)`. `buf = max(0,008, K × ATR[i-1] / entry)`. Stop girişin %5 ötesinden daha uzak olamaz: `stop = min(yapısal, entry × 1,05)`. Long simetriktir (`zone.lo`, yön ters). Hedefler girişten +%5, +%10, +%20. İlk hedefte kalanın stopu giriştir, bugünkü planla aynı. Aynı barda hem yapısal stop hem hedef varsa önce stop.
- **Parametreler ve denenecek aralık:** K = 0,15 ve 0,25. Taban %0,8 sabit, tavan %5 sabit. K yalnız hücre A'da seçilir.
- **Gereken veri:** Mevcut mumlar.
- **İleriye bakma riski:** `zone.hi` giriş mumunda `pick` ile bellidir. ATR `i-1`.
- **Beklenen etki ve gerekçe:** +%5'e, daha sıkı stoptan önce ulaşma oranı düşer. **Tahmin:** oran %72'den belirgin şekilde iner. İşlem başına dolar, erken kesilen −%5'ler −%2 civarına indiği için düşmeyebilir. Kullanıcının başarı tanımı oran olduğu için bu kural, oran düşüp dolar artsa bile ancak protokolün oran şartlarını da sağlarsa kabul edilir.
- **Nasıl test edilmeli:** Bugünkü %5 stop ve yapısal stop yan yana. +50 $, +100 $, +200 $, ortalama brüt dolar, öneri 4 net doları. A/B/C/D.
- **Öncelik:** yüksek

### Öneri 8: On günde +%5 gelmezse kapatma

- **Tür:** çıkış kuralı
- **Neyi iyileştirmeyi hedefliyor:** 30 gün tutmanın fonlama ve geri verme maliyeti. Tabloda güçlü short · yönünde 7 günde +50 $ oranı %70, 30 günde %72'dir. Kenarın büyük kısmı ilk haftadadır. Kullanıcının hedefi haftalık ve aylık işlemlerdir; 30. günde hâlâ açık olan kalan, "süreyi doldurdu" diye kapanıyor.
- **Kesin kural:** İki kilitli varyant.
  - **S8a:** Girişten T gün sonra birinci kademe (+%5) hiç gelmemişse kalan, o mumun kapanışında kapanır. Stop daha önce gelirse stop geçerlidir.
  - **S8b:** S8a artı bugünkü "ilk kademeden sonra stop girişe çekilir". İkinci kademe (+%10) gelince stop, +%5 fiyatına çekilir. Üçüncü kademe aynı kalır.
- **Parametreler ve denenecek aralık:** T = 7, 10, 14. Yalnız S8a için ve yalnız hücre A'da seçilir. S8b, seçilen T'yi kullanır, kendi ızgarası yoktur.
- **Gereken veri:** Mevcut mumlar. Bar sayısı `round(T × 86400 / adım)`.
- **İleriye bakma riski:** Çıkış, T gün sonraki kapanışta, o ana kadarki high/low ile karar verilir. T, test penceresinden seçilmez.
- **Beklenen etki ve gerekçe:** +50 $ oranı pek değişmez çünkü 7. ve 30. gün arasındaki fark tabloda 2 puandır. Net dolar, geç stop olan ve fonlama ödeyen kuyruğu keser. **Tahmin:** ortalama dolar yükselir, +200 $ oranı düşer. +200 $ kullanıcının "süper" tanımıdır; düşüşü saklanmadan yazılır.
- **Nasıl test edilmeli:** Bugünkü 30 gün planın yanında S8a ve S8b. +50 $, +200 $, brüt dolar, net dolar. A/B/C/D.
- **Öncelik:** yüksek

### Öneri 9: Kırık yay, delinmiş seviye ve sırayı bozan temas

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** Bölge kalitesi. Üç ayrı gevşeklik güçlü sayısını şişirebilir.
  1. `arcs` geçerlilik döngüsü son 3 kapanmış mumu atlar (`k < n - 3`). `broken` bayrağı son 3 mumu yazar. `zones.build` bu bayrağa bakmadan yayı bölgeye ekler.
  2. `levels` bir seviyeyi, sonradan kapanışlar içinden geçse de düşürmez. Son 40 pivotun %1,2 içinde iki teması yeter.
  3. `htfTrends` temas sırasında daha yüksek dip / daha alçak tepe şartını bozan pivotu `continue` ile atlar. Çizgiyi iptal etmez. Başka bir pivot üç teması tamamlarsa çizgi kalır.
- **Kesin kural:** Üç anahtar, her biri ayrı raporlanır. Birleştirilmiş "hepsi açık" dördüncü satır olarak da yazılır, seçim hücre A'dadır.
  - **Yay:** `broken === true` olan yay `build` listesine girmez. Geçerlilik döngüsü son kapanmış mumu da kapsar (`k < n`).
  - **Seviye:** İkinci temasın mumundan sonra, seviye fiyatının %1,2 ötesine kapanan mum sayısı 3'e ulaşırsa seviye düşer. Sayım her iki yönde yapılır.
  - **Trend:** Tolerans içindeki bir pivot, bir önceki sayılmış temasa göre yükselen çizgide daha yüksek değilse (düşende daha alçak değilse) aday çizgi iptal olur.
- **Parametreler ve denenecek aralık:** Aralık yok. Üçü de ikili anahtardır.
- **Gereken veri:** Mevcut mumlar.
- **İleriye bakma riski:** Yay kararı, o anki kapanmış dilimin son mumuna kadar bakar; açık aylık veya haftalık mum hâlâ `slice(0, k)` dışındadır. Seviye ihlali yalnız geçmiş kapanışlardır. Trend iptali, `i + L < n` ile doğrulanmış pivotlardadır.
- **Beklenen etki ve gerekçe:** Kırılmış bir yay ikinci "kaynak" olabiliyor ve zayıf bir yatay seviyeyle güçlü üretiyor. **Tahmin:** her anahtar n'yi orta ölçüde düşürür, koşullu boş hipoteze göre farkı ancak yay anahtarında belirgin büyütür. Emin değilim; ölçüm buna karar verecek.
- **Nasıl test edilmeli:** Dört satır (üç anahtar + hepsi). Güçlü short · yönünde A/B/C/D ve +50 $.
- **Öncelik:** orta

### Öneri 10: Aylık trend adayı yalnız logaritmik

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** Aylık çizgide doğrusal ve logaritmik adayın aynı puanda yarışması. Puan `2 × temas + uzunluk + yenilik − (log ? 0,01 : 0)`. 0,01, bir temasa (2 puan) göre yok hükmündedir. Eşit temas sayısında daha yeni temas doğrusal çizgiyi seçer. 15.000 → 60.000 aralığında doğrusal çizgi, log ölçekte eğrilir. Çok yıllık aylık grafikte temasların anlamlı olduğu uzay log fiyattır.
- **Kesin kural:** `tf === '1M'` iken `htfTrends` yalnız `log = true` dener. Haftalık ve günlük her iki uzayı da dener, puan formülü aynı kalır. Başka bir puan ağırlığı denenmez.
- **Parametreler ve denenecek aralık:** Aralık yok.
- **Gereken veri:** Mevcut mumlar.
- **İleriye bakma riski:** Aday kümesi değişir. Kırılma testi, pivot onayı ve açık mumun dışarıda kalması bugünkü fonksiyonla aynıdır.
- **Beklenen etki ve gerekçe:** Bazı aylık çizgiler yer değiştirir veya kaybolur. Bölgeler ve güçlü short örneklemi değişir. Yönü **tahmindir**: 2018–2026 BTC'de log çizginin daha az sahte temas üreteceğini beklerim. Doğrusal çizgi kısa vadede hâlâ doğru araçtır; o yüzden haftalık ve günlük açık kalır.
- **Nasıl test edilmeli:** Bugünkü "iki uzay" ile yalnız bu değişiklik. Güçlü short ve long, A/B/C/D, +50 $ ve n.
- **Öncelik:** orta

### Öneri 11: Günlük yapı aşağı kırılmışken short

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** Direnç retinin, yükseliş yapısı bozulmadan alınmasını. SMA200 grafik zaman dilimindedir: 1s grafikte yaklaşık 8 gün, 1G grafikte 200 gündür. Üç zaman diliminin "SMA200 lehte" şartı aynı bilgi değildir ve `STATS` onları tek n'de toplar.
- **Kesin kural:** Short, ancak son kapanmış günlük mumda şu doğruysa alınır. Günlük seri, giriş mumunun kapanışında tamamen kapanmış günlerde biter. Pivot genişliği L = 5, pivot ancak `i + 5` gün sonraki barda bilinir. Son iki doğrulanmış dip L1 (eski) ve L2 (yeni) olsun. Şart: `L2.p < L1.p`. Long için son iki doğrulanmış tepe, yenisi daha alçak olmayacak (`H2.p > H1.p`). Giriş 1s veya 4s olsa da yapı günlüktedir. İki doğrulanmış dip yoksa işlem elenir.
- **Parametreler ve denenecek aralık:** L = 3, 5, 7. Yalnız hücre A'da seçilir.
- **Gereken veri:** Aynı sembolün günlük mumları. 1s ve 4s testinde de günlük seri çekilir.
- **İleriye bakma riski:** Günlük dip, girişten en az 5 gün önce kapanmış bir günde oluşmuş olmalıdır. Giriş mumunun kendi fitili pivot sayılmaz. Açık gün kullanılmaz.
- **Beklenen etki ve gerekçe:** Ayı rejiminde şart çoğu zaman zaten doğrudur; o yüzden ek küçük olabilir. Asıl fayda, rejim ayıyken günlük yapı hâlâ yükselen dipler yapıyorsa shortu kesmektir. **Tahmin:** 2023–2026'da oranı koşullu boş hipoteze yaklaştırır, 2022 öncesinde farkı büyütür. Emin değilim.
- **Nasıl test edilmeli:** Güçlü short ve long. Zaman dilimi kırılımı da yazılır: 1s, 4s, 1G ayrı n ve +50 $. Kabul, birleşik n ile değil, her zaman dilimi kendi protokolünü geçerse o zaman diliminde açılır. Geçmeyen zaman dilimi `good` dışına alınır.
- **Öncelik:** orta

### Öneri 12: Tek mumun stopu ve hedefi birlikte silmesi

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** 1G mumda stop ve hedefin aynı barda belirsiz olması (bilinen zayıflık 6). ATR, fiyatın %4–5'iyse ±%5 planı bir mumun içinde her iki bariyere de değer. `follow` bu barda stopu önce sayar. Bu muhafazakârdır ve oranı düşürür. Yine de bu mumlar ölçüm değil, yazı-tura olduğu için örneklemden çıkmak daha temizdir.
- **Kesin kural:** Girişten önceki ATR ile `ATR[i-1] / entry > X` ise işlem açılmaz. İkinci, ayrı raporlanan anahtar: sinyal mumunun aralığı `(b.h - b.l) / entry > 0,04` ise açılmaz. 0,04, stop mesafesinin %80'idir (stop %5).
- **Parametreler ve denenecek aralık:** X = 0,03 / 0,04 / 0,05. Seçim hücre A. Aralık anahtarı 0,04'te kilitlidir, ızgarası yoktur.
- **Gereken veri:** Mevcut mumlar.
- **İleriye bakma riski:** ATR bir önceki mumda biter. Aralık, giriş mumunun kendi high/low değeridir ve kapanışta bellidir. Karar kapanışta verilir.
- **Beklenen etki ve gerekçe:** Elenen mumlar tam da yolun bilinmediği mumlardır. **Tahmin:** +50 $ oranı 1G'de birkaç puan yükselir, 1s'de neredeyse değişmez. Net dolar, gap'li günler çıktığı için daha durağan olur.
- **Nasıl test edilmeli:** İki anahtar ayrı. 1s, 4s, 1G ayrı yazılır. Kabul, zaman dilimi bazındadır (öneri 11'deki gibi).
- **Öncelik:** orta

### Öneri 13: Fonlama kalabalığı ve açık pozisyon artışı

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** Dirence gelen hareketin, yeni longlarla mı yoksa kısa kapanışla mı taşındığı. Short için klasik iddia: fonlama pozitif ve açık pozisyon artıyorsa long kalabalıktır, ret daha temizdir. Bu iddia bu veri setinde ölçülmedi. **Tahmin.**
- **Kesin kural:** İki anahtar, ayrı raporlanır. Veri yoksa işlem "eleme" değildir, o anahtarın testinden tamamen çıkar. Veri yokken şartı geçmiş saymak yasaktır.
  - **Fonlama:** Giriş kapanışından önceki son 3 yerleşmenin (`fundingTime` < giriş kapanışı) ortalaması short için > 0, long için < 0.
  - **Açık pozisyon:** Giriş kapanışından en az 5 dakika önce damgalanmış son örnek, 24 saat önceki örneğe göre baz varlık cinsinden ≥ %2 artmış olacak. Fiyat cinsinden dolar OI kullanılmaz; fiyat yükselişi OI'yi tek başına büyütür.
- **Parametreler ve denenecek aralık:** Fonlama eşiği 0 sabit. Bakılan yerleşim sayısı 3 sabit. OI artışı %1 / %2 / %4, seçim hücre A'da ve yalnız OI verisinin var olduğu 2020-09 sonrası eğitim işlemlerinde. 2020-09 öncesi bu anahtarın seçimine girmez.
- **Gereken veri:** Fonlama, öneri 4'teki kaynaktan, 2020 civarından beri. Açık pozisyon REST `openInterestHist` yalnız son 30 günü verir; backtest için kullanılamaz. Geçmiş: `data.binance.vision` `data/futures/um/daily/metrics/<SEMBOL>/`, yaklaşık 2020-09'dan beri, 5 dakikada bir `sum_open_interest`. Likidasyon haritası bu öneride yoktur; kamuya açık, revizyonsuz ve 2018'e inen bir birincil kaynak doğrulanamadı.
- **İleriye bakma riski:** Fonlama satırı ve OI örneği, zaman damgası giriş kapanışından önce olan son kayıttır. OI'de bir örnek daha geriden (5 dakika) beklenir; dosyadaki `create_time` yayın anı değil örnek anı olabilir. OI serisi revize ediliyorsa bu filtre kullanılmaz. Kullanmadan önce aynı günün dosyası ile ertesi günün geriye dönük satırı karşılaştırılır; fark varsa anahtar iptal edilir.
- **Beklenen etki ve gerekçe:** Kalabalık long + direnç, short retinin bilinen gerekçesidir. 2020 sonrası tek bir ayı ve bir boğa içerir. **Tahmin:** shortta küçük bir oran artışı, n'de sert düşüş. Hücre C'de n < 30 ise reddedilir. Long için aynı mantık destek + negatif fonlamadır; longun doğrulama oranı %47 olduğu için bu filtre longu tek başına "iyi kurulum" yapmaz.
- **Nasıl test edilmeli:** Yalnız verisi olan işlemler. 2020-09 öncesi ayrı satırda "kapsam dışı" diye yazılır ve %72 ile harmanlanmaz. A/B/C/D, veri kesişiminde.
- **Öncelik:** orta

### Öneri 14: Bildirim, o sembolün ve o zaman diliminin kendi sayısına bağlı

- **Tür:** filtre
- **Neyi iyileştirmeyi hedefliyor:** `good` ve `scan` beş coinin birleşik `STATS` satırını HYPE, LDO, AVAX ve emtialara da yazar. `te === null` olan satırda doğrulama şartı kodda geçilir (`tr == null` ise sağ taraf bakılmaz). Bugün zayıf satırların +50 $ oranı %60'ın altında olduğu için bildirim gitmiyor. Satır değişirse gider. 1s örnekleri 4s ve 1G bildiriminin oranının içindedir. Tarama yalnız 4s ve 1G bakar.
- **Kesin kural:**
  - `good`, `tr` ve `te` sayı değilse false döner.
  - `STATS` zaman dilimine göre üçe ayrılır. Grafik ve tarama, açık zaman diliminin satırını kullanır.
  - Beş coin dışındaki sembolde "iyi kurulum" ve bildirim, o sembolün kendi `history` çıktısı n ≥ 20 ve +50 $ ≥ %60 ise açılır. Bu kendi-geçmiş oranı panelde birleşik oranın yanında yazılır. n < 20 ise etiket "bu paritede örnek yok"tur, %72 gösterilmez.
  - Long güçlü · yönünde `te` %47 olduğu sürece long bildirim kapalı kalır. Bu zaten bugünkü `good` davranışıdır; eşik düşürülerek açılmaz.
- **Parametreler ve denenecek aralık:** Kendi-geçmiş eşiği n = 20 ve oran %60 kilitli. Izgara yok.
- **Gereken veri:** Mevcut mumlar. Yeni sembol için o sembolün 1s, 4s veya 1G geçmişi.
- **İleriye bakma riski:** Kendi-geçmiş, `history` gibi yalnız kapanmış mum ve tam 30 günlük izleyen pencere kullanır. Son 30 gün hesaba katılmaz. Canlı mum tetik sayılmaz.
- **Beklenen etki ve gerekçe:** Beş coinin oranı, test edilmemiş paritede bir olasılık değildir. Zaman dilimini ayırmak, 1s'in kolay +%5'lerinin günlük bildirimi taşımasını keser. **Tahmin:** 1G'nin kendi oranı birleşik %72'nin altındadır. %60'ın altına inerse günlük bildirim protokol gereği susar. Bu, oran şişmesini keser.
- **Nasıl test edilmeli:** Birleşik tablo, 1s, 4s ve 1G ayrı ayrı, A/B/C/D. Her sembol kendi satırında n ve +50 $. Kabul, zaman dilimi ve sembol bazında protokolle. Beş coin dışında kabul aranmaz; o semboller "kendi geçmişi geçmeden bildirim yok" kuralıyla yaşar.
- **Öncelik:** yüksek

---

## Bilinçli olarak yazılmayanlar

Bunlar bölüm 10'un örnek listesindeydi. Bu turda öneri yapılmadı.

- **Ichimoku, ADX, BTC dominansı, USDT.D.** Aylık rejim ve SMA200 ile aynı yavaş bilgiyi taşırlar. Dominansın bu backtestte kullanılabilecek, anahtarsız, 2018'e inen serisi yok. Yeni bir yavaş filtre, üçüncü önerideki kilit kuralından sonra ancak ayrı bir turda açılır.
- **RSI uyumsuzluğu.** Giriş mumu pivotu ancak L mum sonra doğrulanır. Uyumsuzluğu giriş mumunun tepesinden okumak ileriye bakar. Doğrulanmış önceki pivotla kurulabilir; kuralları öneri 11'den daha gevşek olduğu için bu listeye girmedi.
- **Dört yıllık döngü ve zirveden %20 düşüş.** Örnek iki döngü ve bir 2025 tepesidir. Yeni bir yön hikâyesi, eğim yamasının yaptığı seçimi başka bir dille tekrarlar. Yön tarafında izin verilen tek karşılaştırma öneri 3'tür: 2022 sonunda kilitlenebilen, eğimsiz 10 aylık ortalama.
- **Order block ve adil değer boşluğu.** Tanım yazara göre değişir. Tek bir kilitli formül konmadan ızgaraya çıkarmak, bölüm 8'deki %56–%85 gezintisini yeniden üretir.

## Sıra

Kod yazılacaksa sıra şudur: 1, 2, 3, 4 birlikte kurulur ve bugünkü tablo bu protokolle yeniden basılır. O tablo çıkmadan 5–14'ten biri seçilmez. Sonra 14 (bildirim gerçeği), 6, 5, 7, 8. 9–13 onların sonucunda hâlâ açık olan hücreye bakılır.

Kabul edilmeyen öneri panelde "denendi, doğrulamada tutmadı" diye bir satır ister. Sessizce eşik gevşetilmez.
