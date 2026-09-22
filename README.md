# Bu Gece

İlgi kulüpleri ve bu gecenin tek planı. Felsefe, tarih, edebiyat, astronomi, sanat, müzik, sinema, bilim, psikoloji ve mitoloji odalarında konu açılır. Eşleşme uygulaması değildir.

Ücretsiz planda kişiler yalnızca cinsiyet simgesi ve geçici numarayla görünür. Pro, sabit takma adı, kısa tanıtımı ve doğrudan mesajı açar. Bu sürümde Pro kilidi yerel bir denemedir; Google Play Billing bağlı değildir.

## Çalıştırma

```bash
npm install
npx expo start
```

- Android emülatör: terminalde `a`
- Web: terminalde `w`
- Telefonda Expo Go: SDK 57 ile eşleşen Expo Go sürümü gerekir. Mağaza sürümü gerideyse [expo.dev/go](https://expo.dev/go) üzerinden aynı SDK’yı kur.

Uygulama adı: **Bu Gece**. Arayüz Türkçedir.

## Akış

1. Cinsiyet simgesi ve ev odası seçilir. Tempo isteğe bağlıdır.
2. **Bu Gece** ekranı ruh hali, bütçe ve mesafeye göre tek bir örnek plan gösterir.
3. **Odalar** on kulübü listeler. Oda açılınca moderatör bot o günün konusunu (alıntı + soru) bırakır.
4. Ücretsiz kullanıcı odaya yazabilir. Bir kişiye dokununca yalnızca simge ve `Felsefe_4821` gibi geçici numara görünür. Doğrudan mesaj duvara düşer.
5. **Pro’yu aç** kilidi bu cihazda açar. Profiller ve doğrudan mesaj kullanılabilir. **Ayarlar** içinden Pro kapatılabilir.

Sohbet, planlar ve satın alma bu sürümde cihazın içindedir. Sunucu, push ve gerçek ödeme yoktur.

## Ücretsiz ve Pro

| | Ücretsiz | Pro |
| --- | --- | --- |
| Odada görünüm | Cinsiyet simgesi + geçici numara | Sabit takma ad ve kısa tanıtım |
| Oda sohbeti | Okuma ve yazma | Okuma ve yazma |
| Doğrudan mesaj | Kapalı | Açık |
| Ödeme | — | Yerel deneme. Play Billing sonra `src/billing/mockProBilling.ts` yerine bağlanır |

Kimlik, Pro bayrağı ve sohbet AsyncStorage’da durur.

## Proje

- Expo SDK 57, React Native, TypeScript, Expo Router
- Zustand + AsyncStorage
- `src/app` ekranlar, `src/data` odalar ve konular, `src/store` durum, `src/billing` ödeme sınırı

```bash
npm run typecheck
```
