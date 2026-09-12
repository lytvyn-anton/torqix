import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useJournal } from '../hooks/useJournal';
import { useJournalEntries } from '../hooks/useJournalEntries';
import { JournalScreen } from './JournalScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useJournal', () => ({ useJournal: jest.fn() }));
jest.mock('../hooks/useJournalEntries', () => ({ useJournalEntries: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseJournal = jest.mocked(useJournal);
const mockedUseJournalEntries = jest.mocked(useJournalEntries);

const journal = {
  id: 'journal-1',
  name: 'Push/Pull/Legs journal',
  programId: 'program-1',
  createdAt: '2026-09-01T00:00:00Z',
};

describe('JournalScreen', () => {
  let push: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseJournal.mockReturnValue({
      data: journal,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);
    mockedUseJournalEntries.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournalEntries>);
  });

  it('shows a loading indicator while the journal or its entries are loading', async () => {
    mockedUseJournal.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);

    await render(<JournalScreen journalId="journal-1" />);

    expect(screen.getByTestId('journal-loading')).toBeTruthy();
  });

  it('shows a load error when the journal fails to load', async () => {
    mockedUseJournal.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useJournal>);

    await render(<JournalScreen journalId="journal-1" />);

    expect(screen.getByTestId('journal-load-error')).toBeTruthy();
  });

  it('shows an empty state when the journal has no entries yet', async () => {
    await render(<JournalScreen journalId="journal-1" />);

    expect(screen.getByText(journal.name)).toBeTruthy();
    expect(screen.getByTestId('journal-empty')).toBeTruthy();
  });

  it('lists saved entries, most recent first as returned by the query', async () => {
    mockedUseJournalEntries.mockReturnValue({
      data: [
        { id: 'entry-1', entryDate: '2026-09-01', dayName: 'Push day', setCount: 6 },
        { id: 'entry-2', entryDate: '2026-08-30', dayName: null, setCount: 3 },
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournalEntries>);

    await render(<JournalScreen journalId="journal-1" />);

    expect(screen.getByTestId('journal-entry-entry-1')).toBeTruthy();
    expect(screen.getByTestId('journal-entry-entry-2')).toBeTruthy();
    expect(screen.getByText('Push day')).toBeTruthy();
  });

  it('navigates to a new entry for this journal', async () => {
    await render(<JournalScreen journalId="journal-1" />);

    fireEvent.press(screen.getByTestId('journal-new-entry'));

    expect(push).toHaveBeenCalledWith('/journal-entry/journal-1');
  });
});
