import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { spacing, type ThemeColors } from '../theme/theme';

// Generic "not built yet" tab body — used by tabs whose real screen has its own tracked
// task (History) so the nav shell can ship before that task lands.
type Props = {
  message: string;
  testID: string;
};

export function PlaceholderScreen({ message, testID }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: spacing.xl,
    },
    message: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
