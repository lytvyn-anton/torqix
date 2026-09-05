import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing } from '../../../shared/theme/theme';

export function usePickerChipStyles() {
  const { colors } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
        },
        chip: {
          borderWidth: 1,
          borderColor: colors.borderInput,
          borderRadius: radii.pill,
          paddingVertical: 6,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
        },
        chipSelected: {
          backgroundColor: colors.accent,
          borderColor: colors.accent,
        },
        chipText: {
          color: colors.textPrimary,
        },
        chipTextSelected: {
          color: colors.onAccent,
        },
      }),
    [colors],
  );
}
