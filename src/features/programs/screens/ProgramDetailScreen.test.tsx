import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useDeleteProgram } from '../hooks/useDeleteProgram';
import { useProgram } from '../hooks/useProgram';
import { useSetProgramStatus } from '../hooks/useSetProgramStatus';
import { useResolveProgramJournal } from '../../journal/hooks/useResolveProgramJournal';
import { ProgramDetailScreen } from './ProgramDetailScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useProgram', () => ({ useProgram: jest.fn() }));
jest.mock('../hooks/useDeleteProgram', () => ({ useDeleteProgram: jest.fn() }));
jest.mock('../hooks/useSetProgramStatus', () => ({ useSetProgramStatus: jest.fn() }));
jest.mock('../../journal/hooks/useResolveProgramJournal', () => ({
  useResolveProgramJournal: jest.fn(),
}));

// This file's default-5000ms tests started intermittently timing out in CI (never locally —
// consistently ~90ms there) once this screen picked up two more mocked hooks; bump the
// budget rather than chase a CI-only scheduling flake with no local repro.
jest.setTimeout(15000);

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseProgram = jest.mocked(useProgram);
const mockedUseDeleteProgram = jest.mocked(useDeleteProgram);
const mockedUseSetProgramStatus = jest.mocked(useSetProgramStatus);
const mockedUseResolveProgramJournal = jest.mocked(useResolveProgramJournal);

const program = {
  id: 'program-1',
  name: 'Push / Pull / Legs',
  status: 'active' as const,
  createdAt: '2026-09-01',
  days: [
    {
      id: 'day-1',
      name: 'Push day',
      exercises: [
        { exerciseId: 'ex-1', exerciseName: 'Back Squat', sets: 3, reps: 10, targetWeight: 40 },
      ],
    },
  ],
};

describe('ProgramDetailScreen', () => {
  let push: jest.Mock;
  let deleteMutate: jest.Mock;
  let setStatusMutate: jest.Mock;
  let resolveJournalMutate: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    mockedUseRouter.mockReturnValue({ push, back: jest.fn() } as unknown as ReturnType<
      typeof useRouter
    >);
    deleteMutate = jest.fn();
    mockedUseDeleteProgram.mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useDeleteProgram>);
    setStatusMutate = jest.fn();
    mockedUseSetProgramStatus.mockReturnValue({
      mutate: setStatusMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSetProgramStatus>);
    resolveJournalMutate = jest.fn();
    mockedUseResolveProgramJournal.mockReturnValue({
      mutate: resolveJournalMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useResolveProgramJournal>);
  });

  it('shows a loading indicator while the program is loading', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    expect(screen.getByTestId('program-detail-loading')).toBeTruthy();
  });

  it('shows an error message when the program fails to load', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    expect(screen.getByTestId('program-detail-load-error')).toBeTruthy();
  });

  it("renders the program's name, days, and exercises", async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByTestId('program-detail-day-day-1')).toBeTruthy();
    expect(screen.getByText('Push day')).toBeTruthy();
    expect(screen.getByText('Back Squat')).toBeTruthy();
  });

  it('navigates to program-edit when Edit is pressed', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);
    await fireEvent.press(screen.getByTestId('program-detail-edit'));

    expect(push).toHaveBeenCalledWith('/program-edit/program-1');
  });

  it('shows the delete sheet and deletes the program on confirm', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);
    const back = jest.fn();
    mockedUseRouter.mockReturnValue({ push, back } as unknown as ReturnType<typeof useRouter>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    await fireEvent.press(screen.getByTestId('program-detail-delete'));
    await fireEvent.press(screen.getByTestId('delete-program-confirm'));

    expect(deleteMutate).toHaveBeenCalledWith(
      'program-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    deleteMutate.mock.calls[0][1].onSuccess();
    expect(back).toHaveBeenCalled();
  });

  it('dismisses the delete sheet on keep-going without deleting', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    await fireEvent.press(screen.getByTestId('program-detail-delete'));
    await fireEvent.press(screen.getByTestId('delete-program-keep-going'));

    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it('shows an error in the delete sheet when deleting fails', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseDeleteProgram.mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useDeleteProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);
    await fireEvent.press(screen.getByTestId('program-detail-delete'));

    expect(screen.getByTestId('delete-program-error')).toBeTruthy();
  });

  it('resolves the journal and navigates when Start a journal is pressed', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);
    await fireEvent.press(screen.getByTestId('program-detail-start-journal'));

    expect(resolveJournalMutate).toHaveBeenCalledWith(
      { programId: 'program-1', programName: 'Push / Pull / Legs' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    resolveJournalMutate.mock.calls[0][1].onSuccess({ id: 'journal-1' });
    expect(push).toHaveBeenCalledWith('/journal/journal-1');
  });

  it('shows an error when starting a journal fails', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseResolveProgramJournal.mockReturnValue({
      mutate: resolveJournalMutate,
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useResolveProgramJournal>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    expect(screen.getByTestId('program-detail-start-journal-error')).toBeTruthy();
  });

  it('archives an active program when the status toggle is pressed', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    expect(screen.getByText('Archive program')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('program-detail-toggle-status'));

    expect(setStatusMutate).toHaveBeenCalledWith('archived');
  });

  it('offers to set an archived program active, with a status badge', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ...program, status: 'archived' as const },
    } as unknown as ReturnType<typeof useProgram>);

    await render(<ProgramDetailScreen userId="user-1" programId="program-1" />);

    expect(screen.getByText('Archived')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('program-detail-toggle-status'));

    expect(setStatusMutate).toHaveBeenCalledWith('active');
  });
});
