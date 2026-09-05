import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_IOS_BOTTOM_TRIM } from '../theme/tabBarGeometry';

// The tab bar floats as a capsule above the bottom edge (see app/(app)/(tabs)/_layout.tsx)
// instead of sitting flush against it, so `useBottomTabBarHeight()` alone — just the bar's
// own height — undercounts how much space a screen needs to clear above it. This adds back
// the bottom offset the bar is floated up by, which must match that layout's own `bottom`
// style exactly (including the iOS-only trim) or screens end up with the wrong clearance.
export function useFloatingTabBarClearance(): number {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const bottomOffset =
    Platform.OS === 'ios' ? Math.max(0, insets.bottom - TAB_BAR_IOS_BOTTOM_TRIM) : insets.bottom;
  return tabBarHeight + bottomOffset;
}
