import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { JournalWidgetCard } from '../components/JournalWidgetCard';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { ProgramsIcon } from '../../../shared/components/icons/TabIcons';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
};

// No onCreateProgram/onGenerateProgram props (unlike the old TodayScreen this replaced) —
// the always-visible way to start a *new* program's journal is NewJournalButton in the Home
// tab's own header (app/(app)/(tabs)/_layout.tsx), not this screen; the empty-state CTAs
// below route directly with `intent=journal`, mirroring ProgramsScreen's empty state.
export function HomeScreen({ userId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const activeProgramQuery = useActiveProgram(userId);
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  if (activeProgramQuery.isLoading) {
    return (
      <View style={styles.centered} testID="home-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only treat this as a fatal load failure when we've never had data (first load). A
  // background refetch error (token refresh blip, brief network loss) shouldn't discard an
  // already-loaded active program — see ProfileScreen for the same guard.
  if (activeProgramQuery.isError && activeProgramQuery.data === undefined) {
    return (
      <View style={styles.centered} testID="home-load-error">
        <Text style={styles.error}>{t('home.loadError')}</Text>
      </View>
    );
  }

  const activeProgram = activeProgramQuery.data;

  if (!activeProgram) {
    return (
      <View style={styles.centered} testID="home-empty">
        <View style={styles.emptyIcon}>
          <ProgramsIcon color={colors.accentDark} size={24} />
        </View>
        <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
        <Text style={styles.emptyBody}>{t('home.emptyBody')}</Text>
        <TouchableOpacity
          style={[formStyles.primaryButton, styles.emptyCta]}
          onPress={() => router.push('/program-generate?intent=journal')}
          testID="home-empty-generate-cta"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{t('programs.generateSubmit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/program-create?intent=journal')}
          testID="home-empty-cta"
          accessibilityRole="button"
        >
          <Text style={styles.emptyManualLink}>{t('programs.createManually')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="home-active-program">
      <JournalWidgetCard
        userId={userId}
        programId={activeProgram.id}
        programName={activeProgram.name}
      />
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      // Transparent, not colors.background — the ambient Background sits behind the whole
      // tab navigator (app/(app)/(tabs)/_layout.tsx) and shows through here.
      backgroundColor: 'transparent',
      padding: spacing.xl,
    },
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
  });
}
