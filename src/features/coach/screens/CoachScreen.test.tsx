import { render, screen } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';

import '../../../shared/i18n';
import { CoachScreen } from './CoachScreen';

describe('CoachScreen', () => {
  it('renders the placeholder', async () => {
    // CoachScreen reads useBottomTabBarHeight(), which throws outside a real Bottom Tab
    // Navigator — stand in the value it'd get there since this test renders it standalone.
    await render(
      <BottomTabBarHeightContext.Provider value={83}>
        <CoachScreen />
      </BottomTabBarHeightContext.Provider>,
    );

    expect(screen.getByTestId('coach-placeholder')).toBeTruthy();
  });
});
