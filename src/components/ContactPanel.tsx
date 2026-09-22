import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  answerSupportQuestion,
  SUPPORT_EMAIL,
  SUPPORT_FAQ,
  SUPPORT_GREETING,
} from '@/data/supportFaq';
import { colors, night, radius, space } from '@/theme';

type Turn = { id: string; role: 'bot' | 'user'; text: string };

let turnSeq = 0;

function nextId(): string {
  turnSeq += 1;
  return `t${turnSeq}`;
}

export function ContactPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [turns, setTurns] = useState<Turn[]>([{ id: 'greet', role: 'bot', text: SUPPORT_GREETING }]);
  const [draft, setDraft] = useState('');
  const [emailVisible, setEmailVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTurns([{ id: 'greet', role: 'bot', text: SUPPORT_GREETING }]);
    setDraft('');
    setEmailVisible(false);
  }, [visible]);

  const ask = (question: string, answer: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setTurns((current) => [
      ...current,
      { id: nextId(), role: 'user', text: trimmed },
      { id: nextId(), role: 'bot', text: answer },
    ]);
    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const sendDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    ask(trimmed, answerSupportQuestion(trimmed));
  };

  const openMail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.backdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} style={StyleSheet.absoluteFill} />
          <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>Ayarlar</Text>
                <Text style={styles.title}>İletişim</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
                <Text style={styles.close}>Kapat</Text>
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.thread}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
            >
              {turns.map((turn) => (
                <View
                  key={turn.id}
                  style={[styles.bubble, turn.role === 'user' ? styles.userBubble : styles.botBubble]}
                >
                  <Text style={styles.bubbleText}>{turn.text}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chips}>
              {SUPPORT_FAQ.map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  onPress={() => ask(entry.label, entry.answer)}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                >
                  <Text style={styles.chipLabel}>{entry.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Sorunu yaz"
                placeholderTextColor={colors.faint}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={sendDraft}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gönder"
                onPress={sendDraft}
                style={({ pressed }) => [styles.send, pressed && styles.pressed]}
              >
                <Text style={styles.sendLabel}>Gönder</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setEmailVisible(true)}
              style={({ pressed }) => [styles.write, pressed && styles.pressed]}
            >
              <Text style={styles.writeLabel}>Bana yaz</Text>
            </Pressable>
            {emailVisible ? (
              <Pressable accessibilityRole="link" onPress={openMail}>
                <Text style={styles.email}>{SUPPORT_EMAIL}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 7, 12, 0.72)',
    paddingHorizontal: 16,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
    maxHeight: '78%',
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: night.glassLine,
    padding: space.md,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: night.glowBright,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    color: night.text,
    fontSize: 22,
    fontWeight: '700',
  },
  close: {
    color: night.glowBright,
    fontSize: 15,
    fontWeight: '700',
  },
  thread: {
    maxHeight: 220,
  },
  threadContent: {
    gap: 8,
    paddingVertical: 2,
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(8, 18, 34, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.35)',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: night.segment,
  },
  bubbleText: {
    color: night.text,
    fontSize: 14,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.4)',
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipLabel: {
    color: '#D7E6F4',
    fontSize: 12,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    color: night.text,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  send: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: night.fill,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  write: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: night.glassLine,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
  },
  writeLabel: {
    color: night.glowBright,
    fontSize: 14,
    fontWeight: '700',
  },
  email: {
    color: night.glowBright,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.86,
  },
});
