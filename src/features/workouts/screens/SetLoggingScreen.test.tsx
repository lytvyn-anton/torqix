import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useCancelSession } from '../hooks/useCancelSession';
import { useCompleteSession } from '../hooks/useCompleteSession';
import { useLogSets } from '../hooks/useLogSets';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { SetLoggingScreen } from './SetLoggingScreen';

jest.mock('../hooks/useWorkoutSession', () => ({ useWorkoutSession: jest.fn() }));
jest.mock('../hooks/useProgramDayExercises', () => ({ useProgramDayExercises: jest.fn() }));
jest.mock('../hooks/useLogSets', () => ({ useLogSets: jest.fn() }));
jest.mock('../hooks/useCompleteSession', () => ({ useCompleteSession: jest.fn() }));
jest.mock('../hooks/useCancelSession', () => ({ useCancelSession: jest.fn() }));

const mockedUseWorkoutSession = jest.mocked(useWorkoutSession);
const mockedUseProgramDayExercises = jest.mocked(useProgramDayExercises);
const mockedUseLogSets = jest.mocked(useLogSets);
const mockedUseCompleteSession = jest.mocked(useCompleteSession);
const mockedUseCancelSession = jest.mocked(useCancelSession);

const exercises = [
  {
    id: 'pde-1',
    exerciseId: 'ex-1',
    exerciseName: 'Back Squat',
    orderIndex: 0,
    sets: 3,
    reps: 10,
    targetWeight: 40,
  },
];

describe('SetLoggingScreen', () => {
  let logSetsMutate: jest.Mock;
  let completeMutate: jest.Mock;
  let cancelMutate: jest.Mock;

  beforeEach(() => {
    mockedUseWorkoutSession.mockReturnValue({
      data: {
        id: 'session-1',
        programDayId: 'day-1',
        programDayName: 'Push day',
        status: 'planned',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useWorkoutSession>);
    mockedUseProgramDayExercises.mockReturnValue({
      data: exercises,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgramDayExercises>);
    logSetsMutate = jest.fn().mockResolvedValue(undefined);
    mockedUseLogSets.mockReturnValue({
      mutateAsync: logSetsMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useLogSets>);
    completeMutate = jest.fn().mockResolvedValue(undefined);
    mockedUseCompleteSession.mockReturnValue({
      mutateAsync: completeMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCompleteSession>);
    cancelMutate = jest.fn();
    mockedUseCancelSession.mockReturnValue({
      mutate: cancelMutate,
    } as unknown as ReturnType<typeof useCancelSession>);
  });

  it('shows a loading indicator while session/exercises are loading', async () => {
    mockedUseWorkoutSession.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useWorkoutSession>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    expect(screen.getByTestId('set-logging-loading')).toBeTruthy();
  });

  it('shows the day name and target, with no set fields until "+ Add set" is pressed', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    expect(screen.getByText('Back Squat')).toBeTruthy();
    expect(screen.getByText('Target: 3 × 10')).toBeTruthy();
    expect(screen.queryByTestId('set-logging-pde-1-reps-0')).toBeNull();
    // First "real" render in this describe block is slow on CI (see the same bump on
    // ProgramCreateScreen.test.tsx's first test) — default 5000ms timeout flaked there.
  }, 15000);

  it('adds a set row prefilled with the exercise target when "+ Add set" is pressed', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));

    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('10');
    expect(screen.getByTestId('set-logging-pde-1-weight-0').props.value).toBe('40');
  });

  it('saves every entered set for every touched exercise in one bulk insert on finish', async () => {
    const onCompleted = jest.fn();
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={onCompleted}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '10');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-weight-0'), '15');

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-1'), '8');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-weight-1'), '20');

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() =>
      expect(logSetsMutate).toHaveBeenCalledWith([
        { exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 15 },
        { exerciseId: 'ex-1', setIndex: 1, repsDone: 8, weight: 20 },
      ]),
    );
    await waitFor(() => expect(completeMutate).toHaveBeenCalledWith('session-1'));
    expect(onCompleted).toHaveBeenCalledWith('session-1');
  });

  it('does not save anything for an exercise the user never touched', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(completeMutate).toHaveBeenCalled());
    expect(logSetsMutate).not.toHaveBeenCalled();
  });

  it('skips a set row left completely blank', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-weight-0'), '');

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(completeMutate).toHaveBeenCalled());
    expect(logSetsMutate).not.toHaveBeenCalled();
  });

  it('does not re-insert already-saved sets when retrying finish after completeSession fails', async () => {
    completeMutate.mockRejectedValueOnce(new Error('network error'));

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(screen.getByTestId('set-logging-finish-error')).toBeTruthy());
    expect(logSetsMutate).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(completeMutate).toHaveBeenCalledTimes(2));
    // The set was already persisted by the first attempt, so retrying only retries
    // completing the session instead of inserting it a second time.
    expect(logSetsMutate).toHaveBeenCalledTimes(1);
  });

  it('assigns sequential set_index per exercise across cards and skips blank rows without leaving a gap', async () => {
    mockedUseProgramDayExercises.mockReturnValue({
      data: [
        exercises[0],
        {
          id: 'pde-2',
          exerciseId: 'ex-1',
          exerciseName: 'Back Squat (burnout)',
          orderIndex: 1,
          sets: 1,
          reps: 15,
          targetWeight: null,
        },
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgramDayExercises>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '10');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-weight-0'), '15');

    await fireEvent.press(screen.getByTestId('set-logging-pde-2-add-set'));
    await fireEvent.press(screen.getByTestId('set-logging-pde-2-add-set'));
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-2-reps-0'), '');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-2-weight-0'), '');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-2-reps-1'), '12');

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() =>
      expect(logSetsMutate).toHaveBeenCalledWith([
        { exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 15 },
        { exerciseId: 'ex-1', setIndex: 1, repsDone: 12, weight: null },
      ]),
    );
  });

  it('shows the cancel sheet and cancels the session on confirm', async () => {
    const onCancelled = jest.fn();
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={onCancelled}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-cancel'));
    await fireEvent.press(screen.getByTestId('cancel-workout-confirm'));

    expect(cancelMutate).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    cancelMutate.mock.calls[0][1].onSuccess();
    expect(onCancelled).toHaveBeenCalled();
  });

  it('finishes the workout and calls onCompleted when there is nothing to save', async () => {
    const onCompleted = jest.fn();
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={onCompleted}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(completeMutate).toHaveBeenCalledWith('session-1'));
    expect(onCompleted).toHaveBeenCalledWith('session-1');
  });

  it('disables the finish button while saving is in flight', async () => {
    let resolveSave: () => void = () => {};
    logSetsMutate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() =>
      expect(screen.getByTestId('set-logging-finish').props.accessibilityState.disabled).toBe(true),
    );

    resolveSave();

    await waitFor(() =>
      expect(screen.getByTestId('set-logging-finish').props.accessibilityState.disabled).toBe(
        false,
      ),
    );
  });

  it('shows an error and keeps the entered sets when saving fails', async () => {
    logSetsMutate.mockRejectedValueOnce(new Error('network error'));

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(screen.getByTestId('set-logging-finish-error')).toBeTruthy());
    expect(completeMutate).not.toHaveBeenCalled();
    // The entered set is still there so the user can retry without re-typing.
    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('10');
  });

  it('shows an error in the cancel sheet when cancelling fails', async () => {
    mockedUseCancelSession.mockReturnValue({
      mutate: cancelMutate,
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useCancelSession>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-cancel'));
    expect(screen.getByTestId('cancel-workout-error')).toBeTruthy();
  });
});
