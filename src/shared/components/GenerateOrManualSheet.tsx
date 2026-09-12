import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { BottomSheetPanel } from './BottomSheetPanel';
import { useFormStyles } from '../theme/formStyles';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, type ThemeColors } from '../theme/theme';

type Props = {
  visible: boolean;
  title: string;
  testIdPrefix: string;
  onGenerate: () => void;
  onCreateManually: () => void;
  onClose: () => void;
};

// The generate-vs-manual choice offered by both NewProgramSheet (Programs tab's "New") and
// NewJournalSheet (Home tab's "start a journal") — same layout and behavior, only the sheet's
// own title and testID prefix differ, so those two stay thin wrappers around this.
export function GenerateOrManualSheet({
  visible,
  title,
  testIdPrefix,
  onGenerate,
  onCreateManually,
  onClose,
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
      onRequestClose={onClose}
      testID={testIdPrefix}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('exercises.close')}
      >
        <TouchableOpacity activeOpacity={1} onPress={(event) => event.stopPropagation()}>
          <BottomSheetPanel>
            <Text style={styles.title}>{title}</Text>

            <TouchableOpacity
              style={[formStyles.primaryButton, styles.generateButton]}
              onPress={onGenerate}
              accessibilityRole="button"
              testID={`${testIdPrefix}-generate`}
            >
              <Text style={formStyles.primaryButtonText}>{t('programs.generateTitle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onCreateManually}
              accessibilityRole="button"
              testID={`${testIdPrefix}-manual`}
            >
              <Text style={styles.manualText}>{t('programs.createManually')}</Text>
            </TouchableOpacity>
          </BottomSheetPanel>
        </TouchableOpacity>
      </TouchableOpacity>
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
      marginBottom: spacing.xs,
    },
    generateButton: {
      paddingVertical: spacing.md,
    },
    manualText: {
      color: colors.accentDark,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  });
}
