import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../src/shared/theme/ThemeProvider';

export default function AppLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          title: t('profile.title'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
      <Stack.Screen
        name="program-create"
        options={{
          headerShown: true,
          title: t('programs.createTitle'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
      <Stack.Screen name="workout-session" options={{ headerShown: false }} />
      <Stack.Screen name="workout-complete" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: t('settings.title'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
    </Stack>
  );
}
