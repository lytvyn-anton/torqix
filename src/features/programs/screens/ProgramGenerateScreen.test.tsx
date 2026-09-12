import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useGenerateProgram } from '../hooks/useGenerateProgram';
import { useCreateJournal } from '../../journal/hooks/useCreateJournal';
import { ProgramGenerateScreen } from './ProgramGenerateScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useGenerateProgram', () => ({ useGenerateProgram: jest.fn() }));
jest.mock('../../journal/hooks/useCreateJournal', () => ({ useCreateJournal: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseGenerateProgram = jest.mocked(useGenerateProgram);
const mockedUseCreateJournal = jest.mocked(useCreateJournal);

// Mirrors what programsApi's IncompleteProfileError looks like from the screen's point of
// view (checked by `.name`, not `instanceof` — see ProgramGenerateScreen) without importing
// the real programsApi module, which would pull in the real Supabase client.
function incompleteProfileError(): Error {
  const error = new Error('Complete your profile before generating a program');
  error.name = 'IncompleteProfileError';
  return error;
}

describe('ProgramGenerateScreen', () => {
  beforeEach(() => {
    mockedUseCreateJournal.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateJournal>);
  });

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

  it('creates a journal and jumps straight into logging when intent is journal', async () => {
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    const generateMutate = jest.fn((_input, options) =>
      options.onSuccess({ id: 'program-1', name: 'AI Program', status: 'active', createdAt: '' }),
    );
    mockedUseGenerateProgram.mockReturnValue({
      mutate: generateMutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGenerateProgram>);
    const createJournalMutate = jest.fn((_input, options) => {
      options.onSuccess({ id: 'journal-1' });
    });
    mockedUseCreateJournal.mockReturnValue({
      mutate: createJournalMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateJournal>);

    await render(<ProgramGenerateScreen userId="user-1" intent="journal" />);
    await fireEvent.press(screen.getByTestId('program-generate-submit'));

    expect(createJournalMutate).toHaveBeenCalledWith(
      { programId: 'program-1', name: 'AI Program' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(replace).toHaveBeenCalledWith('/journal-entry/journal-1');
  });

  it('falls back to the program detail screen when journal creation fails, so Generate can’t be retried into a duplicate program', async () => {
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    const generateMutate = jest.fn((_input, options) =>
      options.onSuccess({ id: 'program-1', name: 'AI Program', status: 'active', createdAt: '' }),
    );
    mockedUseGenerateProgram.mockReturnValue({
      mutate: generateMutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGenerateProgram>);
    const createJournalMutate = jest.fn((_input, options) => {
      options.onError(new Error('rls denied'));
    });
    mockedUseCreateJournal.mockReturnValue({
      mutate: createJournalMutate,
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useCreateJournal>);

    await render(<ProgramGenerateScreen userId="user-1" intent="journal" />);
    await fireEvent.press(screen.getByTestId('program-generate-submit'));

    expect(replace).toHaveBeenCalledWith('/program/program-1');
    // Generation itself succeeded — a failure in the separate journal step must not show
    // "couldn't generate a program", which would misattribute the failure.
    expect(screen.queryByTestId('program-generate-error')).toBeNull();
  });
});
