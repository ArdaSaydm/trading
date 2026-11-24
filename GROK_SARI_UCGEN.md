# Grok görevi: Sarı üçgen (piyasa dönüş uyarısı)

## İstek

Kullanıcı, **bir piyasanın ayıdan boğaya ya da boğadan ayıya döneceğini birkaç ay önceden haber veren** bir gösterge istiyor:

- **Ayıdan boğaya** dönecekse sarı üçgen dönüş yerinin **altında** (▲).
- **Boğadan ayıya** dönecekse dönüş yerinin **üstünde** (▼).
- Tam tepe/dibi tutturması gerekmiyor; önemli olan **önceden** uyarması.
- Sadece kriptoda değil, **bütün piyasalarda** çalışmalı (hisse, endeks, emtia, döviz, kripto). Bu yüzden eşikler piyasaya özel olamaz; her piyasanın kendi oynaklığına göre ölçeklenmeli.

Senden istenen: aşağıdaki testten **şu anki kuraldan daha iyi geçen** bir kural bulmak (ayrıntı aşağıda). Sonuçları `GROK_SARI_UCGEN_SONUC.md` dosyasına yaz.

## Tanımlar (değiştirme)

- **Veri:** Günlük mumlar haftalığa çevrilir.
  - Yahoo Finance, 35 piyasa (1970'ten itibaren):
    - Endeksler: S&P 500, Nasdaq, Dow, Nikkei, DAX, FTSE, Hang Seng, BIST 100, Bovespa, Euro Stoxx 50
    - Emtialar: altın, gümüş, petrol, bakır
    - Dövizler: EURUSD, USDJPY, GBPUSD
    - Hisseler: AAPL, MSFT, NVDA, AMZN, INTC, CSCO, KO, XOM, GE, JPM, IBM, WMT, TSLA, META, GOOGL, BA, PFE, C
  - Binance, 14 kripto
  - Bitstamp, BTC (2011'den itibaren)
- **Gerçek dönüş:** Haftalık kapanışların log fiyatında zigzag yapılır.
  - Eşik = max(log 1,2 ; o piyasanın 52 haftalık yıllık oynaklığının tüm geçmişteki medyanı). Örnek: S&P 500 için yaklaşık %20 (klasik ayı piyasası tanımı), BTC için yaklaşık %50.
  - Dönüşten sonraki bacak en az 12 hafta sürmeli.
  - Dip = ayıdan boğaya, tepe = boğadan ayıya.
- **Sinyal:** Koşulun ilk doğru olduğu hafta. Aynı yönde iki sinyal arasında en az 13 hafta. İlk 104 hafta kapalı. Sadece o haftaya kadarki veri kullanılır.
- **Ölçütler:**
  - **Yakalama:** Dönüşlerin kaçında, dönüşten 26 hafta önce ile 4 hafta sonrası arasında aynı yönde sinyal var.
  - **İsabet / taban:** Sinyallerin kaçının ardından 26 hafta içinde (ya da en geç 4 hafta önce) aynı yönde dönüş geldi. Taban, aynı oranın rastgele haftalardaki değeri.
  - **26 hafta:** Sinyal yönünde medyan getiri, rastgele haftalara karşı.
- **Doğrulama:** Kural hem 2010 öncesinde hem 2010 sonrasında, ayrıca her piyasa sınıfında (endeks, hisse, emtia, kripto) rastgeleden iyi olmalı. Tek döneme ya da tek sınıfa uyan kural kabul edilmez.

## Hazır test betiği

`sari_test.js` veriyi çeker ve ölçütleri yazdırır (Node 18+, internet gerekir):

```
node sari_test.js
```

Yeni kuralı `RULES` nesnesine ekle: `[yön, (P, i) => koşul]`, i = hafta. Hazır alanlar:

| Alan | İçerik |
|---|---|
| `P.c` / `P.lc` | Haftalık kapanış / log kapanış |
| `P.z` | (log fiyat − log 40 haftalık ortalama) ÷ bu farkın son 156 haftalık standart sapması |
| `P.R` | Haftalık RSI(14) |
| `P.bear` / `P.bull` | Haftalık RSI ayı / boğa uyumsuzluğunun onaylandığı haftalar |
| `P.w` | Haftalık mumlar (`t`, `h`, `l`, `c`) |
| `P.T` | Gerçek dönüşler (sadece ölçüm için; kuralda kullanmak yasak) |
| `zmax(P, i, k)` | Son k haftadaki en yüksek z |

## Şu anki kural (uygulamada, `turn.js`, 24 Kasım güncellemesi)

Kullanıcı "uyuşmayan çok yer var, daha seçici ve isabetli olsun" dedi, ayrıca "bütün tepe ve diplerle eşleşmesi zorunlu" dedi. Test (75 piyasa) önceden uyaran kurallarda isabet ile yakalamanın birbirine zıt gittiğini gösterdi. Kullanıcı iki katmanı birlikte seçti:

**1. Ön uyarı (içi boş üçgen, seçici):**
- ▲: z ≤ −2 ve son 13 haftanın en düşük z'si ≤ −1,5 ve z o dipten en az 0,75 toparlanmış.
- ▼: haftalık RSI 65'in altına iner ve fiyat 3 yıllık dibin, o piyasanın yıllık oynaklığının (nedensel medyan) en az 3 katı üstünde.

| | Yakalama | İsabet / taban (2010 öncesi / sonrası) |
|---|---|---|
| ▲ | %22 | %72 / %18 (%77 / %63) |
| ▼ | %31 | %32 / %16 (%32 / %33) |

**2. Teyit (dolu üçgen, gecikmeli):** Gerçek zamanlı zigzag. Tepe/dipten, o piyasanın büyük hareket eşiğinin (max(log 1,2 ; o güne kadarki medyan yıllık oynaklık)) %70'i kadar dönüş olunca çıkar. Üçgen tepe/dibin yerine çizilir.
- ▲: yakalama %85, isabet %70 (%74 / %63).
- ▼: yakalama %91, isabet %57 (%64 / %49).
- Gecikme: dönüşten medyan 10 (dip) / 14 (tepe) hafta sonra.

**Senden istenen:** Ön uyarının (özellikle ▼) isabetini ve yakalamasını birlikte artırmak, ya da teyidin gecikmesini isabeti düşürmeden kısaltmak. 75 piyasalı genişletilmiş liste için sembolleri `sari_test.js`'e ekleyebilirsin (eklenenler: ^RUT, ^FCHI, ^AXJO, ^KS11, ^BSESN, NG=F, PL=F, ZC=F, ZW=F, AUDUSD=X, USDCAD=X, ORCL, MCD, PG, JNJ, HD, DIS, CAT, MMM, AMD, QCOM, TXN, ADBE, NFLX, SBUX).

### Önceki sürüm (ilk deneme, yerine geçti)

- ▲: z ≤ −1,5 ya da haftalık RSI boğa uyumsuzluğu. Yakalama %64, isabet %49.
- ▼: RSI ayı uyumsuzluğu ya da aşırı uzamanın sönmesi. Yakalama %53, isabet %23.

## Denenip elenenler (▼ için)

| Kural | Yakalama | İsabet / taban |
|---|---|---|
| Sıkı RSI ayı uyumsuzluğu (ilk tepe RSI ≥ 65, fark > 5) | %18 | %25 / %16 |
| z ≥ 2'ye ilk dokunuş | %29 | %22 / %16 |
| z ≥ 2 zirvesinden 1 puan düşüş | %30 | %25 / %16 |
| 52 haftalık zirveye yakınken 13 haftalık ivme negatife döner | %38 | %19 / %16 |
| Uyumsuzluk + z sönmesi aynı anda (13 hafta içinde) | %14 | %25 / %16 |
| Aşırı uzama sonrası 13 haftalık ortalamanın kırılması | %44 | %20 / %16 |

## Önerebileceğin yönler

- **Haftalık hacim:** Tepede hacim düşüşü ya da dağıtım haftaları. Yahoo'da hisse ve endeks hacmi var.
- **Oynaklık rejimi:** Tepelerden önce oynaklığın dibe vurması, diplerde patlaması.
- **Aylık mum desenleri:** Aylık yutan mum, aylık RSI'nin kendi geçmişine göre yüzdeliği.
- **Kriptoda ▲ için ek koşul:** Örneğin dibin onayı. Ama kural diğer sınıfları bozmamalı.
- **Zaman:** Son büyük dönüşten bu yana geçen süre, piyasanın kendi ortalama döngü süresine göre.
