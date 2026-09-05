import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../../../shared/i18n';
import { usePrograms } from '../hooks/usePrograms';
import { ProgramsScreen } from './ProgramsScreen';

jest.mock('../hooks/usePrograms', () => ({ usePrograms: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const mockedUsePrograms = jest.mocked(usePrograms);
const mockedUseRouter = jest.mocked(useRouter);

// ProgramsScreen reads useFloatingTabBarClearance(), which needs both a real Bottom Tab
// Navigator (for useBottomTabBarHeight()) and a SafeAreaProvider (for useSafeAreaInsets())
// — stand in the values it'd get there since these tests render it standalone.
function renderWithTabBar(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <BottomTabBarHeightContext.Provider value={83}>{ui}</BottomTabBarHeightContext.Provider>
    </SafeAreaProvider>,
  );
}

describe('ProgramsScreen', () => {
  it('shows a loading indicator while programs are loading', async () => {
    mockedUsePrograms.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof usePrograms>);

    await renderWithTabBar(<ProgramsScreen userId="user-1" />);

    expect(screen.getByTestId('programs-loading')).toBeTruthy();
  });

  it('shows an error message when programs fail to load', async () => {
    mockedUsePrograms.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof usePrograms>);

    await renderWithTabBar(<ProgramsScreen userId="user-1" />);

    expect(screen.getByTestId('programs-load-error')).toBeTruthy();
  });

  it('keeps showing an already-loaded list through a background refetch error', async () => {
    mockedUsePrograms.mockReturnValue({
      isLoading: false,
      isError: true,
      data: [
        { id: 'program-1', name: 'Push / Pull / Legs', status: 'active', createdAt: '2026-09-01' },
      ],
    } as unknown as ReturnType<typeof usePrograms>);

    await renderWithTabBar(<ProgramsScreen userId="user-1" />);

    expect(screen.queryByTestId('programs-load-error')).toBeNull();
    expect(screen.getByTestId('programs-list')).toBeTruthy();
  });

  it('shows the empty state when the user has no programs', async () => {
    mockedUsePrograms.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof usePrograms>);
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>);

    await renderWithTabBar(<ProgramsScreen userId="user-1" />);

    expect(screen.getByTestId('programs-empty')).toBeTruthy();
  });

  it('navigates to program creation from the empty state CTA', async () => {
    const push = jest.fn();
    mockedUsePrograms.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof usePrograms>);
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    await renderWithTabBar(<ProgramsScreen userId="user-1" />);
    fireEvent.press(screen.getByTestId('programs-empty-cta'));

    expect(push).toHaveBeenCalledWith('/program-create');
  });

  it('renders a card per program, with a badge for archived ones', async () => {
    mockedUsePrograms.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { id: 'program-1', name: 'Push / Pull / Legs', status: 'active', createdAt: '2026-09-01' },
        { id: 'program-2', name: 'Old 5x5', status: 'archived', createdAt: '2026-01-01' },
      ],
    } as unknown as ReturnType<typeof usePrograms>);

    await renderWithTabBar(<ProgramsScreen userId="user-1" />);

    expect(screen.getByTestId('program-card-program-1')).toBeTruthy();
    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByTestId('program-card-program-2')).toBeTruthy();
    expect(screen.getByText('Old 5x5')).toBeTruthy();
    expect(screen.getByText('Archived')).toBeTruthy();
  });
});
