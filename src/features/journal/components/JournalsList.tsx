import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DeleteJournalSheet } from './DeleteJournalSheet';
import { useDeleteJournal } from '../hooks/useDeleteJournal';
import { useJournals } from '../hooks/useJournals';
import { useSetJournalStatus } from '../hooks/useSetJournalStatus';
import type { JournalSummary } from '../types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { formatUtcDate } from '../../../shared/utils/formatUtcDate';

type Props = {
  userId: string;
};

// The Programs screen's Journals tab — every journal the user has ever started, across every
// program, with per-row archive/unarchive and delete (the counterpart to the Programs tab's
// own manual active/archive actions, see ProgramDetailScreen). Journals aren't created here;
// they're only started from a program (JournalWidgetCard on Home, or ProgramDetailScreen's
// "Start a journal" action) — this tab is purely for managing ones that already exist.
export function JournalsList({ userId }: Props) {
  const { t, i18n } = useTranslation();
  const journalsQuery = useJournals(userId);
  const { colors } = useTheme();
  const styles = useMemo(() => buildScreenStyles(colors), [colors]);

  if (journalsQuery.isLoading) {
    return (
      <View style={styles.centered} testID="journals-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only fatal on a first load with nothing to show yet — same guard as ProgramsScreen
  // against discarding an already-loaded list on a background refetch error.
  if (journalsQuery.isError && journalsQuery.data === undefined) {
    return (
      <View style={styles.centered} testID="journals-load-error">
        <Text style={styles.error}>{t('journal.journalsLoadError')}</Text>
      </View>
    );
  }

  const journals = journalsQuery.data ?? [];

  if (journals.length === 0) {
    return (
      <View style={styles.centered} testID="journals-empty">
        <Text style={styles.emptyTitle}>{t('journal.journalsEmptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('journal.journalsEmptyBody')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="journals-list"
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={journals}
      keyExtractor={(journal) => journal.id}
      renderItem={({ item }) => (
        <JournalRow journal={item} userId={userId} locale={i18n.language} />
      )}
    />
  );
}

function JournalRow({
  journal,
  userId,
  locale,
}: {
  journal: JournalSummary;
  userId: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildRowStyles(colors), [colors]);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const setStatus = useSetJournalStatus(userId);
  const deleteJournal = useDeleteJournal(userId);

  const isArchived = journal.status === 'archived';

  return (
    <View style={styles.card} testID={`journal-row-${journal.id}`}>
      <TouchableOpacity
        onPress={() => router.push(`/journal/${journal.id}`)}
        accessibilityRole="button"
        testID={`journal-row-${journal.id}-open`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{journal.name}</Text>
          {isArchived && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('programs.statusArchived')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.programName}>{journal.programName ?? t('journal.noProgram')}</Text>
        {/* UTC keeps the displayed calendar date matching created_at's UTC date, same
            reasoning as ProgramsScreen's ProgramCard. */}
        <Text style={styles.date}>{formatUtcDate(journal.createdAt, locale)}</Text>
      </TouchableOpacity>

      {setStatus.isError && (
        <Text style={formStyles.error} testID={`journal-row-${journal.id}-status-error`}>
          {t('journal.statusError')}
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() =>
            setStatus.mutate({ journalId: journal.id, status: isArchived ? 'active' : 'archived' })
          }
          disabled={setStatus.isPending}
          accessibilityRole="button"
          testID={`journal-row-${journal.id}-${isArchived ? 'unarchive' : 'archive'}`}
        >
          <Text style={styles.actionText}>
            {t(isArchived ? 'journal.unarchive' : 'journal.archive')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDeleteSheetVisible(true)}
          accessibilityRole="button"
          testID={`journal-row-${journal.id}-delete`}
        >
          <Text style={styles.deleteText}>{t('journal.deleteSheetConfirm')}</Text>
        </TouchableOpacity>
      </View>

      <DeleteJournalSheet
        visible={deleteSheetVisible}
        isError={deleteJournal.isError}
        isPending={deleteJournal.isPending}
        onConfirm={() =>
          deleteJournal.mutate(journal.id, { onSuccess: () => setDeleteSheetVisible(false) })
        }
        onKeepGoing={() => setDeleteSheetVisible(false)}
      />
    </View>
  );
}

function buildScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.md,
    },
    error: {
      color: colors.error,
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
    card: {
      backgroundColor: colors.surfaceTranslucent,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    name: {
      flexShrink: 1,
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 16,
      color: colors.textPrimary,
    },
    programName: {
      fontSize: 13,
      color: colors.textMuted,
    },
    date: {
      fontSize: 12,
      color: colors.textMuted,
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
    actions: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginTop: spacing.sm,
    },
    actionText: {
      color: colors.accentDark,
      fontWeight: '600',
      fontSize: 13,
    },
    deleteText: {
      color: colors.error,
      fontWeight: '600',
      fontSize: 13,
    },
  });
}
