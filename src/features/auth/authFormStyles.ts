import { StyleSheet } from 'react-native';

import { colors, spacing } from '../../shared/theme/theme';
import { formStyles } from '../../shared/theme/formStyles';

export const authFormStyles = StyleSheet.create({
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
});
