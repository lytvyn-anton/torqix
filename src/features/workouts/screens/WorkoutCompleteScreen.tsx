import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWorkoutSummary } from '../hooks/useWorkoutSummary';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { fonts, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  sessionId: string;
  onDone: () => void;
};

export function WorkoutCompleteScreen({ sessionId, onDone }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const summaryQuery = useWorkoutSummary(sessionId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centered}>
        {summaryQuery.isLoading && (
          <ActivityIndicator color={colors.accent} testID="workout-complete-loading" />
        )}

        {summaryQuery.isError && (
          <Text style={formStyles.error} testID="workout-complete-load-error">
            {t('workouts.loadError')}
          </Text>
        )}

        {summaryQuery.data && (
          <>
            <Text style={styles.title}>{t('workouts.completeTitle')}</Text>
            <Text style={styles.body} testID="workout-complete-summary">
              {t('workouts.completeBody', {
                count: summaryQuery.data.setCount,
                day: summaryQuery.data.programDayName,
              })}
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[formStyles.primaryButton, styles.doneButton]}
          onPress={onDone}
          accessibilityRole="button"
          testID="workout-complete-done"
        >
          <Text style={formStyles.primaryButtonText}>{t('workouts.completeDone')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontFamily: fonts.heading,
      fontWeight: fonts.headingWeight,
      fontSize: 22,
      color: colors.textPrimary,
    },
    body: {
      color: colors.textMuted,
      textAlign: 'center',
    },
    doneButton: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
  });
}
