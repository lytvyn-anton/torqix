import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { JournalWidgetCard } from '../components/JournalWidgetCard';
import { NewJournalSheet } from '../../journal/components/NewJournalSheet';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { ProgramsIcon } from '../../../shared/components/icons/TabIcons';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  userId: string;
  onCreateProgram: () => void;
  onGenerateProgram: () => void;
};

export function HomeScreen({ userId, onCreateProgram, onGenerateProgram }: Props) {
  const { t } = useTranslation();
  const activeProgramQuery = useActiveProgram(userId);
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [sheetVisible, setSheetVisible] = useState(false);

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
          onPress={() => setSheetVisible(true)}
          testID="home-new-journal"
          accessibilityRole="button"
        >
          <Text style={formStyles.primaryButtonText}>{t('home.newJournalCta')}</Text>
        </TouchableOpacity>

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

  return (
    <View style={styles.container} testID="home-active-program">
      <JournalWidgetCard
        userId={userId}
        programId={activeProgram.id}
        programName={activeProgram.name}
        onGenerateProgram={onGenerateProgram}
        onCreateProgram={onCreateProgram}
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
  });
}
