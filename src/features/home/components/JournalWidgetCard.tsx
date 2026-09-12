import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useCreateJournal } from '../../journal/hooks/useCreateJournal';
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
// navigation — both actions below only fire on an explicit tap. "Start a journal from this
// program" reuses the same resolve-or-create mutation as ProgramDetailScreen's identical
// action, so tapping either one for the same program lands on the same journal rather than
// creating a duplicate. "+ New journal" is a plain create with no program — safe to offer
// unconditionally now that JournalEntryScreen supports logging against a program-less
// journal (Phase 6's free-form editing task); a second tap just makes a second blank
// journal, manageable from the Programs tab's Journals list.
export function JournalWidgetCard({ userId, activeProgram }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const currentJournalQuery = useCurrentJournal(userId);
  const resolveJournal = useResolveProgramJournal(userId);
  const createJournal = useCreateJournal(userId);

  const handleStartFromProgram = () => {
    if (!activeProgram) return;
    resolveJournal.mutate(
      { programId: activeProgram.id, programName: activeProgram.name },
      { onSuccess: (journal) => router.push(`/journal/${journal.id}`) },
    );
  };

  const handleCreateBlank = () => {
    createJournal.mutate(
      { programId: null, name: t('home.blankJournalName') },
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
          <Text style={styles.noJournalText}>{t('home.noJournalYet')}</Text>

          {/* Each button disables on both mutations' isPending, not just its own — otherwise
              tapping one then immediately the other (before the first settles) could fire
              both, creating two separate journals and pushing two screens back to back. */}
          {activeProgram && (
            <>
              <TouchableOpacity
                style={[formStyles.primaryButton, styles.actionButton]}
                onPress={handleStartFromProgram}
                disabled={resolveJournal.isPending || createJournal.isPending}
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
          )}

          {/* A plain link alongside the primary "start from program" action, or the sole,
              primary-styled action when there's no program to start one from. */}
          <TouchableOpacity
            style={
              activeProgram
                ? styles.newJournalLink
                : [formStyles.primaryButton, styles.actionButton]
            }
            onPress={handleCreateBlank}
            disabled={createJournal.isPending || resolveJournal.isPending}
            accessibilityRole="button"
            testID="journal-widget-new-journal"
          >
            <Text style={activeProgram ? styles.newJournalLinkText : formStyles.primaryButtonText}>
              {t('home.newJournalCta')}
            </Text>
          </TouchableOpacity>
          {createJournal.isError && (
            <Text style={formStyles.error} testID="journal-widget-new-journal-error">
              {t('home.newJournalError')}
            </Text>
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
    newJournalLink: {
      alignSelf: 'flex-start',
    },
    newJournalLinkText: {
      color: colors.accentDark,
      fontWeight: '600',
      fontSize: 13,
    },
  });
}
