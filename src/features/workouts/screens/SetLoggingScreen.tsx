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
import { useLogSet } from '../hooks/useLogSet';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useSetLogs } from '../hooks/useSetLogs';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import type { ProgramDayExerciseDetail, SetLog } from '../types';
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
  const setLogsQuery = useSetLogs(sessionId);
  const logSet = useLogSet(sessionId);
  const completeSession = useCompleteSession(userId);
  const cancelSession = useCancelSession(userId);

  const [drafts, setDrafts] = useState<Record<string, Draft[]>>({});
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);

  // The next set_index to assign per exercise, as an optimistic count layered on top of
  // setLogsQuery: that query only reflects a logged set after its post-mutation
  // invalidation refetches, so two quick taps before that refetch lands would otherwise
  // both read the same "already logged" count and submit the same set_index. Only ever
  // written from the event handler below (never during render), so it can't drift from
  // what was actually assigned.
  const [loggedCountOverrides, setLoggedCountOverrides] = useState<Record<string, number>>({});

  // handleLogSets fires several logSet.mutateAsync calls per tap (one per row), sequentially
  // awaited — the shared useMutation's isPending/isError only ever reflect the single most
  // recently dispatched call, so a per-exercise submitting/error flag has to be tracked here
  // instead of trusting logSet.isPending / logSet.isError.
  const [loggingExerciseCardIds, setLoggingExerciseCardIds] = useState<Record<string, boolean>>({});
  const [logErrorExerciseCardIds, setLogErrorExerciseCardIds] = useState<Record<string, boolean>>(
    {},
  );

  // Sets logged this session, kept visible on the card as their own reps/weight instead of
  // collapsing into a bare count: setLogsQuery only reflects a set after its post-mutation
  // invalidation refetches, so a just-logged set is held here until the query catches up
  // (matched, and then dropped, by set_index).
  const [optimisticLoggedSets, setOptimisticLoggedSets] = useState<Record<string, SetLog[]>>({});

  const rowsFor = (exercise: ProgramDayExerciseDetail): Draft[] =>
    drafts[exercise.id] ?? [defaultDraft(exercise)];

  const setDraftField = (
    exercise: ProgramDayExerciseDetail,
    rowIndex: number,
    field: keyof Draft,
    value: string,
  ) => {
    setDrafts((current) => {
      const rows = current[exercise.id] ?? [defaultDraft(exercise)];
      return {
        ...current,
        [exercise.id]: rows.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)),
      };
    });
  };

  const handleAddSetRow = (exercise: ProgramDayExerciseDetail) => {
    setDrafts((current) => {
      const rows = current[exercise.id] ?? [defaultDraft(exercise)];
      return { ...current, [exercise.id]: [...rows, defaultDraft(exercise)] };
    });
  };

  const loggedSetsFor = (exerciseId: string): SetLog[] => {
    const fromQuery = (setLogsQuery.data ?? []).filter((log) => log.exerciseId === exerciseId);
    const knownIndexes = new Set(fromQuery.map((log) => log.setIndex));
    const stillOptimistic = (optimisticLoggedSets[exerciseId] ?? []).filter(
      (log) => !knownIndexes.has(log.setIndex),
    );
    return [...fromQuery, ...stillOptimistic].sort((a, b) => a.setIndex - b.setIndex);
  };

  const nextSetIndexFor = (exerciseId: string): number =>
    Math.max(loggedSetsFor(exerciseId).length, loggedCountOverrides[exerciseId] ?? 0);

  // Logs every row currently on the exercise's card, one at a time. Each row's set_index is
  // reserved synchronously up front (before any awaits) so a second tap landing before this
  // call resolves can't compute the same starting index and collide with it — a failed insert
  // leaves a gap in the numbering rather than risking a duplicate. Rows that fail stay on the
  // card so the user can retry them instead of silently losing that data; only rows that
  // actually persisted are cleared back to a single blank row.
  const handleLogSets = async (exercise: ProgramDayExerciseDetail) => {
    const rows = rowsFor(exercise);
    const startIndex = nextSetIndexFor(exercise.exerciseId);
    setLoggedCountOverrides((current) => ({
      ...current,
      [exercise.exerciseId]: startIndex + rows.length,
    }));
    setLoggingExerciseCardIds((current) => ({ ...current, [exercise.id]: true }));
    setLogErrorExerciseCardIds((current) => ({ ...current, [exercise.id]: false }));

    const failedRows: Draft[] = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const setIndex = startIndex + i;
      const repsDone = toNullableInt(row.reps);
      const weight = toNullableFloat(row.weight);
      try {
        await logSet.mutateAsync({ exerciseId: exercise.exerciseId, setIndex, repsDone, weight });
        setOptimisticLoggedSets((current) => ({
          ...current,
          [exercise.exerciseId]: [
            ...(current[exercise.exerciseId] ?? []),
            {
              id: `optimistic-${exercise.exerciseId}-${setIndex}`,
              exerciseId: exercise.exerciseId,
              setIndex,
              repsDone,
              weight,
            },
          ],
        }));
      } catch {
        failedRows.push(row);
      }
    }

    setLoggingExerciseCardIds((current) => ({ ...current, [exercise.id]: false }));
    setLogErrorExerciseCardIds((current) => ({ ...current, [exercise.id]: failedRows.length > 0 }));
    setDrafts((current) => ({
      ...current,
      [exercise.id]: failedRows.length > 0 ? failedRows : [defaultDraft(exercise)],
    }));
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
          const rows = rowsFor(exercise);
          const loggedSets = loggedSetsFor(exercise.exerciseId);
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

              {loggedSets.length > 0 && (
                <View style={styles.loggedList} testID={`set-logging-count-${exercise.id}`}>
                  {loggedSets.map((log) => (
                    <Text key={log.id} style={styles.loggedRow}>
                      {t('workouts.loggedSetEntry', {
                        index: log.setIndex + 1,
                        reps: log.repsDone ?? '—',
                        weight: log.weight ?? '—',
                      })}
                    </Text>
                  ))}
                </View>
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
                    testID={
                      rowIndex === 0
                        ? `set-logging-${exercise.id}-reps`
                        : `set-logging-${exercise.id}-reps-${rowIndex}`
                    }
                  />
                  <TextInput
                    style={[formStyles.input, styles.field]}
                    value={draft.weight}
                    onChangeText={(value) => setDraftField(exercise, rowIndex, 'weight', value)}
                    placeholder={t('workouts.weightPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    testID={
                      rowIndex === 0
                        ? `set-logging-${exercise.id}-weight`
                        : `set-logging-${exercise.id}-weight-${rowIndex}`
                    }
                  />
                </View>
              ))}

              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  onPress={() => handleAddSetRow(exercise)}
                  accessibilityRole="button"
                  testID={`set-logging-${exercise.id}-add-set`}
                >
                  <Text style={styles.rowButtonText}>{t('workouts.addSet')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleLogSets(exercise)}
                  disabled={loggingExerciseCardIds[exercise.id] === true}
                  accessibilityRole="button"
                  testID={`set-logging-${exercise.id}-log`}
                >
                  <Text style={styles.rowButtonText}>{t('workouts.logSet')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {Object.values(logErrorExerciseCardIds).some(Boolean) && (
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
    loggedList: {
      gap: 2,
    },
    loggedRow: {
      color: colors.accentDark,
      fontSize: 12,
      fontWeight: '600',
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
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
