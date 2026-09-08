import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useLastPerformedSets } from '../hooks/useLastPerformedSets';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useSetLogs } from '../hooks/useSetLogs';
import { useSyncSetLogs } from '../hooks/useSyncSetLogs';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import type { LogSetInput, ProgramDayExerciseDetail, SetLog } from '../types';
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

// set_index is assigned from a running per-exercise counter (not a row's raw array
// position) so a blank skipped row can't leave a numbering gap, and two program-day-exercise
// cards sharing the same underlying exercise can't both start at 0 and collide.
function buildInputs(
  exercises: ProgramDayExerciseDetail[],
  drafts: Record<string, Draft[]>,
): LogSetInput[] {
  const inputs: LogSetInput[] = [];
  const nextSetIndexByExercise: Record<string, number> = {};
  for (const exercise of exercises) {
    (drafts[exercise.id] ?? []).forEach((row) => {
      const repsDone = toNullableInt(row.reps);
      const weight = toNullableFloat(row.weight);
      if (repsDone == null && weight == null) return;
      const setIndex = nextSetIndexByExercise[exercise.exerciseId] ?? 0;
      nextSetIndexByExercise[exercise.exerciseId] = setIndex + 1;
      inputs.push({ exerciseId: exercise.exerciseId, setIndex, repsDone, weight });
    });
  }
  return inputs;
}

// The inverse of buildInputs: reconstructs draft rows from what's already saved for this
// session. If the same exercise appears on two program-day-exercise cards, its saved sets
// (indistinguishable by card — set_logs only knows the exercise, not the card) all land on
// whichever card comes first here.
function computeInitialDrafts(
  exercises: ProgramDayExerciseDetail[],
  setLogs: SetLog[],
): Record<string, Draft[]> {
  const savedByExercise = new Map<string, Draft[]>();
  for (const log of [...setLogs].sort((a, b) => a.setIndex - b.setIndex)) {
    const list = savedByExercise.get(log.exerciseId) ?? [];
    list.push({
      reps: log.repsDone != null ? String(log.repsDone) : '',
      weight: log.weight != null ? String(log.weight) : '',
    });
    savedByExercise.set(log.exerciseId, list);
  }

  const claimed = new Set<string>();
  const drafts: Record<string, Draft[]> = {};
  for (const exercise of exercises) {
    if (claimed.has(exercise.exerciseId)) continue;
    const saved = savedByExercise.get(exercise.exerciseId);
    if (!saved || saved.length === 0) continue;
    claimed.add(exercise.exerciseId);
    drafts[exercise.id] = saved;
  }
  return drafts;
}

// What was actually done the last time each exercise was performed (in some earlier,
// finished session) — shown as a per-row placeholder hint so a fresh workout doesn't feel
// like a blank slate, without being real data itself (same "the same exercise on two cards
// can't be told apart" caveat as computeInitialDrafts applies here too).
function computeLastPerformedHints(
  exercises: ProgramDayExerciseDetail[],
  lastPerformed: LogSetInput[],
): Record<string, Draft[]> {
  const byExercise = new Map<string, Draft[]>();
  for (const entry of [...lastPerformed].sort((a, b) => a.setIndex - b.setIndex)) {
    const list = byExercise.get(entry.exerciseId) ?? [];
    list.push({
      reps: entry.repsDone != null ? String(entry.repsDone) : '',
      weight: entry.weight != null ? String(entry.weight) : '',
    });
    byExercise.set(entry.exerciseId, list);
  }

  const claimed = new Set<string>();
  const hints: Record<string, Draft[]> = {};
  for (const exercise of exercises) {
    if (claimed.has(exercise.exerciseId)) continue;
    const hint = byExercise.get(exercise.exerciseId);
    if (!hint || hint.length === 0) continue;
    claimed.add(exercise.exerciseId);
    hints[exercise.id] = hint;
  }
  return hints;
}

export const AUTOSAVE_DELAY_MS = 600;

export function SetLoggingScreen({ userId, sessionId, onCancelled, onCompleted }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const sessionQuery = useWorkoutSession(sessionId);
  const exercisesQuery = useProgramDayExercises(sessionQuery.data?.programDayId);
  const setLogsQuery = useSetLogs(sessionId);
  const exerciseIds = useMemo(
    () => Array.from(new Set((exercisesQuery.data ?? []).map((exercise) => exercise.exerciseId))),
    [exercisesQuery.data],
  );
  const lastPerformedQuery = useLastPerformedSets(exerciseIds);
  const syncSetLogs = useSyncSetLogs(sessionId);
  const completeSession = useCompleteSession(userId);
  const cancelSession = useCancelSession(userId);

  // Each exercise's sets live here as plain draft rows (added via "+ Add set"); every edit
  // autosaves to set_logs in the background (debounced) rather than requiring an explicit
  // save step, so progress is captured continuously and reopening this same (still
  // "planned") session later shows what was already entered.
  const [drafts, setDrafts] = useState<Record<string, Draft[]>>({});
  const [lastPerformedHints, setLastPerformedHints] = useState<Record<string, Draft[]>>({});
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // scheduleAutosave's setTimeout callback fires later, on whatever render happened to
  // schedule it — without this ref it would close over that render's exercisesQuery.data,
  // which could be stale by the time it actually runs (e.g. a background refetch resolved
  // in between) and mis-number set_index or skip trimming a newly-added exercise.
  const exercisesRef = useRef(exercisesQuery.data);
  useEffect(() => {
    exercisesRef.current = exercisesQuery.data;
  }, [exercisesQuery.data]);

  const isMountedRef = useRef(true);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Serializes autosave/finish calls to at most one in flight at a time — a rejected sync
  // is swallowed here (each caller handles its own error) so one failure can't permanently
  // block every sync queued after it.
  const syncChainRef = useRef<Promise<void>>(Promise.resolve());
  const runQueuedSync = (currentDrafts: Record<string, Draft[]>): Promise<void> => {
    const exercises = exercisesRef.current ?? [];
    const run = syncChainRef.current
      .catch(() => {})
      .then(() =>
        syncSetLogs.mutateAsync({
          allExerciseIds: exercises.map((exercise) => exercise.exerciseId),
          inputs: buildInputs(exercises, currentDrafts),
        }),
      );
    syncChainRef.current = run;
    return run;
  };

  const scheduleAutosave = (nextDrafts: Record<string, Draft[]>) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runQueuedSync(draftsRef.current)
        .then(() => {
          if (isMountedRef.current) setSaveFailed(false);
        })
        .catch(() => {
          if (isMountedRef.current) setSaveFailed(true);
        });
    }, AUTOSAVE_DELAY_MS);
  };

  // A pending autosave must not fire after the user has navigated away — it would write to
  // a session they believe they already left. The in-flight promise itself is left running
  // (its result still matters for data correctness), but isMountedRef stops its resolution
  // from calling setState on an unmounted screen.
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Repopulates fields from whatever was already saved for this session, once, the first
  // render where all three queries have data — set during render rather than in an Effect
  // (React's documented pattern for initializing state from data that just became available:
  // it re-renders immediately with the new state before anything is painted, instead of
  // committing a wasted empty-fields frame first). An exercise with no saved sets this
  // session gets no rows — unless it has a last-performed hint, in which case it gets that
  // many blank rows so the placeholder hints below are visible right away (still nothing to
  // autosave until the user actually types into one). If the same exercise appears on two
  // program-day-exercise cards in one day, neither its saved sets nor its last-performed sets
  // can be told apart by card (set_logs only knows the exercise, not the card) — both land on
  // whichever card comes first, a rare edge case rather than something worth a schema change.
  const [isInitialized, setIsInitialized] = useState(false);
  if (!isInitialized && exercisesQuery.data && setLogsQuery.data && !lastPerformedQuery.isLoading) {
    setIsInitialized(true);
    const savedDrafts = computeInitialDrafts(exercisesQuery.data, setLogsQuery.data);
    const hints = computeLastPerformedHints(exercisesQuery.data, lastPerformedQuery.data ?? []);
    const mergedDrafts = { ...savedDrafts };
    for (const exercise of exercisesQuery.data) {
      if (mergedDrafts[exercise.id]) continue;
      const hint = hints[exercise.id];
      if (!hint) continue;
      mergedDrafts[exercise.id] = hint.map(() => ({ reps: '', weight: '' }));
    }
    setDrafts(mergedDrafts);
    setLastPerformedHints(hints);
  }

  const setDraftField = (
    exercise: ProgramDayExerciseDetail,
    rowIndex: number,
    field: keyof Draft,
    value: string,
  ) => {
    const rows = drafts[exercise.id] ?? [];
    const nextDrafts = {
      ...drafts,
      [exercise.id]: rows.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)),
    };
    setDrafts(nextDrafts);
    scheduleAutosave(nextDrafts);
  };

  // A new row starts blank, not prefilled with the exercise's target — until the user
  // actually types something, "+ Add set" alone shouldn't autosave a set nobody confirmed
  // they did. The target is only shown as a placeholder hint (below).
  const handleAddSetRow = (exercise: ProgramDayExerciseDetail) => {
    const rows = drafts[exercise.id] ?? [];
    const nextDrafts = { ...drafts, [exercise.id]: [...rows, { reps: '', weight: '' }] };
    setDrafts(nextDrafts);
  };

  // Clearing the pending timer alone isn't enough — an autosave that already fired is
  // mid-flight in syncChainRef, independent of cancelSession's own delete+update. Awaiting
  // it first guarantees that write has landed (or failed) before cancelSession deletes
  // set_logs, so a slow autosave response can't land after the delete and resurrect a row
  // for a session that's now "skipped". cancelSession.isPending only reflects its own network
  // call, which hasn't started yet during that await, so a second tap in that window would
  // otherwise fire cancelSession.mutate (and its onCancelled navigation) twice — guarded via
  // a ref, not the isCancelling state, since two taps landing before React re-renders would
  // both close over the same stale (pre-update) state value.
  const isCancellingRef = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const handleConfirmCancel = async () => {
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;
    setIsCancelling(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    await syncChainRef.current.catch(() => {});
    cancelSession.mutate(sessionId, {
      onSuccess: () => onCancelled(),
      onError: () => {
        isCancellingRef.current = false;
        setIsCancelling(false);
      },
    });
  };

  // Everything is already autosaved by the time this runs — Finish just needs to flush any
  // pending/in-flight sync (so the very latest edit is guaranteed to have landed even if the
  // debounce hadn't fired yet) before marking the session done.
  const handleFinish = async () => {
    setIsSaving(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    try {
      await runQueuedSync(drafts);
      setSaveFailed(false);
      await completeSession.mutateAsync(sessionId);
      onCompleted(sessionId);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (
    sessionQuery.isLoading ||
    exercisesQuery.isLoading ||
    setLogsQuery.isLoading ||
    lastPerformedQuery.isLoading
  ) {
    return (
      <View style={styles.centered} testID="set-logging-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (sessionQuery.isError || exercisesQuery.isError || setLogsQuery.isError) {
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

              {rows.map((draft, rowIndex) => {
                const hint = lastPerformedHints[exercise.id]?.[rowIndex];
                const repsPlaceholder =
                  hint?.reps ||
                  (exercise.reps != null ? String(exercise.reps) : t('workouts.repsPlaceholder'));
                const weightPlaceholder =
                  hint?.weight ||
                  (exercise.targetWeight != null
                    ? String(exercise.targetWeight)
                    : t('workouts.weightPlaceholder'));
                return (
                  <View key={rowIndex} style={[styles.fieldsRow, styles.setRow]}>
                    <TextInput
                      style={[formStyles.input, styles.field]}
                      value={draft.reps}
                      onChangeText={(value) => setDraftField(exercise, rowIndex, 'reps', value)}
                      placeholder={repsPlaceholder}
                      placeholderTextColor={colors.textFaint}
                      keyboardType="number-pad"
                      testID={`set-logging-${exercise.id}-reps-${rowIndex}`}
                    />
                    <TextInput
                      style={[formStyles.input, styles.field]}
                      value={draft.weight}
                      onChangeText={(value) => setDraftField(exercise, rowIndex, 'weight', value)}
                      placeholder={weightPlaceholder}
                      placeholderTextColor={colors.textFaint}
                      keyboardType="decimal-pad"
                      testID={`set-logging-${exercise.id}-weight-${rowIndex}`}
                    />
                  </View>
                );
              })}

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
        isPending={isCancelling || cancelSession.isPending}
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
