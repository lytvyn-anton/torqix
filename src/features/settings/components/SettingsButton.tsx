import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { SettingsIcon } from '../../../shared/components/icons/SettingsIcon';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing } from '../../../shared/theme/theme';

// Header-right button on the Profile screen — Settings' own entry point, separate from
// the profile form fields below it (previously a text link at the top of that scroll view).
export function SettingsButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => router.push('/settings')}
      style={styles.button}
      testID="settings-button"
      accessibilityRole="button"
      accessibilityLabel={t('settings.title')}
    >
      <SettingsIcon color={colors.textPrimary} size={22} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: spacing.lg,
  },
});
