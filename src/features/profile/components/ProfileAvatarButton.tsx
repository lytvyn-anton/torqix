import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useSession } from '../../../shared/auth/SessionProvider';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';

// Header-right button on every tab screen — opens the profile screen, which is reached
// this way (not as its own tab) per the Phase 2 nav design.
export function ProfileAvatarButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const initial = session?.user.email?.trim().charAt(0).toUpperCase() || '?';

  return (
    <TouchableOpacity
      onPress={() => router.push('/profile')}
      style={styles.avatar}
      testID="profile-avatar-button"
      accessibilityRole="button"
      accessibilityLabel={t('profile.title')}
    >
      <Text style={styles.initial}>{initial}</Text>
    </TouchableOpacity>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    avatar: {
      width: 32,
      height: 32,
      borderRadius: radii.lg,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    initial: {
      color: colors.onAccent,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
