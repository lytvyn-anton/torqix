import { act, fireEvent, screen } from '@testing-library/react-native';
import { useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';

import '../../../shared/i18n';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useCreateJournalEntry } from '../hooks/useCreateJournalEntry';
import { useJournal } from '../hooks/useJournal';
import { useLastPerformedJournalSets } from '../hooks/useLastPerformedJournalSets';
import { useExercises } from '../../exercises/hooks/useExercises';
import { useProgram } from '../../programs/hooks/useProgram';
import { JournalEntryScreen } from './JournalEntryScreen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useNavigation: jest.fn() }));
jest.mock('expo-router/build/react-navigation/core', () => ({ usePreventRemove: jest.fn() }));
jest.mock('../hooks/useJournal', () => ({ useJournal: jest.fn() }));
jest.mock('../hooks/useLastPerformedJournalSets', () => ({
  useLastPerformedJournalSets: jest.fn(),
}));
jest.mock('../hooks/useCreateJournalEntry', () => ({ useCreateJournalEntry: jest.fn() }));
jest.mock('../../exercises/hooks/useExercises', () => ({ useExercises: jest.fn() }));
jest.mock('../../programs/hooks/useProgram', () => ({ useProgram: jest.fn() }));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUsePreventRemove = jest.mocked(usePreventRemove);
const mockedUseJournal = jest.mocked(useJournal);
const mockedUseLastPerformedJournalSets = jest.mocked(useLastPerformedJournalSets);
const mockedUseCreateJournalEntry = jest.mocked(useCreateJournalEntry);
const mockedUseExercises = jest.mocked(useExercises);
const mockedUseProgram = jest.mocked(useProgram);

const journal = {
  id: 'journal-1',
  name: 'PPL journal',
  programId: 'program-1',
  createdAt: '2026-09-01T00:00:00Z',
};

const oneDayProgram = {
  id: 'program-1',
  name: 'PPL',
  status: 'active' as const,
  createdAt: '2026-09-01',
  days: [
    {
      id: 'day-1',
      name: 'Push day',
      exercises: [
        { exerciseId: 'ex-1', exerciseName: 'Back Squat', sets: 1, reps: 10, targetWeight: 40 },
      ],
    },
  ],
};

const twoDayProgram = {
  ...oneDayProgram,
  days: [...oneDayProgram.days, { id: 'day-2', name: 'Pull day', exercises: [] }],
};

describe('JournalEntryScreen', () => {
  let back: jest.Mock;
  let dispatch: jest.Mock;
  let createMutate: jest.Mock;
  let preventRemoveCallback: ((options: { data: { action: unknown } }) => void) | undefined;

  beforeEach(() => {
    back = jest.fn();
    dispatch = jest.fn();
    preventRemoveCallback = undefined;

    mockedUseRouter.mockReturnValue({ back, push: jest.fn() } as unknown as ReturnType<
      typeof useRouter
    >);
    mockedUseNavigation.mockReturnValue({ dispatch } as unknown as ReturnType<
      typeof useNavigation
    >);
    mockedUsePreventRemove.mockImplementation((_preventRemove, callback) => {
      preventRemoveCallback = callback;
    });
    mockedUseJournal.mockReturnValue({
      data: journal,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);
    mockedUseProgram.mockReturnValue({
      data: oneDayProgram,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);
    mockedUseLastPerformedJournalSets.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useLastPerformedJournalSets>);
    createMutate = jest.fn();
    mockedUseCreateJournalEntry.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useCreateJournalEntry>);
    mockedUseExercises.mockReturnValue({
      data: [{ id: 'ex-2', name: 'Bench Press', muscleGroup: 'chest', equipment: ['barbell'] }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExercises>);
  });

  it('shows a loading indicator while the journal is loading', async () => {
    mockedUseJournal.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.getByTestId('journal-entry-loading')).toBeTruthy();
  });

  it('logs freely, with no day picker, when the journal has no program left', async () => {
    mockedUseJournal.mockReturnValue({
      data: { ...journal, programId: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);
    // useProgram is disabled with no programId in the real app — it never has data, so its
    // "loaded" state must not be what unblocks this program-less journal.
    mockedUseProgram.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.queryByTestId('journal-entry-loading')).toBeNull();
    expect(screen.queryByTestId('journal-entry-choose-day')).toBeNull();
    expect(screen.getByText('PPL journal')).toBeTruthy();
    expect(screen.getByTestId('journal-entry-add-exercise')).toBeTruthy();
  });

  it('logs freely, with no day picker, when the program has no days', async () => {
    mockedUseProgram.mockReturnValue({
      data: { ...oneDayProgram, days: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.queryByTestId('journal-entry-choose-day')).toBeNull();
    expect(screen.getByText('PPL journal')).toBeTruthy();
    expect(screen.getByTestId('journal-entry-add-exercise')).toBeTruthy();
  });

  it('adds an exercise ad hoc via the picker, with no target and no pre-filled rows', async () => {
    mockedUseProgram.mockReturnValue({
      data: { ...oneDayProgram, days: [] },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.press(screen.getByTestId('journal-entry-add-exercise'));
    await fireEvent.press(screen.getByTestId('exercise-picker-item-ex-2'));

    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.queryByTestId('journal-entry-0-reps-0')).toBeNull();

    await fireEvent.press(screen.getByTestId('journal-entry-0-add-set'));
    expect(screen.getByTestId('journal-entry-0-reps-0').props.value).toBe('');
  });

  it('adds an ad hoc exercise alongside the selected day’s own exercises', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.getByText('Back Squat')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('journal-entry-add-exercise'));
    await fireEvent.press(screen.getByTestId('exercise-picker-item-ex-2'));

    expect(screen.getByText('Bench Press')).toBeTruthy();
    // The day's own exercise keeps its pre-filled row; the ad hoc one starts empty.
    expect(screen.getByTestId('journal-entry-0-reps-0').props.value).toBe('10');
    expect(screen.queryByTestId('journal-entry-1-reps-0')).toBeNull();
  });

  it('saves an ad hoc-only entry with no program day', async () => {
    mockedUseJournal.mockReturnValue({
      data: { ...journal, programId: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);
    mockedUseProgram.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.press(screen.getByTestId('journal-entry-add-exercise'));
    await fireEvent.press(screen.getByTestId('exercise-picker-item-ex-2'));
    await fireEvent.press(screen.getByTestId('journal-entry-0-add-set'));
    await fireEvent.changeText(screen.getByTestId('journal-entry-0-reps-0'), '12');
    await fireEvent.press(screen.getByTestId('journal-entry-save'));

    expect(createMutate).toHaveBeenCalledWith(
      {
        journalId: 'journal-1',
        programDayId: null,
        sets: [{ exerciseId: 'ex-2', setIndex: 0, repsDone: 12, weight: null }],
      },
      expect.any(Object),
    );
  });

  it('lets the user pick a day when the program has more than one', async () => {
    mockedUseProgram.mockReturnValue({
      data: twoDayProgram,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.getByTestId('journal-entry-choose-day')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('journal-entry-choose-day-day-1'));

    expect(screen.getByText('Back Squat')).toBeTruthy();
  });

  it('pre-selects initialDayId on a multi-day program instead of showing the day picker', async () => {
    mockedUseProgram.mockReturnValue({
      data: twoDayProgram,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" initialDayId="day-2" />);

    expect(screen.queryByTestId('journal-entry-choose-day')).toBeNull();
    expect(screen.getByText('Pull day')).toBeTruthy();
  });

  it('falls back to the day picker when initialDayId matches none of the program days', async () => {
    mockedUseProgram.mockReturnValue({
      data: twoDayProgram,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    await render(
      <JournalEntryScreen userId="user-1" journalId="journal-1" initialDayId="stale-day" />,
    );

    expect(screen.getByTestId('journal-entry-choose-day')).toBeTruthy();
  });

  it("auto-selects the program's only day and pre-fills rows from its target", async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.getByText('Back Squat')).toBeTruthy();
    expect(screen.getByTestId('journal-entry-0-reps-0').props.value).toBe('10');
    expect(screen.getByTestId('journal-entry-0-weight-0').props.value).toBe('40');
  });

  it('waits for the journal and program to actually load before deciding there are no days', async () => {
    // Both still loading on first mount — days=[] here is indistinguishable from "no
    // program has days" unless the screen also waits on this, and must not lock in a blank
    // exercise list before the real program day (with its exercise) arrives.
    mockedUseJournal.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);
    mockedUseProgram.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);

    const view = await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    mockedUseJournal.mockReturnValue({
      data: journal,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournal>);
    mockedUseProgram.mockReturnValue({
      data: oneDayProgram,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useProgram>);
    await act(async () => {
      view.rerender(
        <ThemeProvider>
          <JournalEntryScreen userId="user-1" journalId="journal-1" />
        </ThemeProvider>,
      );
    });

    expect(screen.getByText('Back Squat')).toBeTruthy();
  });

  it('pre-fills rows from the last time this exercise was logged, over the program target', async () => {
    mockedUseLastPerformedJournalSets.mockReturnValue({
      data: [{ exerciseId: 'ex-1', setIndex: 0, repsDone: 8, weight: 60 }],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useLastPerformedJournalSets>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.getByTestId('journal-entry-0-reps-0').props.value).toBe('8');
    expect(screen.getByTestId('journal-entry-0-weight-0').props.value).toBe('60');
  });

  it('adds a new set row, pre-filled from the program target like the first row', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.press(screen.getByTestId('journal-entry-0-add-set'));

    expect(screen.getByTestId('journal-entry-0-reps-1').props.value).toBe('10');
  });

  it('deletes a set row', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.press(screen.getByTestId('journal-entry-0-delete-0'));

    expect(screen.queryByTestId('journal-entry-0-reps-0')).toBeNull();
  });

  it('saves the entered sets and leaves the screen on Save', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.press(screen.getByTestId('journal-entry-save'));

    expect(createMutate).toHaveBeenCalledWith(
      {
        journalId: 'journal-1',
        programDayId: 'day-1',
        sets: [{ exerciseId: 'ex-1', setIndex: 0, repsDone: 10, weight: 40 }],
      },
      expect.any(Object),
    );

    await act(async () => {
      createMutate.mock.calls[0][1].onSuccess();
    });
    expect(back).toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shows an error when saving fails', async () => {
    mockedUseCreateJournalEntry.mockReturnValue({
      mutate: createMutate,
      isPending: false,
      isError: true,
    } as unknown as ReturnType<typeof useCreateJournalEntry>);

    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    expect(screen.getByTestId('journal-entry-save-error')).toBeTruthy();
  });

  it('prompts to save or discard when leaving with unsaved changes', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.changeText(screen.getByTestId('journal-entry-0-reps-0'), '12');
    await act(async () => {
      preventRemoveCallback?.({ data: { action: { type: 'GO_BACK' } } });
    });

    expect(screen.getByTestId('save-discard-sheet')).toBeTruthy();
  });

  it('dispatches the deferred navigation action after saving from the sheet', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.changeText(screen.getByTestId('journal-entry-0-reps-0'), '12');
    const pendingAction = { type: 'GO_BACK' };
    await act(async () => {
      preventRemoveCallback?.({ data: { action: pendingAction } });
    });

    await fireEvent.press(screen.getByTestId('save-discard-save'));
    await act(async () => {
      createMutate.mock.calls[0][1].onSuccess();
    });

    expect(dispatch).toHaveBeenCalledWith(pendingAction);
    expect(back).not.toHaveBeenCalled();
  });

  it('discards unsaved changes and dispatches the deferred navigation without saving', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.changeText(screen.getByTestId('journal-entry-0-reps-0'), '12');
    const pendingAction = { type: 'GO_BACK' };
    await act(async () => {
      preventRemoveCallback?.({ data: { action: pendingAction } });
    });

    await fireEvent.press(screen.getByTestId('save-discard-discard'));

    expect(createMutate).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(pendingAction);
  });

  it('keeps editing and hides the sheet without leaving', async () => {
    await render(<JournalEntryScreen userId="user-1" journalId="journal-1" />);

    await fireEvent.changeText(screen.getByTestId('journal-entry-0-reps-0'), '12');
    await act(async () => {
      preventRemoveCallback?.({ data: { action: { type: 'GO_BACK' } } });
    });

    await fireEvent.press(screen.getByTestId('save-discard-keep-editing'));

    expect(screen.queryByTestId('save-discard-sheet')).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });
});
