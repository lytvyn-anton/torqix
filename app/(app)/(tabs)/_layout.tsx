import { Tabs } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ProfileAvatarButton } from '../../../src/features/profile/components/ProfileAvatarButton';
import {
  CoachIcon,
  HistoryIcon,
  ProgramsIcon,
  TodayIcon,
  type TabIconProps,
} from '../../../src/shared/components/icons/TabIcons';
import { colors } from '../../../src/shared/theme/theme';

const TABS: { name: string; titleKey: string; Icon: (props: TabIconProps) => ReactNode }[] = [
  { name: 'index', titleKey: 'today.title', Icon: TodayIcon },
  { name: 'programs', titleKey: 'programs.title', Icon: ProgramsIcon },
  { name: 'history', titleKey: 'history.title', Icon: HistoryIcon },
  { name: 'coach', titleKey: 'coach.title', Icon: CoachIcon },
];

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <ProfileAvatarButton />,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      {TABS.map(({ name, titleKey, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(titleKey),
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
