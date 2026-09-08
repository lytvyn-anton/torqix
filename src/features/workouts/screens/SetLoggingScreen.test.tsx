import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useAbandonOrphanedSession } from '../hooks/useAbandonOrphanedSession';
import { useCancelSession } from '../hooks/useCancelSession';
import { useCompleteSession } from '../hooks/useCompleteSession';
import { useLastPerformedSets } from '../hooks/useLastPerformedSets';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useSetLogs } from '../hooks/useSetLogs';
import { useSyncSetLogs } from '../hooks/useSyncSetLogs';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { SetLoggingScreen } from './SetLoggingScreen';

jest.mock('../hooks/useWorkoutSession', () => ({ useWorkoutSession: jest.fn() }));
jest.mock('../hooks/useProgramDayExercises', () => ({ useProgramDayExercises: jest.fn() }));
jest.mock('../hooks/useSetLogs', () => ({ useSetLogs: jest.fn() }));
jest.mock('../hooks/useLastPerformedSets', () => ({ useLastPerformedSets: jest.fn() }));
jest.mock('../hooks/useSyncSetLogs', () => ({ useSyncSetLogs: jest.fn() }));
jest.mock('../hooks/useCompleteSession', () => ({ useCompleteSession: jest.fn() }));
jest.mock('../hooks/useCancelSession', () => ({ useCancelSession: jest.fn() }));
jest.mock('../hooks/useAbandonOrphanedSession', () => ({ useAbandonOrphanedSession: jest.fn() }));

const mockedUseWorkoutSession = jest.mocked(useWorkoutSession);
const mockedUseProgramDayExercises = jest.mocked(useProgramDayExercises);
const mockedUseSetLogs = jest.mocked(useSetLogs);
const mockedUseLastPerformedSets = jest.mocked(useLastPerformedSets);
const mockedUseSyncSetLogs = jest.mocked(useSyncSetLogs);
const mockedUseCompleteSession = jest.mocked(useCompleteSession);
const mockedUseCancelSession = jest.mocked(useCancelSession);
const mockedUseAbandonOrphanedSession = jest.mocked(useAbandonOrphanedSession);

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
  let abandonMutate: jest.Mock;

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
    mockedUseLastPerformedSets.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useLastPerformedSets>);
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
      isPending: false,
    } as unknown as ReturnType<typeof useCancelSession>);
    abandonMutate = jest.fn();
    mockedUseAbandonOrphanedSession.mockReturnValue({
      mutate: abandonMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useAbandonOrphanedSession>);
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

  it('pre-fills real, editable rows matching the program target when there is no history', async () => {
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
    // 3 real rows (matching the target set count), prefilled with the target reps/weight —
    // not placeholders, not blank.
    for (const i of [0, 1, 2]) {
      expect(screen.getByTestId(`set-logging-pde-1-reps-${i}`).props.value).toBe('10');
      expect(screen.getByTestId(`set-logging-pde-1-weight-${i}`).props.value).toBe('40');
    }
    // First "real" render in this describe block is slow on CI (see the same bump on
    // ProgramCreateScreen.test.tsx's first test) — default 5000ms timeout flaked there.
  }, 15000);

  it('pre-fills rows with what was actually done last time, when that exists', async () => {
    mockedUseLastPerformedSets.mockReturnValue({
      data: [
        { exerciseId: 'ex-1', setIndex: 0, repsDone: 8, weight: 45 },
        { exerciseId: 'ex-1', setIndex: 1, repsDone: 6, weight: 47.5 },
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useLastPerformedSets>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    // Last time's 2 sets win over the program's target-based 3 rows.
    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('8');
    expect(screen.getByTestId('set-logging-pde-1-weight-0').props.value).toBe('45');
    expect(screen.getByTestId('set-logging-pde-1-reps-1').props.value).toBe('6');
    expect(screen.getByTestId('set-logging-pde-1-weight-1').props.value).toBe('47.5');
    expect(screen.queryByTestId('set-logging-pde-1-reps-2')).toBeNull();
  });

  it('pre-fills rows with sets already saved this session, over last time or the target', async () => {
    mockedUseSetLogs.mockReturnValue({
      data: [{ id: 'log-1', exerciseId: 'ex-1', setIndex: 0, repsDone: 9, weight: 42.5 }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useSetLogs>);
    mockedUseLastPerformedSets.mockReturnValue({
      data: [{ exerciseId: 'ex-1', setIndex: 0, repsDone: 8, weight: 45 }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useLastPerformedSets>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('9');
    expect(screen.getByTestId('set-logging-pde-1-weight-0').props.value).toBe('42.5');
    expect(screen.queryByTestId('set-logging-pde-1-reps-1')).toBeNull();
  });

  it('adds another row prefilled with the target when "+ Add set" is pressed', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-add-set'));

    expect(screen.getByTestId('set-logging-pde-1-reps-3').props.value).toBe('10');
    expect(screen.getByTestId('set-logging-pde-1-weight-3').props.value).toBe('40');
  });

  it('does not call the server while editing — only on finish', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '12');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-weight-0'), '50');

    expect(syncSetLogsMutate).not.toHaveBeenCalled();
  });

  it('saves everything in one request and completes the session on finish', async () => {
    const onCompleted = jest.fn();
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={onCompleted}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '12');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-weight-0'), '50');
    // Row 1 left exactly as prefilled (10 × 40kg) — that's still a real, intentional value,
    // not an untouched placeholder, so it's saved too.

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() =>
      expect(syncSetLogsMutate).toHaveBeenCalledWith({
        allExerciseIds: ['ex-1'],
        inputs: [
          { exerciseId: 'ex-1', setIndex: 0, repsDone: 12, weight: 50 },
          { exerciseId: 'ex-1', setIndex: 1, repsDone: 10, weight: 40 },
          { exerciseId: 'ex-1', setIndex: 2, repsDone: 10, weight: 40 },
        ],
      }),
    );
    await waitFor(() => expect(completeMutate).toHaveBeenCalledWith('session-1'));
    expect(onCompleted).toHaveBeenCalledWith('session-1');
  });

  it('skips a row cleared back to fully blank', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    for (const i of [0, 1, 2]) {
      await fireEvent.changeText(screen.getByTestId(`set-logging-pde-1-reps-${i}`), '');
      await fireEvent.changeText(screen.getByTestId(`set-logging-pde-1-weight-${i}`), '');
    }
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '12');

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() =>
      expect(syncSetLogsMutate).toHaveBeenCalledWith({
        allExerciseIds: ['ex-1'],
        inputs: [{ exerciseId: 'ex-1', setIndex: 0, repsDone: 12, weight: null }],
      }),
    );
  });

  it('assigns sequential set_index per exercise across two cards for the same exercise', async () => {
    mockedUseProgramDayExercises.mockReturnValue({
      data: [
        { ...exercises[0], sets: 1 },
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

    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() =>
      expect(syncSetLogsMutate).toHaveBeenCalledWith({
        allExerciseIds: ['ex-1', 'ex-1'],
        inputs: [
          { exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 40 },
          { exerciseId: 'ex-1', setIndex: 1, repsDone: 15, weight: null },
        ],
      }),
    );
  });

  it('flushes whatever is in the fields on unmount if the user leaves without finishing', async () => {
    const { unmount } = await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '12');
    expect(syncSetLogsMutate).not.toHaveBeenCalled();

    unmount();

    await waitFor(() =>
      expect(syncSetLogsMutate).toHaveBeenCalledWith({
        allExerciseIds: ['ex-1'],
        inputs: [
          { exerciseId: 'ex-1', setIndex: 0, repsDone: 12, weight: 40 },
          { exerciseId: 'ex-1', setIndex: 1, repsDone: 10, weight: 40 },
          { exerciseId: 'ex-1', setIndex: 2, repsDone: 10, weight: 40 },
        ],
      }),
    );
  });

  it('does not re-save on unmount once finish already saved successfully', async () => {
    const { unmount } = await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-finish'));
    await waitFor(() => expect(syncSetLogsMutate).toHaveBeenCalledTimes(1));

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(syncSetLogsMutate).toHaveBeenCalledTimes(1);
  });

  it('does not save anything on unmount after cancelling — the drafts are discarded', async () => {
    const onCancelled = jest.fn();
    const { unmount } = await render(
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

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(syncSetLogsMutate).not.toHaveBeenCalled();
  });

  it('still saves on a later unmount if cancelling failed — the session was never actually cancelled', async () => {
    const { unmount } = await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-cancel'));
    await fireEvent.press(screen.getByTestId('cancel-workout-confirm'));

    // cancelSession.mutate was called, but never resolved with onSuccess (e.g. it failed) —
    // isHandledRef must not have been set, so leaving afterward still saves the real drafts.
    unmount();

    await waitFor(() => expect(syncSetLogsMutate).toHaveBeenCalledTimes(1));
  });

  it('retries saving on a later unmount if finish failed to save the first time', async () => {
    syncSetLogsMutate.mockRejectedValueOnce(new Error('network error'));

    const { unmount } = await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-finish'));
    await waitFor(() => expect(screen.getByTestId('set-logging-finish-error')).toBeTruthy());
    expect(completeMutate).not.toHaveBeenCalled();

    unmount();

    await waitFor(() => expect(syncSetLogsMutate).toHaveBeenCalledTimes(2));
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

  it('shows an error and keeps the entered values when saving fails', async () => {
    syncSetLogsMutate.mockRejectedValueOnce(new Error('network error'));

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps-0'), '12');
    await fireEvent.press(screen.getByTestId('set-logging-finish'));

    await waitFor(() => expect(screen.getByTestId('set-logging-finish-error')).toBeTruthy());
    expect(completeMutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('set-logging-pde-1-reps-0').props.value).toBe('12');
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

  describe('when the session was orphaned by a deleted program', () => {
    beforeEach(() => {
      // program_day_id came back null (ON DELETE SET NULL) — getTodaySession auto-skips this
      // before Today ever offers "Continue" for it, but the screen can still be reached
      // directly (e.g. a stale route), and useProgramDayExercises stays disabled without a
      // day id, so this has to be handled as its own state rather than falling through.
      mockedUseWorkoutSession.mockReturnValue({
        data: { id: 'session-1', programDayId: null, programDayName: '', status: 'planned' },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useWorkoutSession>);
      mockedUseProgramDayExercises.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useProgramDayExercises>);
    });

    it('shows a "program deleted" message instead of an empty exercise list', async () => {
      await render(
        <SetLoggingScreen
          userId="user-1"
          sessionId="session-1"
          onCancelled={jest.fn()}
          onCompleted={jest.fn()}
        />,
      );

      expect(screen.getByTestId('set-logging-program-deleted')).toBeTruthy();
      expect(screen.queryByTestId('set-logging-finish')).toBeNull();
    });

    it('abandons the orphaned session (preserving any logged sets) when the button is pressed', async () => {
      const onCancelled = jest.fn();
      await render(
        <SetLoggingScreen
          userId="user-1"
          sessionId="session-1"
          onCancelled={onCancelled}
          onCompleted={jest.fn()}
        />,
      );

      await fireEvent.press(screen.getByTestId('set-logging-program-deleted-cancel'));

      // Not cancelMutate: this dead end must not delete already-logged sets the way a normal
      // user-initiated cancel does — it uses the log-preserving abandon path instead.
      expect(cancelMutate).not.toHaveBeenCalled();
      expect(abandonMutate).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
      abandonMutate.mock.calls[0][1].onSuccess();
      expect(onCancelled).toHaveBeenCalled();
    });

    it('shows an error when abandoning the orphaned session fails', async () => {
      mockedUseAbandonOrphanedSession.mockReturnValue({
        mutate: abandonMutate,
        isPending: false,
        isError: true,
      } as unknown as ReturnType<typeof useAbandonOrphanedSession>);

      await render(
        <SetLoggingScreen
          userId="user-1"
          sessionId="session-1"
          onCancelled={jest.fn()}
          onCompleted={jest.fn()}
        />,
      );

      expect(screen.getByTestId('set-logging-program-deleted-error')).toBeTruthy();
    });
  });
});
