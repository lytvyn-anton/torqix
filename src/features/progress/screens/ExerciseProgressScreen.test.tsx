import { screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useExerciseProgress } from '../../journal/hooks/useExerciseProgress';
import { ExerciseProgressScreen } from './ExerciseProgressScreen';

jest.mock('../../journal/hooks/useExerciseProgress', () => ({
  useExerciseProgress: jest.fn(),
}));

const mockedUseExerciseProgress = jest.mocked(useExerciseProgress);

describe('ExerciseProgressScreen', () => {
  it('shows a loading indicator while progress is loading', async () => {
    mockedUseExerciseProgress.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useExerciseProgress>);

    await render(<ExerciseProgressScreen exerciseId="ex-1" exerciseName="Back Squat" />);

    expect(screen.getByTestId('exercise-progress-loading')).toBeTruthy();
  });

  it('shows an error message when progress fails to load', async () => {
    mockedUseExerciseProgress.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useExerciseProgress>);

    await render(<ExerciseProgressScreen exerciseId="ex-1" exerciseName="Back Squat" />);

    expect(screen.getByTestId('exercise-progress-load-error')).toBeTruthy();
  });

  it('shows the empty state when no sets have been logged', async () => {
    mockedUseExerciseProgress.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof useExerciseProgress>);

    await render(<ExerciseProgressScreen exerciseId="ex-1" exerciseName="Back Squat" />);

    expect(screen.getByTestId('exercise-progress-empty')).toBeTruthy();
  });

  it('renders the exercise name and a row per logged set', async () => {
    mockedUseExerciseProgress.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { id: 'log-1', entryDate: '2026-09-01', setIndex: 0, repsDone: 10, weight: 40 },
        { id: 'log-2', entryDate: '2026-09-01', setIndex: 1, repsDone: 8, weight: 42.5 },
      ],
    } as unknown as ReturnType<typeof useExerciseProgress>);

    await render(<ExerciseProgressScreen exerciseId="ex-1" exerciseName="Back Squat" />);

    expect(screen.getByText('Back Squat')).toBeTruthy();
    expect(screen.getByTestId('exercise-progress-row-log-1')).toBeTruthy();
    expect(screen.getByText('Set 1: 40 kg × 10')).toBeTruthy();
    expect(screen.getByTestId('exercise-progress-row-log-2')).toBeTruthy();
    expect(screen.getByText('Set 2: 42.5 kg × 8')).toBeTruthy();
  });

  it('does not render a chart when all logged sets fall on a single session', async () => {
    mockedUseExerciseProgress.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { id: 'log-1', entryDate: '2026-09-01', setIndex: 0, repsDone: 10, weight: 40 },
        { id: 'log-2', entryDate: '2026-09-01', setIndex: 1, repsDone: 8, weight: 42.5 },
      ],
    } as unknown as ReturnType<typeof useExerciseProgress>);

    await render(<ExerciseProgressScreen exerciseId="ex-1" exerciseName="Back Squat" />);

    expect(screen.queryByTestId('exercise-progress-chart')).toBeNull();
  });

  it('renders the progress chart once at least two sessions have been logged', async () => {
    mockedUseExerciseProgress.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { id: 'log-1', entryDate: '2026-09-01', setIndex: 0, repsDone: 10, weight: 40 },
        { id: 'log-2', entryDate: '2026-09-03', setIndex: 0, repsDone: 10, weight: 42.5 },
      ],
    } as unknown as ReturnType<typeof useExerciseProgress>);

    await render(<ExerciseProgressScreen exerciseId="ex-1" exerciseName="Back Squat" />);

    expect(screen.getByTestId('exercise-progress-chart')).toBeTruthy();
  });
});
