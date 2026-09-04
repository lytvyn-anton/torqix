import type { TextStyle, ViewStyle } from 'react-native';

import { colors, fonts, radii, spacing } from './theme';

// Shared pieces of the auth-form and profile-form layouts (both are a title + labeled
// text inputs + a single primary action button). Plain objects, not run through
// StyleSheet.create, so screen-specific files can compose them into their own
// StyleSheet.create call and override only what genuinely differs (e.g. title/button
// spacing) without callers needing a style ARRAY at every usage site.
export const formStyles: {
  screenTitle: TextStyle;
  input: ViewStyle & TextStyle;
  error: TextStyle;
  primaryButton: ViewStyle;
  primaryButtonText: TextStyle;
} = {
  screenTitle: {
    fontFamily: fonts.heading,
    fontWeight: fonts.headingWeight,
    fontSize: 24,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  error: {
    color: colors.error,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontFamily: fonts.headingBold,
    fontWeight: fonts.headingBoldWeight,
    fontSize: 15,
  },
};
