import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { SettingsScreen } from './SettingsScreen';

describe('SettingsScreen', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to the system theme option selected', async () => {
    await render(<SettingsScreen />);

    expect(screen.getByTestId('settings-theme-system').props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByTestId('settings-theme-light').props.accessibilityState.selected).toBe(
      false,
    );
  });

  it('selects the pressed theme option', async () => {
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByTestId('settings-theme-dark'));

    expect(screen.getByTestId('settings-theme-dark').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('settings-theme-system').props.accessibilityState.selected).toBe(
      false,
    );
  });
});
