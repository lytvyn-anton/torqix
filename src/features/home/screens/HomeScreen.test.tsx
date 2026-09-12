import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { HomeScreen } from './HomeScreen';
import type { ActiveProgram } from '../../programs/types';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../programs/hooks/useActiveProgram', () => ({ useActiveProgram: jest.fn() }));

// Both widgets have their own test coverage (ProgramsWidgetCard.test.tsx,
// JournalWidgetCard.test.tsx) — mocked here to simple stand-ins so HomeScreen's own tests
// only exercise its own loading/error branching and the props/callbacks it wires through.
jest.mock('../components/ProgramsWidgetCard', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    ProgramsWidgetCard: ({
      activeProgram,
      onGenerateProgram,
      onCreateProgram,
    }: {
      activeProgram: ActiveProgram | undefined;
      onGenerateProgram: () => void;
      onCreateProgram: () => void;
    }) => (
      <>
        <Text testID="programs-widget-stub">{activeProgram?.name ?? 'none'}</Text>
        <TouchableOpacity testID="programs-widget-stub-generate" onPress={onGenerateProgram} />
        <TouchableOpacity testID="programs-widget-stub-create" onPress={onCreateProgram} />
      </>
    ),
  };
});
jest.mock('../components/JournalWidgetCard', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    JournalWidgetCard: ({ activeProgram }: { activeProgram: ActiveProgram | undefined }) => (
      <Text testID="journal-widget-card-stub">{activeProgram?.name ?? 'none'}</Text>
    ),
  };
});

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseActiveProgram = jest.mocked(useActiveProgram);

describe('HomeScreen', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  it('shows a loading indicator while the active program is loading', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);

    expect(screen.getByTestId('home-loading')).toBeTruthy();
  });

  it('shows an error message when the active program fails to load', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);

    expect(screen.getByTestId('home-load-error')).toBeTruthy();
  });

  it('keeps showing an already-loaded active program through a background refetch error', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: true,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);

    expect(screen.queryByTestId('home-load-error')).toBeNull();
    expect(screen.getByTestId('home-widgets')).toBeTruthy();
  });

  it('passes the active program through to both widgets', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);

    expect(screen.getByTestId('programs-widget-stub')).toHaveTextContent('Push / Pull / Legs');
    expect(screen.getByTestId('journal-widget-card-stub')).toHaveTextContent('Push / Pull / Legs');
  });

  it('renders both widgets with no active program, passing undefined through', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);

    expect(screen.getByTestId('programs-widget-stub')).toHaveTextContent('none');
    expect(screen.getByTestId('journal-widget-card-stub')).toHaveTextContent('none');
  });

  it('navigates to AI generation (no intent) from the Programs widget', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);
    await fireEvent.press(screen.getByTestId('programs-widget-stub-generate'));

    expect(push).toHaveBeenCalledWith('/program-generate');
  });

  it('navigates to manual creation (no intent) from the Programs widget', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);
    await fireEvent.press(screen.getByTestId('programs-widget-stub-create'));

    expect(push).toHaveBeenCalledWith('/program-create');
  });
});
