import { render, screen } from '@testing-library/react-native';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import type { ReactElement } from 'react';

import '../../../shared/i18n';
import { usePrograms } from '../hooks/usePrograms';
import { ProgramsScreen } from './ProgramsScreen';

jest.mock('../hooks/usePrograms', () => ({ usePrograms: jest.fn() }));

const mockedUsePrograms = jest.mocked(usePrograms);

// ProgramsScreen reads useBottomTabBarHeight(), which throws outside a real Bottom Tab
// Navigator — stand in the value it'd get there since these tests render it standalone.
function renderWithTabBar(ui: ReactElement) {
  return render(
    <BottomTabBarHeightContext.Provider value={83}>{ui}</BottomTabBarHeightContext.Provider>,
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

    await renderWithTabBar(<ProgramsScreen userId="user-1" />);

    expect(screen.getByTestId('programs-empty')).toBeTruthy();
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
