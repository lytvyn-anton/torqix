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
import { useSetProgramStatus } from '../hooks/useSetProgramStatus';
import type { ProgramDetailDay } from '../types';
import { useResolveProgramJournal } from '../../journal/hooks/useResolveProgramJournal';
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
  const setStatus = useSetProgramStatus(userId, programId);
  const resolveJournal = useResolveProgramJournal(userId);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const handleConfirmDelete = () => {
    deleteProgram.mutate(programId, { onSuccess: () => router.back() });
  };

  const handleStartJournal = () => {
    if (!programQuery.data) return;
    resolveJournal.mutate(
      { programId, programName: programQuery.data.name },
      { onSuccess: (journal) => router.push(`/journal/${journal.id}`) },
    );
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
        <View style={styles.header}>
          <Text style={styles.name}>{program.name}</Text>
          {program.status === 'archived' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('programs.statusArchived')}</Text>
            </View>
          )}
        </View>

        {program.days.map((day) => (
          <DayCard key={day.id} day={day} colors={colors} />
        ))}

        <TouchableOpacity
          style={styles.startJournalLink}
          onPress={handleStartJournal}
          disabled={resolveJournal.isPending}
          accessibilityRole="button"
          testID="program-detail-start-journal"
        >
          <Text style={styles.startJournalLinkText}>{t('programs.startJournal')}</Text>
        </TouchableOpacity>

        {resolveJournal.isError && (
          <Text style={formStyles.error} testID="program-detail-start-journal-error">
            {t('programs.startJournalError')}
          </Text>
        )}

        <TouchableOpacity
          style={styles.statusToggle}
          onPress={() => setStatus.mutate(program.status === 'active' ? 'archived' : 'active')}
          disabled={setStatus.isPending}
          accessibilityRole="button"
          testID="program-detail-toggle-status"
        >
          <Text style={styles.statusToggleText}>
            {t(program.status === 'active' ? 'programs.archiveProgram' : 'programs.setActive')}
          </Text>
        </TouchableOpacity>

        {setStatus.isError && (
          <Text style={formStyles.error} testID="program-detail-status-error">
            {t('programs.statusError')}
          </Text>
        )}

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
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    name: {
      flexShrink: 1,
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 20,
      color: colors.textPrimary,
    },
    badge: {
      backgroundColor: colors.accentTint,
      borderRadius: radii.pill,
      paddingVertical: 2,
      paddingHorizontal: spacing.sm,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.accentDark,
    },
    startJournalLink: {
      alignSelf: 'center',
      marginTop: spacing.lg,
    },
    startJournalLinkText: {
      color: colors.accentDark,
      fontWeight: '700',
      fontSize: 15,
    },
    statusToggle: {
      alignSelf: 'center',
      marginTop: spacing.sm,
    },
    statusToggleText: {
      color: colors.accentDark,
      fontWeight: '600',
      fontSize: 13,
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
