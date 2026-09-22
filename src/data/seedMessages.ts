import type { ChatMessage, RoomId } from '@/types';

const BASE = Date.parse('2026-09-22T18:10:00+03:00');

const LINES: { roomId: RoomId; memberId: string; text: string }[] = [
  { roomId: 'felsefe', memberId: 'fel-1', text: 'Kontrol edebildiğim şey bugün kısaydı: tempo ve cümle.' },
  { roomId: 'felsefe', memberId: 'fel-2', text: 'Sokrates’in cümlesi bana biraz sert geliyor. Yaşanmayan düşünce de eksik.' },
  { roomId: 'felsefe', memberId: 'fel-3', text: 'İkisini aynı masaya koyalım: düşünmek yürüyüşü yavaşlatır, yürüyüş düşünceyi.' },
  { roomId: 'tarih', memberId: 'tar-1', text: 'Mahalledeki eski fırının yerini hâlâ tarif edebiliyorum. Bu da arşiv sayılır mı?' },
  { roomId: 'tarih', memberId: 'tar-2', text: 'Tekerrür değil, tekrarı fark etmek asıl mesele.' },
  { roomId: 'tarih', memberId: 'tar-3', text: 'Bir mektup, bir sokak tabelasından daha çok şey saklıyor.' },
  { roomId: 'edebiyat', memberId: 'ede-1', text: 'Bu gece aklımda kalan cümle kısa: kapı aralıktı.' },
  { roomId: 'edebiyat', memberId: 'ede-2', text: 'Yarım kitap bazen bitmiş kitaptan dürüst.' },
  { roomId: 'edebiyat', memberId: 'ede-3', text: 'Şiir, bu odanın temposuna daha yakın.' },
  { roomId: 'astronomi', memberId: 'ast-1', text: 'Dün gece balkon ışığını kapattım. Üç yıldız yeterdi.' },
  { roomId: 'astronomi', memberId: 'ast-2', text: 'Işık yılları fikri sohbeti yavaşlatıyor, hoşuma gidiyor.' },
  { roomId: 'astronomi', memberId: 'ast-3', text: 'Şehirde Ay’ı bulmak da bir tür gözlem.' },
  { roomId: 'sanat', memberId: 'san-1', text: 'Üç dakika kuralını denedim. İkinci dakikada renk değil gölge gördüm.' },
  { roomId: 'sanat', memberId: 'san-2', text: 'Sokak duvarı da müze duvarı da bakmayı ister.' },
  { roomId: 'sanat', memberId: 'san-4', text: 'Bu gece tek bir çizgi: ufuk.' },
  { roomId: 'muzik', memberId: 'muz-1', text: 'Sözsüz bir parça bu odaya daha çok yakışır.' },
  { roomId: 'muzik', memberId: 'muz-2', text: 'Sessizlik, nakarattan sonra gelsin.' },
  { roomId: 'muzik', memberId: 'muz-3', text: 'Canlı ses, kulaklıktan daha kalabalık bir oda kuruyor.' },
  { roomId: 'sinema', memberId: 'sin-1', text: 'Aklımdaki sahne neredeyse karanlık: bir istasyon, tek lamba.' },
  { roomId: 'sinema', memberId: 'sin-2', text: 'Son beş dakika filmi taşır; ilk kare ise odayı kurar.' },
  { roomId: 'sinema', memberId: 'sin-5', text: 'Tek replik bırakıyorum: ışığı kısık tut.' },
  { roomId: 'bilim', memberId: 'bil-1', text: 'Bugünkü küçük gerçek: soğuyan çayda halkalar neden yavaşlar?' },
  { roomId: 'bilim', memberId: 'bil-2', text: 'Yanlışlanan fikir çöpe gitmez, haritayı düzeltir.' },
  { roomId: 'bilim', memberId: 'bil-3', text: 'Mutfaktaki gözlem de laboratuvar sayılır.' },
  { roomId: 'psikoloji', memberId: 'psi-1', text: 'Tempom bu akşam ağır. Adını koyunca biraz yerine oturdu.' },
  { roomId: 'psikoloji', memberId: 'psi-2', text: 'Dinlemek, cevap hazırlamaktan başka bir ritim.' },
  { roomId: 'psikoloji', memberId: 'psi-3', text: 'Küçük ritüel: masaya tek bir soru bırakmak.' },
  { roomId: 'mitoloji', memberId: 'mit-1', text: 'Bu gece labirent. Çıkıştan çok dönüşler ilginç.' },
  { roomId: 'mitoloji', memberId: 'mit-2', text: 'Yerel bir göl efsanesi, büyük destandan daha yakın.' },
  { roomId: 'mitoloji', memberId: 'mit-3', text: 'Ay hem yol gösterir hem saklar.' },
];

export function buildSeedMessages(): Record<RoomId, ChatMessage[]> {
  const buckets: Record<RoomId, ChatMessage[]> = {
    felsefe: [],
    tarih: [],
    edebiyat: [],
    astronomi: [],
    sanat: [],
    muzik: [],
    sinema: [],
    bilim: [],
    psikoloji: [],
    mitoloji: [],
  };

  LINES.forEach((line, index) => {
    buckets[line.roomId].push({
      id: `seed_${line.roomId}_${index}`,
      roomId: line.roomId,
      authorKind: 'member',
      memberId: line.memberId,
      text: line.text,
      createdAt: BASE + index * 7 * 60 * 1000,
    });
  });

  return buckets;
}
