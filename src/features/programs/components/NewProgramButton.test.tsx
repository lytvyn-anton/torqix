import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { NewProgramButton } from './NewProgramButton';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);

describe('NewProgramButton', () => {
  it('navigates to /program-create on press', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await render(<NewProgramButton />);

    fireEvent.press(screen.getByTestId('new-program-button'));
    expect(push).toHaveBeenCalledWith('/program-create');
  });
});
