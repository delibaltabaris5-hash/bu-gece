import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/theme';

export default function NotFound() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Bu sayfa yok</Text>
      <Link href="/" style={styles.link}>
        Başlangıca dön
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.lg,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  link: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '700',
  },
});
