import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsButton } from '../../src/features/settings/components/SettingsButton';
import { useTheme } from '../../src/shared/theme/ThemeProvider';

export default function AppLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
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
          headerRight: () => <SettingsButton />,
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
      <Stack.Screen
        name="program-generate"
        options={{
          headerShown: true,
          title: t('programs.generateTitle'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
      <Stack.Screen
        name="program/[id]"
        options={{
          headerShown: true,
          title: t('programs.detailTitle'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
      <Stack.Screen
        name="program-edit/[id]"
        options={{
          headerShown: true,
          title: t('programs.editTitle'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
      <Stack.Screen
        name="journal/[id]"
        options={{
          headerShown: true,
          title: t('journal.title'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
      <Stack.Screen
        name="journal-entry/[journalId]"
        options={{
          headerShown: true,
          title: t('journal.newEntryTitle'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
      <Stack.Screen
        name="exercise-progress/[exerciseId]"
        options={{
          headerShown: true,
          title: t('progress.title'),
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
        }}
      />
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
