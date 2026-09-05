import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { useProgramDays } from '../../workouts/hooks/useProgramDays';
import { useStartWorkoutSession } from '../../workouts/hooks/useStartWorkoutSession';
import { useTodaySession } from '../../workouts/hooks/useTodaySession';
import { ProgramsIcon } from '../../../shared/components/icons/TabIcons';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  onCreateProgram: () => void;
  onOpenWorkout: (sessionId: string) => void;
};

export function TodayScreen({ userId, onCreateProgram, onOpenWorkout }: Props) {
  const { t } = useTranslation();
  const activeProgramQuery = useActiveProgram(userId);
  const todaySessionQuery = useTodaySession(userId);
  const programDaysQuery = useProgramDays(activeProgramQuery.data?.id);
  const startWorkoutSession = useStartWorkoutSession(userId);
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

  // Gate on the initial fetch only (not background refetches) — otherwise this can render
  // the day picker before we know an in-progress session exists, and starting a new
  // session from there would orphan the real one instead of resuming it.
  if (todaySessionQuery.isLoading) {
    return (
      <View style={styles.centered} testID="today-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const todaySession = todaySessionQuery.data;

  if (todaySession) {
    return (
      <View style={styles.centered} testID="today-continue-workout">
        <Text style={styles.activeProgramLabel}>{t('today.activeProgramLabel')}</Text>
        <Text style={styles.activeProgramName}>{activeProgram.name}</Text>
        <TouchableOpacity
          style={[formStyles.primaryButton, styles.emptyCta]}
          onPress={() => onOpenWorkout(todaySession.id)}
          testID="today-continue-session"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>
            {t('today.continueWorkout')} — {todaySession.programDayName}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleStartDay = (programDayId: string) => {
    startWorkoutSession.mutate(programDayId, {
      onSuccess: (session) => onOpenWorkout(session.id),
    });
  };

  return (
    <View style={styles.centered} testID="today-choose-day">
      <Text style={styles.activeProgramLabel}>{t('today.activeProgramLabel')}</Text>
      <Text style={styles.activeProgramName}>{activeProgram.name}</Text>
      <Text style={styles.chooseDayTitle}>{t('today.chooseDayTitle')}</Text>
      {(programDaysQuery.data ?? []).map((day) => (
        <TouchableOpacity
          key={day.id}
          style={[formStyles.primaryButton, styles.dayButton]}
          onPress={() => handleStartDay(day.id)}
          disabled={startWorkoutSession.isPending}
          testID={`today-start-day-${day.id}`}
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{day.name}</Text>
        </TouchableOpacity>
      ))}
      {startWorkoutSession.isError && (
        <Text style={styles.error} testID="today-start-error">
          {t('today.startError')}
        </Text>
      )}
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
    chooseDayTitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    dayButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      minWidth: 200,
    },
  });
}
