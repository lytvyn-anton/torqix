import { render, screen } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../../../shared/i18n';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { useWorkoutHistory } from '../../workouts/hooks/useWorkoutHistory';
import { HistoryScreen } from './HistoryScreen';

jest.mock('../../workouts/hooks/useWorkoutHistory', () => ({ useWorkoutHistory: jest.fn() }));

const mockedUseWorkoutHistory = jest.mocked(useWorkoutHistory);

// HistoryScreen reads useFloatingTabBarClearance(), which needs both a real Bottom Tab
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

describe('HistoryScreen', () => {
  it('shows a loading indicator while history is loading', async () => {
    mockedUseWorkoutHistory.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useWorkoutHistory>);

    await renderWithTabBar(<HistoryScreen userId="user-1" />);

    expect(screen.getByTestId('history-loading')).toBeTruthy();
  });

  it('shows an error message when history fails to load', async () => {
    mockedUseWorkoutHistory.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useWorkoutHistory>);

    await renderWithTabBar(<HistoryScreen userId="user-1" />);

    expect(screen.getByTestId('history-load-error')).toBeTruthy();
  });

  it('keeps showing an already-loaded list through a background refetch error', async () => {
    mockedUseWorkoutHistory.mockReturnValue({
      isLoading: false,
      isError: true,
      data: [
        {
          id: 'session-1',
          programDayName: 'Push day',
          scheduledDate: '2026-09-01',
          status: 'done',
        },
      ],
    } as unknown as ReturnType<typeof useWorkoutHistory>);

    await renderWithTabBar(<HistoryScreen userId="user-1" />);

    expect(screen.queryByTestId('history-load-error')).toBeNull();
    expect(screen.getByTestId('history-list')).toBeTruthy();
  });

  it('shows the empty state when there is no workout history', async () => {
    mockedUseWorkoutHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof useWorkoutHistory>);

    await renderWithTabBar(<HistoryScreen userId="user-1" />);

    expect(screen.getByTestId('history-empty')).toBeTruthy();
  });

  it('renders a card per session, with a distinct badge for skipped ones', async () => {
    mockedUseWorkoutHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'session-1',
          programDayName: 'Push day',
          scheduledDate: '2026-09-01',
          status: 'done',
        },
        {
          id: 'session-2',
          programDayName: 'Pull day',
          scheduledDate: '2026-08-30',
          status: 'skipped',
        },
      ],
    } as unknown as ReturnType<typeof useWorkoutHistory>);

    await renderWithTabBar(<HistoryScreen userId="user-1" />);

    expect(screen.getByTestId('history-card-session-1')).toBeTruthy();
    expect(screen.getByText('Push day')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByTestId('history-card-session-2')).toBeTruthy();
    expect(screen.getByText('Pull day')).toBeTruthy();
    expect(screen.getByText('Skipped')).toBeTruthy();
  });
});
