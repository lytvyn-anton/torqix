import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePickerScreen } from '../../exercises/screens/ExercisePickerScreen';
import type { Exercise } from '../../exercises/types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';
import { useCreateProgram } from '../hooks/useCreateProgram';
import type { CreateProgramInput } from '../types';

type Props = {
  userId: string;
};

type ExerciseField = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  sets: string;
  reps: string;
  weight: string;
};

type DayField = {
  key: string;
  name: string;
  exercises: ExerciseField[];
};

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

export function ProgramCreateScreen({ userId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const createProgram = useCreateProgram(userId);
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  // Keys are only for list identity across add/remove — the underlying data itself is
  // what gets saved, so simple incrementing counters are enough (no uuid needed).
  const nextDayKey = useRef(1);
  const nextExerciseKey = useRef(0);

  const [name, setName] = useState('');
  const [days, setDays] = useState<DayField[]>([{ key: '0', name: '', exercises: [] }]);
  const [pickerForDayKey, setPickerForDayKey] = useState<string | null>(null);

  const addDay = () => {
    setDays((current) => [
      ...current,
      { key: String(nextDayKey.current++), name: '', exercises: [] },
    ]);
  };

  const updateDay = (key: string, value: string) => {
    setDays((current) => current.map((day) => (day.key === key ? { ...day, name: value } : day)));
  };

  const removeDay = (key: string) => {
    setDays((current) => current.filter((day) => day.key !== key));
  };

  // Shared by add/update/remove below so the day-lookup logic only lives in one place.
  const updateDayExercises = (
    dayKey: string,
    updater: (exercises: ExerciseField[]) => ExerciseField[],
  ) => {
    setDays((current) =>
      current.map((day) =>
        day.key === dayKey ? { ...day, exercises: updater(day.exercises) } : day,
      ),
    );
  };

  const addExercise = (dayKey: string, exercise: Exercise) => {
    updateDayExercises(dayKey, (exercises) => [
      ...exercises,
      {
        key: String(nextExerciseKey.current++),
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: '3',
        reps: '10',
        weight: '',
      },
    ]);
    setPickerForDayKey(null);
  };

  const updateExercise = (
    dayKey: string,
    exerciseKey: string,
    field: 'sets' | 'reps' | 'weight',
    value: string,
  ) => {
    updateDayExercises(dayKey, (exercises) =>
      exercises.map((exercise) =>
        exercise.key === exerciseKey ? { ...exercise, [field]: value } : exercise,
      ),
    );
  };

  const removeExercise = (dayKey: string, exerciseKey: string) => {
    updateDayExercises(dayKey, (exercises) =>
      exercises.filter((exercise) => exercise.key !== exerciseKey),
    );
  };

  const trimmedName = name.trim();
  const validDays = days.filter((day) => day.name.trim().length > 0);
  // A day left blank on purpose (no name, no exercises) is fine to silently drop — that's
  // the existing "extra blank row" flow. But a day with exercises already picked for it
  // must not vanish just because its name field is momentarily/accidentally empty.
  const hasOrphanedExercises = days.some(
    (day) => day.name.trim().length === 0 && day.exercises.length > 0,
  );
  const canSave =
    trimmedName.length > 0 &&
    validDays.length > 0 &&
    !hasOrphanedExercises &&
    !createProgram.isPending;

  const handleSave = () => {
    if (!canSave) return;
    const input: CreateProgramInput = {
      name: trimmedName,
      days: validDays.map((day) => ({
        name: day.name.trim(),
        exercises: day.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: toNullableInt(exercise.sets),
          reps: toNullableInt(exercise.reps),
          targetWeight: toNullableFloat(exercise.weight),
        })),
      })),
    };
    createProgram.mutate(input, { onSuccess: () => router.back() });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.label}>{t('programs.nameLabel')}</Text>
        <TextInput
          style={formStyles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('programs.namePlaceholder')}
          placeholderTextColor={colors.textFaint}
          testID="program-create-name"
        />

        <Text style={styles.label}>{t('programs.daysLabel')}</Text>
        {days.map((day, index) => (
          <View key={day.key} style={styles.dayCard}>
            <View style={styles.dayRow}>
              <TextInput
                style={[formStyles.input, styles.dayInput]}
                value={day.name}
                onChangeText={(value) => updateDay(day.key, value)}
                placeholder={t('programs.dayPlaceholder')}
                placeholderTextColor={colors.textFaint}
                testID={`program-create-day-${index}`}
              />
              {days.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeDay(day.key)}
                  style={styles.removeDay}
                  accessibilityRole="button"
                  accessibilityLabel={t('programs.removeDay')}
                  testID={`program-create-remove-day-${index}`}
                >
                  <Text style={styles.removeDayText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            {day.exercises.length > 0 && (
              <Text style={styles.exercisesLabel}>{t('programs.exercisesLabel')}</Text>
            )}
            {day.exercises.map((exercise, exerciseIndex) => (
              <View key={exercise.key} style={styles.exerciseRow}>
                <View style={styles.exerciseNameRow}>
                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                  <TouchableOpacity
                    onPress={() => removeExercise(day.key, exercise.key)}
                    accessibilityRole="button"
                    accessibilityLabel={t('programs.removeExercise')}
                    testID={`program-create-day-${index}-exercise-${exerciseIndex}-remove`}
                  >
                    <Text style={styles.removeDayText}>×</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.exerciseFieldsRow}>
                  <TextInput
                    style={[formStyles.input, styles.exerciseField]}
                    value={exercise.sets}
                    onChangeText={(value) => updateExercise(day.key, exercise.key, 'sets', value)}
                    placeholder={t('programs.setsPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                    testID={`program-create-day-${index}-exercise-${exerciseIndex}-sets`}
                  />
                  <TextInput
                    style={[formStyles.input, styles.exerciseField]}
                    value={exercise.reps}
                    onChangeText={(value) => updateExercise(day.key, exercise.key, 'reps', value)}
                    placeholder={t('programs.repsPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                    testID={`program-create-day-${index}-exercise-${exerciseIndex}-reps`}
                  />
                  <TextInput
                    style={[formStyles.input, styles.exerciseField]}
                    value={exercise.weight}
                    onChangeText={(value) => updateExercise(day.key, exercise.key, 'weight', value)}
                    placeholder={t('programs.weightPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    testID={`program-create-day-${index}-exercise-${exerciseIndex}-weight`}
                  />
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setPickerForDayKey(day.key)}
              style={styles.addExercise}
              accessibilityRole="button"
              testID={`program-create-day-${index}-add-exercise`}
            >
              <Text style={styles.addDayText}>{t('programs.addExercise')}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={addDay}
          style={styles.addDay}
          accessibilityRole="button"
          testID="program-create-add-day"
        >
          <Text style={styles.addDayText}>{t('programs.addDay')}</Text>
        </TouchableOpacity>

        {hasOrphanedExercises && (
          <Text style={formStyles.error} testID="program-create-orphaned-exercises-error">
            {t('programs.orphanedExercisesError')}
          </Text>
        )}

        {createProgram.isError && (
          <Text style={formStyles.error} testID="program-create-error">
            {t('programs.createError')}
          </Text>
        )}

        <TouchableOpacity
          style={[formStyles.primaryButton, styles.saveButton, !canSave && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          testID="program-create-save"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{t('programs.create')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <ExercisePickerScreen
        // Remounts on every open/close (the key always passes through 'closed' in
        // between), so each opening starts with a clean search/filter state instead of
        // carrying over whatever was left from adding the previous exercise.
        key={pickerForDayKey ?? 'closed'}
        visible={pickerForDayKey !== null}
        onSelect={(exercise) => {
          if (pickerForDayKey !== null) addExercise(pickerForDayKey, exercise);
        }}
        onClose={() => setPickerForDayKey(null)}
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
    scroll: {
      flex: 1,
    },
    container: {
      padding: spacing.xl,
      gap: spacing.sm,
    },
    label: {
      fontWeight: '600',
      marginTop: spacing.sm,
      color: colors.textPrimary,
    },
    dayCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: spacing.md,
      gap: spacing.sm,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dayInput: {
      flex: 1,
    },
    removeDay: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeDayText: {
      fontSize: 20,
      color: colors.textMuted,
    },
    exercisesLabel: {
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 12,
      textTransform: 'uppercase',
    },
    exerciseRow: {
      gap: spacing.xs,
    },
    exerciseNameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    exerciseName: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    exerciseFieldsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    exerciseField: {
      flex: 1,
    },
    addExercise: {
      alignSelf: 'flex-start',
    },
    addDay: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.sm,
    },
    addDayText: {
      color: colors.accentDark,
      fontWeight: '600',
    },
    saveButton: {
      marginTop: spacing.xl,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
}
