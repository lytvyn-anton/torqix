import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { usePrograms } from '../hooks/usePrograms';
import type { Program } from '../types';
import { colors, fonts, radii, spacing } from '../../../shared/theme/theme';

type Props = {
  userId: string;
};

export function ProgramsScreen({ userId }: Props) {
  const { t, i18n } = useTranslation();
  const programsQuery = usePrograms(userId);
  const tabBarHeight = useBottomTabBarHeight();

  if (programsQuery.isLoading) {
    return (
      <View style={styles.centered} testID="programs-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only treat this as a fatal load failure when we've never had data (first load) — see
  // TodayScreen for the same guard against discarding an already-loaded list on a
  // background refetch error.
  if (programsQuery.isError && programsQuery.data === undefined) {
    return (
      <View style={styles.centered} testID="programs-load-error">
        <Text style={styles.error}>{t('programs.loadError')}</Text>
      </View>
    );
  }

  const programs = programsQuery.data ?? [];

  if (programs.length === 0) {
    return (
      <View style={styles.centered} testID="programs-empty">
        <Text style={styles.emptyTitle}>{t('programs.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('programs.emptyBody')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="programs-list"
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg + tabBarHeight }]}
      data={programs}
      keyExtractor={(program) => program.id}
      renderItem={({ item }) => (
        <ProgramCard
          program={item}
          locale={i18n.language}
          archivedLabel={t('programs.statusArchived')}
        />
      )}
    />
  );
}

function ProgramCard({
  program,
  locale,
  archivedLabel,
}: {
  program: Program;
  locale: string;
  archivedLabel: string;
}) {
  return (
    <View style={styles.card} testID={`program-card-${program.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{program.name}</Text>
        {program.status === 'archived' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{archivedLabel}</Text>
          </View>
        )}
      </View>
      {/* timeZone: 'UTC' keeps the displayed calendar date matching created_at's UTC date,
          instead of shifting a day for users west of UTC near a midnight boundary. */}
      <Text style={styles.cardDate}>
        {new Date(program.createdAt).toLocaleDateString(locale, { timeZone: 'UTC' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
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
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentDark,
  },
});
