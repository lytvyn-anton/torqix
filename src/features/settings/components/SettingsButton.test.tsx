import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { SettingsButton } from './SettingsButton';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);

describe('SettingsButton', () => {
  it('navigates to /settings on press', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await render(<SettingsButton />);

    fireEvent.press(screen.getByTestId('settings-button'));

    expect(push).toHaveBeenCalledWith('/settings');
  });
});
