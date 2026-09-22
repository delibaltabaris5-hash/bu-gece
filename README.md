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

Açılınca **Bu Gece** sekmesi kilitli ana sayfadır: gece zemini, başlık ve hilal, ortada Felsefe ile dokuz ışıltılı oda baloncuğu, altta **Ücretsiz: 10 mesaj kaldı**. Yakındakiler / Genel anahtarı yoktur. Kaydırmalı profil kartı yoktur. Atmosfer müziği uygulama açılınca kısık sesle başlar; **Müziği yükselt** ve **Müziği kıs** her ekranda durur.

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
2. **Bu Gece** ekranı on odayı ışıltılı baloncuklar olarak gösterir. Ana sayfada Yakındakiler / Genel anahtarı yoktur; kilometre rozeti görünmez.
3. **Odalar** on kulübü listeler. Oda açılınca moderatör bot o günün konusunu (alıntı + soru) bırakır. Atmosfer, ana sayfa, odalar, sohbet ve doğrudan mesaj dahil her ekranda aynı parçayı döngüye alır.
4. Ücretsiz kullanıcı odaya 10 mesaj yazabilir. Bir kişiye dokununca yalnızca simge ve `Felsefe_4821` gibi geçici numara görünür. Doğrudan mesaj duvara düşer.
5. **Pro’yu aç** kilidi bu cihazda açar. Profiller ve doğrudan mesaj kullanılabilir. **Ayarlar** içinden Pro kapatılabilir.

Sohbet, planlar ve satın alma bu sürümde cihazın içindedir. Sunucu, push ve gerçek ödeme yoktur.

## Ücretsiz ve Pro

| | Ücretsiz | Pro |
| --- | --- | --- |
| Odada görünüm | Cinsiyet simgesi + geçici numara | Sabit takma ad ve kısa tanıtım |
| Oda sohbeti | Okuma ve 10 mesaj | Okuma ve sınırsız yazma |
| Doğrudan mesaj | Kapalı | Açık |
| Ödeme | — | Yerel deneme. Play Billing sonra `src/billing/mockProBilling.ts` yerine bağlanır |

Kimlik, sohbet ve Atmosfer ses düzeyi AsyncStorage’da durur. Ücretsiz mesaj hakkı (`freeMessagesRemaining`) ve yerel Pro bayrağı ayrıca SecureStore’da, cihaz kimliğine bağlı bir anahtarda durur.

### Yeniden kurulum

Yeni bir cihazda hak 10’dur. AsyncStorage veya SecureStore’da kalan sayı zaten varsa o sayı durur; eski 2’lik bakiye 10’a tamamlanmaz. Açılışta, AsyncStorage yüklendikten sonra SecureStore ile karşılaştırılır. SecureStore’daki kalan hak daha düşükse o sayı tutulur. AsyncStorage silinmesi ücretsiz mesajı geri açmaz. **Kimliği sıfırla** da hakkı doldurmaz.

Cihaz kimliği varsa `expo-application` ile alınır: Android’de `androidId`, iOS’ta `identifierForVendor`. İkisi de yoksa SecureStore’da saklanan bir UUID kullanılır. Seçilen kimlik `bugece.install-id` anahtarına yazılır. iOS vendor kimliği yeniden kurulumda değişebilir; Keychain’deki kayıt duruyorsa kota anahtarı ona bağlı kalır.

Bu tam koruma değildir:

- **iOS:** SecureStore, Keychain kullanır (`AFTER_FIRST_UNLOCK`). Uygulamayı silip kurunca kayıt çoğu zaman kalır, bu yüzden ücretsiz hak sıfırlanmayabilir. Her iOS sürümü ve her yedek geri yüklemesi için garanti değildir.
- **Android:** SecureStore uygulama silinince genellikle temizlenir. `androidId` aynı kalsa bile sayaç gider; yeniden kurulum hakkı baştan açabilir.
- **Web:** SecureStore yoktur. Aynı anahtarlar `localStorage` içindedir ve site verisi silinince gider.

Tam koruma için kota sunucuda tutulmalı ve hesap Apple, Google veya telefon numarasıyla bağlanmalıdır. Taslak: `docs/SPEC-server-quota.md`. Bu sürümdeki Pro hâlâ yerel bir denemedir.

### Üye girişi

İlk açılışta kilitli giriş ekranı gelir: **Bu Gece**, **Hesabınla devam et.**, üstte **Kayıt ol**, altta **Gmail ile devam et**, altında **Zaten üye misin? Giriş yap.** **Kayıt ol** e-posta ve şifreyle yeni hesabı 10 mesajla açar; görünen ad isteğe bağlıdır. **Giriş yap** yalnızca kayıtlı hesabı açar ve SecureStore’daki kalan mesajı geri getirir. Aynı e-posta ile yeniden giriş hakkı 10’a döndürmez.

**Gmail ile devam et** giriş, kayıt ve e-posta ekranlarındadır. İstek `Google.useAuthRequest` ile gider. Yönlendirme `AuthSession.makeRedirectUri({ scheme: 'bugece', path: 'giris', projectNameForProxy: 'bu-gece' })` ile hesaplanır. SDK 57 bu çağrıda `projectNameForProxy` alanını yok sayar ve `exp://` veya `bugece://` döndürür. Google web istemcisi bu özel şemayı `Error 400: invalid_request` ile keser. Uygulama o sonucu kullanmaz. Google’a giden adres, web istemcisinde kayıtlı olanlardan biridir:

- Expo Go ve yerel olmayan çalışma: `https://auth.expo.io/@anonymous/bu-gece`
- Web, port 8081: `http://localhost:8081`
- Diğer kayıtlı kökler: `https://localhost`, `http://localhost`, `http://127.0.0.1`, `https://127.0.0.1`

Konsolda `[bu-gece] Google redirectUri` satırı, o çalıştırmada kullanılan adresi yazar. İstek yetkilendirme kodu + PKCE kullanır (`response_type=code`) ve web istemci kimliğini gönderir, çünkü yönlendirme adresleri o istemciye ekli. Yeni bir Gmail adresi 10 mesajla hesap olur. Aynı e-posta kayıtlı sayıyı geri getirir. Google bitmezse Türkçe açıklama çıkar ve e-posta kayıt formu açılır.

Expo yalnızca `EXPO_PUBLIC_` ile başlayan değişkenleri uygulamaya koyar.

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — `746154431428-mctmvk4glj7gi8as42qk4ekaogqlmr3e.apps.googleusercontent.com`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — `746154431428-fto2dpgtmg73hjdisk62loh8utsuucr5.apps.googleusercontent.com` (paket `com.bugece.app`). Mağaza derlemesinde ters istemci şeması `com.googleusercontent.apps.746154431428-fto2dpgtmg73hjdisk62loh8utsuucr5`. Bu HTTPS yönlendirme web istemcisine kayıtlı olduğu için Expo Go isteği web istemci kimliğini kullanır.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` — Android istemcisi. Paket `com.bugece.app` ve yayın SHA-1’i.

OAuth izin ekranı şu an **External / Testing**. Test kullanıcıları: `canaslan1675@gmail.com`, `dekancelik501@gmail.com`. Testing modu yalnızca bu listedekileri alır. Tüm son kullanıcılar için izin ekranı **In production** yayımlanmalıdır.

Ayarlar’da **Giriş yap**, **Hesabım** ve **Çıkış yap** durur. Yazmak üye hesabı ister.

## Atmosfer

Arka plan döngüsü **Echoes of Solitude** (Discomfuse). Parça [Pixabay](https://pixabay.com/music/main-title-echoes-of-solitude-277006/) üzerindedir ve **Pixabay Content License** ile kullanılır. Dosya: `assets/audio/echoes-of-solitude.mp3`. Uygulama açılınca ses yaklaşık 0.15’te başlar; **Müziği yükselt** ve **Müziği kıs** seçimi cihazda kalır. Hans Zimmer kaydı yoktur.

## Proje

- Expo SDK 57, React Native, TypeScript, Expo Router
- Zustand + AsyncStorage, ücretsiz kota için ek olarak `expo-secure-store` ve `expo-application`
- `src/app` ekranlar, `src/data` odalar ve konular, `src/store` durum, `src/billing` ödeme sınırı

```bash
npm run typecheck
```
