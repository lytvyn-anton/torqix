import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useDeleteJournal } from '../hooks/useDeleteJournal';
import { useJournals } from '../hooks/useJournals';
import { useSetJournalStatus } from '../hooks/useSetJournalStatus';
import { JournalsList } from './JournalsList';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../hooks/useJournals', () => ({ useJournals: jest.fn() }));
jest.mock('../hooks/useSetJournalStatus', () => ({ useSetJournalStatus: jest.fn() }));
jest.mock('../hooks/useDeleteJournal', () => ({ useDeleteJournal: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseJournals = jest.mocked(useJournals);
const mockedUseSetJournalStatus = jest.mocked(useSetJournalStatus);
const mockedUseDeleteJournal = jest.mocked(useDeleteJournal);

describe('JournalsList', () => {
  let push: jest.Mock;
  let setStatusMutate: jest.Mock;
  let deleteMutate: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    setStatusMutate = jest.fn();
    mockedUseSetJournalStatus.mockReturnValue({
      mutate: setStatusMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useSetJournalStatus>);
    deleteMutate = jest.fn();
    mockedUseDeleteJournal.mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useDeleteJournal>);
  });

  it('shows a loading indicator while journals are loading', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    expect(screen.getByTestId('journals-loading')).toBeTruthy();
  });

  it('shows an error message when journals fail to load', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    expect(screen.getByTestId('journals-load-error')).toBeTruthy();
  });

  it('keeps showing an already-loaded list through a background refetch error', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: true,
      data: [
        {
          id: 'journal-1',
          name: 'PPL journal',
          status: 'active',
          programName: 'Push / Pull / Legs',
          createdAt: '2026-09-01',
        },
      ],
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    expect(screen.queryByTestId('journals-load-error')).toBeNull();
    expect(screen.getByTestId('journals-list')).toBeTruthy();
  });

  it('shows the empty state when the user has no journals', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    expect(screen.getByTestId('journals-empty')).toBeTruthy();
  });

  it('renders a row per journal, with a badge for archived ones and their program name', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'journal-1',
          name: 'PPL journal',
          status: 'active',
          programName: 'Push / Pull / Legs',
          createdAt: '2026-09-01',
        },
        {
          id: 'journal-2',
          name: 'Old journal',
          status: 'archived',
          programName: null,
          createdAt: '2026-01-01',
        },
      ],
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    expect(screen.getByTestId('journal-row-journal-1')).toBeTruthy();
    expect(screen.getByText('PPL journal')).toBeTruthy();
    expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
    expect(screen.getByTestId('journal-row-journal-2')).toBeTruthy();
    expect(screen.getByText('Old journal')).toBeTruthy();
    expect(screen.getByText('No program')).toBeTruthy();
    expect(screen.getByText('Archived')).toBeTruthy();
  });

  it('navigates to the journal when a row is pressed', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'journal-1',
          name: 'PPL journal',
          status: 'active',
          programName: 'Push / Pull / Legs',
          createdAt: '2026-09-01',
        },
      ],
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);
    await fireEvent.press(screen.getByTestId('journal-row-journal-1-open'));

    expect(push).toHaveBeenCalledWith('/journal/journal-1');
  });

  it('archives an active journal, and offers to unarchive an archived one', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'journal-1',
          name: 'PPL journal',
          status: 'active',
          programName: 'Push / Pull / Legs',
          createdAt: '2026-09-01',
        },
        {
          id: 'journal-2',
          name: 'Old journal',
          status: 'archived',
          programName: null,
          createdAt: '2026-01-01',
        },
      ],
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    await fireEvent.press(screen.getByTestId('journal-row-journal-1-archive'));
    expect(setStatusMutate).toHaveBeenCalledWith({ journalId: 'journal-1', status: 'archived' });

    await fireEvent.press(screen.getByTestId('journal-row-journal-2-unarchive'));
    expect(setStatusMutate).toHaveBeenCalledWith({ journalId: 'journal-2', status: 'active' });
  });

  it('shows the delete sheet and deletes the journal on confirm', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'journal-1',
          name: 'PPL journal',
          status: 'active',
          programName: 'Push / Pull / Legs',
          createdAt: '2026-09-01',
        },
      ],
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    await fireEvent.press(screen.getByTestId('journal-row-journal-1-delete'));
    await fireEvent.press(screen.getByTestId('delete-journal-confirm'));

    expect(deleteMutate).toHaveBeenCalledWith(
      'journal-1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('dismisses the delete sheet on keep-going without deleting', async () => {
    mockedUseJournals.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'journal-1',
          name: 'PPL journal',
          status: 'active',
          programName: 'Push / Pull / Legs',
          createdAt: '2026-09-01',
        },
      ],
    } as unknown as ReturnType<typeof useJournals>);

    await render(<JournalsList userId="user-1" />);

    await fireEvent.press(screen.getByTestId('journal-row-journal-1-delete'));
    await fireEvent.press(screen.getByTestId('delete-journal-keep-going'));

    expect(deleteMutate).not.toHaveBeenCalled();
  });
});
