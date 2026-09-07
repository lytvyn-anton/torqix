import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { NewProgramButton } from './NewProgramButton';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);

describe('NewProgramButton', () => {
  it('opens the new-program sheet on press', async () => {
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>);

    await render(<NewProgramButton />);

    expect(screen.queryByTestId('new-program-sheet-generate')).toBeNull();
    await fireEvent.press(screen.getByTestId('new-program-button'));
    expect(screen.getByTestId('new-program-sheet-generate')).toBeTruthy();
  });

  it('navigates to /program-generate and closes the sheet from the AI option', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await render(<NewProgramButton />);
    await fireEvent.press(screen.getByTestId('new-program-button'));
    await fireEvent.press(screen.getByTestId('new-program-sheet-generate'));

    expect(push).toHaveBeenCalledWith('/program-generate');
    expect(screen.queryByTestId('new-program-sheet-generate')).toBeNull();
  });

  it('navigates to /program-create and closes the sheet from the manual option', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await render(<NewProgramButton />);
    await fireEvent.press(screen.getByTestId('new-program-button'));
    await fireEvent.press(screen.getByTestId('new-program-sheet-manual'));

    expect(push).toHaveBeenCalledWith('/program-create');
    expect(screen.queryByTestId('new-program-sheet-manual')).toBeNull();
  });
});
