import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { SilhouetteBubble } from '@/components/ProfileBubble';
import { PrimaryButton } from '@/components/ui';
import { getMember, memberFacingName } from '@/data/members';
import { getRoom } from '@/data/rooms';
import { chatIdFor, newMessageId, subscribeChat, writeChatMessage, type ChatMessageDoc } from '@/lib/chats';
import { decodeRouteId } from '@/lib/liveDm';
import { cachedLivePerson, fetchLivePerson, normalizeAccountId, presenceFacingName, type LivePerson } from '@/lib/presence';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily, night, radius, space } from '@/theme';
import type { DirectMessage, Gender } from '@/types';

export default function SohbetThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = typeof params.id === 'string' ? params.id : undefined;
  const memberId = decodeRouteId(rawId);
  const seed = getMember(memberId);
  const isPro = useAppStore((state) => state.isPro);
  const accountId = useAppStore((state) => state.accountId);
  const gender = useAppStore((state) => state.gender);
  const stableNick = useAppStore((state) => state.stableNick);
  const tempNick = useAppStore((state) => state.tempNick);
  const remaining = useAppStore((state) => state.freeMessagesRemaining);
  const thread = useAppStore((state) => (memberId ? state.directMessages[memberId] : undefined));
  const postDirectMessage = useAppStore((state) => state.postDirectMessage);
  const spendMessageCredit = useAppStore((state) => state.spendMessageCredit);
  const [live, setLive] = useState<LivePerson | null>(null);
  const [resolvedFor, setResolvedFor] = useState<string | undefined>(seed ? memberId : undefined);
  const [liveMessages, setLiveMessages] = useState<ChatMessageDoc[]>([]);
  const [failed, setFailed] = useState<ChatMessageDoc[]>([]);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    if (!memberId || seed) {
      setLive(null);
      setResolvedFor(memberId);
      return;
    }
    const cached = cachedLivePerson(memberId);
    if (cached) {
      setLive(cached);
      setResolvedFor(memberId);
      return;
    }
    let cancel = false;
    void fetchLivePerson(memberId).then((person) => {
      if (cancel) return;
      setLive(person);
      setResolvedFor(memberId);
    });
    return () => {
      cancel = true;
    };
  }, [memberId, seed]);

  const signedIn = Boolean(accountId);
  const quotaBlocked = signedIn && !isPro && remaining <= 0;
  const room = seed ? getRoom(seed.roomId) : undefined;
  const matchedLive =
    live && memberId && normalizeAccountId(live.accountId) === normalizeAccountId(memberId) ? live : null;
  const peerUid = matchedLive?.uid || matchedLive?.accountId || '';
  const liveThreadId = matchedLive && accountId ? chatIdFor(accountId, peerUid) : null;

  useEffect(() => {
    if (!liveThreadId) {
      setLiveMessages([]);
      return;
    }
    return subscribeChat(liveThreadId, setLiveMessages, () => setSendError('Sohbet şu an okunamadı.'));
  }, [liveThreadId]);

  const data = useMemo(() => {
    if (!matchedLive || !accountId) return [...(thread ?? [])].reverse();
    const selfId = accountId.trim();
    const remote = liveMessages.map((message) => ({
      id: message.id,
      memberId: matchedLive.accountId,
      from: message.senderType === 'bot' ? ('bot' as const) : message.senderId === selfId ? ('self' as const) : ('member' as const),
      text: message.text,
      createdAt: message.createdAt || Date.now(),
      status: message.status,
    }));
    const pending = failed.filter((message) => !liveMessages.some((item) => item.id === message.id));
    return [...remote, ...pending.map((message) => ({
      id: message.id,
      memberId: matchedLive.accountId,
      from: 'self' as const,
      text: message.text,
      createdAt: message.createdAt,
      status: 'failed' as const,
    }))].reverse();
  }, [accountId, failed, liveMessages, matchedLive, thread]);
  const face = seed
    ? {
        id: seed.id,
        gender: seed.gender,
        label: memberFacingName(seed, isPro),
        subtitle: isPro
          ? `${room?.name ?? 'Sohbet'} · ${seed.bio}`
          : 'Ücretsiz · simge ve geçici numara',
      }
    : matchedLive
      ? {
          id: matchedLive.accountId,
          gender: matchedLive.gender,
          label: presenceFacingName(matchedLive.displayNick, isPro),
          subtitle: isPro ? 'Çevrimiçi' : 'Ücretsiz · simge ve geçici numara',
        }
      : null;

  if (!face) {
    return (
      <View style={styles.missing}>
        {resolvedFor !== memberId ? (
          <ActivityIndicator color={night.glowBright} />
        ) : (
          <Text style={styles.missingText}>Kişi bulunamadı.</Text>
        )}
      </View>
    );
  }

  const selfGender: Gender = gender ?? 'kadin';
  const selfName = isPro ? stableNick || 'Sen' : tempNick || 'Sen';

  const renderItem = ({ item }: { item: DirectMessage & { status?: 'sending' | 'sent' | 'failed' } }) => {
    const mine = item.from === 'self';
    const autoBot = item.from === 'bot' || (Boolean(seed) && !mine);
    return (
      <MessageBubble
        mine={mine}
        bot={autoBot}
        glyph={room?.mark ?? '✶'}
        gender={mine ? selfGender : face.gender}
        name={mine ? selfName : autoBot ? face.label : face.label}
        text={item.text}
        createdAt={item.createdAt}
        status={item.status}
        onRetry={
          item.status === 'failed' && liveThreadId && accountId && peerUid
            ? () => {
                void writeChatMessage({
                  chatId: liveThreadId,
                  messageId: newMessageId(),
                  senderId: accountId,
                  senderType: 'user',
                  text: item.text,
                  members: [accountId, peerUid],
                }).then((ok) => {
                  if (ok) setFailed((current) => current.filter((failedItem) => failedItem.id !== item.id));
                });
              }
            : undefined
        }
      />
    );
  };

  const send = async (text: string) => {
    if (!signedIn) {
      router.push('/giris');
      return false;
    }
    if (quotaBlocked) return false;
    if (matchedLive && accountId && liveThreadId && peerUid) {
      setSendError('');
      const messageId = newMessageId();
      const ok = await writeChatMessage({
        chatId: liveThreadId,
        messageId,
        senderId: accountId,
        senderType: 'user',
        text,
        members: [accountId, peerUid],
      });
      if (!ok) {
        setFailed((current) => [
          ...current,
          {
            id: messageId,
            chatId: liveThreadId,
            senderId: accountId,
            senderType: 'user',
            text,
            createdAt: Date.now(),
            type: 'text',
            status: 'failed',
          },
        ]);
        setSendError('Mesaj iletilemedi.');
        return false;
      }
      spendMessageCredit();
      return true;
    }
    return postDirectMessage(face.id, text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'android' ? undefined : 'padding'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Geri" onPress={() => router.back()}>
          <Text style={styles.back}>Geri</Text>
        </Pressable>
        <SilhouetteBubble diameter={42} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{face.label}</Text>
          <Text style={styles.subtitle}>{face.subtitle}</Text>
          {seed ? <Text style={styles.subtitle}>Sohbetinize bot eşlik ediyor.</Text> : null}
        </View>
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {isPro
              ? 'İlk cümleyi sen bırak. Konum paylaşılmaz.'
              : !signedIn
                ? 'Yazmak için üye girişi gerekir.'
                : `Ücretsiz: ${Math.max(0, remaining)} mesaj kaldı. Simge ve geçici numara.`}
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

      {!signedIn ? (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.paywall}>
            <Text style={styles.payTitle}>Üye girişi</Text>
            <Text style={styles.payBody}>Misafir gezinebilir. Mesaj hakkı hesaba bağlıdır.</Text>
            <PrimaryButton label="Giriş yap" onPress={() => router.push('/giris')} />
          </View>
        </View>
      ) : quotaBlocked ? (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.paywall}>
            <Text style={styles.payTitle}>Ücretsiz mesaj hakkın doldu</Text>
            <Text style={styles.payBody}>Pro sınırsız yazar ve sabit adı açar.</Text>
            <PrimaryButton label="Pro’yu aç" onPress={() => router.push('/pro')} />
          </View>
        </View>
      ) : (
        <ChatComposer
          hint={
            sendError
              ? sendError
              : isPro
                ? 'Pro: sabit ad açık. Sınırsız mesaj.'
                : `Ücretsiz: ${remaining} mesaj kaldı. Oda ve sohbet aynı hakkı kullanır.`
          }
          onSend={send}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: night.bg,
  },
  missing: {
    flex: 1,
    backgroundColor: night.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    color: night.text,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  back: {
    color: night.glowBright,
    fontSize: 16,
    fontWeight: '700',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '600',
  },
  subtitle: {
    color: night.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  empty: {
    flex: 1,
    padding: space.lg,
    justifyContent: 'center',
  },
  emptyText: {
    color: night.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
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
    borderTopColor: night.glassLine,
    backgroundColor: 'rgba(8, 16, 28, 0.94)',
    paddingHorizontal: space.lg,
    paddingTop: 10,
    gap: 8,
  },
  hint: {
    color: night.muted,
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
    color: night.text,
    backgroundColor: '#101C2A',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: night.glassLine,
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  paywall: {
    gap: 8,
    paddingVertical: 4,
  },
  payTitle: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 20,
  },
  payBody: {
    color: night.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
