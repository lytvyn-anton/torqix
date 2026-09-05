import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useFormStyles } from '../../shared/theme/formStyles';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { spacing } from '../../shared/theme/theme';

export function useAuthFormStyles() {
  const { colors } = useTheme();
  const formStyles = useFormStyles();

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          padding: spacing.xl,
          gap: spacing.md,
          backgroundColor: colors.background,
        },
        title: {
          ...formStyles.screenTitle,
          marginBottom: spacing.md,
        },
        input: formStyles.input,
        error: formStyles.error,
        submitButton: {
          ...formStyles.primaryButton,
          marginTop: spacing.sm,
        },
        submitButtonText: formStyles.primaryButtonText,
        switchRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: spacing.lg,
        },
        switchAction: {
          fontWeight: '600',
          color: colors.accentDark,
        },
      }),
    [colors, formStyles],
  );
}
