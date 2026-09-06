import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../../../shared/i18n';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { useLoggedExercises } from '../../workouts/hooks/useLoggedExercises';
import { ProgressScreen } from './ProgressScreen';

jest.mock('../../workouts/hooks/useLoggedExercises', () => ({ useLoggedExercises: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedUseLoggedExercises = jest.mocked(useLoggedExercises);
const mockedUseRouter = jest.mocked(useRouter);

// ProgressScreen reads useFloatingTabBarClearance(), which needs both a real Bottom Tab
// Navigator (for useBottomTabBarHeight()) and a SafeAreaProvider (for useSafeAreaInsets())
// — stand in the values it'd get there since these tests render it standalone.
function renderWithTabBar(ui: ReactElement) {
  return render(
    <ThemeProvider>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <BottomTabBarHeightContext.Provider value={83}>{ui}</BottomTabBarHeightContext.Provider>
      </SafeAreaProvider>
    </ThemeProvider>,
  );
}

describe('ProgressScreen', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({
      push: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it('shows a loading indicator while exercises are loading', async () => {
    mockedUseLoggedExercises.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useLoggedExercises>);

    await renderWithTabBar(<ProgressScreen userId="user-1" />);

    expect(screen.getByTestId('progress-loading')).toBeTruthy();
  });

  it('shows an error message when the list fails to load', async () => {
    mockedUseLoggedExercises.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useLoggedExercises>);

    await renderWithTabBar(<ProgressScreen userId="user-1" />);

    expect(screen.getByTestId('progress-load-error')).toBeTruthy();
  });

  it('shows the empty state when no exercise has been logged yet', async () => {
    mockedUseLoggedExercises.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof useLoggedExercises>);

    await renderWithTabBar(<ProgressScreen userId="user-1" />);

    expect(screen.getByTestId('progress-empty')).toBeTruthy();
  });

  it('renders a row per exercise with its last-performed summary', async () => {
    mockedUseLoggedExercises.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          lastScheduledDate: '2026-09-01',
          lastSessionSetCount: 4,
        },
      ],
    } as unknown as ReturnType<typeof useLoggedExercises>);

    await renderWithTabBar(<ProgressScreen userId="user-1" />);

    expect(screen.getByTestId('progress-row-exercise-1')).toBeTruthy();
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('navigates to the exercise detail screen when a row is pressed', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseLoggedExercises.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          lastScheduledDate: '2026-09-01',
          lastSessionSetCount: 4,
        },
      ],
    } as unknown as ReturnType<typeof useLoggedExercises>);

    await renderWithTabBar(<ProgressScreen userId="user-1" />);
    fireEvent.press(screen.getByTestId('progress-row-exercise-1'));

    expect(push).toHaveBeenCalledWith({
      pathname: '/exercise-progress/[exerciseId]',
      params: { exerciseId: 'exercise-1', name: 'Bench Press' },
    });
  });
});
