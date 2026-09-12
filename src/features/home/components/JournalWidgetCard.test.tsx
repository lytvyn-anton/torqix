import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useJournalForProgram } from '../../journal/hooks/useJournalForProgram';
import { useResolveProgramJournal } from '../../journal/hooks/useResolveProgramJournal';
import { useProgram } from '../../programs/hooks/useProgram';
import { JournalWidgetCard } from './JournalWidgetCard';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../programs/hooks/useProgram', () => ({ useProgram: jest.fn() }));
jest.mock('../../journal/hooks/useResolveProgramJournal', () => ({
  useResolveProgramJournal: jest.fn(),
}));
jest.mock('../../journal/hooks/useJournalForProgram', () => ({
  useJournalForProgram: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseProgram = jest.mocked(useProgram);
const mockedUseResolveProgramJournal = jest.mocked(useResolveProgramJournal);
const mockedUseJournalForProgram = jest.mocked(useJournalForProgram);

const program = {
  id: 'program-1',
  name: 'Push / Pull / Legs',
  status: 'active' as const,
  createdAt: '2026-09-01T00:00:00Z',
  days: [
    { id: 'day-1', name: 'Push day', exercises: [] },
    { id: 'day-2', name: 'Pull day', exercises: [] },
  ],
};

describe('JournalWidgetCard', () => {
  let push: jest.Mock;
  let resolveMutate: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    resolveMutate = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseProgram.mockReturnValue({
      data: program,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseResolveProgramJournal.mockReturnValue({
      mutate: resolveMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useResolveProgramJournal>);
    // Default: an active journal already exists for this program, so the "no journal yet"
    // state (its own describe block below) doesn't leak into the other tests here.
    mockedUseJournalForProgram.mockReturnValue({
      data: { id: 'journal-1' },
      isSuccess: true,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournalForProgram>);
  });

  it('lists the active program’s days', async () => {
    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByTestId('journal-widget-day-day-1')).toBeTruthy();
    expect(screen.getByTestId('journal-widget-day-day-2')).toBeTruthy();
  });

  it('keeps showing an already-loaded day list through a background refetch error', async () => {
    mockedUseProgram.mockReturnValue({
      data: program,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('journal-widget-load-error')).toBeNull();
    expect(screen.getByTestId('journal-widget-day-day-1')).toBeTruthy();
  });

  it('resolves the program journal and navigates into logging when a day is tapped', async () => {
    resolveMutate.mockImplementation((_input, options) => {
      options.onSuccess({ id: 'journal-1' });
    });

    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('journal-widget-day-day-1'));

    expect(resolveMutate).toHaveBeenCalledWith(
      { programId: 'program-1', programName: 'Push / Pull / Legs' },
      expect.anything(),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith({
        pathname: '/journal-entry/[journalId]',
        params: { journalId: 'journal-1', dayId: 'day-1' },
      }),
    );
  });

  it('ignores a second day tap while the first resolve is still in flight', async () => {
    // Deliberately never resolves within this test, standing in for the async gap between
    // tapping and the mutation settling — a second tap landing in that gap must not fire a
    // second resolveJournalForProgram call (see JournalWidgetCard's isResolvingRef).
    resolveMutate.mockImplementation(() => {});

    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('journal-widget-day-day-1'));
    await fireEvent.press(screen.getByTestId('journal-widget-day-day-2'));

    expect(resolveMutate).toHaveBeenCalledTimes(1);
  });

  it('opens the new journal sheet from its own row', async () => {
    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('journal-widget-new'));

    expect(screen.getByTestId('new-journal-sheet-generate')).toBeTruthy();
  });

  it('calls onGenerateProgram when the sheet’s generate option is picked', async () => {
    const onGenerateProgram = jest.fn();

    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={onGenerateProgram}
        onCreateProgram={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('journal-widget-new'));
    await fireEvent.press(screen.getByTestId('new-journal-sheet-generate'));

    expect(onGenerateProgram).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateProgram when the sheet’s manual option is picked', async () => {
    const onCreateProgram = jest.fn();

    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={jest.fn()}
        onCreateProgram={onCreateProgram}
      />,
    );

    await fireEvent.press(screen.getByTestId('journal-widget-new'));
    await fireEvent.press(screen.getByTestId('new-journal-sheet-manual'));

    expect(onCreateProgram).toHaveBeenCalledTimes(1);
  });

  it('does not claim "no journal yet" while the check is still loading', async () => {
    mockedUseJournalForProgram.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useJournalForProgram>);

    await render(
      <JournalWidgetCard
        userId="user-1"
        programId="program-1"
        programName="Push / Pull / Legs"
        onGenerateProgram={jest.fn()}
        onCreateProgram={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('journal-widget-no-journal-yet')).toBeNull();
  });

  describe('when no journal exists yet for this program', () => {
    beforeEach(() => {
      mockedUseJournalForProgram.mockReturnValue({
        data: null,
        isSuccess: true,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useJournalForProgram>);
    });

    it('shows a "no journal yet" message with a way to start one', async () => {
      await render(
        <JournalWidgetCard
          userId="user-1"
          programId="program-1"
          programName="Push / Pull / Legs"
          onGenerateProgram={jest.fn()}
          onCreateProgram={jest.fn()}
        />,
      );

      expect(screen.getByTestId('journal-widget-no-journal-yet')).toBeTruthy();
      expect(screen.getByTestId('journal-widget-start-journal')).toBeTruthy();
    });

    it('resolves the journal and navigates into it when Start journal is pressed', async () => {
      resolveMutate.mockImplementation((_input, options) => {
        options.onSuccess({ id: 'journal-new' });
      });

      await render(
        <JournalWidgetCard
          userId="user-1"
          programId="program-1"
          programName="Push / Pull / Legs"
          onGenerateProgram={jest.fn()}
          onCreateProgram={jest.fn()}
        />,
      );

      await fireEvent.press(screen.getByTestId('journal-widget-start-journal'));

      expect(resolveMutate).toHaveBeenCalledWith(
        { programId: 'program-1', programName: 'Push / Pull / Legs' },
        expect.anything(),
      );
      expect(push).toHaveBeenCalledWith('/journal/journal-new');
    });
  });
});
