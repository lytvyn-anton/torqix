import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useActiveProgram } from '../../programs/hooks/useActiveProgram';
import { HomeScreen } from './HomeScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
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
    expect(screen.getByTestId('home-active-program')).toBeTruthy();
  });

  it('shows the journal widget card for the active program', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { id: 'program-1', name: 'Push / Pull / Legs' },
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);

    expect(screen.getByTestId('journal-widget-card-stub')).toBeTruthy();
    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
  });

  it('shows the empty state when there is no active program', async () => {
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);

    expect(screen.getByTestId('home-empty')).toBeTruthy();
  });

  it('navigates to AI generation with intent=journal from the empty state CTA', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);
    await fireEvent.press(screen.getByTestId('home-empty-generate-cta'));

    expect(push).toHaveBeenCalledWith('/program-generate?intent=journal');
  });

  it('navigates to manual creation with intent=journal from the empty state CTA', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseActiveProgram.mockReturnValue({
      isLoading: false,
      isError: false,
      data: null,
    } as unknown as ReturnType<typeof useActiveProgram>);

    await render(<HomeScreen userId="user-1" />);
    await fireEvent.press(screen.getByTestId('home-empty-cta'));

    expect(push).toHaveBeenCalledWith('/program-create?intent=journal');
  });
});
