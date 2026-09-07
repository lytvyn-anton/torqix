import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../theme/theme';

type Props = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
};

// Small pill-shaped header-right button, shared by the Programs tab's "New" and "AI" actions
// (NewProgramButton, GenerateProgramButton) so their shared look stays in one place.
export function HeaderPillButton({ label, accessibilityLabel, onPress, testID }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      backgroundColor: colors.accentTint,
      borderRadius: radii.pill,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      marginRight: spacing.sm,
    },
    label: {
      color: colors.accentDark,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
