import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { ProgramsIcon } from '../../../shared/components/icons/TabIcons';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  onCreateProgram: () => void;
};

export function TodayScreen({ userId, onCreateProgram }: Props) {
  const { t } = useTranslation();
  const activeProgramQuery = useActiveProgram(userId);
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  if (activeProgramQuery.isLoading) {
    return (
      <View style={styles.centered} testID="today-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only treat this as a fatal load failure when we've never had data (first load). A
  // background refetch error (token refresh blip, brief network loss) shouldn't discard an
  // already-loaded active program — see ProfileScreen for the same guard.
  if (activeProgramQuery.isError && activeProgramQuery.data === undefined) {
    return (
      <View style={styles.centered} testID="today-load-error">
        <Text style={styles.error}>{t('today.loadError')}</Text>
      </View>
    );
  }

  const activeProgram = activeProgramQuery.data;

  if (!activeProgram) {
    return (
      <View style={styles.centered} testID="today-empty">
        <View style={styles.emptyIcon}>
          <ProgramsIcon color={colors.accentDark} size={24} />
        </View>
        <Text style={styles.emptyTitle}>{t('today.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('today.emptyBody')}</Text>
        <TouchableOpacity
          style={[formStyles.primaryButton, styles.emptyCta]}
          onPress={onCreateProgram}
          testID="today-create-program"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{t('today.emptyCta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Scheduling/sessions aren't built yet, so there's no "today's workout" to show for an
  // active program — just confirm which one is active until that lands.
  return (
    <View style={styles.centered} testID="today-active-program">
      <Text style={styles.activeProgramLabel}>{t('today.activeProgramLabel')}</Text>
      <Text style={styles.activeProgramName}>{activeProgram.name}</Text>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      // Transparent, not colors.background — the ambient Background sits behind the whole
      // tab navigator (app/(app)/(tabs)/_layout.tsx) and shows through here.
      backgroundColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.md,
    },
    error: {
      color: colors.error,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accentTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 15,
      color: colors.textPrimary,
    },
    emptyBody: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    emptyCta: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.sm,
    },
    activeProgramLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    activeProgramName: {
      fontFamily: fonts.heading,
      fontWeight: fonts.headingWeight,
      fontSize: 20,
      color: colors.textPrimary,
    },
  });
}
