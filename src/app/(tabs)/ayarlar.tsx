import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Pill, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { getRoom } from '@/data/rooms';
import { MOODS, genderLabel, labelOf } from '@/labels';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const gender = useAppStore((state) => state.gender);
  const room = getRoom(useAppStore((state) => state.roomId));
  const mood = useAppStore((state) => state.mood);
  const isPro = useAppStore((state) => state.isPro);
  const freeMessagesRemaining = useAppStore((state) => state.freeMessagesRemaining);
  const stableNick = useAppStore((state) => state.stableNick);
  const tempNick = useAppStore((state) => state.tempNick);
  const resetIdentity = useAppStore((state) => state.resetIdentity);
  const revokePro = useAppStore((state) => state.revokePro);

  const confirmReset = () => {
    Alert.alert(
      'Kimliği sıfırla',
      'Oda ve simge seçimin silinir. Sohbet geçmişi bu cihazda kalır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            resetIdentity();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <Screen bottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>Bu cihaz</Text>
        <Text style={styles.title}>Ayarlar</Text>

        <View style={styles.card}>
          <View style={styles.identity}>
            {gender ? <Avatar gender={gender} size={56} /> : null}
            <View style={styles.identityCopy}>
              <Text style={styles.cardTitle}>{isPro ? stableNick : tempNick}</Text>
              <Text style={styles.meta}>
                {gender ? genderLabel(gender) : 'Simge seçilmedi'}
                {room ? ` · ${room.name}` : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.line}>Odada görünen geçici ad: {tempNick || '—'}</Text>
          <Text style={styles.line}>Pro ile sabit ad: {stableNick || '—'}</Text>
          <Text style={styles.line}>Tempo: {mood ? labelOf(MOODS, mood) : 'Seçilmedi'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Üyelik</Text>
            <Pill label={isPro ? 'Pro' : 'Ücretsiz'} tone={isPro ? 'gold' : 'muted'} />
          </View>
          <Text style={styles.body}>
            Ücretsiz planda odadaki kişiler simge ve geçici numarayla görünür. Odaya 1–2 mesaj yazılır
            {isPro ? ' (Pro ile sınırsız).' : ` (${Math.max(0, freeMessagesRemaining)} kaldı).`} Doğrudan mesaj kapalıdır.
          </Text>
          <Text style={styles.body}>
            Pro, sabit takma adı, kısa tanıtımı ve doğrudan mesajı açar. Bu sürümde kilit yerel bir denemedir.
          </Text>
          {isPro ? (
            <SecondaryButton label="Pro’yu kapat" onPress={revokePro} />
          ) : (
            <PrimaryButton label="Pro’yu aç" onPress={() => router.push('/pro')} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bu uygulama</Text>
          <Text style={styles.body}>
            Bu Gece bir ilgi kulübüdür. Felsefe, tarih, edebiyat, astronomi, sanat, müzik, sinema, bilim, psikoloji ve mitoloji odaları konu içindir.
          </Text>
          <SecondaryButton label="Kimliği sıfırla" onPress={confirmReset} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.md,
    paddingBottom: 32,
  },
  kicker: {
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 10,
  },
  identity: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  line: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});
