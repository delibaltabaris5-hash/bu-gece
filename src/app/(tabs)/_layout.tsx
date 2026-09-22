import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Text, View, type ColorValue } from 'react-native';

import { AtmosphereControl } from '@/components/AtmosphereControl';
import { useAppStore } from '@/store/useAppStore';
import { colors, night } from '@/theme';

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 16 }}>{glyph}</Text>;
}

export default function TabLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const onboarded = useAppStore((state) => state.onboarded);

  if (hydrated && !onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenLayout={({ children }) => (
        <View style={{ flex: 1, backgroundColor: night.bg }}>
          <View style={{ flex: 1 }}>{children}</View>
          <AtmosphereControl includeSafeArea={false} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: night.bg,
          borderTopColor: 'rgba(120, 180, 230, 0.28)',
        },
        tabBarActiveTintColor: night.glowBright,
        tabBarInactiveTintColor: colors.faint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bu Gece',
          tabBarIcon: ({ color }) => <TabGlyph glyph="✶" color={color} />,
        }}
      />
      <Tabs.Screen
        name="odalar"
        options={{
          title: 'Odalar',
          tabBarIcon: ({ color }) => <TabGlyph glyph="▣" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ayarlar"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <TabGlyph glyph="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}
