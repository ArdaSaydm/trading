# Grok görevi: "Turuncu" büyük dönüş göstergesi

## İstek

Kullanıcı, geçmişte **2 ay ve daha uzun süren büyük yükseliş/düşüşlerin çoğundan önce yanan** bir sinyal istiyor. Yükseliş gelecekse turuncu işaret mumun altında, düşüş gelecekse üstünde.

Senden istenen: aşağıdaki testten **benimkinden daha iyi geçen** bir kural bulmak. Sonuçlarını `GROK_TURUNCU_SONUC.md` dosyasına yaz.

## Tanımlar (değiştirme)

- **Veri:** Binance spot günlük mumlar, 26 coin (BTC, ETH, BNB, SOL, XRP, LDO, LTC, ADA, LINK, DOGE, TRX, XLM, ETC, BCH, DOT, AVAX, ATOM, NEO, EOS, VET, FIL, UNI, AAVE, NEAR, ALGO, IOTA), 2017–2026.
- **Büyük hareket:** Yüksek/düşük fiyatla %30 zigzag. Bir bacak en az 60 gün sürmeli ve en az %30 olmalı.
- **Sinyal:** Koşul ilk kez doğru olduğu gün. Aynı yönde iki sinyal arasında en az 30 gün. İlk 364 gün ısınma (1 yıllık tepe/dip için).
- **Ölçütler:**
  - **Yakalanan:** Bacak başlangıcından 45 gün önce ile 20 gün sonrası arasında doğru yönde sinyal olan bacakların oranı. "Erken" sütununda üst sınır bacağın ilk üçte biri.
  - **İsabet / taban:** Sinyallerin bu pencerelere düşme oranı, rastgele günlerin oranına karşı.
  - **90 gün:** Sinyal yönünde 90 günlük medyan getiri ve 90 gün içinde en az %30 lehte hareket olma oranı, rastgele günlere karşı.
- **Doğrulama:** Kural tüm veride ve **sadece 2023 sonrası** ayrı ayrı rastgeleden iyi olmalı. 2018–2022'ye göre seçilip 2023+'da tutmayan kural kabul edilmez. Ayrıca büyük 5 coinde de bakılır.
- Kural sadece o güne kadarki veriyi kullanmalı (geleceğe bakmak yok).

## Hazır test betiği

Klasördeki `turuncu_test.js` veriyi Binance'ten çeker ve tüm ölçütleri yazdırır (Node 18+):

```
node turuncu_test.js
```

Yeni kuralı `RULES` nesnesine ekle: `[yön, (P, i) => koşul]`. Hazır alanlar: `P.c` kapanış, `P.b` mumlar, `P.s10/s20/s30/s50/s100/s200` ortalamalar, `P.rsiD` günlük RSI, `P.dd` 1 yıllık tepeden uzaklık, `P.ru` 1 yıllık dipten uzaklık, `P.dsl/dsh` 1 yıllık dip/tepeden bu yana gün, `P.vol` 7 günlük / 90 günlük hacim. `crossUp(P, 's10', i)` ve `crossDn(P, 's50', i)` yardımcıları var.

## Şu anki kurallar (uygulamada)

- **Turuncu alt (yükseliş):** 1 yıllık dip son 30 günde, fiyat 1 yıllık tepenin en az %40 altında, günlük kapanış 10 günlük ortalamanın üstüne çıkıyor.
- **Turuncu üst (düşüş):** Fiyat 1 yıllık dibin en az %50 üstündeyken günlük kapanış 50 günlük ortalamanın altına iniyor.

| | Yakalanan (2018+ / 2023+) | İsabet / taban | 90 gün medyan (sinyal / rastgele) |
|---|---|---|---|
| Alt | %46 / %45 | %38 / %17 | +%4 / −%5 (2023+: +%9 / −%5) |
| Üst | %54 / %56 | %11 / %11 (2023+: %14 / %13) | +%12 / +%5 (2023+: +%14 / +%5) |

## Denenip elenenler

- **"Çoğunu" yakalayanlar rastgeleden iyi değil:** Fiyat 50 günlük ortalamanın %17 altında (yakalama %83), günlük RSI ≤ 30 (%75), 30 günlük dip kırılımı (%87), yükselişte geri çekilme + toparlanma (%70–85). Bunların 90 günlük getirisi rastgele günlerle aynı ya da daha kötü.
- **Tepe desenleri:** Aylık RSI ≥ 64 + 1 yıllık zirveye yakınlık, haftalık RSI ≥ 66 + aylık RSI ≥ 64, Mayer çarpanı ≥ 1,5. Eğitim coinlerinde iyi, diğer 20 coinde %1–3 yakalama.
- **17 özellikli gradyan artırma modeli:** Coin bazında 5 katlı doğrulamada iyi görünüyor (yakalama %57–66), ama 2022'ye kadar eğitip 2023+'da test edince 90 günlük getiri rastgeleden kötü. Coinler aynı piyasa döngüsünü paylaştığı için coin ayrımı yanıltıcı.
- **Düşüş sinyaline ek filtreler** (50 günlük ortalama eğimi, 1 yıllık zirve son 120 günde, 200 günlük ortalama, haftalık RSI): yakalamayı %20–35'e düşürüyor, getiri farkını artırmıyor.

## Önerebileceğin yönler

- Fonlama oranı, açık pozisyon ve BTC dominansı gibi fiyat dışı veriler. Binance vadeli API'sinden çekilebilir, ama geçmişi 2019–2020'den başlıyor.
- Haftalık/aylık mum desenleri (ör. aylık yutan mum, haftalık 20 SMA bandı).
- BTC aylık rejimine göre koşullandırma: piyasa yönündeki turuncular ayrı ölçülmeli.
