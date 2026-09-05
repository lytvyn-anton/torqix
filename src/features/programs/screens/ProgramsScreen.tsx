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

import { usePrograms } from '../hooks/usePrograms';
import type { Program } from '../types';
import { ProgramsIcon } from '../../../shared/components/icons/TabIcons';
import { useFloatingTabBarClearance } from '../../../shared/hooks/useFloatingTabBarClearance';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
};

export function ProgramsScreen({ userId }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const programsQuery = usePrograms(userId);
  const tabBarClearance = useFloatingTabBarClearance();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildScreenStyles(colors), [colors]);

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
        <View style={styles.emptyIcon}>
          <ProgramsIcon color={colors.accentDark} size={24} />
        </View>
        <Text style={styles.emptyTitle}>{t('programs.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('programs.emptyBody')}</Text>
        <TouchableOpacity
          style={[formStyles.primaryButton, styles.emptyCta]}
          onPress={() => router.push('/program-create')}
          testID="programs-empty-cta"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{t('programs.emptyCta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      testID="programs-list"
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: spacing.lg + tabBarClearance }]}
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
  const { colors } = useTheme();
  const styles = useMemo(() => buildCardStyles(colors), [colors]);

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
    emptyCta: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
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
