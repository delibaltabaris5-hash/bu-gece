import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { listRegisteredUsers, type MemberAccount } from '@/lib/accountBook';
import { colors, night, radius, space } from '@/theme';

/** Reads users/{uid}. This is not the current session. */
export function RegisteredUsers() {
  const [rows, setRows] = useState<MemberAccount[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void listRegisteredUsers()
      .then((users) => {
        if (alive) setRows(users);
      })
      .catch(() => {
        if (alive) setError('Kayıtlı hesaplar okunamadı.');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Kayıtlı hesaplar</Text>
      {error ? <Text style={styles.meta}>{error}</Text> : null}
      {rows === null && !error ? <Text style={styles.meta}>Yükleniyor…</Text> : null}
      {rows && rows.length === 0 ? <Text style={styles.meta}>Henüz profil yok.</Text> : null}
      {rows?.map((user) => (
        <Text key={user.accountId} style={styles.line}>
          {user.displayName ? `${user.displayName} · ` : ''}
          {user.email || user.accountId}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 8,
  },
  title: {
    color: night.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: night.muted,
    fontSize: 14,
  },
  line: {
    color: night.text,
    fontSize: 15,
  },
});
