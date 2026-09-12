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

import { useJournal } from '../hooks/useJournal';
import { useJournalEntries } from '../hooks/useJournalEntries';
import type { JournalEntrySummary } from '../types';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { formatUtcDate } from '../../../shared/utils/formatUtcDate';

type Props = {
  journalId: string;
};

export function JournalScreen({ journalId }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const journalQuery = useJournal(journalId);
  const entriesQuery = useJournalEntries(journalId);
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  if (journalQuery.isLoading || entriesQuery.isLoading) {
    return (
      <View style={styles.centered} testID="journal-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (journalQuery.isError || entriesQuery.isError || !journalQuery.data) {
    return (
      <View style={styles.centered} testID="journal-load-error">
        <Text style={formStyles.error}>{t('journal.loadError')}</Text>
      </View>
    );
  }

  const journal = journalQuery.data;
  const entries = entriesQuery.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{journal.name}</Text>
        <TouchableOpacity
          style={[formStyles.primaryButton, styles.newEntryButton]}
          onPress={() => router.push(`/journal-entry/${journalId}`)}
          accessibilityRole="button"
          testID="journal-new-entry"
        >
          <Text style={formStyles.primaryButtonText}>{t('journal.newEntry')}</Text>
        </TouchableOpacity>
      </View>

      {entries.length === 0 ? (
        <View style={styles.centered} testID="journal-empty">
          <Text style={styles.emptyBody}>{t('journal.emptyBody')}</Text>
        </View>
      ) : (
        <FlatList
          testID="journal-entries-list"
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={entries}
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => <EntryCard entry={item} locale={i18n.language} />}
        />
      )}
    </View>
  );
}

function EntryCard({ entry, locale }: { entry: JournalEntrySummary; locale: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildCardStyles(colors), [colors]);

  return (
    <View style={styles.card} testID={`journal-entry-${entry.id}`}>
      <View style={styles.cardHeader}>
        {/* journal_day_id is nullable (ON DELETE SET NULL) — an entry whose day was deleted,
            or logged with none picked, still shows up with a blank day label. */}
        <Text style={styles.dayName}>{entry.dayName ?? t('journal.noDay')}</Text>
        <Text style={styles.date}>{formatUtcDate(entry.entryDate, locale)}</Text>
      </View>
      <Text style={styles.setCount}>{t('journal.setCount', { count: entry.setCount })}</Text>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      padding: spacing.xl,
      gap: spacing.md,
    },
    header: {
      padding: spacing.xl,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    name: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 20,
      color: colors.textPrimary,
    },
    newEntryButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.xl,
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
      padding: spacing.xl,
      paddingTop: 0,
      gap: spacing.md,
    },
  });
}

function buildCardStyles(colors: ThemeColors) {
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
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dayName: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 15,
      color: colors.textPrimary,
    },
    date: {
      fontSize: 12,
      color: colors.textMuted,
    },
    setCount: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
}
