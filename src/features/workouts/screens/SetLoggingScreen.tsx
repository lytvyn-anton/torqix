import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CancelWorkoutSheet } from '../components/CancelWorkoutSheet';
import { useAbandonOrphanedSession } from '../hooks/useAbandonOrphanedSession';
import { useCancelSession } from '../hooks/useCancelSession';
import { useCompleteSession } from '../hooks/useCompleteSession';
import { useLastPerformedSets } from '../hooks/useLastPerformedSets';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useSetLogs } from '../hooks/useSetLogs';
import { useSyncSetLogs } from '../hooks/useSyncSetLogs';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import type { LogSetInput, ProgramDayExerciseDetail, SetLog } from '../types';
import { TrashIcon } from '../../../shared/components/icons/TrashIcon';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { toNullableFloat, toNullableInt } from '../../../shared/utils/numberInput';

type Props = {
  userId: string;
  sessionId: string;
  onCancelled: () => void;
  onCompleted: (sessionId: string) => void;
};

// A plain, fixed-width button (not animated to the live swipe distance): ReanimatedSwipeable
// measures this view's own rendered width to know how far the row can swipe, so shrinking it
// dynamically (e.g. to track the drag) would make the measured width 0 at rest and lock the
// gesture at "nothing to reveal" before the first swipe even starts.
function SetDeleteAction({
  onPress,
  accessibilityLabel,
  testID,
  iconColor,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  testID: string;
  iconColor: string;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <TrashIcon color={iconColor} size={18} />
    </TouchableOpacity>
  );
}

type Draft = { id: string; reps: string; weight: string };

// A stable per-row id, independent of the row's position in the array — used as the list
// key for each row's Swipeable so deleting a row unmounts *that* row's swipe state instead
// of a same-index sibling inheriting it (React would otherwise reuse the component instance
// at that index, carrying over the previous row's still-open swipe position). Two disjoint
// prefixes ("draft-initial"/"draft-added") keep computeInitialDrafts's render-time batch —
// which needs its own plain local counter, since reading/writing a real ref during render is
// unsafe (react-hooks/refs) — from ever colliding with ids handleAddSetRow hands out later
// from its own ref, in an event handler where that's fine.
function makeDraftId(counter: { current: number }, prefix: string): string {
  counter.current += 1;
  return `${prefix}-${counter.current}`;
}

function defaultDraft(
  exercise: ProgramDayExerciseDetail,
  idCounter: { current: number },
  idPrefix: string,
): Draft {
  return {
    id: makeDraftId(idCounter, idPrefix),
    reps: exercise.reps != null ? String(exercise.reps) : '',
    weight: exercise.targetWeight != null ? String(exercise.targetWeight) : '',
  };
}

function groupByExercise<T extends { exerciseId: string; setIndex: number }>(
  entries: T[],
  toDraft: (entry: T) => Draft,
): Map<string, Draft[]> {
  const byExercise = new Map<string, Draft[]>();
  for (const entry of [...entries].sort((a, b) => a.setIndex - b.setIndex)) {
    const list = byExercise.get(entry.exerciseId) ?? [];
    list.push(toDraft(entry));
    byExercise.set(entry.exerciseId, list);
  }
  return byExercise;
}

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

// Real, editable starting values for every card — not a placeholder hint — so opening the
// screen feels like a notebook that already has numbers in it rather than a blank form:
// whatever was already saved this session takes priority, then what was actually done the
// last time this exercise was finished, then the program's own target as a last resort. If
// the same exercise appears on two program-day-exercise cards in a day, its saved/last-time
// sets can't be told apart by card (set_logs only knows the exercise, not the card) — both
// land on whichever card comes first, a rare edge case rather than something worth a schema
// change for.
function computeInitialDrafts(
  exercises: ProgramDayExerciseDetail[],
  setLogs: SetLog[],
  lastPerformed: LogSetInput[],
): Record<string, Draft[]> {
  // A plain local counter, not a React ref — this whole function only ever runs during
  // render (see the isInitialized guard below), where reading/writing a real ref is unsafe.
  const idCounter = { current: 0 };
  const savedByExercise = groupByExercise(setLogs, (log) => ({
    id: makeDraftId(idCounter, 'draft-initial'),
    reps: log.repsDone != null ? String(log.repsDone) : '',
    weight: log.weight != null ? String(log.weight) : '',
  }));
  const lastPerformedByExercise = groupByExercise(lastPerformed, (entry) => ({
    id: makeDraftId(idCounter, 'draft-initial'),
    reps: entry.repsDone != null ? String(entry.repsDone) : '',
    weight: entry.weight != null ? String(entry.weight) : '',
  }));

  // "claimed" only gates the saved/last-performed tiers, which are keyed by exercise (shared,
  // ambiguous across two cards for the same exercise) — the target-based fallback is keyed by
  // the card's own program_day_exercises row, so a second card must still get its own target
  // rows even after the first card already consumed the shared saved/last-performed data.
  const claimed = new Set<string>();
  const drafts: Record<string, Draft[]> = {};
  for (const exercise of exercises) {
    if (!claimed.has(exercise.exerciseId)) {
      const saved = savedByExercise.get(exercise.exerciseId);
      if (saved && saved.length > 0) {
        claimed.add(exercise.exerciseId);
        drafts[exercise.id] = saved;
        continue;
      }
      const lastTime = lastPerformedByExercise.get(exercise.exerciseId);
      if (lastTime && lastTime.length > 0) {
        claimed.add(exercise.exerciseId);
        drafts[exercise.id] = lastTime;
        continue;
      }
    }
    if (exercise.sets != null && exercise.sets > 0) {
      drafts[exercise.id] = Array.from({ length: exercise.sets }, () =>
        defaultDraft(exercise, idCounter, 'draft-initial'),
      );
    }
  }
  return drafts;
}

export function SetLoggingScreen({ userId, sessionId, onCancelled, onCompleted }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const deleteSetLabel = t('workouts.deleteSet');

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
  const abandonOrphanedSession = useAbandonOrphanedSession(userId);

  // Each exercise's sets live here as plain draft rows — nothing is sent to the server as
  // you type. Everything currently in `drafts` is saved in one request when the user taps
  // "Finish workout", or when they leave the screen any other way (back button, switching
  // tabs) so closing without an explicit Finish doesn't lose it either.
  const [drafts, setDrafts] = useState<Record<string, Draft[]>>({});
  const nextDraftIdRef = useRef(0);
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // The unmount-flush effect below only runs once (empty deps) and reads exercisesQuery.data
  // from whichever render happened to be current at mount — this ref keeps it current so a
  // background refetch that resolves later doesn't leave it flushing against a stale list.
  const exercisesRef = useRef(exercisesQuery.data);
  useEffect(() => {
    exercisesRef.current = exercisesQuery.data;
  }, [exercisesQuery.data]);

  const isMountedRef = useRef(true);
  // True once the current drafts have been explicitly handled — saved via Finish, or
  // intentionally discarded via Cancel — so the unmount-flush effect below knows not to
  // save them again (redundant after Finish) or at all (Cancel means "throw this away").
  // Reset to false by any further edit, since that edit hasn't been handled yet.
  const isHandledRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (isHandledRef.current) return;
      // Leaving without pressing Finish or Cancel (back button, switching tabs, closing the
      // app) still needs to save whatever was typed — otherwise reopening this session later
      // would show no trace it was ever entered. The request is fired and left running after
      // unmount since it isn't tied to the component's lifecycle.
      const exercises = exercisesRef.current ?? [];
      syncSetLogs
        .mutateAsync({
          allExerciseIds: exercises.map((exercise) => exercise.exerciseId),
          inputs: buildInputs(exercises, draftsRef.current),
        })
        .catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sets the fields' starting values, once, the first render where all three queries have
  // data — set during render rather than in an Effect (React's documented pattern for
  // initializing state from data that just became available: it re-renders immediately with
  // the new state before anything is painted, instead of committing a wasted empty-fields
  // frame first).
  const [isInitialized, setIsInitialized] = useState(false);
  if (!isInitialized && exercisesQuery.data && setLogsQuery.data && !lastPerformedQuery.isLoading) {
    setIsInitialized(true);
    setDrafts(
      computeInitialDrafts(exercisesQuery.data, setLogsQuery.data, lastPerformedQuery.data ?? []),
    );
  }

  const setDraftField = (
    exercise: ProgramDayExerciseDetail,
    rowIndex: number,
    field: keyof Draft,
    value: string,
  ) => {
    isHandledRef.current = false;
    const rows = drafts[exercise.id] ?? [];
    setDrafts({
      ...drafts,
      [exercise.id]: rows.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)),
    });
  };

  const handleAddSetRow = (exercise: ProgramDayExerciseDetail) => {
    isHandledRef.current = false;
    const rows = drafts[exercise.id] ?? [];
    setDrafts({
      ...drafts,
      [exercise.id]: [...rows, defaultDraft(exercise, nextDraftIdRef, 'draft-added')],
    });
  };

  const handleDeleteSetRow = (exercise: ProgramDayExerciseDetail, rowIndex: number) => {
    isHandledRef.current = false;
    const rows = drafts[exercise.id] ?? [];
    setDrafts({ ...drafts, [exercise.id]: rows.filter((_, i) => i !== rowIndex) });
  };

  const handleConfirmCancel = () => {
    // Only marked handled once cancelSession actually succeeds — if it fails, the session is
    // still "planned" and unedited, so a later unmount (after the user dismisses the error and
    // leaves some other way) must still get a chance to save the current drafts instead of
    // silently discarding them for a cancel that never actually happened.
    cancelSession.mutate(sessionId, {
      onSuccess: () => {
        isHandledRef.current = true;
        onCancelled();
      },
    });
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await syncSetLogs.mutateAsync({
        allExerciseIds: (exercisesQuery.data ?? []).map((exercise) => exercise.exerciseId),
        inputs: buildInputs(exercisesQuery.data ?? [], drafts),
      });
      // Only marked handled once the save actually succeeds — if it fails, a later unmount
      // should still get a chance to save the same (still-current) drafts.
      isHandledRef.current = true;
      setSaveFailed(false);
      await completeSession.mutateAsync(sessionId);
      onCompleted(sessionId);
    } catch {
      setSaveFailed(true);
    } finally {
      if (isMountedRef.current) setIsSaving(false);
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

  if (
    sessionQuery.isError ||
    exercisesQuery.isError ||
    setLogsQuery.isError ||
    lastPerformedQuery.isError
  ) {
    return (
      <View style={styles.centered} testID="set-logging-load-error">
        <Text style={formStyles.error}>{t('workouts.loadError')}</Text>
      </View>
    );
  }

  // The session's program was deleted out from under it after this screen was already loading
  // (or reached directly, e.g. a stale link) — program_day_id was SET NULL, so there's no day
  // or exercises left to render. getTodaySession auto-skips this before Today ever offers a
  // "Continue" button for it, but this is still reachable directly, so show an explicit dead
  // end instead of the blank card list that useProgramDayExercises (disabled without a day id)
  // would otherwise leave behind.
  if (sessionQuery.data && sessionQuery.data.programDayId === null) {
    return (
      <View style={styles.centered} testID="set-logging-program-deleted">
        <Text style={formStyles.screenTitle}>{t('workouts.programDeletedTitle')}</Text>
        <Text style={styles.target}>{t('workouts.programDeletedBody')}</Text>
        {abandonOrphanedSession.isError && (
          <Text style={formStyles.error} testID="set-logging-program-deleted-error">
            {t('workouts.cancelError')}
          </Text>
        )}
        <TouchableOpacity
          style={[formStyles.primaryButton, styles.finishButton]}
          onPress={() =>
            // Not cancelSession: this state isn't the user choosing to discard a workout, it's
            // an external cause (the program got deleted) closing it out — any sets already
            // logged before that happened should survive, same as the auto-skip on Today.
            abandonOrphanedSession.mutate(sessionId, {
              onSuccess: () => {
                // No exercises were ever rendered on this dead-end screen, so there are no
                // drafts to flush — mark handled so the unmount effect doesn't fire a pointless
                // sync against a session that's already skipped.
                isHandledRef.current = true;
                onCancelled();
              },
            })
          }
          disabled={abandonOrphanedSession.isPending}
          accessibilityRole="button"
          testID="set-logging-program-deleted-cancel"
        >
          <Text style={formStyles.primaryButtonText}>{t('workouts.programDeletedCta')}</Text>
        </TouchableOpacity>
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
                <Swipeable
                  key={draft.id}
                  containerStyle={styles.setRow}
                  overshootRight={false}
                  renderRightActions={() => (
                    <SetDeleteAction
                      onPress={() => handleDeleteSetRow(exercise, rowIndex)}
                      accessibilityLabel={deleteSetLabel}
                      testID={`set-logging-${exercise.id}-delete-${rowIndex}`}
                      iconColor={colors.onAccent}
                      style={styles.deleteAction}
                    />
                  )}
                >
                  <View style={styles.fieldsRow}>
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
                </Swipeable>
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
    deleteAction: {
      width: 64,
      // Left margin, not padding: ReanimatedSwipeable measures this whole box (margin
      // included) to know how far to reveal, so the row swipes open exactly enough to
      // expose this gap too, instead of the button sitting flush against the fields.
      marginLeft: spacing.sm,
      backgroundColor: colors.error,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
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
