import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, type ThemeMode } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

const MODES: { mode: ThemeMode; labelKey: string }[] = [
  { mode: 'light', labelKey: 'settings.themeLight' },
  { mode: 'dark', labelKey: 'settings.themeDark' },
  { mode: 'system', labelKey: 'settings.themeSystem' },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.label}>{t('settings.themeLabel')}</Text>
        <View style={styles.segmented}>
          {MODES.map(({ mode: optionMode, labelKey }) => {
            const selected = mode === optionMode;
            return (
              <TouchableOpacity
                key={optionMode}
                onPress={() => setMode(optionMode)}
                style={[styles.segment, selected && styles.segmentSelected]}
                testID={`settings-theme-${optionMode}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
    container: {
      padding: spacing.xl,
      gap: spacing.sm,
    },
    label: {
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    segmented: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    segmentTextSelected: {
      color: colors.onAccent,
    },
  });
}
