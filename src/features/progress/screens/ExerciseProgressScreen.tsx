import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { useExerciseProgress } from '../../workouts/hooks/useExerciseProgress';
import type { ExerciseProgressEntry } from '../../workouts/types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  exerciseId: string;
  exerciseName: string;
};

export function ExerciseProgressScreen({ exerciseId, exerciseName }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const progressQuery = useExerciseProgress(exerciseId);

  if (progressQuery.isLoading) {
    return (
      <View style={styles.centered} testID="exercise-progress-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (progressQuery.isError) {
    return (
      <View style={styles.centered} testID="exercise-progress-load-error">
        <Text style={formStyles.error}>{t('progress.loadError')}</Text>
      </View>
    );
  }

  const entries = progressQuery.data ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{exerciseName}</Text>

      {entries.length === 0 ? (
        <View style={styles.centered} testID="exercise-progress-empty">
          <Text style={styles.emptyBody}>{t('progress.emptyBody')}</Text>
        </View>
      ) : (
        <FlatList
          testID="exercise-progress-list"
          contentContainerStyle={styles.listContent}
          data={entries}
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => <EntryRow entry={item} locale={i18n.language} />}
        />
      )}
    </View>
  );
}

function EntryRow({ entry, locale }: { entry: ExerciseProgressEntry; locale: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildRowStyles(colors), [colors]);

  return (
    <View style={styles.row} testID={`exercise-progress-row-${entry.id}`}>
      <Text style={styles.date}>
        {/* timeZone: 'UTC' — scheduled_date is a plain calendar date with no time component,
            so formatting it in the device's local zone could shift it a day either way. */}
        {new Date(entry.scheduledDate).toLocaleDateString(locale, { timeZone: 'UTC' })}
      </Text>
      <Text style={styles.detail}>
        {t('progress.setEntry', {
          index: entry.setIndex + 1,
          weight: entry.weight ?? '—',
          reps: entry.repsDone ?? '—',
        })}
      </Text>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.md,
    },
    name: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 20,
      color: colors.textPrimary,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyBody: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    listContent: {
      gap: spacing.sm,
    },
  });
}

function buildRowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      backgroundColor: colors.surfaceTranslucent,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    date: {
      fontSize: 12,
      color: colors.textMuted,
    },
    detail: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });
}
