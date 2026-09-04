import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { NewProgramButton } from '../../../src/features/programs/components/NewProgramButton';
import { ProfileAvatarButton } from '../../../src/features/profile/components/ProfileAvatarButton';
import {
  CoachIcon,
  HistoryIcon,
  ProgramsIcon,
  TodayIcon,
  type TabIconProps,
} from '../../../src/shared/components/icons/TabIcons';
import { colors, shadows } from '../../../src/shared/theme/theme';

const TABS: {
  name: string;
  titleKey: string;
  Icon: (props: TabIconProps) => ReactNode;
  headerRight?: () => ReactNode;
}[] = [
  { name: 'index', titleKey: 'today.title', Icon: TodayIcon },
  {
    name: 'programs',
    titleKey: 'programs.title',
    Icon: ProgramsIcon,
    headerRight: () => (
      <View style={styles.headerRight}>
        <NewProgramButton />
        <ProfileAvatarButton />
      </View>
    ),
  },
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
        // Floating + transparent so tabBarBackground's blur shows content scrolling underneath,
        // like iOS's native translucent tab bar. Screens with content pinned to the bottom edge
        // (e.g. CoachScreen's composer) or a scrollable list (ProgramsScreen) add their own
        // bottom offset via useBottomTabBarHeight() to avoid sitting behind it.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          ...shadows.tabBar,
        },
        tabBarBackground: () => (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        ),
      }}
    >
      {TABS.map(({ name, titleKey, Icon, headerRight }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(titleKey),
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
            ...(headerRight ? { headerRight } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
