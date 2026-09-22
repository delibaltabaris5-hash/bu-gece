import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, night, space } from '@/theme';

export function Screen({
  children,
  bottom = true,
  backgroundColor,
}: {
  children: ReactNode;
  bottom?: boolean;
  backgroundColor?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: bottom ? insets.bottom : 0,
          backgroundColor: backgroundColor ?? colors.bg,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmentBlock}>
      <Text style={styles.kicker}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Pill({ label, tone = 'gold' }: { label: string; tone?: 'gold' | 'muted' }) {
  return (
    <View style={[styles.pill, tone === 'muted' && styles.pillMuted]}>
      <Text style={[styles.pillLabel, tone === 'muted' && styles.pillLabelMuted]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  primary: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: night.fill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    elevation: 8,
    shadowColor: night.glow,
    shadowOpacity: 0.75,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: night.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
  },
  secondaryLabel: {
    color: night.text,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.45,
  },
  segmentBlock: {
    gap: space.xs,
  },
  kicker: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: {
    backgroundColor: night.segment,
    borderColor: night.ring,
  },
  chipLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  chipLabelOn: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pill: {
    borderRadius: 999,
    backgroundColor: 'rgba(30, 90, 152, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillMuted: {
    backgroundColor: colors.elevated,
  },
  pillLabel: {
    color: colors.goldSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  pillLabelMuted: {
    color: colors.muted,
  },
});
