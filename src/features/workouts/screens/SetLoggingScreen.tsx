import { useRouter } from 'expo-router';
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
import { useLogSets } from '../hooks/useLogSets';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import type { LogSetInput, ProgramDayExerciseDetail } from '../types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';
import { toNullableFloat, toNullableInt } from '../../../shared/utils/numberInput';

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

export function SetLoggingScreen({ userId, sessionId, onCancelled, onCompleted }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const sessionQuery = useWorkoutSession(sessionId);
  const exercisesQuery = useProgramDayExercises(sessionQuery.data?.programDayId);
  const logSets = useLogSets(sessionId);
  const completeSession = useCompleteSession(userId);
  const cancelSession = useCancelSession(userId);

  // Nothing is written to set_logs while the workout is in progress — each exercise's sets
  // live here as plain draft rows (added via "+ Add set") and are only persisted in bulk
  // when the user taps "Finish workout". An exercise the user never touched has no entry
  // here at all, so it contributes nothing to save.
  const [drafts, setDrafts] = useState<Record<string, Draft[]>>({});
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const setDraftField = (
    exercise: ProgramDayExerciseDetail,
    rowIndex: number,
    field: keyof Draft,
    value: string,
  ) => {
    setDrafts((current) => {
      const rows = current[exercise.id] ?? [];
      return {
        ...current,
        [exercise.id]: rows.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)),
      };
    });
  };

  const handleAddSetRow = (exercise: ProgramDayExerciseDetail) => {
    setDrafts((current) => {
      const rows = current[exercise.id] ?? [];
      return { ...current, [exercise.id]: [...rows, defaultDraft(exercise)] };
    });
  };

  const handleConfirmCancel = () => {
    cancelSession.mutate(sessionId, { onSuccess: () => onCancelled() });
  };

  // Persists every set entered across all exercises in one bulk insert, then marks the
  // session done — only once the insert succeeds, so a failed save doesn't complete a
  // session with missing data. set_index is assigned from a running per-exercise counter
  // (not the row's raw array position) so a blank skipped row can't leave a gap, and two
  // program-day-exercise cards sharing the same underlying exercise can't both start
  // numbering from 0 and collide. Drafts are cleared as soon as the insert succeeds — before
  // completeSession runs — so if completing the session then fails, retrying "Finish" only
  // retries that (nothing left in `inputs`) instead of re-inserting the same sets.
  const handleFinish = async () => {
    setSaveFailed(false);
    setIsSaving(true);
    const inputs: LogSetInput[] = [];
    const nextSetIndexByExercise: Record<string, number> = {};
    for (const exercise of exercisesQuery.data ?? []) {
      (drafts[exercise.id] ?? []).forEach((row) => {
        const repsDone = toNullableInt(row.reps);
        const weight = toNullableFloat(row.weight);
        if (repsDone == null && weight == null) return;
        const setIndex = nextSetIndexByExercise[exercise.exerciseId] ?? 0;
        nextSetIndexByExercise[exercise.exerciseId] = setIndex + 1;
        inputs.push({ exerciseId: exercise.exerciseId, setIndex, repsDone, weight });
      });
    }

    try {
      if (inputs.length > 0) {
        await logSets.mutateAsync(inputs);
        setDrafts({});
      }
      await completeSession.mutateAsync(sessionId);
      onCompleted(sessionId);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
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
          const rows = drafts[exercise.id] ?? [];
          return (
            <View key={exercise.id} style={[formStyles.glassSurface, styles.exerciseCard]}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/exercise-progress/[exerciseId]',
                      params: { exerciseId: exercise.exerciseId, name: exercise.exerciseName },
                    })
                  }
                  accessibilityRole="button"
                  testID={`set-logging-${exercise.id}-progress`}
                >
                  <Text style={styles.progressLink}>{t('workouts.viewProgress')}</Text>
                </TouchableOpacity>
              </View>
              {(exercise.sets != null || exercise.reps != null) && (
                <Text style={styles.target}>
                  {t('workouts.target', { sets: exercise.sets ?? '—', reps: exercise.reps ?? '—' })}
                </Text>
              )}

              {rows.map((draft, rowIndex) => (
                <View key={rowIndex} style={[styles.fieldsRow, styles.setRow]}>
                  <TextInput
                    style={[formStyles.input, styles.field]}
                    value={draft.reps}
                    onChangeText={(value) => setDraftField(exercise, rowIndex, 'reps', value)}
                    placeholder={t('workouts.repsPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                    testID={`set-logging-${exercise.id}-reps-${rowIndex}`}
                  />
                  <TextInput
                    style={[formStyles.input, styles.field]}
                    value={draft.weight}
                    onChangeText={(value) => setDraftField(exercise, rowIndex, 'weight', value)}
                    placeholder={t('workouts.weightPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    testID={`set-logging-${exercise.id}-weight-${rowIndex}`}
                  />
                </View>
              ))}

              <TouchableOpacity
                onPress={() => handleAddSetRow(exercise)}
                style={styles.addSetButton}
                accessibilityRole="button"
                testID={`set-logging-${exercise.id}-add-set`}
              >
                <Text style={styles.rowButtonText}>{t('workouts.addSet')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {(saveFailed || completeSession.isError) && (
          <Text style={formStyles.error} testID="set-logging-finish-error">
            {t('workouts.finishError')}
          </Text>
        )}

        <TouchableOpacity
          style={[formStyles.primaryButton, styles.finishButton]}
          onPress={handleFinish}
          disabled={isSaving || completeSession.isPending}
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
    exerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    exerciseName: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 16,
    },
    progressLink: {
      color: colors.accentDark,
      fontSize: 12,
      fontWeight: '600',
    },
    target: {
      color: colors.textMuted,
      fontSize: 12,
    },
    setRow: {
      marginTop: spacing.xs,
    },
    fieldsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    field: {
      flex: 1,
    },
    addSetButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
    },
    rowButtonText: {
      color: colors.accentDark,
      fontWeight: '600',
    },
    finishButton: {
      marginTop: spacing.md,
    },
  });
}
