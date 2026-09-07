import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../theme/theme';

type Props = {
  children: ReactNode;
};

// Rounded, frosted card for a bottom sheet's content (ConfirmSheet, NewProgramSheet). A flat
// `colors.surfaceTranslucent` fill alone reads as nearly invisible in dark mode (8% white) —
// that token is designed to sit on top of a BlurView, the way the tab bar layers it
// (app/(app)/(tabs)/_layout.tsx's tabBarBackground), not as a standalone background. Without
// the blur, a sheet using it directly let whatever sits behind it (the floating tab bar, a
// screen's fixed footer buttons) show clearly through instead of being obscured.
export function BottomSheetPanel({ children }: Props) {
  const { blurTint } = useTheme();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.clip}>
      <BlurView intensity={90} tint={blurTint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    clip: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      overflow: 'hidden',
    },
    tint: {
      backgroundColor: colors.surfaceTranslucent,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.sm,
    },
  });
}
