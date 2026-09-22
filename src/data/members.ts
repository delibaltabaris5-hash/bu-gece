import type { Gender, Member, RoomId } from '@/types';

interface MemberSeed {
  id: string;
  roomId: RoomId;
  gender: Gender;
  stableNick: string;
  bio: string;
  city: string;
}

const SEEDS: MemberSeed[] = [
  ['fel-1', 'felsefe', 'kadin', 'SessizArguman', 'Akşam yürüyüşlerinde etik sorular biriktiririm.', 'İzmir'],
  ['fel-2', 'felsefe', 'erkek', 'YavasCikarim', 'Net cümle yerine itirazı severim.', 'Ankara'],
  ['fel-3', 'felsefe', 'kadin', 'EsikNotu', 'Stoacı metinleri kısa kısa okurum.', 'Bursa'],
  ['fel-4', 'felsefe', 'erkek', 'MasaKenari', 'Tartışmayı kişisel almadan sürdürmeye çalışırım.', 'Eskişehir'],
  ['fel-5', 'felsefe', 'kadin', 'GeceSorusu', 'İyi bir gecenin tanımını biriktiririm.', 'İstanbul'],
  ['tar-1', 'tarih', 'erkek', 'ArsivYuruyusu', 'Mahalle tarihini yürüyerek tararım.', 'İstanbul'],
  ['tar-2', 'tarih', 'kadin', 'TekerrurNotu', 'Tekrar ile unutkanlığı ayırmaya çalışırım.', 'İzmir'],
  ['tar-3', 'tarih', 'erkek', 'MektupKatmani', 'Eski mektupların temposunu severim.', 'Ankara'],
  ['tar-4', 'tarih', 'kadin', 'SessizCesme', 'Tabelanın arkasındaki hikâyeye bakarım.', 'Konya'],
  ['tar-5', 'tarih', 'erkek', 'SokakTabelasi', 'Yerel tarihi kısa notlara bölerim.', 'Trabzon'],
  ['ede-1', 'edebiyat', 'kadin', 'AralikKapi', 'Kısa cümleleri biriktiririm.', 'İzmir'],
  ['ede-2', 'edebiyat', 'erkek', 'YarimSayfa', 'Bitmeyen kitapları da ciddiye alırım.', 'Ankara'],
  ['ede-3', 'edebiyat', 'kadin', 'KisaMisra', 'Şiiri gecenin temposuna daha yakın bulurum.', 'Eskişehir'],
  ['ede-4', 'edebiyat', 'erkek', 'KenarNotu', 'Sayfa kenarına soru yazarım.', 'İstanbul'],
  ['ede-5', 'edebiyat', 'kadin', 'GeceParagrafi', 'Tek paragraflık metinler seçerim.', 'Antalya'],
  ['ast-1', 'astronomi', 'kadin', 'BalkonGozlemi', 'Balkon ışığını kapatıp bakarım.', 'Ankara'],
  ['ast-2', 'astronomi', 'erkek', 'YavasIsik', 'Işık yılı fikri sohbeti yavaşlatıyor, hoşuma gidiyor.', 'İzmir'],
  ['ast-3', 'astronomi', 'kadin', 'UcYildiz', 'Üç yıldız bir gözlem için yeter.', 'Bursa'],
  ['ast-4', 'astronomi', 'erkek', 'SehirAyi', 'Şehirde Ay’ı bulmayı da gözlem sayarım.', 'İstanbul'],
  ['ast-5', 'astronomi', 'kadin', 'TakimyildizNotu', 'Takımyıldız hikâyelerini kısa tutarım.', 'Antalya'],
  ['san-1', 'sanat', 'kadin', 'UcDakika', 'Eserin önünde süreyi sayarım.', 'İzmir'],
  ['san-2', 'sanat', 'erkek', 'GolgeHatti', 'Önce gölgeye, sonra çizgiye bakarım.', 'Ankara'],
  ['san-3', 'sanat', 'kadin', 'DuvarNotu', 'Sokak duvarını da müze duvarı kadar ciddiye alırım.', 'İstanbul'],
  ['san-4', 'sanat', 'erkek', 'TekCizgi', 'Tek çizgilik eskizler biriktiririm.', 'Eskişehir'],
  ['san-5', 'sanat', 'kadin', 'AtolyeSonrasi', 'Atölye çıkışında tek bir not alırım.', 'Bursa'],
  ['muz-1', 'muzik', 'erkek', 'SozsuzGece', 'Sözsüz parçaları odaya daha yakın bulurum.', 'İstanbul'],
  ['muz-2', 'muzik', 'kadin', 'NakarattanSonra', 'Sessizliğin nakarattan sonra gelmesini severim.', 'İzmir'],
  ['muz-3', 'muzik', 'erkek', 'CanliOda', 'Canlı sesin odayı nasıl topladığını dinlerim.', 'Ankara'],
  ['muz-4', 'muzik', 'kadin', 'InceRitim', 'İnce ritimleri tarif etmeye çalışırım.', 'Antalya'],
  ['muz-5', 'muzik', 'erkek', 'SessizOlcu', 'Sessizliği de bir ölçü sayarım.', 'Bursa'],
  ['sin-1', 'sinema', 'kadin', 'TekLamba', 'Karanlık sahneleri tek ışıkla hatırlarım.', 'İstanbul'],
  ['sin-2', 'sinema', 'erkek', 'SonBesDakika', 'Kapanış dakikalarını ayrıca not ederim.', 'Ankara'],
  ['sin-3', 'sinema', 'kadin', 'IlkKare', 'İlk kare odayı kurar, diye düşünürüm.', 'İzmir'],
  ['sin-4', 'sinema', 'erkek', 'KisikIsik', 'Kısık ışıkta daha iyi bakarım.', 'Eskişehir'],
  ['sin-5', 'sinema', 'kadin', 'KaranlikSahne', 'Tek bir repliği yanında taşırım.', 'Bursa'],
  ['bil-1', 'bilim', 'erkek', 'MutfakGozlemi', 'Mutfaktaki gözlemi de not ederim.', 'Ankara'],
  ['bil-2', 'bilim', 'kadin', 'DuzelenHarita', 'Yanlışlanan fikrin haritayı düzelttiğini severim.', 'İzmir'],
  ['bil-3', 'bilim', 'erkek', 'KucukGercek', 'Küçük gerçekleri biriktiririm.', 'İstanbul'],
  ['bil-4', 'bilim', 'kadin', 'SoruMasasi', 'Cevaptan önce soruyu masada tutarım.', 'Eskişehir'],
  ['bil-5', 'bilim', 'erkek', 'SakinDeney', 'Sade deneyleri uzun anlatılara tercih ederim.', 'Bursa'],
  ['psi-1', 'psikoloji', 'kadin', 'AgirTempo', 'Temponun adını koyunca yerine oturduğunu fark ederim.', 'İzmir'],
  ['psi-2', 'psikoloji', 'erkek', 'DinlemeRitmi', 'Cevap hazırlamadan dinlemeyi denerim.', 'Ankara'],
  ['psi-3', 'psikoloji', 'kadin', 'TekSoru', 'Masaya tek bir soru bırakmayı ritüel sayarım.', 'İstanbul'],
  ['psi-4', 'psikoloji', 'erkek', 'AliskanlikNotu', 'Alışkanlıkları suçlamadan tarif ederim.', 'Bursa'],
  ['psi-5', 'psikoloji', 'kadin', 'DikkatKenari', 'Dikkatin nerede olduğunu ara sıra kontrol ederim.', 'Eskişehir'],
  ['mit-1', 'mitoloji', 'erkek', 'LabirentGece', 'Çıkıştan çok dönüşlere bakarım.', 'Ankara'],
  ['mit-2', 'mitoloji', 'kadin', 'GolEfsanesi', 'Yerel göl anlatılarını kısa tutarım.', 'Trabzon'],
  ['mit-3', 'mitoloji', 'kadin', 'AyIsareti', 'Ay’ı hem yol hem örtü olarak okurum.', 'İzmir'],
  ['mit-4', 'mitoloji', 'erkek', 'YerelAnlati', 'Büyük destandan önce yerel efsaneye bakarım.', 'Konya'],
  ['mit-5', 'mitoloji', 'kadin', 'AtesVeNehir', 'Sembolleri bu gecenin sorusuna bağlarım.', 'Antalya'],
].map(([id, roomId, gender, stableNick, bio, city]) => ({
  id,
  roomId: roomId as RoomId,
  gender: gender as Gender,
  stableNick,
  bio,
  city,
}));

export const MEMBERS: Member[] = SEEDS;

const byId = new Map(MEMBERS.map((member) => [member.id, member]));

export function getMember(id: string | undefined): Member | undefined {
  if (!id) return undefined;
  return byId.get(id);
}

export function membersInRoom(roomId: RoomId): Member[] {
  return MEMBERS.filter((member) => member.roomId === roomId);
}
