import type { Room, RoomId } from '@/types';

export const ROOMS: Room[] = [
  {
    id: 'felsefe',
    name: 'Felsefe',
    mark: 'Λ',
    blurb: 'Etik, özgürlük ve iyi bir gecenin tanımı.',
  },
  {
    id: 'tarih',
    name: 'Tarih',
    mark: '▣',
    blurb: 'Sokak, arşiv ve unutulan katmanlar.',
  },
  {
    id: 'edebiyat',
    name: 'Edebiyat',
    mark: '¶',
    blurb: 'Cümle, yarım kitap ve gecenin kelimesi.',
  },
  {
    id: 'astronomi',
    name: 'Astronomi',
    mark: '✶',
    blurb: 'Şehir ışığında bile gökyüzüne bakmak.',
  },
  {
    id: 'sanat',
    name: 'Sanat',
    mark: '△',
    blurb: 'Üç dakika bakış, çizgi ve gölge.',
  },
  {
    id: 'muzik',
    name: 'Müzik',
    mark: '♪',
    blurb: 'Ritim, sessizlik ve bu gecenin parçası.',
  },
  {
    id: 'sinema',
    name: 'Sinema',
    mark: '▶',
    blurb: 'Tek kare, tek replik, kısık ışık.',
  },
  {
    id: 'bilim',
    name: 'Bilim',
    mark: '◎',
    blurb: 'Küçük gözlemler ve düzeltilebilir fikirler.',
  },
  {
    id: 'psikoloji',
    name: 'Psikoloji',
    mark: '◌',
    blurb: 'Tempo, dikkat ve alışkanlık üzerine sohbet. Klinik destek değildir.',
  },
  {
    id: 'mitoloji',
    name: 'Mitoloji',
    mark: '☼',
    blurb: 'Sembol, yerel anlatı ve gecenin miti.',
  },
];

const byId = new Map(ROOMS.map((room) => [room.id, room]));

export function isRoomId(value: string): value is RoomId {
  return byId.has(value as RoomId);
}

export function getRoom(id: string | null | undefined): Room | undefined {
  if (!id) return undefined;
  return byId.get(id as RoomId);
}
