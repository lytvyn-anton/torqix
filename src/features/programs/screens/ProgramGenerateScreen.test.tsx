import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useGenerateProgram } from '../hooks/useGenerateProgram';
import { ProgramGenerateScreen } from './ProgramGenerateScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useGenerateProgram', () => ({ useGenerateProgram: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseGenerateProgram = jest.mocked(useGenerateProgram);

// Mirrors what programsApi's IncompleteProfileError looks like from the screen's point of
// view (checked by `.name`, not `instanceof` — see ProgramGenerateScreen) without importing
// the real programsApi module, which would pull in the real Supabase client.
function incompleteProfileError(): Error {
  const error = new Error('Complete your profile before generating a program');
  error.name = 'IncompleteProfileError';
  return error;
}

describe('ProgramGenerateScreen', () => {
  it('generates a program and navigates to its detail screen on success', async () => {
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    const mutate = jest.fn((_input, options) =>
      options.onSuccess({ id: 'program-1', name: 'AI Program', status: 'active', createdAt: '' }),
    );
    mockedUseGenerateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGenerateProgram>);

    await render(<ProgramGenerateScreen userId="user-1" />);
    await fireEvent.press(screen.getByTestId('program-generate-submit'));

    expect(mutate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(replace).toHaveBeenCalledWith('/program/program-1');
  });

  it('shows a generic error and lets the user retry on a plain failure', async () => {
    mockedUseRouter.mockReturnValue({ replace: jest.fn() } as unknown as ReturnType<
      typeof useRouter
    >);
    mockedUseGenerateProgram.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: true,
      error: new Error('Failed to generate a program'),
    } as unknown as ReturnType<typeof useGenerateProgram>);

    await render(<ProgramGenerateScreen userId="user-1" />);

    expect(screen.getByTestId('program-generate-error')).toBeTruthy();
    expect(screen.getByTestId('program-generate-submit')).toBeTruthy();
    expect(screen.queryByTestId('program-generate-go-to-profile')).toBeNull();
  });

  it('offers to go to the profile screen when the profile is incomplete', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({
      replace: jest.fn(),
      push,
    } as unknown as ReturnType<typeof useRouter>);
    mockedUseGenerateProgram.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: true,
      error: incompleteProfileError(),
    } as unknown as ReturnType<typeof useGenerateProgram>);

    await render(<ProgramGenerateScreen userId="user-1" />);

    expect(screen.getByTestId('program-generate-error')).toBeTruthy();
    expect(screen.queryByTestId('program-generate-submit')).toBeNull();

    await fireEvent.press(screen.getByTestId('program-generate-go-to-profile'));
    expect(push).toHaveBeenCalledWith('/profile');
  });
});
