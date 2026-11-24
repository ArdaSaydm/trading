# Sarı üçgen: öneri

▼ ön uyarısına tek bir ek kapı yeter. Mevcut kural durur. Aynı sınıftaki piyasaların çoğu kendi 3 yıllık dibinden oynaklığına göre uzamışken, bu piyasada haftalık RSI 70'in altına inerse ve fiyat da en az 2 oynaklık uzamışsa, o hafta da uyarı sayılır. ▲ ön uyarısı ve teyit eşiği (0,7) aynı kalır. `turn.js` değiştirilmedi. Kural `sari_test.js` içinde `Ön uyarı ▼ + aynı sınıf kalabalığı` adıyla duruyor; sayılar `node sari_test.js` çıktısı (75 piyasa).

## Kural

Mevcut ▼ aynı: haftalık RSI 65'in altına iner ve kapanış, 3 yıllık dibin en az 3 katı oynaklık üstündedir. Oynaklık, o haftaya kadarki medyan yıllık oynaklıktır.

Ek kapı, bunun yanında açıktır:

- Haftalık RSI 70'in altına iner (önceki hafta 70 veya üstüydü).
- Kapanış, 3 yıllık dibin en az 2 katı oynaklık üstündedir.
- Aynı sınıftan en az 4 başka piyasanın o hafta verisi vardır ve bunların en az yarısı 3 yıllık dibin 2,5 katı oynaklık üstündedir. Sınıf, piyasanın kendi sınıfıdır: endeks endeksle, hisse hisseyle, emtia emtiayla, kripto kriptoyla.

Sinyal, iki kapıdan birinin ilk doğru olduğu haftadır. Aynı yönde 13 hafta beklenir. İlk 104 hafta kapalıdır. Eşikler piyasanın kendi oynaklığındandır. Başka haftanın verisi ve etiketlenmiş dönüş kullanılmaz.

## Sonuç

| | Yakalama | İsabet / taban | 26 hafta |
|---|---|---|---|
| Mevcut ▼, 2010 öncesi | %30 (126/422) | %32 / %21 | −5% / −5% |
| Yeni ▼, 2010 öncesi | %37 (158/422) | %31 / %21 | −5% / −5% |
| Mevcut ▼, 2010 sonrası | %34 (79/230) | %33 / %12 | −6% / −4% |
| Yeni ▼, 2010 sonrası | %43 (99/230) | %35 / %12 | −5% / −4% |
| Mevcut ▼, tümü | %31 (205/652) | %32 / %16 | −5% / −5% |
| Yeni ▼, tümü | %39 (257/652) | %32 / %16 | −5% / −5% |

Yakalama iki dönemde de yükselir (30→37 ve 34→43). İsabet 2010 öncesinde 1 puan geride, 2010 sonrasında 2 puan öndedir; tüm örnekte ikisi de %32'dir. Uyarı, yakalanan tepelerden medyan 12 hafta (2010 öncesi) ve 11 hafta (2010 sonrası) önce gelir. Mevcut kuralda bu süre 10 haftadır.

Sınıf satırları:

| | Yakalama | İsabet / taban | 26 hafta |
|---|---|---|---|
| Endeks, mevcut → yeni | %39 → %52 | %26/%15 → %27/%15 | −5% / −5% |
| Hisse, mevcut → yeni | %28 → %33 | %31/%18 → %31/%18 | −6% / −6% |
| Emtia, mevcut → yeni | %37 → %47 | %51/%17 → %50/%17 | 0% / −3% |
| Kripto, mevcut → yeni | %44 → %72 | %86/%10 → %81/%10 | −4% → +2% / 0% |
| Döviz | %29, değişmedi | %40 / %7 | +1% / 0% |

2010 sonrası hisse: yakalama %31→%36, isabet %28→%30 (114 tepe). 2010 sonrası endeks: yakalama %39→%50, isabet %29→%30. 2010 sonrası emtia: yakalama %35→%44, isabet %53→%51, 26 hafta +3%→0% (39 sinyal). Bu hücrede isabet ve satış getirisi bir miktar geriler; yakalama artar.

On yıl kırılımı, aynı çekimde, resmi toplamlarla birebir tutan hesap:

| | Yakalama | İsabet / taban | 26 hafta |
|---|---|---|---|
| 1970–89 | %43 | %37 / %19 | −3% / −5% |
| 1990–2009 | %35 | %28 / %21 | −7% / −5% |
| 2010–17 | %43 | %37 / %12 | −5% / −4% |
| 2018–26 | %43 | %34 / %12 | −5% / −4% |

Dört aralığın her birinde isabet tabanın üstündedir. 1990–2009 aralığında fark 7 puandır; en ince dilim budur.

26 haftalık satış, rastgele haftanın satışını yenmez. 2010 sonrası −5% / −4%, mevcut kuralın −6% / −4%'ünden bir puan iyidir ve hâlâ eksi taraftadır. Piyasalar yukarı sürüklenir. Kuralın kazancı, tepenin penceresine daha çok düşmesidir. Sinyalden sonraki 26 haftanın kendisi bir satış sistemi değildir.

Döviz satırı yerinde kaldı. Beş paritede "sınıfın yarısı uzamış" şartı yeni sinyal üretmedi. Döviz, istenen dört sınıftan biri değildir. Dört sınıfta da isabet tabanın üstündedir.

## Neden bu kapı

İlk ölçülen birleşim, sınıf yerine bütün geleneksel piyasaların kalabalığını kullanıyordu (RSI 70, 2 oynaklık). Onun yakalaması daha yüksekti: 2010 öncesi %47, sonrası %52, isabet %31 / %32. 2010 sonrası emtiada uyarı geç kalıyordu (medyan gecikme −1 hafta) ve 26 haftalık satış 0%'ın karşısında −6% idi. Aynı sınıf kalabalığı bu hücreyi toparladı (gecikme +4 hafta, 26 hafta 0% / 0%) ve 2010 sonrası hissede yakalamayı %31'den %36'ya çıkardı. İki ölçüm de önceden yazılmış birleşimlerdi. Eşikler (yarı, 2,5 oynaklık, RSI 70) sonuç görüldükten sonra oynatılmadı.

RSI 65 kırılımını yalnızca sınıf kalabalıkken almak, 2010 sonrası isabeti %49'a çıkarıyor (202 sinyal, taban %12) ve yakalamayı %33'te tutuyor. 2010 sonrası hissede 27 sinyal kalıyor, 114 tepenin %14'ü. Büyük sınıf uyarısız kaldığı için ana kural yapılmadı.

## ▲ aynı kaldı

| | Yakalama | İsabet / taban | 26 hafta |
|---|---|---|---|
| 2010 öncesi | %23 (103/443) | %77 / %22 | +8% / +6% |
| 2010 sonrası | %21 (51/248) | %63 / %13 | +9% / +4% |
| Endeks | %31 | %78 / %16 | +11% / +5% |
| Hisse | %21 | %73 / %19 | +10% / +6% |
| Emtia | %20 | %81 / %18 | +12% / +3% |
| Kripto | %0 (0/26) | 3 sinyal, %0 / %15 | −37% / 0% |

İsabet zaten yüksek. Yakalama %22. Kriptoda kural üç kez yandı ve 26 dibin hiçbirine denk gelmedi.

Yakalamayı kripto dahil büyütmek isabeti eritiyor. "52 haftalık dibe 8 hafta içinde yükselen hafta": kripto yakalama %81, isabet %29 / %15, 26 hafta +2% / 0%. Aynı kural 2010 öncesinde isabeti %52'ye indiriyor ve 26 haftayı +4% / +6% ile rastgelenin altında bırakıyor. Oynaklık patlaması artı RSI'nin 30'u yukarı kırması isabeti korumaya daha yakın (2010 sonrası %63, yakalama %28) ve kriptoda 2 sinyalde kalıyor. İkisi de ▲'nın yerine konmadı.

## Teyit eşiği aynı kaldı

Dolu üçgen, büyük hareket eşiğinin K katı kadar geri çekilince çıkar. Yayınlanan özet K=0,7 için yakalama %85 / %91, isabet %70 / %57, gecikme medyan 10 hafta (dip) / 14 hafta (tepe). Aynı 75 piyasada, etikete 10 hafta içindeki teyitte K=0,7 isabeti bu özete oturuyor (havuzlanmış yaklaşık %69 ve %55). Gecikme bu eşleşmede 8 ve 12 hafta ölçüldü.

| K | ▲ yakalama, gecikme | ▲ isabet, 2010 öncesi / sonrası | ▼ yakalama, gecikme | ▼ isabet, 2010 öncesi / sonrası |
|---|---|---|---|---|
| 0,45 | %85, 4 hf | %60 / %50 | %92, 7 hf | %42 / %31 |
| 0,55 | %85, 6 hf | %66 / %55 | %90, 9 hf | %50 / %38 |
| 0,60 | %84, 6 hf | %68 / %58 | %90, 10 hf | %53 / %41 |
| 0,70 | %82, 8 hf | %73 / %64 | %87, 12 hf | %62 / %47 |
| 0,80 | %79, 11 hf | %79 / %70 | %82, 15 hf | %71 / %55 |

K'yi 0,70'ten 0,60'a indirmek gecikmeden yaklaşık 2 hafta alır. Tepe isabeti 2010 öncesinde 62→53, sonrasında 47→41 olur. İstenen, gecikmenin isabet düşmeden kısalmasıydı. 0,7 duruyor.

## Takvim ve ay evresi

Dokuz takvim ve ay evresi, hem tek başına hem mevcut kuralın üstünde filtre olarak denendi. Dolunay, yeniay, çift hafta, Ocak, Ekim, Mayıs, Eylül. Tek başına yananlar isabeti tabana yapıştırır: sürekli sinyalin yakalaması %100'e çıkar, dönüşü rastgele haftadan iyi seçmez.

İki filtre sayıyı hareket ettirdi ve yine de alınmadı.

Yeniay filtresi, mevcut ▲ yalnızca yeniaya denk gelince: 2010 öncesi 71 sinyal, yakalama %12, isabet %75 / %22, 26 hafta +15% / +6%. 2010 sonrası 46 sinyal, yakalama %12, isabet %63 / %13, 26 hafta +14% / +4%. Getiri iki dönemde de mevcut ▲'nın üstündedir (+8% / +6% ve +9% / +4%). Yakalama yarıya iner. Kriptoda 1 sinyal vardır. Dört sınıf şartı burada kapanır.

Ekim filtresi, mevcut ▲ yalnızca Ekimde: 2010 öncesi 56 sinyal, isabet %98 / %22, 26 hafta +11% / +6%, yakalama %12. 2010 sonrası 6 sinyal, isabet %50. Örnek kapanır.

Mayıs ayında açılan satışın 26 haftası iki dönemde de rastgele satıştan yaklaşık 2 puan iyidir (−3% / −5% ve −3% / −4%). İsabet tabana eşittir (%20 / %21 ve %12 / %12). Bu bir dönüş uyarısı değildir. Mayısın mevcut ▼ üzerine filtresi 2010 sonrası isabeti %49'a çıkarır ve yakalamayı %8'e indirir.

## Bakılıp bırakılanlar

395 kural skorlandı. Hacim (klimaks, dağıtım, kuru yükseliş), aylık kırılım, aylık RSI yüzdeliği, piyasanın kendi geçmiş rallisine göre "olgun" tepe, 52 haftalık zirveye yakınken 10 haftalık ortalamanın kırılması. Hacim dövizde yok; hisse, endeks, emtia ve kriptoda var. Zirve kırılımı yakalamayı %70–80 bandına çıkarır, 2010 sonrası isabeti %22 civarına indirir ve 26 haftalık satışı rastgelenin gerisinde bırakır. Bu aileler iki dönemde ve dört sınıfta, isabet ile yakalamayı birlikte mevcut kuralın üstüne taşıyamadı.

Kripto ▲ açık kaldı. Mevcut ▲ orada üç sinyaldir. Onu gevşetmek diğer sınıfların isabetini ve 2010 öncesi getirisini bozuyor.
