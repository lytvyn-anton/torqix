import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLoggedExercises } from '../../workouts/hooks/useLoggedExercises';
import type { ExerciseSummary } from '../../workouts/types';
import { TrendingUpIcon } from '../../../shared/components/icons/TabIcons';
import { useFloatingTabBarClearance } from '../../../shared/hooks/useFloatingTabBarClearance';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
};

export function ProgressScreen({ userId }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const tabBarClearance = useFloatingTabBarClearance();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const exercisesQuery = useLoggedExercises(userId);

  if (exercisesQuery.isLoading) {
    return (
      <View style={styles.centered} testID="progress-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (exercisesQuery.isError && exercisesQuery.data === undefined) {
    return (
      <View style={styles.centered} testID="progress-load-error">
        <Text style={styles.error}>{t('progressTab.loadError')}</Text>
      </View>
    );
  }

  const exercises = exercisesQuery.data ?? [];

  if (exercises.length === 0) {
    return (
      <View style={styles.centered} testID="progress-empty">
        <View style={styles.emptyIcon}>
          <TrendingUpIcon color={colors.accentDark} size={24} />
        </View>
        <Text style={styles.emptyTitle}>{t('progressTab.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('progressTab.emptyBody')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="progress-list"
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg + tabBarClearance }]}
      data={exercises}
      keyExtractor={(item) => item.exerciseId}
      renderItem={({ item }) => (
        <ExerciseRow
          exercise={item}
          locale={i18n.language}
          onPress={() =>
            router.push({
              pathname: '/exercise-progress/[exerciseId]',
              params: { exerciseId: item.exerciseId, name: item.exerciseName },
            })
          }
        />
      )}
    />
  );
}

function ExerciseRow({
  exercise,
  locale,
  onPress,
}: {
  exercise: ExerciseSummary;
  locale: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildRowStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      testID={`progress-row-${exercise.exerciseId}`}
    >
      <Text style={styles.name}>{exercise.exerciseName}</Text>
      <Text style={styles.meta}>
        {t('progressTab.lastPerformed', {
          // timeZone: 'UTC' — scheduled_date is a plain calendar date with no time component,
          // so formatting it in the device's local zone could shift it a day either way.
          date: new Date(exercise.lastScheduledDate).toLocaleDateString(locale, {
            timeZone: 'UTC',
          }),
          count: exercise.lastSessionSetCount,
        })}
      </Text>
    </TouchableOpacity>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      // Transparent, not colors.background — the ambient Background sits behind the whole
      // tab navigator (app/(app)/(tabs)/_layout.tsx) and shows through here.
      backgroundColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.md,
    },
    error: {
      color: colors.error,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accentTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 15,
      color: colors.textPrimary,
    },
    emptyBody: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    list: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    listContent: {
      padding: spacing.lg,
      gap: spacing.md,
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
      padding: spacing.lg,
      gap: spacing.xs,
    },
    name: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 15,
      color: colors.textPrimary,
    },
    meta: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
