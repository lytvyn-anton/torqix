import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useCancelSession } from '../hooks/useCancelSession';
import { useCompleteSession } from '../hooks/useCompleteSession';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useSetLogs } from '../hooks/useSetLogs';
import { useSyncSetLogs } from '../hooks/useSyncSetLogs';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { AUTOSAVE_DELAY_MS, SetLoggingScreen } from './SetLoggingScreen';

jest.mock('../hooks/useWorkoutSession', () => ({ useWorkoutSession: jest.fn() }));
jest.mock('../hooks/useProgramDayExercises', () => ({ useProgramDayExercises: jest.fn() }));
jest.mock('../hooks/useSetLogs', () => ({ useSetLogs: jest.fn() }));
jest.mock('../hooks/useSyncSetLogs', () => ({ useSyncSetLogs: jest.fn() }));
jest.mock('../hooks/useCompleteSession', () => ({ useCompleteSession: jest.fn() }));
jest.mock('../hooks/useCancelSession', () => ({ useCancelSession: jest.fn() }));

const mockedUseWorkoutSession = jest.mocked(useWorkoutSession);
const mockedUseProgramDayExercises = jest.mocked(useProgramDayExercises);
const mockedUseSetLogs = jest.mocked(useSetLogs);
const mockedUseSyncSetLogs = jest.mocked(useSyncSetLogs);
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
  let syncSetLogsMutate: jest.Mock;
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
    mockedUseSetLogs.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSetLogs>);
    syncSetLogsMutate = jest.fn().mockResolvedValue(undefined);
    mockedUseSyncSetLogs.mockReturnValue({
      mutateAsync: syncSetLogsMutate,
    } as unknown as ReturnType<typeof useSyncSetLogs>);
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

  it('shows a loading indicator while session/exercises/saved sets are loading', async () => {
    mockedUseSetLogs.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useSetLogs>);

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

  it('adds a blank set row hinting the exercise target as a placeholder', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));

    // Blank, not prefilled: adding a row shouldn't by itself autosave a set nobody actually
    // confirmed — the target is only a placeholder hint until the user types a real value.
    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('');
    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.placeholder).toBe('10');
    expect(screen.getByTestId('set-logging-pde-1-weight-0').props.value).toBe('');
    expect(screen.getByTestId('set-logging-pde-1-weight-0').props.placeholder).toBe('40');
  });

  it('repopulates fields with sets already saved for this session on reopen', async () => {
    mockedUseSetLogs.mockReturnValue({
      data: [
        { id: 'log-1', exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 15 },
        { id: 'log-2', exerciseId: 'ex-1', setIndex: 1, repsDone: 8, weight: 20 },
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSetLogs>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('10');
    expect(screen.getByTestId('set-logging-pde-1-weight-0').props.value).toBe('15');
    expect(screen.getByTestId('set-logging-pde-1-reps-1').props.value).toBe('8');
    expect(screen.getByTestId('set-logging-pde-1-weight-1').props.value).toBe('20');
  });

  it('autosaves an edited set in the background, without pressing finish', async () => {
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

    expect(syncSetLogsMutate).not.toHaveBeenCalled();

    await waitFor(
      () =>
        expect(syncSetLogsMutate).toHaveBeenCalledWith({
          allExerciseIds: ['ex-1'],
          inputs: [{ exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 15 }],
        }),
      { timeout: 2000 },
    );
  });

  it('saves every entered set for every touched exercise and completes the session on finish', async () => {
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
      expect(syncSetLogsMutate).toHaveBeenCalledWith({
        allExerciseIds: ['ex-1'],
        inputs: [
          { exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 15 },
          { exerciseId: 'ex-1', setIndex: 1, repsDone: 8, weight: 20 },
        ],
      }),
    );
    await waitFor(() => expect(completeMutate).toHaveBeenCalledWith('session-1'));
    expect(onCompleted).toHaveBeenCalledWith('session-1');
  });

  it('does not save anything for an exercise the user never touched, or a row left blank', async () => {
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

    await waitFor(() =>
      expect(syncSetLogsMutate).toHaveBeenCalledWith({ allExerciseIds: ['ex-1'], inputs: [] }),
    );
    expect(completeMutate).toHaveBeenCalledWith('session-1');
  });

  it('assigns sequential set_index per exercise across two cards for the same exercise', async () => {
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
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-2-reps-0'), '12');

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() =>
      expect(syncSetLogsMutate).toHaveBeenCalledWith({
        allExerciseIds: ['ex-1', 'ex-1'],
        inputs: [
          { exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 15 },
          { exerciseId: 'ex-1', setIndex: 1, repsDone: 12, weight: null },
        ],
      }),
    );
  });

  it('does not autosave an added row until it is actually edited', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    // Long enough to catch a debounce that fires without being asked to.
    await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_DELAY_MS + 200));

    expect(syncSetLogsMutate).not.toHaveBeenCalled();
  });

  it('cancels a pending autosave instead of writing it when the workout is cancelled', async () => {
    const onCancelled = jest.fn();
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={onCancelled}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '10');

    await fireEvent.press(screen.getByTestId('set-logging-cancel'));
    await fireEvent.press(screen.getByTestId('cancel-workout-confirm'));
    await waitFor(() => expect(cancelMutate).toHaveBeenCalled());
    cancelMutate.mock.calls[0][1].onSuccess();

    await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_DELAY_MS + 200));
    expect(syncSetLogsMutate).not.toHaveBeenCalled();
  });

  it('waits for an in-flight autosave to settle before cancelling, so it cannot resurrect a row after cancel deletes it', async () => {
    let resolveSync: () => void = () => {};
    syncSetLogsMutate.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSync = resolve;
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
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '10');

    // Let the debounce actually fire, so the autosave is genuinely in flight (not merely
    // scheduled) by the time cancel is confirmed.
    await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_DELAY_MS + 50));
    expect(syncSetLogsMutate).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('set-logging-cancel'));
    fireEvent.press(screen.getByTestId('cancel-workout-confirm'));

    // cancelSession must not run until the in-flight autosave it needs to outlive settles —
    // otherwise a slow autosave response could land after cancel's delete and resurrect a row.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(cancelMutate).not.toHaveBeenCalled();

    resolveSync();

    await waitFor(() =>
      expect(cancelMutate).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
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

    await waitFor(() =>
      expect(cancelMutate).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    );
    cancelMutate.mock.calls[0][1].onSuccess();
    expect(onCancelled).toHaveBeenCalled();
  });

  it('finishes and calls onCompleted when there is nothing to save', async () => {
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
    syncSetLogsMutate.mockImplementation(
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
    syncSetLogsMutate.mockRejectedValueOnce(new Error('network error'));

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
    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(screen.getByTestId('set-logging-finish-error')).toBeTruthy());
    expect(completeMutate).not.toHaveBeenCalled();
    // The entered set is still there so the user can retry without re-typing.
    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('10');
  });

  it('shows an error when the sets saved fine but completing the session fails', async () => {
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
