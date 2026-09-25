import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { RegisteredUsers } from '@/components/RegisteredUsers';
import { ContactPanel } from '@/components/ContactPanel';
import { Pill, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { getRoom } from '@/data/rooms';
import { writeSessionAccountId } from '@/lib/accountBook';
import { MATCH_MOODS, matchMoodLabel, type MatchMood } from '@/lib/matchMoods';
import { leaveMatchQueue, saveMatchMood } from '@/lib/matching';
import { MOODS, genderLabel, labelOf } from '@/labels';
import { useAppStore } from '@/store/useAppStore';
import { colors, fontFamily, night, radius, space } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const gender = useAppStore((state) => state.gender);
  const room = getRoom(useAppStore((state) => state.roomId));
  const mood = useAppStore((state) => state.mood);
  const isPro = useAppStore((state) => state.isPro);
  const accountId = useAppStore((state) => state.accountId);
  const accountEmail = useAppStore((state) => state.accountEmail);
  const accountName = useAppStore((state) => state.accountName);
  const signOut = useAppStore((state) => state.signOut);
  const freeMessagesRemaining = useAppStore((state) => state.freeMessagesRemaining);
  const stableNick = useAppStore((state) => state.stableNick);
  const tempNick = useAppStore((state) => state.tempNick);
  const resetIdentity = useAppStore((state) => state.resetIdentity);
  const revokePro = useAppStore((state) => state.revokePro);
  const [contactOpen, setContactOpen] = useState(false);

  const confirmReset = () => {
    Alert.alert(
      'Oda ve simgeyi sıfırla',
      'Bu üye hesabını silmez ve çıkış yapmaz. Yalnızca oda ve simge seçimin silinir. Sohbet geçmişi bu cihazda kalır.',
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

  const confirmSignOut = () => {
    Alert.alert(
      'Çıkış yap',
      'Oturum kapanır. Oda, simge ve sohbetlerin bu cihazda kalır. Hesabın silinmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkış yap',
          style: 'destructive',
          onPress: () => {
            void writeSessionAccountId(null);
            signOut();
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
          <Text style={styles.line}>Eşleşme ruh hali</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MATCH_MOODS.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => {
                  if (!accountId) return;
                  void leaveMatchQueue(accountId).then(() => saveMatchMood(accountId, option.value as MatchMood));
                }}
              >
                <Text style={styles.meta}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.meta}>{accountId ? 'Seçince havuzdaki eski ruh hali silinir.' : matchMoodLabel(null)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Üyelik</Text>
            <Pill label={isPro ? 'Pro' : 'Ücretsiz'} tone={isPro ? 'gold' : 'muted'} />
          </View>
          <Text style={styles.body}>
            Ücretsiz planda kişiler simge ve geçici numarayla görünür. Oda ve Sohbetler aynı 10 mesajı paylaşır. Mesaj hakkı üye hesabına bağlıdır.
            {isPro
              ? ' (Pro ile sınırsız).'
              : accountId
                ? ` (${Math.max(0, freeMessagesRemaining)} kaldı).`
                : ' Yazmak için giriş gerekir.'}
          </Text>
          <Text style={styles.body}>
            Pro, sabit takma adı, kısa tanıtımı ve sınırsız mesajı açar. Bu sürümde kilit yerel bir denemedir.
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
        </View>

        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accountId ? 'Hesabım' : 'Giriş yap'}
            onPress={() => router.push('/giris')}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.identityCopy}>
              <Text style={styles.contactLabel}>{accountId ? 'Hesabım' : 'Giriş yap'}</Text>
              <Text style={styles.meta}>
                {accountId ? accountName || accountEmail || accountId : 'Üye girişi veya kayıt'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          {accountId ? <RegisteredUsers /> : null}
          {accountId ? (
            <>
              <View style={styles.divider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Çıkış yap"
                onPress={confirmSignOut}
                style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
              >
                <Text style={styles.contactLabel}>Çıkış yap</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Oda ve simgeyi sıfırla"
            onPress={confirmReset}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <Text style={styles.resetLabel}>Oda ve simgeyi sıfırla</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="İletişim"
          onPress={() => setContactOpen(true)}
          style={({ pressed }) => [styles.contact, pressed && styles.pressed]}
        >
          <Text style={styles.contactLabel}>İletişim</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>
      <ContactPanel visible={contactOpen} onClose={() => setContactOpen(false)} />
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
    color: night.text,
    fontSize: 34,
    fontWeight: '600',
    fontFamily: fontFamily.serif,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  resetLabel: {
    color: '#E7A0A8',
    fontSize: 16,
    fontWeight: '700',
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
  },
  contactLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  chevron: {
    color: night.glowBright,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.86,
  },
});
