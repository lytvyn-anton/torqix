import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useExercises } from '../../exercises/hooks/useExercises';
import { useCreateProgram } from '../hooks/useCreateProgram';
import { ProgramCreateScreen } from './ProgramCreateScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useCreateProgram', () => ({ useCreateProgram: jest.fn() }));
jest.mock('../../exercises/hooks/useExercises', () => ({ useExercises: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseCreateProgram = jest.mocked(useCreateProgram);
const mockedUseExercises = jest.mocked(useExercises);

describe('ProgramCreateScreen', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({
      back: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    mockedUseExercises.mockReturnValue({
      data: [{ id: 'ex-1', name: 'Back Squat', muscleGroup: 'legs', equipment: ['barbell'] }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExercises>);
  });

  it('disables save until a name and at least one non-blank day are entered', async () => {
    const mutate = jest.fn();
    mockedUseCreateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    await fireEvent.press(screen.getByTestId('program-create-save'));
    expect(mutate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('program-create-name'), 'Push / Pull / Legs');
    await fireEvent.press(screen.getByTestId('program-create-save'));
    expect(mutate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('program-create-day-0'), 'Push day');
    await fireEvent.press(screen.getByTestId('program-create-save'));

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Push / Pull / Legs', days: [{ name: 'Push day', exercises: [] }] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  }, 15000);

  it('adds and removes day rows, only sending non-blank names', async () => {
    const mutate = jest.fn();
    mockedUseCreateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    await fireEvent.changeText(screen.getByTestId('program-create-name'), 'Full Body');
    await fireEvent.changeText(screen.getByTestId('program-create-day-0'), 'Day A');
    await fireEvent.press(screen.getByTestId('program-create-add-day'));
    // Second row left blank on purpose — should be filtered out on save.
    expect(screen.getByTestId('program-create-day-1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('program-create-add-day'));
    await fireEvent.changeText(screen.getByTestId('program-create-day-2'), 'Day B');
    await fireEvent.press(screen.getByTestId('program-create-remove-day-1'));

    await fireEvent.press(screen.getByTestId('program-create-save'));

    expect(mutate).toHaveBeenCalledWith(
      {
        name: 'Full Body',
        days: [
          { name: 'Day A', exercises: [] },
          { name: 'Day B', exercises: [] },
        ],
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('adds an exercise to a day via the picker, with editable sets/reps/weight', async () => {
    const mutate = jest.fn();
    mockedUseCreateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    await fireEvent.changeText(screen.getByTestId('program-create-name'), 'Legs');
    await fireEvent.changeText(screen.getByTestId('program-create-day-0'), 'Leg day');

    await fireEvent.press(screen.getByTestId('program-create-day-0-add-exercise'));
    await fireEvent.press(screen.getByTestId('exercise-picker-item-ex-1'));

    expect(screen.getByText('Back Squat')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('program-create-day-0-exercise-0-weight'), '60');
    await fireEvent.press(screen.getByTestId('program-create-save'));

    expect(mutate).toHaveBeenCalledWith(
      {
        name: 'Legs',
        days: [
          {
            name: 'Leg day',
            exercises: [{ exerciseId: 'ex-1', sets: 3, reps: 10, targetWeight: 60 }],
          },
        ],
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('removes an added exercise from a day', async () => {
    const mutate = jest.fn();
    mockedUseCreateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    await fireEvent.changeText(screen.getByTestId('program-create-name'), 'Legs');
    await fireEvent.changeText(screen.getByTestId('program-create-day-0'), 'Leg day');
    await fireEvent.press(screen.getByTestId('program-create-day-0-add-exercise'));
    await fireEvent.press(screen.getByTestId('exercise-picker-item-ex-1'));

    await fireEvent.press(screen.getByTestId('program-create-day-0-exercise-0-remove'));
    await fireEvent.press(screen.getByTestId('program-create-save'));

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Legs', days: [{ name: 'Leg day', exercises: [] }] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('blocks save and shows an error if a day has exercises but no name', async () => {
    const mutate = jest.fn();
    mockedUseCreateProgram.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    // Overall program name is set and a second, named day exists, so canSave would
    // otherwise be true — the blank first day's picked exercise must still block saving.
    await fireEvent.changeText(screen.getByTestId('program-create-name'), 'Legs');
    await fireEvent.press(screen.getByTestId('program-create-day-0-add-exercise'));
    await fireEvent.press(screen.getByTestId('exercise-picker-item-ex-1'));
    await fireEvent.press(screen.getByTestId('program-create-add-day'));
    await fireEvent.changeText(screen.getByTestId('program-create-day-1'), 'Day B');

    expect(screen.getByTestId('program-create-orphaned-exercises-error')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('program-create-save'));
    expect(mutate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('program-create-day-0'), 'Leg day');
    await fireEvent.press(screen.getByTestId('program-create-save'));
    expect(mutate).toHaveBeenCalled();
  });

  it('shows an error message when the mutation fails', async () => {
    mockedUseCreateProgram.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useCreateProgram>);

    await render(<ProgramCreateScreen userId="user-1" />);

    expect(screen.getByTestId('program-create-error')).toBeTruthy();
  });
});
