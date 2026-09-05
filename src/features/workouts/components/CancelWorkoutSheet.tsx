import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  visible: boolean;
  isError?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onKeepGoing: () => void;
};

export function CancelWorkoutSheet({ visible, isError, isPending, onConfirm, onKeepGoing }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeepGoing}
      testID="cancel-workout-sheet"
    >
      <View style={styles.backdrop}>
        <View style={[formStyles.glassSurface, styles.sheet]}>
          <Text style={styles.title}>{t('workouts.cancelSheetTitle')}</Text>
          <Text style={styles.body}>{t('workouts.cancelSheetBody')}</Text>

          {isError && (
            <Text style={formStyles.error} testID="cancel-workout-error">
              {t('workouts.cancelError')}
            </Text>
          )}

          <TouchableOpacity
            style={[formStyles.primaryButton, styles.confirmButton]}
            onPress={onConfirm}
            disabled={isPending}
            accessibilityRole="button"
            testID="cancel-workout-confirm"
          >
            <Text style={formStyles.primaryButtonText}>{t('workouts.cancelSheetConfirm')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onKeepGoing}
            accessibilityRole="button"
            testID="cancel-workout-keep-going"
          >
            <Text style={styles.keepGoingText}>{t('workouts.cancelSheetKeepGoing')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    title: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 17,
    },
    body: {
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    confirmButton: {
      backgroundColor: colors.error,
    },
    keepGoingText: {
      color: colors.accentDark,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  });
}
