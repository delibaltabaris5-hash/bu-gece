const STABLE_NICKS = [
  'GeceNotu',
  'SessizMasa',
  'LambalıSayfa',
  'KısaTur',
  'AçıkPencere',
  'SonDurak',
  'İnceAyraç',
  'YavaşTempo',
  'AraSokak',
  'KalemUcu',
  'EşikCümle',
  'SakinKenar',
];

export function pickStableNick(): string {
  const index = Math.floor(Math.random() * STABLE_NICKS.length);
  return STABLE_NICKS[index] ?? 'GeceNotu';
}

export function pickTempNumber(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function nickNumber(tempNick: string): string {
  const last = tempNick.split('_').pop() ?? '';
  return /^\d{4}$/.test(last) ? last : '1000';
}

export function tempNickInRoom(roomName: string, tempNick: string): string {
  return `${roomName}_${nickNumber(tempNick)}`;
}

export function memberTempNick(roomName: string, memberId: string): string {
  let hash = 0;
  for (let index = 0; index < memberId.length; index += 1) {
    hash = (hash * 33 + memberId.charCodeAt(index)) >>> 0;
  }
  return `${roomName}_${1000 + (hash % 9000)}`;
}
