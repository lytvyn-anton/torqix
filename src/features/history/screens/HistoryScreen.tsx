import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { useWorkoutHistory } from '../../workouts/hooks/useWorkoutHistory';
import type { WorkoutHistoryEntry } from '../../workouts/types';
import { HistoryIcon } from '../../../shared/components/icons/TabIcons';
import { useFloatingTabBarClearance } from '../../../shared/hooks/useFloatingTabBarClearance';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
};

export function HistoryScreen({ userId }: Props) {
  const { t, i18n } = useTranslation();
  const historyQuery = useWorkoutHistory(userId);
  const tabBarClearance = useFloatingTabBarClearance();
  const { colors } = useTheme();
  const styles = useMemo(() => buildScreenStyles(colors), [colors]);

  if (historyQuery.isLoading) {
    return (
      <View style={styles.centered} testID="history-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only treat this as a fatal load failure when we've never had data (first load) — see
  // TodayScreen/ProgramsScreen for the same guard against discarding an already-loaded
  // list on a background refetch error.
  if (historyQuery.isError && historyQuery.data === undefined) {
    return (
      <View style={styles.centered} testID="history-load-error">
        <Text style={styles.error}>{t('history.loadError')}</Text>
      </View>
    );
  }

  const entries = historyQuery.data ?? [];

  if (entries.length === 0) {
    return (
      <View style={styles.centered} testID="history-empty">
        <View style={styles.emptyIcon}>
          <HistoryIcon color={colors.accentDark} size={24} />
        </View>
        <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('history.emptyBody')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="history-list"
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg + tabBarClearance }]}
      data={entries}
      keyExtractor={(entry) => entry.id}
      renderItem={({ item }) => (
        <SessionCard
          entry={item}
          locale={i18n.language}
          doneLabel={t('history.statusDone')}
          skippedLabel={t('history.statusSkipped')}
        />
      )}
    />
  );
}

function SessionCard({
  entry,
  locale,
  doneLabel,
  skippedLabel,
}: {
  entry: WorkoutHistoryEntry;
  locale: string;
  doneLabel: string;
  skippedLabel: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildCardStyles(colors), [colors]);

  return (
    <View style={styles.card} testID={`history-card-${entry.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{entry.programDayName}</Text>
        <View style={[styles.badge, entry.status === 'skipped' && styles.badgeSkipped]}>
          <Text style={[styles.badgeText, entry.status === 'skipped' && styles.badgeTextSkipped]}>
            {entry.status === 'done' ? doneLabel : skippedLabel}
          </Text>
        </View>
      </View>
      {/* timeZone: 'UTC' — scheduled_date is a plain calendar date with no time component,
          so formatting it in the device's local zone could shift it a day either way. */}
      <Text style={styles.cardDate}>
        {new Date(entry.scheduledDate).toLocaleDateString(locale, { timeZone: 'UTC' })}
      </Text>
    </View>
  );
}

function buildScreenStyles(colors: ThemeColors) {
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

// Separate from buildScreenStyles: SessionCard is one FlatList row among potentially many, so
// it only builds the handful of style keys it actually uses instead of the whole screen's.
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
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardName: {
      fontFamily: fonts.headingBold,
      fontWeight: fonts.headingBoldWeight,
      fontSize: 16,
      color: colors.textPrimary,
    },
    cardDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    badge: {
      backgroundColor: colors.accentTint,
      borderRadius: radii.pill,
      paddingVertical: 2,
      paddingHorizontal: spacing.sm,
    },
    badgeSkipped: {
      backgroundColor: colors.border,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.accentDark,
    },
    badgeTextSkipped: {
      color: colors.textMuted,
    },
  });
}
