import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatComposer } from '@/components/ChatComposer';
import { MessageBubble } from '@/components/MessageBubble';
import { getMember } from '@/data/members';
import { getRoom } from '@/data/rooms';
import { useAppStore } from '@/store/useAppStore';
import { colors, night, radius, space } from '@/theme';
import type { DirectMessage, Gender } from '@/types';

export default function DirectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const member = getMember(params.id);
  const isPro = useAppStore((state) => state.isPro);
  const accountId = useAppStore((state) => state.accountId);
  const hydrated = useAppStore((state) => state.hydrated);
  const gender = useAppStore((state) => state.gender);
  const stableNick = useAppStore((state) => state.stableNick);
  const thread = useAppStore((state) => (member ? state.directMessages[member.id] : undefined));
  const postDirectMessage = useAppStore((state) => state.postDirectMessage);

  const data = useMemo(() => [...(thread ?? [])].reverse(), [thread]);

  if (hydrated && !accountId) return <Redirect href="/giris" />;
  if (hydrated && !isPro) return <Redirect href="/pro" />;
  if (!member) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Kişi bulunamadı.</Text>
      </View>
    );
  }

  const room = getRoom(member.roomId);
  const selfGender: Gender = gender ?? 'kadin';

  const renderItem = ({ item }: { item: DirectMessage }) => {
    const mine = item.from === 'self';
    return (
      <MessageBubble
        mine={mine}
        bot={!mine}
        glyph={room?.mark ?? '✶'}
        gender={mine ? selfGender : member.gender}
        name={mine ? stableNick || 'Sen' : member.stableNick}
        text={item.text}
        createdAt={item.createdAt}
      />
    );
  };

  const send = (text: string) => postDirectMessage(member.id, text);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'android' ? undefined : 'padding'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => router.back()}>
          <Text style={styles.back}>Geri</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{member.stableNick}</Text>
          <Text style={styles.subtitle}>Doğrudan mesaj · {room?.name}</Text>
          <Text style={styles.subtitle}>Sohbetinize bot eşlik ediyor.</Text>
        </View>
      </View>
      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            İlk cümleyi konu üzerinden bırak. Bu kanal, odadaki bir kişiyle yazışma.
          </Text>
        </View>
      ) : (
        <FlatList
          inverted
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <ChatComposer onSend={send} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  missing: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    color: colors.text,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 16,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  empty: {
    flex: 1,
    padding: space.lg,
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingTop: 12,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.elevated,
    paddingHorizontal: space.lg,
    paddingTop: 10,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  send: {
    backgroundColor: night.fill,
    borderRadius: 999,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: {
    opacity: 0.4,
  },
  sendLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
});
