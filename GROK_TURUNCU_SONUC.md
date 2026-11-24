# Turuncu sonuç

Yükseliş işaretini değiştirmek için iki kural öneriyorum. İkisi de 2018–2022 ve 2023 sonrasında, ayrı ayrı, rastgele günden iyi. Yakalama, uygulamadaki alt işaretle aynı bantta (%46–48). İsabet ve 90 günlük getiri daha yüksek.

Düşüş işareti için bu eşiği geçen bir değiştirme yok. Uygulamadaki üst işaret durabilir. Takvim, ay evresi ve ters kırılım gibi mantığı zayıf kurallar da tarandı. Çok başarılı çıkanı olmadı. Sayıları aşağıda.

Kurallar `turuncu_test.js` içine eklendi. Canlı grafik (`orange.js`) değiştirilmedi.

## Nasıl elendi

Aynı ölçüt: 26 coin, %30 ve en az 60 gün süren bacak, sinyal koşulun ilk günü, aynı yönde 30 gün ara, ilk 364 gün kapalı. Yakalanan bacak, başlangıçtan 45 gün önce ile 20 gün sonrası. 90 gün, sinyal yönündeki getiri.

Tarama yaklaşık 1270 kural: dip/tepe konumu, kırılım, RSI, çekiç, yutan mum, fonlama, BTC’nin 200 günlük ortalaması, genişlik. Seçim 2023 öncesine bakılarak yapıldı. 2023+ yalnızca doğrulama. Ayrıca haftanın günü, ayın günü, yeni ay, dolunay ve ters yönde kırılım denendi.

`node turuncu_test.js` uygulamadaki kuralı görev dosyasındaki tabloyla tutuyor. 2023+ medyanlar birebir (+%9 / −%5 ve +%14 / +%5). 2018+ rastgele taban bu çalıştırmada −%4; dosyada −%5 yazıyor. Fark, medyanın bir puanı.

Coinler aynı dalgada hareket ediyor. 2023 sonrasındaki yükseliş bacakları, başlangıçları 45 gün içinde olan 12 dalgada toplanıyor. Uygulamadaki işaret, RSI yıkama ve 5 günlük kırılım bu 12 dalganın 6’sını yakalıyor. BTC filtresi 5’ini yakalıyor. 89 coin-bacak bu 12 dalgaya iniyor.

## Öneri 1. Yükseliş: RSI yıkama, BTC 200 gün altında

O gün, hepsi birden:

- Kapanış, son 1 yılın tepesinin en az %40 altında.
- Son 15 günün birinde günlük RSI 25 veya altındaydı.
- Günlük kapanış, 10 günlük ortalamanın üstüne çıkıyor.
- Aynı gün BTC kapanışı, BTC’nin 200 günlük ortalamasının altında.

BTC filtresi o günün kapanışını kullanır. Bu kural, uygulamadaki alt işaretin yakalama oranını koruyup isabeti ve 90 günlük medyanı yükselten aday.

| | 2018+ | 2023+ | Büyük 5, tüm dönem |
|---|---|---|---|
| Yakalanan | 76/161 = %47 (erken %47) | 41/89 = %46 | 23/46 = %50 |
| İsabet / taban | %51 / %17 | %54 / %16 | %56 / %22 |
| 90 gün medyan | +%8 / −%4 | +%10 / −%5 | +%15 / +%4 |
| ≥%30 lehte | %50 / %45 | %42 / %40 | %62 / %45 |
| Olay | 157 (0,9/yıl/coin) | 76 | 43 |

Uygulamadaki alt işaret, aynı çalıştırmada: yakalama %47 / %45, isabet %38 / %39, 90 gün +%4 / +%9. Büyük 5’te yakalama %35, 90 gün +%18.

2023 öncesinde uygulamadaki işaretin 90 gün medyanı −%3, rastgele −%4 idi. Bu öneride aynı dönem +%4 / −%4. Kenar, 2023’ten önce de vardı.

Yıl yıl, 2023+:

| | 2023 | 2024 | 2025–2026 |
|---|---|---|---|
| Yakalanan | 10/23 = %43 | 9/24 = %38 | 22/42 = %52 |
| 90 gün | +%19 / +%6 | +%4 / −%3 | +%10 / −%12 |
| ≥%30 lehte | %62 / %44 | %23 / %49 | %41 / %31 |
| Olay | 13 | 13 | 50 |

2024’te medyan rastgeleden iyi, %30’luk lehte hareket oranı değil (13 olay). Uygulamadaki işaret de 2024’te bu oranla rastgelenin altında (%33 / %49). 2024, “90 günde %30” ölçütünün boşa gittiği yıl. Medyan ölçütü duruyor.

Büyük 5, yalnızca 2023+: yakalama %50 (10/20), isabet %71 / %19, 90 gün +%18 / +%5. Uygulamadaki işaret aynı dilimde yakalama %40, 90 gün +%23 / +%5.

## Öneri 2. Aynı kural, BTC’siz

BTC serisi istenmiyorsa filtreyi çıkarın. Kural tek coinin kendi mumunda biter.

| | 2018+ | 2023+ | Büyük 5 |
|---|---|---|---|
| Yakalanan | 78/161 = %48 | 43/89 = %48 | 23/46 = %50 |
| İsabet / taban | %45 / %17 | %44 / %16 | %53 / %22 |
| 90 gün medyan | +%6 / −%4 | +%8 / −%5 | +%15 / +%4 |
| ≥%30 lehte | %49 / %45 | %44 / %40 | %61 / %45 |
| Olay | 183 (1,1/yıl/coin) | 98 | 45 |

2023+ büyük 5: yakalama %50, 90 gün +%19 / +%5. RSI eşiği 20 olunca 2024’te tek olay kalıyor. Eşik 30 olunca yakalama %76’ya çıkıyor, 90 gün medyanı +%1’e düşüyor ve kenar gidiyor. 25, iki ucun arasında kalan grid noktası. Bakış penceresi 10, 15 veya 25 gün olunca tablo birkaç puan oynuyor.

## Öneri 3. Daha seyrek yükseliş: 5 günlük kırılım

1 yıllık dip son 10 günün içinde ve kapanış, önceki 5 günün en yüksek tepesinin üstünde. Ortalama şartı yok.

| | 2018+ | 2023+ | Büyük 5 |
|---|---|---|---|
| Yakalanan | 62/161 = %39 | 35/89 = %39 | 15/46 = %33 |
| İsabet / taban | %48 / %17 | %51 / %16 | %62 / %22 |
| 90 gün medyan | +%13 / −%4 | +%11 / −%5 | +%22 / +%4 |
| ≥%30 lehte | %57 / %45 | %50 / %40 | %69 / %45 |
| Olay | 151 (0,9/yıl/coin) | 91 | 26 |

2023 öncesi de tutuyor: yakalama %36, 90 gün +%13 / −%4. 2023+ büyük 5 medyanı +%20 / +%5. Yakalama, uygulamadaki işaretin altında. “Bacakların çoğu” hedefine bu kural yaklaşmıyor. Az sinyal, daha yüksek 90 gün getirisi istenirse bu.

2025–2026 medyanı +%3 / −%12. Kenar duruyor, mutlak getiri zayıf. 2024’te ≥%30 oranı %36 / %49.

## Düşüş

Uygulamadaki üst işaret bu çalıştırmada:

| | 2018+ | 2023+ | Büyük 5 |
|---|---|---|---|
| Yakalanan | 57/105 = %54 | 40/72 = %56 | 18/26 = %69 |
| İsabet / taban | %11 / %11 | %14 / %13 | %17 / %12 |
| 90 gün medyan | +%12 / +%4 | +%14 / +%5 | −%1 / −%4 |
| ≥%30 lehte | %43 / %36 | %39 / %31 | %32 / %26 |
| Olay | 601 (3,5/yıl/coin) | 334 | 135 |

2023+ büyük 5 dilimi: yakalama %71 (10/14), 90 gün −%2 / −%5. İşaret büyük coinlerin tepelerini yakalıyor. Kısa tarafın 90 günü, BTC, ETH, BNB, SOL ve XRP’de eksi. Tüm listedeki +%14, altcoinlerden geliyor.

Bunu geçmek için aranan şey, yakalamayı %30’un üstünde tutup isabeti tabandan ayırmak ve 90 gün kenarını her iki dönemde de korumaktı. Çıkan adaylar üç gruba ayrıldı:

- **Sık ateşleyenler** (50 günlük ortalama yerine 10 veya 20, yıldız, 5 gün kırılımı). Yakalama %65–71. İsabet tabana yapışık. 2018–2022’de 90 gün kenarı eksi.
- **Tepeye yakın ve seyrek olanlar** (1 yıllık tepe son 15–30 günde, sonra 10 veya 20 günlük ortalamanın altına inmek). 2023+ isabet %21–23 / taban %13, bu taramadaki en temiz isabet farkı. 2023 yılındaki 90 gün medyanı −%18 ile −%28, rastgele −%6. Yakalama %15–24.
- **Mayer çarpanı ≥ 1,3 ve 10 günlük ortalamanın altına inmek**, BTC son 1 yılın tepesine %8’den yakınken. 2023+ medyan +%25 / +%5, ≥%30 lehte %52 / %31. 2023 yılında yakalama 0/19, medyan −%30 / −%6. 2024 ve 2025 tabloyu taşıyor. Görev dosyasındaki Mayer elemesiyle aynı cins: bir boğa döngüsüne yapışıyor, önceki tepeyi kaçırıyor.

Haftalık kapanışın 20 haftalık ortalamayı aşağı kırması bu evrende 2 olay üretti. O yüzden ölçülmedi.

Fonlama (7 günlük ortalama eksi) RSI yıkamasının üstüne eklenince 2018–2022 medyanı +%17 / −%4, 2023+ yakalama %17 ve medyan +%18’e kadar çıkıyor. Aynı filtrenin kardeşi (RSI 30) 2023+ medyanını +%3’e düşürüyor. Fonlama geçmişi 2019’da başlıyor ve iki dönem arasında dağılmıyor. Öneriye girmedi.

## Mantığı zayıf kurallar

İstenen buydu: saçma da olsa her iki dönemde çok iyiyse yazılsın. Şunlar ölçüldü. Öneri olanı yok.

- **Dipte ters kırılım.** 1 yıllık dip son 30 günde, fiyat tepenin %40 altında, kapanış 10 günlük ortalamanın *altına* iniyor. Yön yine yükseliş. 2018+ yakalama %46, isabet %35 / %17, 90 gün +%4 / −%4. 2023+ yakalama %43, 90 gün +%7 / −%5. Rastgeleden iyi. Uygulamadaki alt işaretin her ölçütünün gerisinde. Aynı yerde aşağı kırmak, toparlanmayı haber vermiyor. Sadece dip bölgesinde durmak, 90 günün bir kısmını yukarı taşıyor.
- **Üst işaret, yalnız cumartesi.** 2023+ medyan +%22 / +%5, isabet %18 / %13, yakalama %17 (12/72). 2018–2022’de kenar +3 puan, yakalama %12. 2024’te 15 bacağın 1’i. Dokuz takvim filtresinden biri. Örneklem bunu “kural” yapmıyor.
- **Alt işaret, yalnız Mayıs–Ağustos.** 2023+ medyan +%11 / −%5, yakalama %27. 2018–2022 medyanı −%10 / −%4. Dönemler ters.
- **Çift gün, ayın 1’i, ayın sonu, yeni ay, dolunay, pazartesi.** Ya neredeyse her bacağı yakalıyorlar çünkü çok sık yanıyorlar (isabet = taban) ya da 90 gün kenarı bir dönemde artı, diğerinde eksi.

Yüksek yakalama tek başına işe yaramıyor. Günlük RSI’nin 30’a ilk değmesi 2023+ yakalama %76, 90 gün −%5 / −%5. Fiyatın 50 günlük ortalamanın %17 altına inmesi yakalama %80, 90 gün −%10 / −%5. 30 günlük dip kırılımı yakalama %99, 90 gün −%4 / −%5. Görev dosyasındaki eleme bu veride duruyor.

İki iyi kuralı OR ile birleştirmek yakalamayı 2023+ %64’e çıkarıyor (uygulamadaki alt VEYA RSI yıkama). 2018–2022 medyanı −%6 / −%4 oluyor. Eklenen günler kenarı siliyor. O birleşim kabul edilmedi.

## Konacak kural

Canlıya alınacaksa öneri 1, yükselişin yerine geçer. Düşüş satırı aynı kalır. Aynı yönde 30 gün ara ve 364 gün ısınma durur.

```
yukarı = dd <= -0.40
      ve son 15 günde RSI(14) <= 25
      ve kapanış, 10 günlük ortalamayı yukarı keser
      ve BTC kapanışı < BTC 200 günlük ortalaması
```

BTC istenmezse son satır kalkar (öneri 2). Daha seyrek işaret istenirse öneri 3 tek başına kullanılır. İkisini birden yakmak, yukarıdaki OR denemesinde 2018–2022 kenarını bozdu.
