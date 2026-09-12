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
import { useJournalDays } from '../hooks/useJournalDays';
import { useLastPerformedJournalSets } from '../hooks/useLastPerformedJournalSets';
import type { JournalDayExercise, SetLogInput } from '../types';
import { ExercisePickerScreen } from '../../exercises/screens/ExercisePickerScreen';
import type { Exercise } from '../../exercises/types';
import { TrashIcon } from '../../../shared/components/icons/TrashIcon';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { toNullableFloat, toNullableInt } from '../../../shared/utils/numberInput';

type Props = {
  userId: string;
  journalId: string;
  // Optionally pre-selects a specific cloned day (via the journal-entry/[journalId] route's
  // ?dayId param) rather than landing on the "which day?" picker below — ignored if it
  // doesn't match one of this journal's own days (e.g. a stale deep link). No current
  // in-app entry point passes this; kept as the route already supports it.
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
  exercise: JournalDayExercise,
  idCounter: { current: number },
  idPrefix: string,
): Draft {
  return {
    id: makeDraftId(idCounter, idPrefix),
    reps: exercise.reps != null ? String(exercise.reps) : '',
    weight: exercise.targetWeight != null ? String(exercise.targetWeight) : '',
  };
}

// An exercise added ad hoc (via the picker below), not one of the program day's predefined
// ones — no target sets/reps/weight, since there's no plan behind it, just what actually
// gets logged.
function toAdHocExercise(exercise: Exercise): JournalDayExercise {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: null,
    reps: null,
    targetWeight: null,
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
// JournalDayExercise (journalApi's getJournalDays shape) has no journal_day_exercises row id
// to key by, so two cards for the same exercise on one day (a rare setup) would otherwise
// collide. The lastPerformed tier is still looked up by exercise id, same as the old
// SetLoggingScreen's "claimed" logic, so only the first card for a shared exercise gets it.
function computeInitialDrafts(
  exercises: JournalDayExercise[],
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
  exercises: JournalDayExercise[],
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
  // journal_days is the journal's own one-time copy of whatever days/exercises it was cloned
  // from (see journalApi's cloneProgramDaysIntoJournal) — a journal that was never cloned
  // from a program (or a program with no days at the time) simply has none, and this screen
  // treats that the same way: not a dead end, just a blank entry to log ad hoc against (see
  // the days.length === 0 handling below). One query, keyed by journalId, which is always
  // known up front — unlike the old live-program lookup this replaced, there's no second
  // query whose own loading state could be mistaken for "no days".
  const journalDaysQuery = useJournalDays(journalId);
  const createEntry = useCreateJournalEntry(userId);

  const days = journalDaysQuery.data ?? [];
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  // Auto-picks initialDayId (see the Props comment above) or the only day there is — set
  // during render (React's documented pattern for deriving state from data that just became
  // available) rather than an Effect, so there's no wasted frame showing a picker with a
  // single, pointless, or already-decided option.
  const initialDayMatches = initialDayId != null && days.some((day) => day.id === initialDayId);
  if (selectedDayId === null && initialDayMatches) {
    setSelectedDayId(initialDayId as string);
  } else if (selectedDayId === null && !initialDayMatches && days.length === 1) {
    setSelectedDayId(days[0].id);
  }
  const selectedDay = days.find((day) => day.id === selectedDayId) ?? null;
  const exerciseIdsForLastPerformed = useMemo(
    () =>
      Array.from(new Set((selectedDay?.exercises ?? []).map((exercise) => exercise.exerciseId))),
    [selectedDay],
  );
  const lastPerformedQuery = useLastPerformedJournalSets(exerciseIdsForLastPerformed);

  // The exercise cards shown for this entry — seeded once from the selected day's predefined
  // exercises (if any), then freely editable: "+ Add exercise" below appends to this same
  // list, ad hoc, with no day or program behind the addition. State, not derived from
  // selectedDay, precisely so an added exercise survives independently of it.
  const [exercises, setExercises] = useState<JournalDayExercise[]>([]);
  // Nothing here is sent to the server as you type — everything currently in `drafts` is
  // saved in one request only when the user taps Save. Leaving any other way (back button,
  // gesture) with unsaved changes is caught by usePreventRemove below instead of silently
  // autosaving or discarding, unlike the old workout-session flow.
  const [drafts, setDrafts] = useState<Record<number, Draft[]>>({});
  const nextDraftIdRef = useRef(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const pendingActionRef = useRef<NavigationAction | null>(null);

  usePreventRemove(isDirty, ({ data }) => {
    pendingActionRef.current = data.action;
    setSheetVisible(true);
  });

  // Fires once either a day is picked (or auto-picked above) or there's nothing to pick from
  // at all (no cloned days) — the latter starts from a blank exercise list rather than
  // waiting forever on a day that will never be selected. Gated on journalDaysQuery.isLoading
  // so a still-loading fetch (days=[] on every render until it resolves) can't be mistaken
  // for "no days" and lock in that blank list prematurely.
  if (
    !isInitialized &&
    !journalDaysQuery.isLoading &&
    (days.length === 0 || selectedDay) &&
    !lastPerformedQuery.isLoading
  ) {
    setIsInitialized(true);
    const idCounter = { current: 0 };
    const initialExercises = selectedDay?.exercises ?? [];
    setExercises(initialExercises);
    setDrafts(computeInitialDrafts(initialExercises, lastPerformedQuery.data ?? [], idCounter));
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

  const handleAddSetRow = (exercise: JournalDayExercise, exerciseIndex: number) => {
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

  const handleAddExercise = (exercise: Exercise) => {
    if (!isDirty) setIsDirty(true);
    setExercises((current) => [...current, toAdHocExercise(exercise)]);
    setPickerVisible(false);
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
      { journalId, journalDayId: selectedDayId, sets: buildInputs(exercises, drafts) },
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

  if (journalDaysQuery.isLoading) {
    return (
      <View style={styles.centered} testID="journal-entry-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only fatal on a first load with no cached days yet — a background refetch error
  // shouldn't hide an already-loaded, still-loggable day list, same guard as elsewhere.
  if (journalDaysQuery.isError && journalDaysQuery.data === undefined) {
    return (
      <View style={styles.centered} testID="journal-entry-load-error">
        <Text style={formStyles.error}>{t('journal.loadError')}</Text>
      </View>
    );
  }

  if (days.length > 0 && !selectedDay) {
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
        <Text style={formStyles.screenTitle}>{selectedDay?.name ?? journalQuery.data.name}</Text>

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

        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={styles.addExerciseButton}
          accessibilityRole="button"
          testID="journal-entry-add-exercise"
        >
          <Text style={styles.rowButtonText}>{t('programs.addExercise')}</Text>
        </TouchableOpacity>

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

      <ExercisePickerScreen
        // Remounts on every open/close (the key always passes through 'closed' in between),
        // so each opening starts with a clean search/filter state — same reasoning as
        // ProgramForm's use of this component.
        key={pickerVisible ? 'open' : 'closed'}
        visible={pickerVisible}
        onSelect={handleAddExercise}
        onClose={() => setPickerVisible(false)}
      />

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
    addExerciseButton: {
      alignSelf: 'flex-start',
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
