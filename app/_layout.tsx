import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '../src/shared/api/queryClient';
import { SessionProvider, useSession } from '../src/shared/auth/SessionProvider';
import '../src/shared/i18n';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );
}
