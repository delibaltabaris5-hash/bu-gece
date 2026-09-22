import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, BotMark } from '@/components/Avatar';
import { formatClock } from '@/lib/format';
import { colors, radius } from '@/theme';
import type { Gender } from '@/types';

interface MessageBubbleProps {
  name: string;
  text: string;
  createdAt: number;
  mine: boolean;
  bot?: boolean;
  glyph?: string;
  gender?: Gender;
  onPressAuthor?: () => void;
}

export function MessageBubble({
  name,
  text,
  createdAt,
  mine,
  bot = false,
  glyph = '✶',
  gender = 'kadin',
  onPressAuthor,
}: MessageBubbleProps) {
  const author = (
    <View style={styles.authorRow}>
      {bot ? <BotMark glyph={glyph} size={28} /> : <Avatar gender={gender} size={28} />}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );

  return (
    <View style={[styles.wrap, mine && styles.wrapMine]}>
      {onPressAuthor ? (
        <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPressAuthor}>
          {author}
        </Pressable>
      ) : (
        author
      )}
      <View style={[styles.bubble, mine && styles.bubbleMine, bot && styles.bubbleBot]}>
        <Text style={styles.text}>{text}</Text>
        <Text style={styles.time}>{formatClock(createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 14,
  },
  wrapMine: {
    alignItems: 'flex-end',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '86%',
  },
  name: {
    color: colors.muted,
    fontSize: 13,
    flexShrink: 1,
  },
  bubble: {
    maxWidth: '86%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  bubbleMine: {
    backgroundColor: '#243246',
  },
  bubbleBot: {
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  text: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  time: {
    color: colors.faint,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
});
