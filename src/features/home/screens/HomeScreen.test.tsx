import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { HomeScreen } from './HomeScreen';

jest.mock('../../programs/hooks/useActiveProgram', () => ({ useActiveProgram: jest.fn() }));

// JournalWidgetCard has its own test coverage (useProgram/useResolveProgramJournal, day
// rows) — mocked here to a simple stand-in so HomeScreen's own tests only exercise its own
// loading/error/empty/active-program branching.
jest.mock('../components/JournalWidgetCard', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    JournalWidgetCard: ({ programName }: { programName: string }) => (
      <Text testID="journal-widget-card-stub">{programName}</Text>
    ),
  };
});

const mockedUseActiveProgram = jest.mocked(useActiveProgram);

describe('HomeScreen', () => {
  it('shows a loading indicator while the active program is loading', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <HomeScreen userId="user-1" onCreateProgram={jest.fn()} onGenerateProgram={jest.fn()} />,
    );

    expect(screen.getByTestId('home-loading')).toBeTruthy();
  });

  it('shows an error message when the active program fails to load', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <HomeScreen userId="user-1" onCreateProgram={jest.fn()} onGenerateProgram={jest.fn()} />,
    );

    expect(screen.getByTestId('home-load-error')).toBeTruthy();
  });

  it('keeps showing an already-loaded active program through a background refetch error', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <HomeScreen userId="user-1" onCreateProgram={jest.fn()} onGenerateProgram={jest.fn()} />,
    );

    expect(screen.queryByTestId('home-load-error')).toBeNull();
    expect(screen.getByTestId('home-active-program')).toBeTruthy();
  });

  it('shows the journal widget card for the active program', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <HomeScreen userId="user-1" onCreateProgram={jest.fn()} onGenerateProgram={jest.fn()} />,
    );

    expect(screen.getByTestId('journal-widget-card-stub')).toBeTruthy();
    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
  });

  it('opens the new journal sheet from the empty state', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(
      <HomeScreen userId="user-1" onCreateProgram={jest.fn()} onGenerateProgram={jest.fn()} />,
    );

    expect(screen.getByTestId('home-empty')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-new-journal'));
    expect(screen.getByTestId('new-journal-sheet-generate')).toBeTruthy();
  });

  it('calls onGenerateProgram when the sheet’s generate option is picked', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);
    const onGenerateProgram = jest.fn();

    await render(
      <HomeScreen
        userId="user-1"
        onCreateProgram={jest.fn()}
        onGenerateProgram={onGenerateProgram}
      />,
    );

    await fireEvent.press(screen.getByTestId('home-new-journal'));
    await fireEvent.press(screen.getByTestId('new-journal-sheet-generate'));
    expect(onGenerateProgram).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateProgram when the sheet’s manual option is picked', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);
    const onCreateProgram = jest.fn();

    await render(
      <HomeScreen
        userId="user-1"
        onCreateProgram={onCreateProgram}
        onGenerateProgram={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('home-new-journal'));
    await fireEvent.press(screen.getByTestId('new-journal-sheet-manual'));
    expect(onCreateProgram).toHaveBeenCalledTimes(1);
  });
});
