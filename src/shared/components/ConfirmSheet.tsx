import { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useFormStyles } from '../theme/formStyles';
import { useTheme } from '../theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../theme/theme';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  keepGoingLabel: string;
  errorText: string;
  isError?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onKeepGoing: () => void;
  // Distinguishes each caller's testIDs (e.g. 'cancel-workout' -> 'cancel-workout-sheet',
  // '...-confirm', '...-keep-going', '...-error') without hardcoding either caller's name here.
  testIdPrefix: string;
};

// A bottom-sheet confirmation modal for a destructive/disruptive action — the shape shared
// by "cancel this workout?" and "delete this program?": a title, a body, an optional error,
// a primary (red) confirm button, and a text-link way to back out instead.
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  keepGoingLabel,
  errorText,
  isError,
  isPending,
  onConfirm,
  onKeepGoing,
  testIdPrefix,
}: Props) {
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeepGoing}
      testID={`${testIdPrefix}-sheet`}
    >
      <View style={styles.backdrop}>
        <View style={[formStyles.glassSurface, styles.sheet]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {isError && (
            <Text style={formStyles.error} testID={`${testIdPrefix}-error`}>
              {errorText}
            </Text>
          )}

          <TouchableOpacity
            style={[formStyles.primaryButton, styles.confirmButton]}
            onPress={onConfirm}
            disabled={isPending}
            accessibilityRole="button"
            testID={`${testIdPrefix}-confirm`}
          >
            <Text style={formStyles.primaryButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onKeepGoing}
            accessibilityRole="button"
            testID={`${testIdPrefix}-keep-going`}
          >
            <Text style={styles.keepGoingText}>{keepGoingLabel}</Text>
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
