const ROOM_REPLIES = [
  (room: string) => `${room} masasında bunu bir örnekle açar mısın?`,
  (room: string) => `Katıldığın yer ile duraksadığın yeri ayırırsan ${room} sohbeti netleşir.`,
  () => 'Başka bir odadan gelen biri bu cümleyi nasıl duyardı?',
  () => 'Tek bir ayrıntı seçelim: seni en çok hangi parça yakaladı?',
  () => 'Bu gece için kısa bir cümleyle toparlayalım.',
  () => 'Buna karşı bir itiraz da var mı, yoksa masa hemfikir mi?',
];

export function botReply(roomName: string, seed: number): string {
  const index = Math.abs(seed) % ROOM_REPLIES.length;
  const build = ROOM_REPLIES[index] ?? ROOM_REPLIES[0];
  return build(roomName);
}

export const DM_REPLIES = [
  'Bunu odada da açsak iyi olur. Hangi cümleden başlayalım?',
  'Not aldım. Benim tarafta benzer bir örnek var.',
  'Kısa tutayım: buna katılıyorum, ayrıntıyı sen seç.',
  'Bu geceki konuda bunun yeri var. Biraz daha somutlaştıralım.',
  'Bunu başkasının cümlesiyle yan yana koyunca ne değişiyor?',
];

export function dmReply(seed: number): string {
  return DM_REPLIES[Math.abs(seed) % DM_REPLIES.length] ?? DM_REPLIES[0];
}
