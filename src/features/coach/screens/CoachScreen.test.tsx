import { render, screen } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../../../shared/i18n';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { CoachScreen } from './CoachScreen';

describe('CoachScreen', () => {
  it('renders the placeholder', async () => {
    // CoachScreen reads useFloatingTabBarClearance(), which needs both a real Bottom Tab
    // Navigator (for useBottomTabBarHeight()) and a SafeAreaProvider (for useSafeAreaInsets())
    // — stand in the values it'd get there since this test renders it standalone.
    await render(
      <ThemeProvider>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 0, left: 0, right: 0, bottom: 0 },
          }}
        >
          <BottomTabBarHeightContext.Provider value={83}>
            <CoachScreen />
          </BottomTabBarHeightContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('coach-placeholder')).toBeTruthy();
  });
});
