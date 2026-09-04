import { Stack } from 'expo-router';

import { colors } from '../../src/shared/theme/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
