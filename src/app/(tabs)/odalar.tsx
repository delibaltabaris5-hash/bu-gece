import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { membersInRoom } from '@/data/members';
import { ROOMS } from '@/data/rooms';
import { topicForDay } from '@/data/topics';
import { useAppStore } from '@/store/useAppStore';
import { colors, fontFamily, night, radius, space } from '@/theme';
import { Screen } from '@/components/ui';

export default function RoomsScreen() {
  const router = useRouter();
  const homeRoomId = useAppStore((state) => state.roomId);

  return (
    <Screen bottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>On oda</Text>
        <Text style={styles.title}>Odalar</Text>
        <Text style={styles.lead}>
          Her odanın bir moderatörü ve bugünün konusu var. Ücretsiz planda herkes simge ve geçici numarayla durur.
        </Text>
        {ROOMS.map((room) => {
          const topic = topicForDay(room.id);
          const count = membersInRoom(room.id).length;
          const home = room.id === homeRoomId;
          return (
            <Pressable
              key={room.id}
              accessibilityRole="button"
              onPress={() => router.push(`/oda/${room.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.row}>
                <Text style={styles.mark}>{room.mark}</Text>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name}>{room.name}</Text>
                    {home ? <Text style={styles.home}>Senin odan</Text> : null}
                  </View>
                  <Text style={styles.blurb}>{room.blurb}</Text>
                  <Text style={styles.topic} numberOfLines={2}>
                    Bugün: {topic.question}
                  </Text>
                  <Text style={styles.meta}>{count} örnek kişi · {room.name} Bot</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: 12,
    paddingBottom: 28,
  },
  kicker: {
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    color: night.text,
    fontSize: 34,
    fontWeight: '600',
    fontFamily: fontFamily.serif,
  },
  lead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  pressed: {
    opacity: 0.86,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  mark: {
    color: colors.gold,
    fontSize: 22,
    width: 28,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  home: {
    color: colors.goldSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  blurb: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  topic: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.faint,
    fontSize: 12,
  },
});
