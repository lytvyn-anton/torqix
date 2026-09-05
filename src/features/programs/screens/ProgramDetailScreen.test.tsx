import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useDeleteProgram } from '../hooks/useDeleteProgram';
import { useProgram } from '../hooks/useProgram';
import { ProgramDetailScreen } from './ProgramDetailScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useProgram', () => ({ useProgram: jest.fn() }));
jest.mock('../hooks/useDeleteProgram', () => ({ useDeleteProgram: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseProgram = jest.mocked(useProgram);
const mockedUseDeleteProgram = jest.mocked(useDeleteProgram);

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
});
