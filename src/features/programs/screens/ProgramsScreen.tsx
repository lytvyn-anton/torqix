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

import { usePrograms } from '../hooks/usePrograms';
import type { Program } from '../types';
import { JournalsList } from '../../journal/components/JournalsList';
import { ProgramsIcon } from '../../../shared/components/icons/TabIcons';
import { useFloatingTabBarClearance } from '../../../shared/hooks/useFloatingTabBarClearance';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { formatUtcDate } from '../../../shared/utils/formatUtcDate';

type Props = {
  userId: string;
};

type Tab = 'programs' | 'journals';

export function ProgramsScreen({ userId }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const programsQuery = usePrograms(userId);
  const tabBarClearance = useFloatingTabBarClearance();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildScreenStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('programs');

  const tabBar = (
    <View style={styles.segmented} testID="programs-tab-bar">
      {(['programs', 'journals'] as const).map((option) => {
        const selected = tab === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => setTab(option)}
            style={[styles.segment, selected && styles.segmentSelected]}
            testID={`programs-tab-${option}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {t(option === 'programs' ? 'programs.tabPrograms' : 'programs.tabJournals')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (tab === 'journals') {
    return (
      <View style={styles.container}>
        {tabBar}
        <JournalsList userId={userId} />
      </View>
    );
  }

  if (programsQuery.isLoading) {
    return (
      <View style={styles.container}>
        {tabBar}
        <View style={styles.centered} testID="programs-loading">
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  // Only treat this as a fatal load failure when we've never had data (first load) — see
  // HomeScreen for the same guard against discarding an already-loaded list on a
  // background refetch error.
  if (programsQuery.isError && programsQuery.data === undefined) {
    return (
      <View style={styles.container}>
        {tabBar}
        <View style={styles.centered} testID="programs-load-error">
          <Text style={styles.error}>{t('programs.loadError')}</Text>
        </View>
      </View>
    );
  }

  const programs = programsQuery.data ?? [];

  if (programs.length === 0) {
    return (
      <View style={styles.container}>
        {tabBar}
        <View style={styles.centered} testID="programs-empty">
          <View style={styles.emptyIcon}>
            <ProgramsIcon color={colors.accentDark} size={24} />
          </View>
          <Text style={styles.emptyTitle}>{t('programs.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('programs.emptyBody')}</Text>
          <TouchableOpacity
            style={[formStyles.primaryButton, styles.emptyCta]}
            onPress={() => router.push('/program-generate')}
            testID="programs-empty-generate-cta"
            accessibilityRole="button"
          >
            <Text style={formStyles.primaryButtonText}>{t('programs.generateSubmit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/program-create')}
            testID="programs-empty-cta"
            accessibilityRole="button"
          >
            <Text style={styles.emptyManualLink}>{t('programs.emptyCta')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {tabBar}
      <FlatList
        testID="programs-list"
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: spacing.lg + tabBarClearance },
        ]}
        data={programs}
        keyExtractor={(program) => program.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            locale={i18n.language}
            archivedLabel={t('programs.statusArchived')}
            onPress={() => router.push(`/program/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

function ProgramCard({
  program,
  locale,
  archivedLabel,
  onPress,
}: {
  program: Program;
  locale: string;
  archivedLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildCardStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      testID={`program-card-${program.id}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{program.name}</Text>
        {program.status === 'archived' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{archivedLabel}</Text>
          </View>
        )}
      </View>
      {/* UTC keeps the displayed calendar date matching created_at's UTC date, instead of
          shifting a day for users west of UTC near a midnight boundary. */}
      <Text style={styles.cardDate}>{formatUtcDate(program.createdAt, locale)}</Text>
    </TouchableOpacity>
  );
}

function buildScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    segmented: {
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 13,
    },
    segmentTextSelected: {
      color: colors.onAccent,
    },
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
    emptyCta: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.sm,
    },
    emptyManualLink: {
      color: colors.accentDark,
      fontWeight: '600',
      fontSize: 13,
      marginTop: spacing.sm,
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

// Separate from buildScreenStyles: ProgramCard is one FlatList row among potentially many, so
// it only builds the handful of style keys it actually uses instead of the whole screen's.
function buildCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Translucent instead of a solid surface fill — the ambient Background (already blurred
    // as a whole) shows softly through, giving the "glass card" look from the design canvas
    // without needing a second per-card BlurView.
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
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.accentDark,
    },
  });
}
