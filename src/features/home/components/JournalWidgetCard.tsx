import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { NewJournalSheet } from '../../journal/components/NewJournalSheet';
import { useJournalForProgram } from '../../journal/hooks/useJournalForProgram';
import { useResolveProgramJournal } from '../../journal/hooks/useResolveProgramJournal';
import { useProgram } from '../../programs/hooks/useProgram';
import type { ProgramDetailDay } from '../../programs/types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  programId: string;
  programName: string;
  onGenerateProgram: () => void;
  onCreateProgram: () => void;
};

// Replaces the old flat "Active program" card (just a name, no way to act on it) — this is
// the Home tab's actual entry point into the Journal pivot: it shows the active program's
// days and, tapping one, resolves (or creates, first time) that program's journal and drops
// the user straight into logging against that day. See PLAN.md's Phase 5 section, PR 3/4.
// "+ New journal" sits on its own row below the (possibly multi-line) program name, not
// sharing a row with it — a shared header row let a long, wrapped name push the button out
// of alignment with the rest of the card.
export function JournalWidgetCard({
  userId,
  programId,
  programName,
  onGenerateProgram,
  onCreateProgram,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [sheetVisible, setSheetVisible] = useState(false);

  const programQuery = useProgram(programId);
  const journalForProgramQuery = useJournalForProgram(userId, programId);
  const resolveJournal = useResolveProgramJournal(userId);
  // A plain ref, not resolveJournal.isPending: that only flips after React commits the
  // re-render, so two taps on different day rows in the same tick (a mis-tap immediately
  // followed by the intended one) could both fire the mutation before either saw isPending —
  // each would find "no existing journal" and insert its own, duplicating the journal row.
  // Setting this synchronously on the first tap closes that window; it's cleared once the
  // mutation settles either way so a later tap after a failure can retry.
  const isResolvingRef = useRef(false);

  const handleDayPress = (day: ProgramDetailDay) => {
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;
    resolveJournal.mutate(
      { programId, programName },
      {
        onSuccess: (journal) => {
          isResolvingRef.current = false;
          router.push({
            pathname: '/journal-entry/[journalId]',
            params: { journalId: journal.id, dayId: day.id },
          });
        },
        onError: () => {
          isResolvingRef.current = false;
        },
      },
    );
  };

  // No day picked here, unlike handleDayPress — lands on the journal's own (empty) entry
  // list rather than jumping straight into logging one specific day.
  const handleStartJournal = () => {
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;
    resolveJournal.mutate(
      { programId, programName },
      {
        onSuccess: (journal) => {
          isResolvingRef.current = false;
          router.push(`/journal/${journal.id}`);
        },
        onError: () => {
          isResolvingRef.current = false;
        },
      },
    );
  };

  // Only once the check has actually resolved to "no journal exists" — while it's still
  // loading, or errored, stay quiet rather than flash a false "no journal yet" claim.
  const showNoJournalYet = journalForProgramQuery.isSuccess && journalForProgramQuery.data === null;

  return (
    <View style={[formStyles.glassSurface, styles.card]} testID="journal-widget-card">
      <Text style={styles.eyebrow}>{t('home.journalLabel')}</Text>
      <Text style={styles.programName}>{programName}</Text>

      {showNoJournalYet && (
        <View style={styles.noJournalRow} testID="journal-widget-no-journal-yet">
          <Text style={styles.noJournalText}>{t('home.noJournalYet')}</Text>
          <TouchableOpacity
            style={[formStyles.primaryButton, styles.startJournalButton]}
            onPress={handleStartJournal}
            disabled={resolveJournal.isPending}
            accessibilityRole="button"
            testID="journal-widget-start-journal"
          >
            <Text style={formStyles.primaryButtonText}>{t('home.startJournal')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.newJournalRow}
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        testID="journal-widget-new"
      >
        <Text style={styles.newJournalLink}>{t('home.newJournalCta')}</Text>
      </TouchableOpacity>

      {programQuery.isLoading && (
        <View style={styles.centered} testID="journal-widget-loading">
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Only fatal when we've never had data (first load) — a background refetch error
          (token refresh blip, brief network loss) shouldn't hide an already-loaded, still-
          tappable day list behind an error banner. See HomeScreen for the same guard. */}
      {programQuery.isError && programQuery.data === undefined && (
        <Text style={formStyles.error} testID="journal-widget-load-error">
          {t('home.loadError')}
        </Text>
      )}

      {programQuery.data?.days.map((day) => (
        <TouchableOpacity
          key={day.id}
          style={styles.dayRow}
          onPress={() => handleDayPress(day)}
          disabled={resolveJournal.isPending}
          accessibilityRole="button"
          testID={`journal-widget-day-${day.id}`}
        >
          <Text style={styles.dayName}>{day.name}</Text>
        </TouchableOpacity>
      ))}

      {programQuery.data && programQuery.data.days.length === 0 && (
        <Text style={styles.noDays} testID="journal-widget-no-days">
          {t('home.noDays')}
        </Text>
      )}

      {resolveJournal.isError && (
        <Text style={formStyles.error} testID="journal-widget-resolve-error">
          {t('home.startJournalError')}
        </Text>
      )}

      <NewJournalSheet
        visible={sheetVisible}
        onGenerate={() => {
          setSheetVisible(false);
          onGenerateProgram();
        }}
        onCreateManually={() => {
          setSheetVisible(false);
          onCreateProgram();
        }}
        onClose={() => setSheetVisible(false)}
      />
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
    programName: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 18,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    noJournalRow: {
      gap: spacing.sm,
    },
    noJournalText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    startJournalButton: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    newJournalRow: {
      alignSelf: 'flex-start',
    },
    newJournalLink: {
      color: colors.accentDark,
      fontWeight: '600',
      fontSize: 13,
    },
    centered: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    dayRow: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    dayName: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    noDays: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
}
