import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { JournalWidgetCard } from '../components/JournalWidgetCard';
import { ProgramsWidgetCard } from '../components/ProgramsWidgetCard';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
};

// Phase 6's Program/Journal separation (see PLAN.md): two independent widgets rather than
// the old single Journal-widget-that-also-shows-the-program-and-auto-creates-a-journal.
// Loading/hard-error states still gate on the active-program fetch alone — both widgets need
// to know whether one exists (ProgramsWidgetCard to render itself, JournalWidgetCard to offer
// "start a journal from this program") — but neither widget's own content depends on the
// other actually existing.
export function HomeScreen({ userId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const activeProgramQuery = useActiveProgram(userId);
  const { colors } = useTheme();
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

  const activeProgram = activeProgramQuery.data ?? undefined;

  return (
    <View style={styles.container} testID="home-widgets">
      <ProgramsWidgetCard
        activeProgram={activeProgram}
        onGenerateProgram={() => router.push('/program-generate')}
        onCreateProgram={() => router.push('/program-create')}
      />
      <JournalWidgetCard userId={userId} activeProgram={activeProgram} />
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
      gap: spacing.xl,
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
  });
}
