import { BlurView } from 'expo-blur';
import { Tabs, type BottomTabBarButtonProps } from 'expo-router/js-tabs';
// Not a public entrypoint, but the only place this component lives — expo-router's default
// tab button (`renderButtonDefault` in its bundled BottomTabItem.js) is just `<PlatformPressable
// {...props} />`. We need that same "spread everything through" behavior (it's what forwards
// `href` for web anchor semantics, `aria-label`, `role`, ripple config, etc.) while adding our
// own pill wrapper around `children`, so we import the same component rather than reinventing
// a subset of it on top of plain `Pressable`.
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NewProgramButton } from '../../../src/features/programs/components/NewProgramButton';
import { ProfileAvatarButton } from '../../../src/features/profile/components/ProfileAvatarButton';
import { Background } from '../../../src/shared/components/Background';
import {
  CoachIcon,
  HistoryIcon,
  ProgramsIcon,
  TodayIcon,
  type TabIconProps,
} from '../../../src/shared/components/icons/TabIcons';
import { TAB_BAR_IOS_BOTTOM_TRIM } from '../../../src/shared/theme/tabBarGeometry';
import { useTheme, useThemedStyles } from '../../../src/shared/theme/ThemeProvider';
import { shadows, spacing, type ThemeColors } from '../../../src/shared/theme/theme';

// Fixed height for the floating pill bar (overrides the library's own 49px + safe-area-inset
// default — see getTabBarHeight in expo-router's bundled BottomTabBar.js). Floating clear of
// the bottom edge means the home indicator inset doesn't need to be baked into the bar itself.
const TAB_BAR_HEIGHT = 64;

// Sized to fit "Programs" — the longest of the four tab labels — plus its padding, so every
// tab's active pill is the same width instead of hugging each label's own text width.
const TAB_PILL_MIN_WIDTH = 72;

// The pill sits roughly 4-5px in from the bar's edge on the near-flush first/last tabs (icon
// + label + our own padding, inset a further 5px by the library's own per-item `padding: 5`
// in tabVerticalUiKit). For nested rounded corners to read as concentric rather than
// mismatched, the inner radius should be roughly (outer radius - that gap) — 32 - ~4.5 ≈ 28.
const TAB_PILL_RADIUS = 28;

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
      <View style={staticStyles.headerRight}>
        <NewProgramButton />
        <ProfileAvatarButton />
      </View>
    ),
  },
  { name: 'history', titleKey: 'history.title', Icon: HistoryIcon },
  { name: 'coach', titleKey: 'coach.title', Icon: CoachIcon },
];

function buildTabPillStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabPillActive: {
      backgroundColor: colors.accentTint,
    },
  });
}

// The library's own tabBarActiveBackgroundColor spans the full tab column with no rounding
// in the 'uikit' variant we use — taking over the button lets the pill/glass highlight hug
// just the icon+label content, like iOS 26's tab bar treats the selected tab.
//
// The library's default item style (tabVerticalUiKit) is `justifyContent: 'flex-start'`,
// which anchors icon+label to the top of the tab column instead of centering them in the
// bar — that's what read as "not centered". `tabButtonOverride` wins over it since it's
// spread after the incoming `style` in the array below.
//
// Everything else (`...rest`, including `href`, `role`, `aria-label`, `android_ripple`,
// `onPress`/`onLongPress`, `testID`) is forwarded straight to PlatformPressable unpicked —
// we only need to read `children`/`style` to build the pill, and `aria-selected` to decide
// whether it's the active one.
//
// Reads the theme itself (rather than taking colors as a prop) so it stays a stable,
// module-scope function reference passed straight to `tabBarButton` below — the library
// renders that prop as a JSX element type, so a new function identity on every TabsLayout
// render (e.g. a wrapper closure capturing colors) would unmount/remount every tab button on
// every render, not just on an actual theme change.
function GlassTabButton({
  children,
  style,
  'aria-selected': focused,
  ...rest
}: BottomTabBarButtonProps) {
  const themedStyles = useThemedStyles(buildTabPillStyles);

  return (
    <PlatformPressable
      style={[style, staticStyles.tabButtonOverride]}
      aria-selected={focused}
      {...rest}
    >
      <View style={[staticStyles.tabPill, focused && themedStyles.tabPillActive]}>{children}</View>
    </PlatformPressable>
  );
}

function buildTabBarTintStyle(colors: ThemeColors) {
  return StyleSheet.create({
    tabBarTint: {
      backgroundColor: colors.surfaceTranslucent,
    },
  });
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, resolvedScheme } = useTheme();
  const tintStyles = useThemedStyles(buildTabBarTintStyle);

  return (
    <View style={staticStyles.root}>
      <Background />
      <Tabs
        screenOptions={{
          headerRight: () => <ProfileAvatarButton />,
          // Transparent (not colors.background) so the ambient Background behind this whole
          // stack shows through the header area too, matching the design canvas — the
          // "Today"/"Programs"/etc. title floats directly on the background there rather than
          // sitting on its own opaque bar.
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarButton: GlassTabButton,
          // Floating capsule that clears both the side and bottom edges (like Slack's/iOS
          // Reminders' tab bar) instead of a full-width bar flush with the screen edges.
          // Transparent background so tabBarBackground's blur shows content scrolling
          // underneath, like iOS's native translucent tab bar. Screens with content pinned to
          // the bottom edge (e.g. CoachScreen's composer) or a scrollable list (ProgramsScreen)
          // add their own bottom offset via useBottomTabBarHeight() to avoid sitting behind it.
          //
          // `height` and `paddingBottom` override the library's own defaults (49px tall,
          // padded by the safe-area inset) — see getTabBarHeight in expo-router's bundled
          // BottomTabBar.js. Floating well clear of the bottom edge means the home-indicator
          // inset doesn't need to be baked into the bar's own height any more; we push the
          // whole bar up by that inset instead, via `bottom`.
          // `start`/`end`, not `left`/`right`: the library's own base style for the bottom bar
          // sets `start: 0, end: 0` (styles.bottom in expo-router's bundled BottomTabBar.js),
          // and Yoga gives the logical start/end edges priority over the physical left/right
          // ones whenever both are set — so a `left`/`right` override here is silently ignored.
          tabBarStyle: {
            position: 'absolute',
            start: spacing.xl + spacing.sm,
            end: spacing.xl + spacing.sm,
            // iOS's home indicator inset leaves more room than the bar needs to clear it
            // comfortably — nudge the bar down a bit closer to the edge on iOS specifically.
            // Clamped at 0: devices/orientations with no bottom inset (e.g. a home-button
            // iPhone) would otherwise go negative and push the bar off-screen.
            bottom:
              Platform.OS === 'ios'
                ? Math.max(0, insets.bottom - TAB_BAR_IOS_BOTTOM_TRIM)
                : insets.bottom,
            height: TAB_BAR_HEIGHT,
            paddingBottom: 0,
            paddingTop: 0,
            backgroundColor: 'transparent',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            borderRadius: TAB_BAR_HEIGHT / 2,
            ...shadows.tabBar,
          },
          // Layering a translucent white/dark tint on top of the blur gives the bar a distinct
          // "glass panel" look, matching how iOS's own system materials combine blur with a
          // tint rather than using raw blur alone.
          //
          // Rounded + clipped here rather than on the bar itself, so the shadow above (which
          // needs to render outside the bar's bounds) isn't clipped away by the same
          // overflow: 'hidden' that rounds off the blur layer's corners.
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, staticStyles.tabBarBackgroundClip]}>
              <BlurView
                intensity={80}
                tint={resolvedScheme === 'dark' ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, tintStyles.tabBarTint]} />
            </View>
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
    </View>
  );
}

// Layout-only, theme-independent — built once at module scope.
const staticStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarBackgroundClip: {
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  tabButtonOverride: {
    // The library's own item style aligns content to the top of the tab column
    // (justifyContent: 'flex-start'); centering it here is what actually centers the
    // icon+label within the bar's height.
    justifyContent: 'center',
  },
  tabPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    // Kept tight on purpose: the tab column is only ~80pt wide once the bar's own side
    // margins are subtracted, and "Programs" is the longest label — much more horizontal
    // padding here and it clips to "Progra…".
    paddingHorizontal: spacing.sm,
    minWidth: TAB_PILL_MIN_WIDTH,
    // Not radii.pill: the icon+label stack is taller than it is wide, so a full 999 radius
    // clamps to the shorter axis and stretches into an oval ("egg") instead of a circle. A
    // fixed, moderate radius reads as a rounded chip regardless of the content's aspect
    // ratio — same idea as iOS Reminders' tab bar highlight.
    borderRadius: TAB_PILL_RADIUS,
    // Without this, Android has been seen losing the rounded clip on the active pill's
    // background after a tab-switch re-render (rounded right after mount, square after
    // the first transition) — forcing an explicit clip layer keeps it stable.
    overflow: 'hidden',
  },
});
