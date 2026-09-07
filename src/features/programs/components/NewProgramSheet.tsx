import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { BottomSheetPanel } from '../../../shared/components/BottomSheetPanel';
import { useFormStyles } from '../../../shared/theme/formStyles';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, type ThemeColors } from '../../../shared/theme/theme';

type Props = {
  visible: boolean;
  onGenerate: () => void;
  onCreateManually: () => void;
  onClose: () => void;
};

// Bottom sheet opened from the Programs tab header's "New" button, offering the two ways to
// get a program: AI generation (the faster, primary path) or the manual form. Kept as one
// header entry point rather than two separate pills — a second pill next to the tab's
// "Programs" title header overflowed/overlapped on device.
export function NewProgramSheet({ visible, onGenerate, onCreateManually, onClose }: Props) {
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
      testID="new-program-sheet"
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
            <Text style={styles.title}>{t('programs.createTitle')}</Text>

            <TouchableOpacity
              style={[formStyles.primaryButton, styles.generateButton]}
              onPress={onGenerate}
              accessibilityRole="button"
              testID="new-program-sheet-generate"
            >
              <Text style={formStyles.primaryButtonText}>{t('programs.generateTitle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onCreateManually}
              accessibilityRole="button"
              testID="new-program-sheet-manual"
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
