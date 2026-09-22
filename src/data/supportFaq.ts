export interface SupportFaq {
  id: string;
  label: string;
  keywords: string[];
  answer: string;
}

export const SUPPORT_EMAIL = 'canaslan1675@gmail.com';

export const SUPPORT_FAQ: SupportFaq[] = [
  {
    id: 'kota',
    label: 'Ücretsiz kota',
    keywords: ['ücretsiz', 'kota', 'mesaj hakkı', 'kaldı', 'hak'],
    answer:
      'Ücretsiz planda oda ve Sohbetler aynı 10 mesajı paylaşır. Hak bitince yazma durur, okuma sürer. Pro ile mesaj sınırsızdır.',
  },
  {
    id: 'pro',
    label: 'Pro',
    keywords: ['pro', 'üyelik', 'sabit', 'takma', 'doğrudan', 'sınırsız'],
    answer:
      'Pro sabit takma adı, kısa tanıtımı ve sınırsız mesajı açar. Doğrudan mesaj da Pro ile gelir. Bu sürümde kilit yerel bir denemedir; Google Play Billing bağlı değildir. Ayarlar’dan kapatabilirsin.',
  },
  {
    id: 'odalar',
    label: 'Odalar',
    keywords: ['oda', 'odalar', 'kulüp', 'felsefe', 'konu'],
    answer:
      'On ilgi odası vardır: Felsefe, Tarih, Edebiyat, Astronomi, Sanat, Müzik, Sinema, Bilim, Psikoloji ve Mitoloji. Odalar konu içindir. Moderatör bot o günün alıntısını ve sorusunu bırakır. Psikoloji odası klinik destek değildir.',
  },
  {
    id: 'sohbetler',
    label: 'Sohbetler',
    keywords: ['sohbet', 'genel', 'ruh hali', 'ruh', 'tempo', 'eşleş'],
    answer:
      'Sohbetler iki bölümdür. Genel, kişileri gece takımyıldızında gösterir. Ruh Hali bugünkü tempoyu sorar; aynı tempodakiler kısa bir aramadan sonra belirir. Konum kullanılmaz.',
  },
  {
    id: 'atmosfer',
    label: 'Atmosfer',
    keywords: ['atmosfer', 'echoes', 'ses', 'müziği kıs', 'müziği yükselt', 'arka plan'],
    answer:
      'Atmosfer, Echoes of Solitude parçasını uygulama açılınca kısık sesle döngüye alır. Müziği yükselt ve Müziği kıs her ekranda durur. Ses düzeyi bu cihazda kalır.',
  },
  {
    id: 'gizlilik',
    label: 'Gizlilik',
    keywords: ['gizlilik', 'fotoğraf', 'foto', 'resim', 'konum', 'veri', 'sunucu'],
    answer:
      'Fotoğraf yok. Kişiler cinsiyet simgesi ve adla görünür. Kimlik, Pro kilidi ve sohbet bu cihazda kalır; sunucuya gitmez. Konum takibi yoktur.',
  },
];

const FALLBACK =
  'Bunu sık sorulanlarda net bulamadım. Ücretsiz kota, Pro, odalar, Sohbetler, Atmosfer veya gizlilikten birini seç.';

export const SUPPORT_GREETING =
  'Merhaba. Sık sorulanlara kısa cevap veririm. Bir konu seç ya da yaz.';

function fold(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c');
}

export function answerSupportQuestion(question: string): string {
  const folded = fold(question).trim();
  if (!folded) return FALLBACK;

  let best: { answer: string; score: number } | null = null;
  for (const entry of SUPPORT_FAQ) {
    let score = 0;
    const label = fold(entry.label);
    if (folded === label || folded.includes(label)) score += 4;
    for (const keyword of entry.keywords) {
      const token = fold(keyword);
      if (token && folded.includes(token)) score += token.length > 3 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { answer: entry.answer, score };
  }
  return best?.answer ?? FALLBACK;
}
