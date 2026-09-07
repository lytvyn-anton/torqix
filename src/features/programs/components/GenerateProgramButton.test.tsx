import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { GenerateProgramButton } from './GenerateProgramButton';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);

describe('GenerateProgramButton', () => {
  it('navigates to /program-generate on press', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await render(<GenerateProgramButton />);

    fireEvent.press(screen.getByTestId('generate-program-button'));
    expect(push).toHaveBeenCalledWith('/program-generate');
  });
});
