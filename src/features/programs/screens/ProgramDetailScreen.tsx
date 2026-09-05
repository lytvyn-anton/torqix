import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DeleteProgramSheet } from '../components/DeleteProgramSheet';
import { useDeleteProgram } from '../hooks/useDeleteProgram';
import { useProgram } from '../hooks/useProgram';
import type { ProgramDetailDay } from '../types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  programId: string;
};

export function ProgramDetailScreen({ userId, programId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const programQuery = useProgram(programId);
  const deleteProgram = useDeleteProgram(userId);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const handleConfirmDelete = () => {
    deleteProgram.mutate(programId, { onSuccess: () => router.back() });
  };

  if (programQuery.isLoading) {
    return (
      <View style={styles.centered} testID="program-detail-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (programQuery.isError || !programQuery.data) {
    return (
      <View style={styles.centered} testID="program-detail-load-error">
        <Text style={formStyles.error}>{t('programs.detailLoadError')}</Text>
      </View>
    );
  }

  const program = programQuery.data;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.name}>{program.name}</Text>

        {program.days.map((day) => (
          <DayCard key={day.id} day={day} colors={colors} />
        ))}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[formStyles.primaryButton, styles.actionButton]}
            onPress={() => router.push(`/program-edit/${program.id}`)}
            accessibilityRole="button"
            testID="program-detail-edit"
          >
            <Text style={formStyles.primaryButtonText}>{t('programs.edit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[formStyles.primaryButton, styles.actionButton, styles.deleteButton]}
            onPress={() => setDeleteSheetVisible(true)}
            accessibilityRole="button"
            testID="program-detail-delete"
          >
            <Text style={formStyles.primaryButtonText}>{t('programs.delete')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DeleteProgramSheet
        visible={deleteSheetVisible}
        isError={deleteProgram.isError}
        isPending={deleteProgram.isPending}
        onConfirm={handleConfirmDelete}
        onKeepGoing={() => setDeleteSheetVisible(false)}
      />
    </View>
  );
}

function DayCard({ day, colors }: { day: ProgramDetailDay; colors: ThemeColors }) {
  const { t } = useTranslation();
  const styles = useMemo(() => buildDayCardStyles(colors), [colors]);

  return (
    <View style={styles.card} testID={`program-detail-day-${day.id}`}>
      <Text style={styles.dayName}>{day.name}</Text>
      {day.exercises.map((exercise, index) => (
        <View key={`${exercise.exerciseId}-${index}`} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>
            {[
              exercise.sets != null || exercise.reps != null
                ? `${exercise.sets ?? '-'}×${exercise.reps ?? '-'}`
                : null,
              exercise.targetWeight != null
                ? `${exercise.targetWeight}${t('programs.weightUnit')}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
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
    scrollContent: {
      padding: spacing.xl,
      gap: spacing.md,
    },
    name: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 20,
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    actionButton: {
      flex: 1,
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
  });
}

function buildDayCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceTranslucent,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    dayName: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    exerciseRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    exerciseName: {
      color: colors.textPrimary,
    },
    exerciseMeta: {
      color: colors.textMuted,
    },
  });
}
