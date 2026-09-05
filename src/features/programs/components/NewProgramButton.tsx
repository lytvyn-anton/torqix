import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

// Header-right button on the Programs tab that opens the manual creation screen.
export function NewProgramButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <TouchableOpacity
      onPress={() => router.push('/program-create')}
      style={styles.button}
      testID="new-program-button"
      accessibilityRole="button"
      accessibilityLabel={t('programs.createTitle')}
    >
      <Text style={styles.label}>{t('programs.newProgram')}</Text>
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
