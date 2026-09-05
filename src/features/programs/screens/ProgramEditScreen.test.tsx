import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useExercises } from '../../exercises/hooks/useExercises';
import { useProgram } from '../hooks/useProgram';
import { useUpdateProgram } from '../hooks/useUpdateProgram';
import { ProgramEditScreen } from './ProgramEditScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useProgram', () => ({ useProgram: jest.fn() }));
jest.mock('../hooks/useUpdateProgram', () => ({ useUpdateProgram: jest.fn() }));
jest.mock('../../exercises/hooks/useExercises', () => ({ useExercises: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseProgram = jest.mocked(useProgram);
const mockedUseUpdateProgram = jest.mocked(useUpdateProgram);
const mockedUseExercises = jest.mocked(useExercises);

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

describe('ProgramEditScreen', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ back: jest.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedUseExercises.mockReturnValue({
      data: [{ id: 'ex-1', name: 'Back Squat', muscleGroup: 'legs', equipment: ['barbell'] }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExercises>);
  });

  it('shows a loading indicator while the program is loading', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseUpdateProgram.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useUpdateProgram>);

    await render(<ProgramEditScreen userId="user-1" programId="program-1" />);

    expect(screen.getByTestId('program-edit-loading')).toBeTruthy();
  });

  it('shows an error message when the program fails to load', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseUpdateProgram.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useUpdateProgram>);

    await render(<ProgramEditScreen userId="user-1" programId="program-1" />);

    expect(screen.getByTestId('program-edit-load-error')).toBeTruthy();
  });

  it('pre-fills the form from the loaded program and saves edits via updateProgram', async () => {
    const mutate = jest.fn();
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseUpdateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useUpdateProgram>);

    await render(<ProgramEditScreen userId="user-1" programId="program-1" />);

    expect(screen.getByDisplayValue('Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByDisplayValue('Push day')).toBeTruthy();
    expect(screen.getByText('Back Squat')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByDisplayValue('Push / Pull / Legs'),
      'Push / Pull / Legs v2',
    );
    await fireEvent.press(screen.getByTestId('program-form-save'));

    expect(mutate).toHaveBeenCalledWith(
      {
        name: 'Push / Pull / Legs v2',
        days: [
          {
            id: 'day-1',
            name: 'Push day',
            exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, targetWeight: 40 }],
          },
        ],
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows an error message when the update mutation fails', async () => {
    mockedUseProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: program,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseUpdateProgram.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useUpdateProgram>);

    await render(<ProgramEditScreen userId="user-1" programId="program-1" />);

    expect(screen.getByTestId('program-form-error')).toBeTruthy();
  });
});
