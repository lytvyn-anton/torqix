import { useNavigation, useRouter } from 'expo-router';
// Not part of expo-router's public API surface, but bundled inside it (expo-router vendors
// its own react-navigation core) — same reasoning as importing PlatformPressable from
// 'expo-router/build/react-navigation/elements' in the tab bar layout
// (app/(app)/(tabs)/_layout.tsx). usePreventRemove is what lets this screen show the
// Save/Discard sheet on back navigation instead of the old flow's silent autosave, which is
// the whole point of the Journal pivot (PLAN.md's Phase 5 section).
import { usePreventRemove } from 'expo-router/build/react-navigation/core';
import type { NavigationAction } from 'expo-router/build/react-navigation/routers';
import { useMemo, useRef, useState } from 'react';
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

import { SaveDiscardSheet } from '../components/SaveDiscardSheet';
import { useCreateJournalEntry } from '../hooks/useCreateJournalEntry';
import { useJournal } from '../hooks/useJournal';
import { useLastPerformedJournalSets } from '../hooks/useLastPerformedJournalSets';
import type { SetLogInput } from '../types';
import { useProgram } from '../../programs/hooks/useProgram';
import type { ProgramDetailExercise } from '../../programs/types';
import { TrashIcon } from '../../../shared/components/icons/TrashIcon';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { toNullableFloat, toNullableInt } from '../../../shared/utils/numberInput';

type Props = {
  userId: string;
  journalId: string;
  // Set when arriving from the Home tab's JournalWidgetCard, which lets the user tap a
  // specific program day rather than always landing on the "which day?" picker below —
  // ignored if it doesn't match one of this journal's program's days (e.g. stale deep link).
  initialDayId?: string;
};

type Draft = { id: string; reps: string; weight: string };

// A plain, fixed-width button (not animated to the live swipe distance) — see the same note
// on the old SetLoggingScreen this is adapted from: ReanimatedSwipeable measures this view's
// own rendered width to know how far the row can swipe.
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

function makeDraftId(counter: { current: number }, prefix: string): string {
  counter.current += 1;
  return `${prefix}-${counter.current}`;
}

function defaultDraft(
  exercise: ProgramDetailExercise,
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

// Drafts are keyed by the exercise's position in the day's list, not its exercise id —
// ProgramDetailExercise (programsApi.getProgram's shape) has no program_day_exercises row id
// to key by, so two cards for the same exercise on one day (a rare setup) would otherwise
// collide. The lastPerformed tier is still looked up by exercise id, same as the old
// SetLoggingScreen's "claimed" logic, so only the first card for a shared exercise gets it.
function computeInitialDrafts(
  exercises: ProgramDetailExercise[],
  lastPerformed: SetLogInput[],
  idCounter: { current: number },
): Record<number, Draft[]> {
  const lastPerformedByExercise = groupByExercise(lastPerformed, (entry) => ({
    id: makeDraftId(idCounter, 'draft-initial'),
    reps: entry.repsDone != null ? String(entry.repsDone) : '',
    weight: entry.weight != null ? String(entry.weight) : '',
  }));

  const claimed = new Set<string>();
  const drafts: Record<number, Draft[]> = {};
  exercises.forEach((exercise, index) => {
    if (!claimed.has(exercise.exerciseId)) {
      const lastTime = lastPerformedByExercise.get(exercise.exerciseId);
      if (lastTime && lastTime.length > 0) {
        claimed.add(exercise.exerciseId);
        drafts[index] = lastTime;
        return;
      }
    }
    if (exercise.sets != null && exercise.sets > 0) {
      drafts[index] = Array.from({ length: exercise.sets }, () =>
        defaultDraft(exercise, idCounter, 'draft-initial'),
      );
    }
  });
  return drafts;
}

// set_index is assigned from a running per-exercise counter (not a row's raw array
// position) so a blank skipped row can't leave a numbering gap, and two cards sharing the
// same underlying exercise can't both start at 0 and collide (see journal_entry_set_logs'
// unique (journal_entry_id, exercise_id, set_index) constraint).
function buildInputs(
  exercises: ProgramDetailExercise[],
  drafts: Record<number, Draft[]>,
): SetLogInput[] {
  const inputs: SetLogInput[] = [];
  const nextSetIndexByExercise: Record<string, number> = {};
  exercises.forEach((exercise, index) => {
    (drafts[index] ?? []).forEach((row) => {
      const repsDone = toNullableInt(row.reps);
      const weight = toNullableFloat(row.weight);
      if (repsDone == null && weight == null) return;
      const setIndex = nextSetIndexByExercise[exercise.exerciseId] ?? 0;
      nextSetIndexByExercise[exercise.exerciseId] = setIndex + 1;
      inputs.push({ exerciseId: exercise.exerciseId, setIndex, repsDone, weight });
    });
  });
  return inputs;
}

export function JournalEntryScreen({ userId, journalId, initialDayId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const deleteSetLabel = t('journal.deleteSet');

  const journalQuery = useJournal(journalId);
  const programQuery = useProgram(journalQuery.data?.programId ?? undefined);
  const createEntry = useCreateJournalEntry(userId);

  const days = programQuery.data?.days ?? [];
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  // Auto-picks initialDayId (arrived here via a specific day on the Home tab's
  // JournalWidgetCard) or the only day there is — set during render (React's documented
  // pattern for deriving state from data that just became available) rather than an Effect,
  // so there's no wasted frame showing a picker with a single, pointless, or already-decided
  // option.
  const initialDayMatches = initialDayId != null && days.some((day) => day.id === initialDayId);
  if (selectedDayId === null && initialDayMatches) {
    setSelectedDayId(initialDayId as string);
  } else if (selectedDayId === null && !initialDayMatches && days.length === 1) {
    setSelectedDayId(days[0].id);
  }
  const selectedDay = days.find((day) => day.id === selectedDayId) ?? null;
  const exercises = useMemo(() => selectedDay?.exercises ?? [], [selectedDay]);
  const exerciseIds = useMemo(
    () => Array.from(new Set(exercises.map((exercise) => exercise.exerciseId))),
    [exercises],
  );
  const lastPerformedQuery = useLastPerformedJournalSets(exerciseIds);

  // Nothing here is sent to the server as you type — everything currently in `drafts` is
  // saved in one request only when the user taps Save. Leaving any other way (back button,
  // gesture) with unsaved changes is caught by usePreventRemove below instead of silently
  // autosaving or discarding, unlike the old workout-session flow.
  const [drafts, setDrafts] = useState<Record<number, Draft[]>>({});
  const nextDraftIdRef = useRef(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const pendingActionRef = useRef<NavigationAction | null>(null);

  usePreventRemove(isDirty, ({ data }) => {
    pendingActionRef.current = data.action;
    setSheetVisible(true);
  });

  if (!isInitialized && selectedDay && !lastPerformedQuery.isLoading) {
    setIsInitialized(true);
    const idCounter = { current: 0 };
    setDrafts(computeInitialDrafts(exercises, lastPerformedQuery.data ?? [], idCounter));
  }

  const setDraftField = (
    exerciseIndex: number,
    rowIndex: number,
    field: keyof Draft,
    value: string,
  ) => {
    if (!isDirty) setIsDirty(true);
    const rows = drafts[exerciseIndex] ?? [];
    setDrafts({
      ...drafts,
      [exerciseIndex]: rows.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)),
    });
  };

  const handleAddSetRow = (exercise: ProgramDetailExercise, exerciseIndex: number) => {
    if (!isDirty) setIsDirty(true);
    const rows = drafts[exerciseIndex] ?? [];
    setDrafts({
      ...drafts,
      [exerciseIndex]: [...rows, defaultDraft(exercise, nextDraftIdRef, 'draft-added')],
    });
  };

  const handleDeleteSetRow = (exerciseIndex: number, rowIndex: number) => {
    if (!isDirty) setIsDirty(true);
    const rows = drafts[exerciseIndex] ?? [];
    setDrafts({ ...drafts, [exerciseIndex]: rows.filter((_, i) => i !== rowIndex) });
  };

  // Completes whatever navigation was deferred by usePreventRemove (leaving via back
  // button/gesture) once its unsaved-changes prompt has been resolved one way or the other.
  // Dispatching that exact preserved action is what lets it go through despite `isDirty`
  // still being true at this point — same pattern as react-navigation's own
  // usePreventRemove docs. Falls back to a plain router.back() for the direct Save button,
  // which never went through that prompt in the first place.
  const leaveScreen = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pendingAction) {
      navigation.dispatch(pendingAction);
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    createEntry.mutate(
      { journalId, programDayId: selectedDayId, sets: buildInputs(exercises, drafts) },
      {
        onSuccess: () => {
          setIsDirty(false);
          setSheetVisible(false);
          leaveScreen();
        },
      },
    );
  };

  const handleDiscard = () => {
    setIsDirty(false);
    setSheetVisible(false);
    leaveScreen();
  };

  const handleKeepEditing = () => {
    pendingActionRef.current = null;
    setSheetVisible(false);
  };

  if (journalQuery.isLoading) {
    return (
      <View style={styles.centered} testID="journal-entry-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (journalQuery.isError || !journalQuery.data) {
    return (
      <View style={styles.centered} testID="journal-entry-load-error">
        <Text style={formStyles.error}>{t('journal.loadError')}</Text>
      </View>
    );
  }

  // The journal's program was deleted out from under it (program_id was SET NULL) — there's
  // no day or exercises left to log against, so this is a dead end rather than an empty
  // logging screen.
  if (journalQuery.data.programId === null) {
    return (
      <View style={styles.centered} testID="journal-entry-orphaned">
        <Text style={formStyles.screenTitle}>{t('journal.orphanedTitle')}</Text>
        <Text style={styles.target}>{t('journal.orphanedBody')}</Text>
      </View>
    );
  }

  if (programQuery.isLoading) {
    return (
      <View style={styles.centered} testID="journal-entry-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (programQuery.isError || !programQuery.data) {
    return (
      <View style={styles.centered} testID="journal-entry-load-error">
        <Text style={formStyles.error}>{t('journal.loadError')}</Text>
      </View>
    );
  }

  if (days.length === 0) {
    return (
      <View style={styles.centered} testID="journal-entry-no-days">
        <Text style={formStyles.screenTitle}>{t('journal.noDaysTitle')}</Text>
        <Text style={styles.target}>{t('journal.noDaysBody')}</Text>
      </View>
    );
  }

  if (!selectedDay) {
    return (
      <View style={styles.centered} testID="journal-entry-choose-day">
        <Text style={formStyles.screenTitle}>{t('journal.chooseDayTitle')}</Text>
        {days.map((day) => (
          <TouchableOpacity
            key={day.id}
            style={[formStyles.primaryButton, styles.dayButton]}
            onPress={() => setSelectedDayId(day.id)}
            accessibilityRole="button"
            testID={`journal-entry-choose-day-${day.id}`}
          >
            <Text style={formStyles.primaryButtonText}>{day.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (lastPerformedQuery.isLoading || !isInitialized) {
    return (
      <View style={styles.centered} testID="journal-entry-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (lastPerformedQuery.isError) {
    return (
      <View style={styles.centered} testID="journal-entry-load-error">
        <Text style={formStyles.error}>{t('journal.loadError')}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={formStyles.screenTitle}>{selectedDay.name}</Text>

        {exercises.map((exercise, exerciseIndex) => {
          const rows = drafts[exerciseIndex] ?? [];
          return (
            <View
              key={exerciseIndex}
              style={[formStyles.glassSurface, styles.exerciseCard]}
              testID={`journal-entry-exercise-${exerciseIndex}`}
            >
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
                  testID={`journal-entry-${exerciseIndex}-progress`}
                >
                  <Text style={styles.progressLink}>{t('journal.viewProgress')}</Text>
                </TouchableOpacity>
              </View>
              {(exercise.sets != null || exercise.reps != null) && (
                <Text style={styles.target}>
                  {t('journal.target', { sets: exercise.sets ?? '—', reps: exercise.reps ?? '—' })}
                </Text>
              )}

              {rows.map((draft, rowIndex) => (
                <Swipeable
                  key={draft.id}
                  containerStyle={styles.setRow}
                  overshootRight={false}
                  renderRightActions={() => (
                    <SetDeleteAction
                      onPress={() => handleDeleteSetRow(exerciseIndex, rowIndex)}
                      accessibilityLabel={deleteSetLabel}
                      testID={`journal-entry-${exerciseIndex}-delete-${rowIndex}`}
                      iconColor={colors.onAccent}
                      style={styles.deleteAction}
                    />
                  )}
                >
                  <View style={styles.fieldsRow}>
                    <TextInput
                      style={[formStyles.input, styles.field]}
                      value={draft.reps}
                      onChangeText={(value) =>
                        setDraftField(exerciseIndex, rowIndex, 'reps', value)
                      }
                      placeholder={t('journal.repsPlaceholder')}
                      placeholderTextColor={colors.textFaint}
                      keyboardType="number-pad"
                      testID={`journal-entry-${exerciseIndex}-reps-${rowIndex}`}
                    />
                    <TextInput
                      style={[formStyles.input, styles.field]}
                      value={draft.weight}
                      onChangeText={(value) =>
                        setDraftField(exerciseIndex, rowIndex, 'weight', value)
                      }
                      placeholder={t('journal.weightPlaceholder')}
                      placeholderTextColor={colors.textFaint}
                      keyboardType="decimal-pad"
                      testID={`journal-entry-${exerciseIndex}-weight-${rowIndex}`}
                    />
                  </View>
                </Swipeable>
              ))}

              <TouchableOpacity
                onPress={() => handleAddSetRow(exercise, exerciseIndex)}
                style={styles.addSetButton}
                accessibilityRole="button"
                testID={`journal-entry-${exerciseIndex}-add-set`}
              >
                <Text style={styles.rowButtonText}>{t('journal.addSet')}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {createEntry.isError && (
          <Text style={formStyles.error} testID="journal-entry-save-error">
            {t('journal.saveError')}
          </Text>
        )}

        <TouchableOpacity
          style={[formStyles.primaryButton, styles.saveButton]}
          onPress={handleSave}
          disabled={createEntry.isPending}
          accessibilityRole="button"
          testID="journal-entry-save"
        >
          <Text style={formStyles.primaryButtonText}>{t('journal.save')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <SaveDiscardSheet
        visible={sheetVisible}
        isError={createEntry.isError}
        isPending={createEntry.isPending}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onKeepEditing={handleKeepEditing}
      />
    </>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.md,
    },
    dayButton: {
      alignSelf: 'stretch',
    },
    container: {
      padding: spacing.xl,
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
    saveButton: {
      marginTop: spacing.md,
    },
  });
}
