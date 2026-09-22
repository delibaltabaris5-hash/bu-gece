import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Crescent } from '@/components/Crescent';
import { MessageBubble } from '@/components/MessageBubble';
import { getMember } from '@/data/members';
import { getRoom } from '@/data/rooms';
import { topicForDay } from '@/data/topics';
import { memberTempNick, tempNickInRoom } from '@/lib/identity';
import { useAppStore } from '@/store/useAppStore';
import { colors, night, radius, space } from '@/theme';
import type { ChatMessage, Gender } from '@/types';

export default function RoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const room = getRoom(params.id);
  const messages = useAppStore((state) => (room ? state.roomMessages[room.id] : undefined));
  const ensureDailyTopic = useAppStore((state) => state.ensureDailyTopic);
  const postRoomMessage = useAppStore((state) => state.postRoomMessage);
  const isPro = useAppStore((state) => state.isPro);
  const freeMessagesRemaining = useAppStore((state) => state.freeMessagesRemaining);
  const gender = useAppStore((state) => state.gender);
  const tempNick = useAppStore((state) => state.tempNick);
  const stableNick = useAppStore((state) => state.stableNick);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (room) ensureDailyTopic(room.id);
  }, [ensureDailyTopic, room]);

  const data = useMemo(() => [...(messages ?? [])].reverse(), [messages]);
  const topic = room ? topicForDay(room.id) : undefined;

  if (!room || !topic) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Oda bulunamadı.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.back}>Geri</Text>
        </Pressable>
      </View>
    );
  }

  const selfGender: Gender = gender ?? 'kadin';
  const selfName = isPro ? stableNick : tempNickInRoom(room.name, tempNick);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    if (item.authorKind === 'bot') {
      return (
        <MessageBubble
          bot
          glyph={room.mark}
          name={`${room.name} Bot`}
          text={item.text}
          createdAt={item.createdAt}
          mine={false}
        />
      );
    }
    if (item.authorKind === 'self') {
      return (
        <MessageBubble
          mine
          gender={selfGender}
          name={selfName || 'Sen'}
          text={item.text}
          createdAt={item.createdAt}
        />
      );
    }
    const member = getMember(item.memberId);
    if (!member) return null;
    const name = isPro ? member.stableNick : memberTempNick(room.name, member.id);
    return (
      <MessageBubble
        gender={member.gender}
        name={name}
        text={item.text}
        createdAt={item.createdAt}
        mine={false}
        onPressAuthor={() => router.push(`/uye/${member.id}`)}
      />
    );
  };

  const quotaBlocked = !isPro && freeMessagesRemaining <= 0;

  const send = () => {
    if (quotaBlocked) return;
    const sent = postRoomMessage(room.id, draft);
    if (sent) setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => router.back()}>
          <Text style={styles.back}>Geri</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{room.name}</Text>
            <Crescent size={18} cutoutColor={colors.bg} />
          </View>
          <Text style={styles.subtitle}>
            {room.name} Bot · {isPro ? 'Pro' : `Ücretsiz · ${Math.max(0, freeMessagesRemaining)} mesaj`}
          </Text>
        </View>
      </View>

      <View style={styles.pin}>
        <Text style={styles.pinKicker}>Bugünün konusu</Text>
        <Text style={styles.pinText}>{topic.question}</Text>
      </View>

      <FlatList
        inverted
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.composer}>
        <Text style={styles.hint}>
          {isPro
            ? 'Pro: sabit adlar açık. Odaya herkes yazabilir.'
            : quotaBlocked
              ? 'Ücretsiz mesaj hakkın doldu. Pro sınırsız yazar.'
              : `Ücretsiz: ${freeMessagesRemaining} mesaj kaldı. Simge ve geçici numara.`}
        </Text>
        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Odaya bir cümle bırak"
            placeholderTextColor={colors.faint}
            style={styles.input}
            maxLength={400}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            disabled={!draft.trim() || quotaBlocked}
            onPress={send}
            style={[styles.send, (!draft.trim() || quotaBlocked) && styles.sendOff]}
          >
            <Text style={styles.sendLabel}>Gönder</Text>
          </Pressable>
        </View>
      </View>
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
    gap: 12,
  },
  missingText: {
    color: colors.text,
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '700',
  },
  headerCopy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  pin: {
    marginHorizontal: space.lg,
    marginBottom: 8,
    backgroundColor: night.glass,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: night.glassLine,
    padding: 12,
    gap: 4,
  },
  pinKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  pinText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
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
    paddingHorizontal: space.lg,
    paddingTop: 8,
    gap: 8,
    backgroundColor: colors.elevated,
  },
  hint: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 16,
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
