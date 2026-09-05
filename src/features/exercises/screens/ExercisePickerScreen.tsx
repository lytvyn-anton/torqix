import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { useExercises } from '../hooks/useExercises';
import type { Exercise } from '../types';

type Props = {
  visible: boolean;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
};

// `null` selects every muscle group — a real value keeps "no filter" out of the same
// string space as an actual muscle group, instead of relying on a sentinel string that
// could theoretically collide with catalog data.
const ALL_MUSCLE_GROUPS = null;

export function ExercisePickerScreen({ visible, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const { data: exercises, isLoading, isError } = useExercises();

  // Search/filter state resets each time the picker is (re)opened because the caller
  // remounts this component via a `key` change on open/close, rather than leaving one
  // invocation's search behind to silently hide exercises on the next "+ Add exercise".
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(ALL_MUSCLE_GROUPS);

  const muscleGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const exercise of exercises ?? []) {
      if (exercise.muscleGroup) groups.add(exercise.muscleGroup);
    }
    return Array.from(groups).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (exercises ?? []).filter((exercise) => {
      const matchesGroup =
        muscleGroup === ALL_MUSCLE_GROUPS || exercise.muscleGroup === muscleGroup;
      const matchesQuery =
        normalizedQuery.length === 0 || exercise.name.toLowerCase().includes(normalizedQuery);
      return matchesGroup && matchesQuery;
    });
  }, [exercises, muscleGroup, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      testID="exercise-picker"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={formStyles.screenTitle}>{t('exercises.pickerTitle')}</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            testID="exercise-picker-close"
          >
            <Text style={styles.closeText}>{t('exercises.close')}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[formStyles.input, styles.search]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('exercises.searchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          testID="exercise-picker-search"
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={styles.chipRowContent}
          data={[ALL_MUSCLE_GROUPS, ...muscleGroups]}
          keyExtractor={(group) => group ?? 'all'}
          renderItem={({ item: group }) => {
            const selected = group === muscleGroup;
            const label =
              group === ALL_MUSCLE_GROUPS
                ? t('exercises.allMuscleGroups')
                : t(`exercises.muscleGroup.${group}`, { defaultValue: group });
            return (
              <TouchableOpacity
                onPress={() => setMuscleGroup(group)}
                style={[styles.chip, selected && styles.chipSelected]}
                testID={`exercise-picker-filter-${group ?? 'all'}`}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {isLoading && <ActivityIndicator style={styles.stateIndicator} color={colors.accent} />}
        {isError && (
          <Text style={[formStyles.error, styles.stateIndicator]}>{t('exercises.loadError')}</Text>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <Text style={[styles.noResults, styles.stateIndicator]}>{t('exercises.noResults')}</Text>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(exercise) => exercise.id}
          renderItem={({ item: exercise }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onSelect(exercise)}
              testID={`exercise-picker-item-${exercise.id}`}
            >
              <Text style={styles.rowName}>{exercise.name}</Text>
              {exercise.muscleGroup && (
                <Text style={styles.rowMeta}>
                  {t(`exercises.muscleGroup.${exercise.muscleGroup}`, {
                    defaultValue: exercise.muscleGroup,
                  })}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
    },
    closeText: {
      color: colors.accentDark,
      fontWeight: '600',
    },
    search: {
      marginBottom: spacing.md,
    },
    chipRow: {
      flexGrow: 0,
      marginBottom: spacing.md,
    },
    chipRowContent: {
      gap: spacing.sm,
    },
    chip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.textMuted,
      fontWeight: '600',
    },
    chipTextSelected: {
      color: colors.onAccent,
    },
    stateIndicator: {
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    noResults: {
      color: colors.textMuted,
    },
    row: {
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowName: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 16,
    },
    rowMeta: {
      color: colors.textMuted,
      marginTop: 2,
    },
  });
}
