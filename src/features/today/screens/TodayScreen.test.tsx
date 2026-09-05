import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { useProgramDays } from '../../workouts/hooks/useProgramDays';
import { useStartWorkoutSession } from '../../workouts/hooks/useStartWorkoutSession';
import { useTodaySession } from '../../workouts/hooks/useTodaySession';
import { TodayScreen } from './TodayScreen';

jest.mock('../../programs/hooks/useActiveProgram', () => ({ useActiveProgram: jest.fn() }));
jest.mock('../../workouts/hooks/useProgramDays', () => ({ useProgramDays: jest.fn() }));
jest.mock('../../workouts/hooks/useStartWorkoutSession', () => ({
  useStartWorkoutSession: jest.fn(),
}));
jest.mock('../../workouts/hooks/useTodaySession', () => ({ useTodaySession: jest.fn() }));

const mockedUseActiveProgram = jest.mocked(useActiveProgram);
const mockedUseProgramDays = jest.mocked(useProgramDays);
const mockedUseStartWorkoutSession = jest.mocked(useStartWorkoutSession);
const mockedUseTodaySession = jest.mocked(useTodaySession);

describe('TodayScreen', () => {
  beforeEach(() => {
    mockedUseProgramDays.mockReturnValue({
      data: [{ id: 'day-1', name: 'Push day', orderIndex: 0 }],
    } as unknown as ReturnType<typeof useProgramDays>);
    mockedUseStartWorkoutSession.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useStartWorkoutSession>);
    mockedUseTodaySession.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTodaySession>);
  });

  it("shows a loading indicator while today's session is still being checked", async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);
    mockedUseTodaySession.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useTodaySession>);

    await render(
      <TodayScreen userId="user-1" onCreateProgram={jest.fn()} onOpenWorkout={jest.fn()} />,
    );

    expect(screen.getByTestId('today-loading')).toBeTruthy();
    expect(screen.queryByTestId('today-choose-day')).toBeNull();
  });

  it('shows a loading indicator while the active program is loading', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <TodayScreen userId="user-1" onCreateProgram={jest.fn()} onOpenWorkout={jest.fn()} />,
    );

    expect(screen.getByTestId('today-loading')).toBeTruthy();
  });

  it('shows an error message when the active program fails to load', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <TodayScreen userId="user-1" onCreateProgram={jest.fn()} onOpenWorkout={jest.fn()} />,
    );

    expect(screen.getByTestId('today-load-error')).toBeTruthy();
  });

  it('shows the empty state and calls onCreateProgram when there is no active program', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);
    const onCreateProgram = jest.fn();

    await render(
      <TodayScreen userId="user-1" onCreateProgram={onCreateProgram} onOpenWorkout={jest.fn()} />,
    );

    expect(screen.getByTestId('today-empty')).toBeTruthy();
    fireEvent.press(screen.getByTestId('today-create-program'));
    expect(onCreateProgram).toHaveBeenCalledTimes(1);
  });

  it('keeps showing an already-loaded active program through a background refetch error', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <TodayScreen userId="user-1" onCreateProgram={jest.fn()} onOpenWorkout={jest.fn()} />,
    );

    expect(screen.queryByTestId('today-load-error')).toBeNull();
    expect(screen.getByTestId('today-choose-day')).toBeTruthy();
  });

  it("offers to start each of the active program's days when there is no session in progress", async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);
    const mutate = jest.fn();
    mockedUseStartWorkoutSession.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useStartWorkoutSession>);
    const onOpenWorkout = jest.fn();

    await render(
      <TodayScreen userId="user-1" onCreateProgram={jest.fn()} onOpenWorkout={onOpenWorkout} />,
    );

    expect(screen.getByTestId('today-choose-day')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('today-start-day-day-1'));

    expect(mutate).toHaveBeenCalledWith(
      'day-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const onSuccess = mutate.mock.calls[0][1].onSuccess;
    onSuccess({ id: 'session-1' });
    expect(onOpenWorkout).toHaveBeenCalledWith('session-1');
  });

  it('offers to continue an in-progress session instead of the day picker', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);
    mockedUseTodaySession.mockReturnValue({
      data: {
        id: 'session-1',
        programDayId: 'day-1',
        programDayName: 'Push day',
        status: 'planned',
      },
    } as unknown as ReturnType<typeof useTodaySession>);
    const onOpenWorkout = jest.fn();

    await render(
      <TodayScreen userId="user-1" onCreateProgram={jest.fn()} onOpenWorkout={onOpenWorkout} />,
    );

    expect(screen.getByTestId('today-continue-workout')).toBeTruthy();
    expect(screen.queryByTestId('today-choose-day')).toBeNull();

    await fireEvent.press(screen.getByTestId('today-continue-session'));
    expect(onOpenWorkout).toHaveBeenCalledWith('session-1');
  });
});
