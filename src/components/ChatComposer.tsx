import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MESSAGE_MAX } from '@/lib/chats';
import { night, radius, space } from '@/theme';

type Props = {
  hint?: string;
  disabled?: boolean;
  onSend: (text: string) => Promise<boolean> | boolean;
};

export function ChatComposer({ hint, disabled, onSend }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const trimmed = draft.trim().slice(0, MESSAGE_MAX);
  const blocked = disabled || sending || !trimmed;

  const send = async () => {
    if (blocked) return;
    setSending(true);
    const text = trimmed;
    setDraft('');
    try {
      const ok = await onSend(text);
      if (!ok) setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.row}>
        <TextInput
          value={draft}
          onChangeText={(value) => setDraft(value.slice(0, MESSAGE_MAX))}
          placeholder="Mesaj yaz..."
          placeholderTextColor={night.muted}
          style={styles.input}
          multiline
          maxLength={MESSAGE_MAX}
          editable={!disabled && !sending}
          submitBehavior="submit"
          blurOnSubmit={false}
          onSubmitEditing={() => void send()}
          accessibilityLabel="Mesaj yaz"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          disabled={blocked}
          onPress={() => void send()}
          style={[styles.send, blocked && styles.sendOff]}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.sendLabel}>Gönder</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: night.glassLine,
    backgroundColor: 'rgba(8, 16, 28, 0.96)',
    paddingHorizontal: space.lg,
    paddingTop: 10,
    gap: 8,
  },
  hint: {
    color: night.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
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
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
  },
  send: {
    backgroundColor: night.fill,
    borderRadius: 999,
    minHeight: 44,
    minWidth: 76,
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
});
