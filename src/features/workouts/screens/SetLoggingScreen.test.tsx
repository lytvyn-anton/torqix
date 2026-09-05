import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useCancelSession } from '../hooks/useCancelSession';
import { useCompleteSession } from '../hooks/useCompleteSession';
import { useLogSet } from '../hooks/useLogSet';
import { useProgramDayExercises } from '../hooks/useProgramDayExercises';
import { useSetLogs } from '../hooks/useSetLogs';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { SetLoggingScreen } from './SetLoggingScreen';

jest.mock('../hooks/useWorkoutSession', () => ({ useWorkoutSession: jest.fn() }));
jest.mock('../hooks/useProgramDayExercises', () => ({ useProgramDayExercises: jest.fn() }));
jest.mock('../hooks/useSetLogs', () => ({ useSetLogs: jest.fn() }));
jest.mock('../hooks/useLogSet', () => ({ useLogSet: jest.fn() }));
jest.mock('../hooks/useCompleteSession', () => ({ useCompleteSession: jest.fn() }));
jest.mock('../hooks/useCancelSession', () => ({ useCancelSession: jest.fn() }));

const mockedUseWorkoutSession = jest.mocked(useWorkoutSession);
const mockedUseProgramDayExercises = jest.mocked(useProgramDayExercises);
const mockedUseSetLogs = jest.mocked(useSetLogs);
const mockedUseLogSet = jest.mocked(useLogSet);
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
  let logSetMutate: jest.Mock;
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
    mockedUseSetLogs.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSetLogs>);
    logSetMutate = jest.fn();
    mockedUseLogSet.mockReturnValue({
      mutate: logSetMutate,
    } as unknown as ReturnType<typeof useLogSet>);
    completeMutate = jest.fn();
    mockedUseCompleteSession.mockReturnValue({
      mutate: completeMutate,
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

  it('shows the day name, target, and lets the user log a set with the target defaults', async () => {
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

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-log'));

    expect(logSetMutate).toHaveBeenCalledWith({
      exerciseId: 'ex-1',
      setIndex: 0,
      repsDone: 10,
      weight: 40,
    });
    // First "real" render in this describe block is slow on CI (see the same bump on
    // ProgramCreateScreen.test.tsx's first test) — default 5000ms timeout flaked there.
  }, 15000);

  it('logs subsequent sets with an incrementing set index based on already-logged sets', async () => {
    mockedUseSetLogs.mockReturnValue({
      data: [{ id: 'log-1', exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 40 }],
    } as unknown as ReturnType<typeof useSetLogs>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    expect(screen.getByText('1 logged')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-log'));
    expect(logSetMutate).toHaveBeenCalledWith(expect.objectContaining({ setIndex: 1 }));
  });

  it('assigns increasing set indexes across taps even before the query cache reflects the first log', async () => {
    // setLogsQuery.data never changes here, simulating two taps landing before the
    // post-mutation invalidation has refetched — the set index still must not repeat.
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('set-logging-pde-1-log'));
    await fireEvent.press(screen.getByTestId('set-logging-pde-1-log'));

    expect(logSetMutate).toHaveBeenNthCalledWith(1, expect.objectContaining({ setIndex: 0 }));
    expect(logSetMutate).toHaveBeenNthCalledWith(2, expect.objectContaining({ setIndex: 1 }));
  });

  it('logs a set with edited reps/weight', async () => {
    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-reps'), '8');
    await fireEvent.changeText(screen.getByTestId('set-logging-pde-1-weight'), '42.5');
    await fireEvent.press(screen.getByTestId('set-logging-pde-1-log'));

    expect(logSetMutate).toHaveBeenCalledWith({
      exerciseId: 'ex-1',
      setIndex: 0,
      repsDone: 8,
      weight: 42.5,
    });
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

  it('finishes the workout and calls onCompleted', async () => {
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

    expect(completeMutate).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    completeMutate.mock.calls[0][1].onSuccess();
    expect(onCompleted).toHaveBeenCalledWith('session-1');
  });

  it('disables the log-set button while a log is in flight, and shows an error on failure', async () => {
    mockedUseLogSet.mockReturnValue({
      mutate: logSetMutate,
      isPending: true,
      isError: true,
    } as unknown as ReturnType<typeof useLogSet>);

    await render(
      <SetLoggingScreen
        userId="user-1"
        sessionId="session-1"
        onCancelled={jest.fn()}
        onCompleted={jest.fn()}
      />,
    );

    expect(screen.getByTestId('set-logging-pde-1-log').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.getByTestId('set-logging-log-error')).toBeTruthy();
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
