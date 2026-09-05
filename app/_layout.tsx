import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '../src/shared/api/queryClient';
import { SessionProvider, useSession } from '../src/shared/auth/SessionProvider';
import { useAppReady } from '../src/shared/hooks/useAppReady';
import '../src/shared/i18n';
import { ThemeProvider, useTheme } from '../src/shared/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Providers mount immediately — session restore (SessionProvider's onAuthStateChange
  // subscription) starts right away instead of waiting behind font loading.
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  const { colors, resolvedScheme, isHydrated } = useTheme();
  const appReady = useAppReady(isLoading, isHydrated);
  // Follows the resolved theme (which can be a user override, not just the OS setting) rather
  // than expo-status-bar's "auto", which only tracks the system appearance and would show the
  // wrong-contrast status bar icons whenever the user picks a mode that disagrees with it.
  const statusBarStyle = resolvedScheme === 'dark' ? 'light' : 'dark';

  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} />
        <StatusBar style={statusBarStyle} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={statusBarStyle} />
    </>
  );
}
