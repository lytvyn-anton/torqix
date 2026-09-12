import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BottomSheetPanel } from '../../../shared/components/BottomSheetPanel';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  visible: boolean;
  isError?: boolean;
  isPending?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
};

// Shown when the user tries to leave a journal entry with unsaved changes — the fix for the
// original cancel-without-confirm bug (PLAN.md's Phase 5 section): nothing is saved until
// the user explicitly chooses to, either via the screen's own Save button or here. Three
// options rather than ConfirmSheet's two (confirm/keep-going), since "leave" here isn't a
// single destructive action — Save and Discard are both valid ways to resolve it.
export function SaveDiscardSheet({
  visible,
  isError,
  isPending,
  onSave,
  onDiscard,
  onKeepEditing,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onKeepEditing}
      testID="save-discard-sheet"
    >
      <View style={styles.backdrop}>
        <BottomSheetPanel>
          <Text style={styles.title}>{t('journal.saveDiscardTitle')}</Text>
          <Text style={styles.body}>{t('journal.saveDiscardBody')}</Text>

          {isError && (
            <Text style={formStyles.error} testID="save-discard-error">
              {t('journal.saveError')}
            </Text>
          )}

          <TouchableOpacity
            style={[formStyles.primaryButton, styles.saveButton]}
            onPress={onSave}
            disabled={isPending}
            accessibilityRole="button"
            testID="save-discard-save"
          >
            <Text style={formStyles.primaryButtonText}>{t('journal.saveDiscardSave')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDiscard}
            disabled={isPending}
            accessibilityRole="button"
            testID="save-discard-discard"
          >
            <Text style={styles.discardText}>{t('journal.saveDiscardDiscard')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onKeepEditing}
            disabled={isPending}
            accessibilityRole="button"
            testID="save-discard-keep-editing"
          >
            <Text style={styles.keepEditingText}>{t('journal.saveDiscardKeepEditing')}</Text>
          </TouchableOpacity>
        </BottomSheetPanel>
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
    title: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 17,
    },
    body: {
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    saveButton: {
      marginTop: spacing.xs,
    },
    discardText: {
      color: colors.error,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
    keepEditingText: {
      color: colors.accentDark,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
