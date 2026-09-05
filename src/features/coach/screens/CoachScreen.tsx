import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { CoachIcon } from '../../../shared/components/icons/TabIcons';
import { useFloatingTabBarClearance } from '../../../shared/hooks/useFloatingTabBarClearance';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

// Static "coming soon" tab — the real AI coach feature builds in Phase 4/5. This exists
// now so the bottom nav has all 4 tabs wired for Phase 2.
export function CoachScreen() {
  const { t } = useTranslation();
  const tabBarClearance = useFloatingTabBarClearance();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <View style={styles.container} testID="coach-placeholder">
      <View style={styles.icon}>
        <CoachIcon color={colors.textMuted} size={28} />
      </View>
      <Text style={styles.title}>{t('coach.comingSoonTitle')}</Text>
      <Text style={styles.body}>{t('coach.comingSoonBody')}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t('coach.comingSoonBadge')}</Text>
      </View>
      <View
        style={[formStyles.glassSurface, styles.composer, { bottom: spacing.xl + tabBarClearance }]}
      >
        <Text style={styles.composerPlaceholder}>{t('coach.messagePlaceholder')}</Text>
      </View>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      // Transparent, not colors.background — the ambient Background sits behind the whole
      // tab navigator (app/(app)/(tabs)/_layout.tsx) and shows through here.
      backgroundColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      fontFamily: fonts.heading,
      fontWeight: fonts.headingWeight,
      fontSize: 18,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    badge: {
      backgroundColor: colors.accentTint,
      borderRadius: radii.lg,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accentDark,
    },
    composer: {
      position: 'absolute',
      left: spacing.xl,
      right: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.xl,
      padding: spacing.md,
      // Translucent, matching the glass card treatment (see ProgramsScreen's ProgramCard) —
      // the already-blurred ambient Background shows softly through instead of a flat fill.
      backgroundColor: colors.surfaceTranslucent,
    },
    composerPlaceholder: {
      fontSize: 14,
      color: colors.textFaint,
    },
  });
}
