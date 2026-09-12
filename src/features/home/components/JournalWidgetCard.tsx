import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useCurrentJournal } from '../../journal/hooks/useCurrentJournal';
import { useResolveProgramJournal } from '../../journal/hooks/useResolveProgramJournal';
import type { ActiveProgram } from '../../programs/types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  activeProgram: ActiveProgram | undefined;
};

// The Home tab's Journal widget — independent of ProgramsWidgetCard (Phase 6's
// Program/Journal separation, see PLAN.md). Shows at most one journal: the most recently
// created active one (useCurrentJournal), across any program. Unlike the old
// resolve-on-day-tap flow, nothing here creates a journal as a side effect of unrelated
// navigation — "Start a journal from this program" only fires on an explicit tap, reusing
// the same resolve-or-create mutation as ProgramDetailScreen's identical action so tapping
// either one for the same program lands on the same journal rather than creating a
// duplicate. There is deliberately no "+ New journal" (blank, program-less) entry point here
// yet — that needs JournalEntryScreen to support logging against a program-less journal
// first (Phase 6's free-form editing task), so it isn't wired in until then.
export function JournalWidgetCard({ userId, activeProgram }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const currentJournalQuery = useCurrentJournal(userId);
  const resolveJournal = useResolveProgramJournal(userId);

  const handleStartFromProgram = () => {
    if (!activeProgram) return;
    resolveJournal.mutate(
      { programId: activeProgram.id, programName: activeProgram.name },
      { onSuccess: (journal) => router.push(`/journal/${journal.id}`) },
    );
  };

  return (
    <View style={[formStyles.glassSurface, styles.card]} testID="journal-widget-card">
      <Text style={styles.eyebrow}>{t('home.journalLabel')}</Text>

      {currentJournalQuery.isLoading && (
        <View style={styles.centered} testID="journal-widget-loading">
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {currentJournalQuery.isError && currentJournalQuery.data === undefined && (
        <Text style={formStyles.error} testID="journal-widget-load-error">
          {t('home.loadError')}
        </Text>
      )}

      {currentJournalQuery.data && (
        <>
          <TouchableOpacity
            onPress={() => router.push(`/journal/${currentJournalQuery.data!.id}`)}
            accessibilityRole="button"
            testID="journal-widget-open"
          >
            <Text style={styles.journalName}>{currentJournalQuery.data.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[formStyles.primaryButton, styles.actionButton]}
            onPress={() => router.push(`/journal-entry/${currentJournalQuery.data!.id}`)}
            accessibilityRole="button"
            testID="journal-widget-new-entry"
          >
            <Text style={formStyles.primaryButtonText}>{t('journal.newEntry')}</Text>
          </TouchableOpacity>
        </>
      )}

      {currentJournalQuery.data === null && (
        <View style={styles.noJournalRow} testID="journal-widget-no-journal">
          {activeProgram ? (
            <>
              <Text style={styles.noJournalText}>{t('home.noJournalYet')}</Text>
              <TouchableOpacity
                style={[formStyles.primaryButton, styles.actionButton]}
                onPress={handleStartFromProgram}
                disabled={resolveJournal.isPending}
                accessibilityRole="button"
                testID="journal-widget-start-from-program"
              >
                <Text style={formStyles.primaryButtonText}>{t('programs.startJournal')}</Text>
              </TouchableOpacity>
              {resolveJournal.isError && (
                <Text style={formStyles.error} testID="journal-widget-start-error">
                  {t('programs.startJournalError')}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.noJournalText}>{t('home.journalNeedsProgram')}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.md,
      width: '100%',
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    journalName: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 18,
      color: colors.textPrimary,
    },
    actionButton: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    centered: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    noJournalRow: {
      gap: spacing.sm,
    },
    noJournalText: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
}
