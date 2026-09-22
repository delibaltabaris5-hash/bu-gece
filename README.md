# Bu Gece

İlgi kulüpleri ve bu gecenin tek planı. Felsefe, tarih, edebiyat, astronomi, sanat, müzik, sinema, bilim, psikoloji ve mitoloji odalarında konu açılır. Eşleşme uygulaması değildir.

Ücretsiz planda kişiler yalnızca cinsiyet simgesi ve geçici numarayla görünür. Pro, sabit takma adı, kısa tanıtımı ve doğrudan mesajı açar. Bu sürümde Pro kilidi yerel bir denemedir; Google Play Billing bağlı değildir.

## Çalıştırma

```bash
npm install
npx expo start
```

Uygulama adı: **Bu Gece**. Arayüz Türkçedir. Proje Expo SDK 57 kullanır.

### Expo Go (Android)

Expo hesabı gerekmez. Telefon ve bilgisayar aynı ağda olmalıdır.

1. Android telefona Expo Go kur. Sürüm bu projeyle aynı SDK’yı konuşmalıdır (SDK 57). Play Store gerideyse [expo.dev/go](https://expo.dev/go) üzerinden SDK 57 paketini indir.
2. Bilgisayarda `npm install` ardından `npx expo start`.
3. Terminaldeki QR kodu Expo Go ile okut. Bağlantı koparsa `npx expo start --tunnel` dene.
4. Android emülatör açıksa terminalde `a`.

Web için terminalde `w`.

### Kurulabilir APK

`eas build` Expo hesabı ister. Bu depoyu hazırlayan ortamda `npx expo whoami` sonucu `Not logged in` ve `EXPO_TOKEN` yoktu, bu yüzden bulut APK’sı burada üretilmedi.

Sahip makinesinde, etkileşimli girişle:

```bash
npm install
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Etkileşimsiz (Expo erişim belirteci, [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)):

```bash
export EXPO_TOKEN=...
npx eas-cli build -p android --profile preview --non-interactive
```

`eas.json` içindeki `preview` profili iç dağıtım APK’sı ister (`android.buildType: apk`). Bittiğinde Expo’nun verdiği bağlantıdan APK indirilir. `npx expo export --platform android` yalnızca JavaScript paketidir; telefona kurulan APK değildir.

Expo hesabı olmadan yerel debug APK (Android SDK 36, build-tools 36.0.0, NDK 27.1.12297006):

```bash
npx expo prebuild -p android --no-install
cd android && ./gradlew assembleDebug
```

Çıktı: `android/app/build/outputs/apk/debug/app-debug.apk`. `android/` git’e girmez.

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
