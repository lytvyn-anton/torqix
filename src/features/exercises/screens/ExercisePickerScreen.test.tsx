import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useExercises } from '../hooks/useExercises';
import { ExercisePickerScreen } from './ExercisePickerScreen';

jest.mock('../hooks/useExercises', () => ({ useExercises: jest.fn() }));

const mockedUseExercises = jest.mocked(useExercises);

const exercises = [
  { id: 'ex-1', name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: ['barbell'] },
  { id: 'ex-2', name: 'Back Squat', muscleGroup: 'legs', equipment: ['barbell'] },
  { id: 'ex-3', name: 'Push-up', muscleGroup: 'chest', equipment: ['bodyweight'] },
];

describe('ExercisePickerScreen', () => {
  it('lists exercises and calls onSelect when one is tapped', async () => {
    mockedUseExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExercises>);
    const onSelect = jest.fn();

    await render(<ExercisePickerScreen visible onSelect={onSelect} onClose={jest.fn()} />);

    expect(screen.getByTestId('exercise-picker-item-ex-1')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('exercise-picker-item-ex-2'));
    expect(onSelect).toHaveBeenCalledWith(exercises[1]);
  });

  it('filters by search text', async () => {
    mockedUseExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExercises>);

    await render(<ExercisePickerScreen visible onSelect={jest.fn()} onClose={jest.fn()} />);

    await fireEvent.changeText(screen.getByTestId('exercise-picker-search'), 'squat');

    expect(screen.queryByTestId('exercise-picker-item-ex-1')).toBeNull();
    expect(screen.getByTestId('exercise-picker-item-ex-2')).toBeTruthy();
  });

  it('filters by muscle group chip', async () => {
    mockedUseExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExercises>);

    await render(<ExercisePickerScreen visible onSelect={jest.fn()} onClose={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('exercise-picker-filter-legs'));

    expect(screen.queryByTestId('exercise-picker-item-ex-1')).toBeNull();
    expect(screen.getByTestId('exercise-picker-item-ex-2')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', async () => {
    mockedUseExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExercises>);
    const onClose = jest.fn();

    await render(<ExercisePickerScreen visible onSelect={jest.fn()} onClose={onClose} />);
    await fireEvent.press(screen.getByTestId('exercise-picker-close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows an error message when the query fails', async () => {
    mockedUseExercises.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useExercises>);

    await render(<ExercisePickerScreen visible onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText("Couldn't load exercises.")).toBeTruthy();
  });
});
