import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useProgram } from '../../programs/hooks/useProgram';
import type { ActiveProgram } from '../../programs/types';
import { ChevronRightIcon } from '../../../shared/components/icons/ChevronRightIcon';
import { ProgramsIcon } from '../../../shared/components/icons/TabIcons';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  activeProgram: ActiveProgram | undefined;
  onGenerateProgram: () => void;
  onCreateProgram: () => void;
};

// The Home tab's Programs widget — independent of JournalWidgetCard (Phase 6's
// Program/Journal separation, see PLAN.md). Purely informational/navigational for now: shows
// the active program's name and a single "Next" row rather than its full day list, which
// doesn't scale once a program has many days — see the design canvas linked from PLAN.md's
// Phase 6 section. "Next" is just the first day in the program's own day order (a
// placeholder, not real schedule logic), since there's no calendar yet — Phase 7 replaces it
// with a real next-scheduled-workout date. The whole card links to the program's detail
// screen; there's no per-day tap action here any more (that used to double as "start a
// journal for this day", which is exactly the coupling this phase removes).
export function ProgramsWidgetCard({ activeProgram, onGenerateProgram, onCreateProgram }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const programQuery = useProgram(activeProgram?.id);

  if (!activeProgram) {
    return (
      <View
        style={[formStyles.glassSurface, styles.card, styles.emptyCard]}
        testID="programs-widget-empty"
      >
        <View style={styles.emptyIcon}>
          <ProgramsIcon color={colors.accentDark} size={24} />
        </View>
        <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('home.emptyBody')}</Text>
        <TouchableOpacity
          style={[formStyles.primaryButton, styles.emptyCta]}
          onPress={onGenerateProgram}
          testID="programs-widget-generate-cta"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{t('programs.generateSubmit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCreateProgram}
          testID="programs-widget-create-cta"
          accessibilityRole="button"
        >
          <Text style={styles.emptyManualLink}>{t('programs.createManually')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const days = programQuery.data?.days ?? [];
  const nextDay = days[0]?.name;

  return (
    <TouchableOpacity
      style={[formStyles.glassSurface, styles.card]}
      onPress={() => router.push(`/program/${activeProgram.id}`)}
      accessibilityRole="button"
      testID="programs-widget-card"
    >
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{t('home.programLabel')}</Text>
        <ChevronRightIcon color={colors.textMuted} size={16} />
      </View>
      <Text style={styles.programName}>{activeProgram.name}</Text>

      {programQuery.isLoading && (
        <View style={styles.centered} testID="programs-widget-loading">
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Only fatal when there's never been data — a background refetch error shouldn't hide
          an already-loaded next-day row, same guard as elsewhere on this screen. */}
      {programQuery.isError && programQuery.data === undefined && (
        <Text style={formStyles.error} testID="programs-widget-load-error">
          {t('home.loadError')}
        </Text>
      )}

      {programQuery.data && (
        <View style={styles.nextRow} testID="programs-widget-next">
          <Text style={styles.nextText}>
            {nextDay ? t('home.nextDay', { day: nextDay }) : t('home.noDays')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
    emptyCard: {
      alignItems: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    centered: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    nextRow: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      alignSelf: 'flex-start',
    },
    nextText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accentTint,
      alignItems: 'center',
      justifyContent: 'center',
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
    },
    emptyManualLink: {
      color: colors.accentDark,
      fontWeight: '600',
      fontSize: 13,
    },
  });
}
