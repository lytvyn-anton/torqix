import { fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useCreateJournal } from '../../journal/hooks/useCreateJournal';
import { useCurrentJournal } from '../../journal/hooks/useCurrentJournal';
import { useResolveProgramJournal } from '../../journal/hooks/useResolveProgramJournal';
import { JournalWidgetCard } from './JournalWidgetCard';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../journal/hooks/useCurrentJournal', () => ({ useCurrentJournal: jest.fn() }));
jest.mock('../../journal/hooks/useResolveProgramJournal', () => ({
  useResolveProgramJournal: jest.fn(),
}));
jest.mock('../../journal/hooks/useCreateJournal', () => ({ useCreateJournal: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseCurrentJournal = jest.mocked(useCurrentJournal);
const mockedUseResolveProgramJournal = jest.mocked(useResolveProgramJournal);
const mockedUseCreateJournal = jest.mocked(useCreateJournal);

const activeProgram = { id: 'program-1', name: 'Push / Pull / Legs' };
const journal = {
  id: 'journal-1',
  name: 'Push / Pull / Legs',
  status: 'active' as const,
  programName: 'Push / Pull / Legs',
  createdAt: '2026-09-01T00:00:00Z',
};

describe('JournalWidgetCard', () => {
  let push: jest.Mock;
  let resolveMutate: jest.Mock;
  let createMutate: jest.Mock;

  beforeEach(() => {
    push = jest.fn();
    resolveMutate = jest.fn();
    createMutate = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUseResolveProgramJournal.mockReturnValue({
      mutate: resolveMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useResolveProgramJournal>);
    mockedUseCreateJournal.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateJournal>);
  });

  it('shows a loading indicator while the current journal is loading', async () => {
    mockedUseCurrentJournal.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useCurrentJournal>);

    await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

    expect(screen.getByTestId('journal-widget-loading')).toBeTruthy();
  });

  it('shows an error message when the current journal fails to load with no cached data', async () => {
    mockedUseCurrentJournal.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useCurrentJournal>);

    await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

    expect(screen.getByTestId('journal-widget-load-error')).toBeTruthy();
  });

  it('keeps showing an already-resolved "no journal" state through a background refetch error', async () => {
    mockedUseCurrentJournal.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useCurrentJournal>);

    await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

    expect(screen.queryByTestId('journal-widget-load-error')).toBeNull();
    expect(screen.getByTestId('journal-widget-no-journal')).toBeTruthy();
  });

  describe('when a journal exists', () => {
    beforeEach(() => {
      mockedUseCurrentJournal.mockReturnValue({
        data: journal,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useCurrentJournal>);
    });

    it('shows the journal name and navigates to it when tapped', async () => {
      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

      await fireEvent.press(screen.getByTestId('journal-widget-open'));

      expect(screen.getByText('Push / Pull / Legs')).toBeTruthy();
      expect(push).toHaveBeenCalledWith('/journal/journal-1');
    });

    it('navigates to logging a new entry when "+ New entry" is pressed', async () => {
      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

      await fireEvent.press(screen.getByTestId('journal-widget-new-entry'));

      expect(push).toHaveBeenCalledWith('/journal-entry/journal-1');
    });
  });

  describe('when no journal exists yet', () => {
    beforeEach(() => {
      mockedUseCurrentJournal.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useCurrentJournal>);
    });

    it('offers to start one from the active program', async () => {
      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

      expect(screen.getByTestId('journal-widget-no-journal')).toBeTruthy();
      expect(screen.getByTestId('journal-widget-start-from-program')).toBeTruthy();
    });

    it('disables "start from program" while a blank create is already in flight', async () => {
      mockedUseCreateJournal.mockReturnValue({
        mutate: createMutate,
        isPending: true,
        isError: false,
      } as unknown as ReturnType<typeof useCreateJournal>);

      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

      expect(
        screen.getByTestId('journal-widget-start-from-program').props.accessibilityState.disabled,
      ).toBe(true);
    });

    it('disables the blank "+ New journal" action while "start from program" is already in flight', async () => {
      mockedUseResolveProgramJournal.mockReturnValue({
        mutate: resolveMutate,
        isPending: true,
        isError: false,
      } as unknown as ReturnType<typeof useResolveProgramJournal>);

      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

      expect(
        screen.getByTestId('journal-widget-new-journal').props.accessibilityState.disabled,
      ).toBe(true);
    });

    it('resolves the journal for the active program and navigates into it on success', async () => {
      resolveMutate.mockImplementation((_input, options) => {
        options.onSuccess({ id: 'journal-new' });
      });

      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);
      await fireEvent.press(screen.getByTestId('journal-widget-start-from-program'));

      expect(resolveMutate).toHaveBeenCalledWith(
        { programId: 'program-1', programName: 'Push / Pull / Legs' },
        expect.anything(),
      );
      expect(push).toHaveBeenCalledWith('/journal/journal-new');
    });

    it('shows a resolve error when the mutation fails', async () => {
      mockedUseResolveProgramJournal.mockReturnValue({
        mutate: resolveMutate,
        isPending: false,
        isError: true,
      } as unknown as ReturnType<typeof useResolveProgramJournal>);

      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

      expect(screen.getByTestId('journal-widget-start-error')).toBeTruthy();
    });

    it('offers only the blank "+ New journal" action when there is no active program', async () => {
      await render(<JournalWidgetCard userId="user-1" activeProgram={undefined} />);

      expect(screen.queryByTestId('journal-widget-start-from-program')).toBeNull();
      expect(screen.getByTestId('journal-widget-new-journal')).toBeTruthy();
    });

    it('creates a blank journal with no program and navigates into it on success', async () => {
      createMutate.mockImplementation((_input, options) => {
        options.onSuccess({ id: 'journal-blank' });
      });

      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);
      await fireEvent.press(screen.getByTestId('journal-widget-new-journal'));

      expect(createMutate).toHaveBeenCalledWith(
        { programId: null, name: 'Journal' },
        expect.anything(),
      );
      expect(push).toHaveBeenCalledWith('/journal/journal-blank');
    });

    it('creates a blank journal even with no active program', async () => {
      createMutate.mockImplementation((_input, options) => {
        options.onSuccess({ id: 'journal-blank' });
      });

      await render(<JournalWidgetCard userId="user-1" activeProgram={undefined} />);
      await fireEvent.press(screen.getByTestId('journal-widget-new-journal'));

      expect(createMutate).toHaveBeenCalledWith(
        { programId: null, name: 'Journal' },
        expect.anything(),
      );
      expect(push).toHaveBeenCalledWith('/journal/journal-blank');
    });

    it('shows a create error when the blank-journal mutation fails', async () => {
      mockedUseCreateJournal.mockReturnValue({
        mutate: createMutate,
        isPending: false,
        isError: true,
      } as unknown as ReturnType<typeof useCreateJournal>);

      await render(<JournalWidgetCard userId="user-1" activeProgram={activeProgram} />);

      expect(screen.getByTestId('journal-widget-new-journal-error')).toBeTruthy();
    });
  });
});
