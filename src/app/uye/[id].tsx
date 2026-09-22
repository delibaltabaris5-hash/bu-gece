import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { PrimaryButton, SecondaryButton } from '@/components/ui';
import { getMember } from '@/data/members';
import { getRoom } from '@/data/rooms';
import { memberTempNick } from '@/lib/identity';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme';

export default function MemberScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const member = getMember(params.id);
  const isPro = useAppStore((state) => state.isPro);
  const room = getRoom(member?.roomId);

  if (!member || !room) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Kişi bulunamadı</Text>
        <SecondaryButton label="Geri" onPress={() => router.back()} />
      </View>
    );
  }

  const tempNick = memberTempNick(room.name, member.id);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => router.back()}>
        <Text style={styles.back}>Geri</Text>
      </Pressable>
      <View style={styles.card}>
        <Avatar gender={member.gender} size={84} />
        <Text style={styles.kicker}>{room.name}</Text>
        <Text style={styles.title}>{isPro ? member.stableNick : tempNick}</Text>
        {isPro ? (
          <>
            <Text style={styles.body}>{member.bio}</Text>
            <Text style={styles.meta}>Şehir notu: {member.city}</Text>
            <Text style={styles.meta}>Geçici numara: {tempNick}</Text>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Ücretsiz planda bu kişiyi yalnızca simge ve geçici numarayla görürsün.
            </Text>
            <View style={styles.locked}>
              <Text style={styles.lockedTitle}>Pro ile açılır</Text>
              <Text style={styles.meta}>Sabit takma ad</Text>
              <Text style={styles.meta}>Kısa tanıtım</Text>
              <Text style={styles.meta}>Doğrudan mesaj</Text>
            </View>
          </>
        )}
      </View>
      {isPro ? (
        <PrimaryButton label="Doğrudan mesaj" onPress={() => router.push(`/dm/${member.id}`)} />
      ) : (
        <PrimaryButton label="Pro ile mesajı aç" onPress={() => router.push('/pro')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  back: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 8,
    alignItems: 'flex-start',
  },
  kicker: {
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  locked: {
    alignSelf: 'stretch',
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  lockedTitle: {
    color: colors.goldSoft,
    fontWeight: '700',
    marginBottom: 4,
  },
});
