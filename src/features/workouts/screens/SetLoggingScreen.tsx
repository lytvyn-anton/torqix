import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CancelWorkoutSheet } from '../components/CancelWorkoutSheet';
import { useCancelSession } from '../hooks/useCancelSession';
import { useCompleteSession } from '../hooks/useCompleteSession';
import { useLogSet } from '../hooks/useLogSet';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useSetLogs } from '../hooks/useSetLogs';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import type { ProgramDayExerciseDetail, SetLog } from '../types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  sessionId: string;
  onCancelled: () => void;
  onCompleted: (sessionId: string) => void;
};

type Draft = { reps: string; weight: string };

function defaultDraft(exercise: ProgramDayExerciseDetail): Draft {
  return {
    reps: exercise.reps != null ? String(exercise.reps) : '',
    weight: exercise.targetWeight != null ? String(exercise.targetWeight) : '',
  };
}

function toNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNullableFloat(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function SetLoggingScreen({ userId, sessionId, onCancelled, onCompleted }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const sessionQuery = useWorkoutSession(sessionId);
  const exercisesQuery = useProgramDayExercises(sessionQuery.data?.programDayId);
  const setLogsQuery = useSetLogs(sessionId);
  const logSet = useLogSet(sessionId);
  const completeSession = useCompleteSession(userId);
  const cancelSession = useCancelSession(userId);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);

  // The next set_index to assign per exercise, as an optimistic count layered on top of
  // setLogsQuery: that query only reflects a logged set after its post-mutation
  // invalidation refetches, so two quick taps before that refetch lands would otherwise
  // both read the same "already logged" count and submit the same set_index. Only ever
  // written from the event handler below (never during render), so it can't drift from
  // what was actually assigned.
  const [loggedCountOverrides, setLoggedCountOverrides] = useState<Record<string, number>>({});

  const setDraftField = (exercise: ProgramDayExerciseDetail, field: keyof Draft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [exercise.id]: { ...(current[exercise.id] ?? defaultDraft(exercise)), [field]: value },
    }));
  };

  const loggedSetsFor = (exerciseId: string): SetLog[] =>
    (setLogsQuery.data ?? []).filter((log) => log.exerciseId === exerciseId);

  const nextSetIndexFor = (exerciseId: string): number =>
    Math.max(loggedSetsFor(exerciseId).length, loggedCountOverrides[exerciseId] ?? 0);

  const handleLogSet = (exercise: ProgramDayExerciseDetail) => {
    const draft = drafts[exercise.id] ?? defaultDraft(exercise);
    const setIndex = nextSetIndexFor(exercise.exerciseId);
    setLoggedCountOverrides((current) => ({ ...current, [exercise.exerciseId]: setIndex + 1 }));
    logSet.mutate({
      exerciseId: exercise.exerciseId,
      setIndex,
      repsDone: toNullableInt(draft.reps),
      weight: toNullableFloat(draft.weight),
    });
  };

  const handleConfirmCancel = () => {
    cancelSession.mutate(sessionId, { onSuccess: () => onCancelled() });
  };

  const handleFinish = () => {
    completeSession.mutate(sessionId, { onSuccess: () => onCompleted(sessionId) });
  };

  if (sessionQuery.isLoading || exercisesQuery.isLoading) {
    return (
      <View style={styles.centered} testID="set-logging-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (sessionQuery.isError || exercisesQuery.isError) {
    return (
      <View style={styles.centered} testID="set-logging-load-error">
        <Text style={formStyles.error}>{t('workouts.loadError')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={formStyles.screenTitle}>{sessionQuery.data?.programDayName}</Text>
        <TouchableOpacity
          onPress={() => setCancelSheetVisible(true)}
          accessibilityRole="button"
          testID="set-logging-cancel"
        >
          <Text style={styles.cancelText}>{t('workouts.cancel')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {(exercisesQuery.data ?? []).map((exercise) => {
          const draft = drafts[exercise.id] ?? defaultDraft(exercise);
          const loggedSets = loggedSetsFor(exercise.exerciseId);
          return (
            <View key={exercise.id} style={[formStyles.glassSurface, styles.exerciseCard]}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              {(exercise.sets != null || exercise.reps != null) && (
                <Text style={styles.target}>
                  {t('workouts.target', { sets: exercise.sets ?? '—', reps: exercise.reps ?? '—' })}
                </Text>
              )}

              {loggedSets.length > 0 && (
                <Text style={styles.loggedCount} testID={`set-logging-count-${exercise.id}`}>
                  {t('workouts.setsLoggedCount', { count: loggedSets.length })}
                </Text>
              )}

              <View style={styles.fieldsRow}>
                <TextInput
                  style={[formStyles.input, styles.field]}
                  value={draft.reps}
                  onChangeText={(value) => setDraftField(exercise, 'reps', value)}
                  placeholder={t('workouts.repsPlaceholder')}
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  testID={`set-logging-${exercise.id}-reps`}
                />
                <TextInput
                  style={[formStyles.input, styles.field]}
                  value={draft.weight}
                  onChangeText={(value) => setDraftField(exercise, 'weight', value)}
                  placeholder={t('workouts.weightPlaceholder')}
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  testID={`set-logging-${exercise.id}-weight`}
                />
              </View>

              <TouchableOpacity
                onPress={() => handleLogSet(exercise)}
                disabled={logSet.isPending}
                style={styles.logSetButton}
                accessibilityRole="button"
                testID={`set-logging-${exercise.id}-log`}
              >
                <Text style={styles.logSetText}>{t('workouts.logSet')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {logSet.isError && (
          <Text style={formStyles.error} testID="set-logging-log-error">
            {t('workouts.logSetError')}
          </Text>
        )}
        {completeSession.isError && (
          <Text style={formStyles.error} testID="set-logging-finish-error">
            {t('workouts.finishError')}
          </Text>
        )}

        <TouchableOpacity
          style={[formStyles.primaryButton, styles.finishButton]}
          onPress={handleFinish}
          disabled={completeSession.isPending}
          accessibilityRole="button"
          testID="set-logging-finish"
        >
          <Text style={formStyles.primaryButtonText}>{t('workouts.finish')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <CancelWorkoutSheet
        visible={cancelSheetVisible}
        isError={cancelSession.isError}
        isPending={cancelSession.isPending}
        onConfirm={handleConfirmCancel}
        onKeepGoing={() => setCancelSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    cancelText: {
      color: colors.error,
      fontWeight: '600',
    },
    container: {
      padding: spacing.xl,
      paddingTop: 0,
      gap: spacing.md,
    },
    exerciseCard: {
      borderRadius: 16,
      padding: spacing.md,
      gap: spacing.xs,
    },
    exerciseName: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 16,
    },
    target: {
      color: colors.textMuted,
      fontSize: 12,
    },
    loggedCount: {
      color: colors.accentDark,
      fontSize: 12,
      fontWeight: '600',
    },
    fieldsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    field: {
      flex: 1,
    },
    logSetButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
    },
    logSetText: {
      color: colors.accentDark,
      fontWeight: '600',
    },
    finishButton: {
      marginTop: spacing.md,
    },
  });
}
