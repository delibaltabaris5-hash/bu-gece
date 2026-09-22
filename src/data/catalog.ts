import { MEMBERS, membersInRoom } from '@/data/members';
import { PLANS } from '@/data/plans';
import { ROOMS } from '@/data/rooms';
import { topicsFor } from '@/data/topics';

export function assertCatalog(): void {
  if (ROOMS.length !== 10) {
    throw new Error(`Expected 10 rooms, found ${ROOMS.length}`);
  }
  for (const room of ROOMS) {
    const topics = topicsFor(room.id);
    const members = membersInRoom(room.id);
    if (topics.length < 5 || topics.length > 7) {
      throw new Error(`${room.id} has ${topics.length} topics`);
    }
    if (members.length < 4 || members.length > 6) {
      throw new Error(`${room.id} has ${members.length} members`);
    }
  }
  if (MEMBERS.length !== 50) {
    throw new Error(`Expected 50 members, found ${MEMBERS.length}`);
  }
  if (PLANS.length < 10) {
    throw new Error('Plans missing');
  }
}
