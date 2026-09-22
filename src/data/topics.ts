import type { RoomId, Topic } from '@/types';
import { todayKey } from '@/lib/format';

const TOPICS: Record<RoomId, Topic[]> = {
  felsefe: [
    {
      id: 'fel-1',
      quote: 'Düşünmeden yaşanan hayat, yaşanmaya değmez. — Sokrates',
      question: 'Bugün hangi düşünce seni bir an durdurdu?',
    },
    {
      id: 'fel-2',
      quote: 'İnsan özgürlüğe mahkûmdur. — Sartre',
      question: 'Bu akşam verdiğin küçük bir seçim seni nasıl şekillendirdi?',
    },
    {
      id: 'fel-3',
      quote: 'Bildiğim tek şey, hiçbir şey bilmediğimdir.',
      question: 'Bu cümle sana alçakgönüllülük mü, yoksa bir kaçış mı gibi geliyor?',
    },
    {
      id: 'fel-4',
      quote: 'Kontrol edebildiğin ile edemediğini ayır.',
      question: 'Bugün enerjini hangisine harcadın?',
    },
    {
      id: 'fel-5',
      quote: 'Başkaları olmadan benlik de eksik kalır.',
      question: '“Cehennem başkalarıdır” fikrine bu masada yer var mı?',
    },
    {
      id: 'fel-6',
      quote: 'Mutluluk bir sonuç değil, tekrar edilen bir erdem olabilir.',
      question: 'Senin için iyi bir gece neye benzer?',
    },
  ],
  tarih: [
    {
      id: 'tar-1',
      quote: 'Tarih tekerrürden ibarettir.',
      question: 'Bu söze katılıyor musun, yoksa yalnızca unutkanlık mı tekrar eder?',
    },
    {
      id: 'tar-2',
      quote: 'Bir şehir sokak, mutfak ve savaş diye üç katmana ayrılabilir.',
      question: 'Gezmeden önce hangisini merak edersin?',
    },
    {
      id: 'tar-3',
      quote: 'Unutulan bir meslek de bir gelenek kadar tarih sayılır.',
      question: 'Aklında kalan sessiz bir örnek var mı?',
    },
    {
      id: 'tar-4',
      quote: 'Arşivdeki bir mektup, bugünün sohbetinden daha yavaştır.',
      question: 'Yavaşlık onu daha mı dürüst kılar?',
    },
    {
      id: 'tar-5',
      quote: 'Yerel tarih çoğu zaman tabelanın arkasında durur.',
      question: 'Mahallende en az anlatılan köşe neresi?',
    },
    {
      id: 'tar-6',
      quote: 'Bir akşam yürüyüşü tek bir dönemi yeniden kurabilir.',
      question: 'Hangi yüzyılın ışığını seçerdin?',
    },
  ],
  edebiyat: [
    {
      id: 'ede-1',
      quote: 'Bu gece aklında kalan cümle kısa olsun.',
      question: 'Hangi cümle?',
    },
    {
      id: 'ede-2',
      quote: 'Kitaplar yalnızlığın en nazik hâli olabilir.',
      question: 'Sana göre nazik olan tarafı hangisi: cümle mi, sessizlik mi?',
    },
    {
      id: 'ede-3',
      quote: 'Yarım kalan kitap da bir karardır.',
      question: 'Neden yarım kaldı?',
    },
    {
      id: 'ede-4',
      quote: 'Şiir ile düzyazı aynı odaya farklı tempolar getirir.',
      question: 'Bu gecenin ritmine hangisi yakın?',
    },
    {
      id: 'ede-5',
      quote: 'Bir karakterle aynı masada oturmak, onu övmek değildir.',
      question: 'Yalnızca konuşmak için kimi seçerdin?',
    },
    {
      id: 'ede-6',
      quote: 'Türkçede tek bir kelime bir odayı taşıyabilir.',
      question: 'Bu gece o kelime ne olsun?',
    },
  ],
  astronomi: [
    {
      id: 'ast-1',
      quote: 'Gökyüzüne en son ne zaman gerçekten baktın?',
      question: 'O bakışta neyi arıyordun?',
    },
    {
      id: 'ast-2',
      quote: 'Yıldız ışığı bize geçmişten gelir.',
      question: 'Bu gecikme sohbeti nasıl değiştirir?',
    },
    {
      id: 'ast-3',
      quote: 'Ay’ın evresi bir odanın temposunu değiştirebilir.',
      question: 'Bu gece hangi evreye benziyor?',
    },
    {
      id: 'ast-4',
      quote: 'Şehir ışıkları olmasa ilk neyi arardın?',
      question: 'Bir takımyıldız mı, karanlığın kendisi mi?',
    },
    {
      id: 'ast-5',
      quote: 'Yukarı bakmak, aşağıyı da yeniden görmektir.',
      question: 'Bugün bunu nerede fark ettin?',
    },
    {
      id: 'ast-6',
      quote: 'Bir takımyıldızın hikâyesi tek cümleye sığabilir.',
      question: 'Hangisini seçersin?',
    },
  ],
  sanat: [
    {
      id: 'san-1',
      quote: 'Bir esere üç dakika bakmak, bakışın kendisini konu eder.',
      question: 'İkinci dakikada ne değişirdi?',
    },
    {
      id: 'san-2',
      quote: 'Renk mi çizgi mi bu gecenin dili?',
      question: 'Birini seç ve nedenini söyle.',
    },
    {
      id: 'san-3',
      quote: 'Müzede en son hangi eserin önünde durdun?',
      question: 'Adını bilmesen de tarif et.',
    },
    {
      id: 'san-4',
      quote: 'Sokak duvarı ile müze duvarı aynı ciddiyetle bakılmayı hak eder mi?',
      question: 'Nerede duruyorsun?',
    },
    {
      id: 'san-5',
      quote: 'Karanlıkta heykel, dokunmadan da okunur.',
      question: 'Gölge mi kütle mi daha çok anlatır?',
    },
    {
      id: 'san-6',
      quote: 'Bu gece tek bir fırça darbesi atılsa.',
      question: 'Ne kalırdı tuvalde?',
    },
  ],
  muzik: [
    {
      id: 'muz-1',
      quote: 'Bu gecenin parçası sözsüz de olabilir.',
      question: 'Söz mü, melodi mi odayı toplar?',
    },
    {
      id: 'muz-2',
      quote: 'Bir ritim insanları aynı tempoya çağırır.',
      question: 'Bugün hangi tempo sende kaldı?',
    },
    {
      id: 'muz-3',
      quote: 'Canlı ses ile kulaklık arasındaki fark yalnızca teknik değildir.',
      question: 'Sence asıl fark ne?',
    },
    {
      id: 'muz-4',
      quote: 'Bazı enstrümanlar geceyi gündüzden daha iyi taşır.',
      question: 'Senin için gece hangi enstrüman?',
    },
    {
      id: 'muz-5',
      quote: 'Sessizlik de bir ölçü olabilir.',
      question: 'Nakarattan sonra mı gelsin, önce mi?',
    },
    {
      id: 'muz-6',
      quote: 'Bir nakaratın sözünden çok etkisi kalır.',
      question: 'Paylaşmak istediğin ritmi nasıl tarif edersin?',
    },
  ],
  sinema: [
    {
      id: 'sin-1',
      quote: 'Bu gece aklındaki sahne tek bir ışıkla anlatılabilsin.',
      question: 'Nasıl bir kare?',
    },
    {
      id: 'sin-2',
      quote: 'Film, karanlıkta birlikte bakma sanatıdır.',
      question: 'Son izlediğin karede seni tutan neydi?',
    },
    {
      id: 'sin-3',
      quote: 'Son beş dakika filmi taşır; ilk kare odayı kurar.',
      question: 'Sence hangisi daha belirleyici?',
    },
    {
      id: 'sin-4',
      quote: 'Yönetmen mi oyuncu mu seni içeri alır?',
      question: 'Tek bir örnekle söyle.',
    },
    {
      id: 'sin-5',
      quote: 'Siyah-beyaz, geceyi renklerden daha net kurabilir.',
      question: 'Buna katılıyor musun?',
    },
    {
      id: 'sin-6',
      quote: 'Bu odaya tek bir replik bırak.',
      question: 'Sahnenin geri kalanını birlikte tamamlayalım.',
    },
  ],
  bilim: [
    {
      id: 'bil-1',
      quote: 'Merak, cevaptan önce soruyu tutar.',
      question: 'Bu gece masaya hangi soru gelsin?',
    },
    {
      id: 'bil-2',
      quote: 'Küçük bir gerçek, büyük bir iddiadan daha sağlam durabilir.',
      question: 'Bugün öğrendiğin küçük gerçek ne?',
    },
    {
      id: 'bil-3',
      quote: 'Laboratuvar dışı bilim mutfakta, yürüyüşte, gökyüzünde de durur.',
      question: 'Senin örneğin nerede?',
    },
    {
      id: 'bil-4',
      quote: 'Yanlışlanan bir fikir çöpe gitmez.',
      question: 'Haritayı nasıl düzeltir?',
    },
    {
      id: 'bil-5',
      quote: 'Basit bir gözlem uzun bir hikâyeye dönüşebilir.',
      question: 'Son fark ettiğin ayrıntı ne?',
    },
    {
      id: 'bil-6',
      quote: 'Bir deney tek cümleyle de kurulur.',
      question: 'Ne ölçerdin?',
    },
  ],
  psikoloji: [
    {
      id: 'psi-1',
      quote: 'Zihnin temposu da bir sohbet konusudur.',
      question: 'Bu gece tempo hızlı mı, ağır mı, dağınık mı, sakin mi?',
    },
    {
      id: 'psi-2',
      quote: 'Alışkanlık sessiz bir oda arkadaşıdır.',
      question: 'Hangisini masaya davet ederdin?',
    },
    {
      id: 'psi-3',
      quote: 'Dinlemek ile cevap hazırlamak ayrı ritimlerdir.',
      question: 'Bu sohbette hangisi baskın?',
    },
    {
      id: 'psi-4',
      quote: 'Bir duyguyu adlandırmak onu küçültmek zorunda değildir.',
      question: 'Sana göre netleştirir mi?',
    },
    {
      id: 'psi-5',
      quote: 'Dikkatin nerede olduğu geceyi değiştirir.',
      question: 'Şu an dikkat nerede?',
    },
    {
      id: 'psi-6',
      quote: 'Küçük bir ritüel sohbeti çerçeveler.',
      question: 'Senin ritüelin ne olurdu?',
    },
  ],
  mitoloji: [
    {
      id: 'mit-1',
      quote: 'Her gecenin bir miti olmak zorunda değildir; yine de biri yakışır.',
      question: 'Bu gecenin havasına hangi anlatı uyuyor?',
    },
    {
      id: 'mit-2',
      quote: 'Kahraman yolu bugün bir yürüyüş kadar küçük olabilir.',
      question: 'Nerede döndün?',
    },
    {
      id: 'mit-3',
      quote: 'Anlatılar insan kusurlarını büyütür.',
      question: 'Hangi kusur bir hikâyeye dönüşür?',
    },
    {
      id: 'mit-4',
      quote: 'Yerel bir efsane, büyük destandan daha yakın durabilir.',
      question: 'Bildiğin kısa bir anlatı var mı?',
    },
    {
      id: 'mit-5',
      quote: 'Işık ile gölge mitlerde birlikte yürür.',
      question: 'Bu gece hangisi önde?',
    },
    {
      id: 'mit-6',
      quote: 'Ay, labirent, nehir, ateş.',
      question: 'Bir sembol seç: bu odada ne anlama gelsin?',
    },
  ],
};

export function topicsFor(roomId: RoomId): Topic[] {
  return TOPICS[roomId];
}

export function topicForDay(roomId: RoomId, day = todayKey()): Topic {
  const list = TOPICS[roomId];
  let hash = 0;
  for (let index = 0; index < day.length; index += 1) {
    hash = (hash * 33 + day.charCodeAt(index)) >>> 0;
  }
  return list[hash % list.length] ?? list[0];
}
