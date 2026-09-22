import 'react-native-gesture-handler';

import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform, StatusBar as NativeStatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AtmosphereControl } from '@/components/AtmosphereControl';
import { AtmosphereHost } from '@/hooks/useAtmosphere';
import { useAppStore } from '@/store/useAppStore';
import { colors, night } from '@/theme';

function AtmosphereChrome() {
  const segments = useSegments();
  if (segments[0] === '(tabs)') return null;
  return <AtmosphereControl />;
}

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(night.bg).catch(() => undefined);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      useAppStore.setState({ hydrated: true });
    };
    const unsubscribe = useAppStore.persist.onFinishHydration(finish);
    if (useAppStore.persist.hasHydrated()) finish();
    const timer = setTimeout(finish, 2500);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {Platform.OS === 'android' ? (
        <NativeStatusBar barStyle="light-content" backgroundColor={night.bg} translucent />
      ) : null}
      <View style={{ flex: 1, backgroundColor: night.bg, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: night.bg }}>
          <AtmosphereHost />
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="oda/[id]" />
              <Stack.Screen name="uye/[id]" />
              <Stack.Screen name="dm/[id]" />
              <Stack.Screen name="sohbet/[id]" />
              <Stack.Screen
                name="pro"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>
          </View>
          <AtmosphereChrome />
        </View>
      </View>
    </SafeAreaProvider>
  );
}
