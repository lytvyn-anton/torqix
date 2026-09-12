import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import { useResolveProgramJournal } from '../../journal/hooks/useResolveProgramJournal';
import { useProgram } from '../../programs/hooks/useProgram';
import { JournalWidgetCard } from './JournalWidgetCard';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../programs/hooks/useProgram', () => ({ useProgram: jest.fn() }));
jest.mock('../../journal/hooks/useResolveProgramJournal', () => ({
  useResolveProgramJournal: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUseProgram = jest.mocked(useProgram);
const mockedUseResolveProgramJournal = jest.mocked(useResolveProgramJournal);

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
  });

  it('lists the active program’s days', async () => {
    await render(
      <JournalWidgetCard userId="user-1" programId="program-1" programName="Push / Pull / Legs" />,
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
      <JournalWidgetCard userId="user-1" programId="program-1" programName="Push / Pull / Legs" />,
    );

    expect(screen.queryByTestId('journal-widget-load-error')).toBeNull();
    expect(screen.getByTestId('journal-widget-day-day-1')).toBeTruthy();
  });

  it('resolves the program journal and navigates into logging when a day is tapped', async () => {
    resolveMutate.mockImplementation((_input, options) => {
      options.onSuccess({ id: 'journal-1' });
    });

    await render(
      <JournalWidgetCard userId="user-1" programId="program-1" programName="Push / Pull / Legs" />,
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
      <JournalWidgetCard userId="user-1" programId="program-1" programName="Push / Pull / Legs" />,
    );

    await fireEvent.press(screen.getByTestId('journal-widget-day-day-1'));
    await fireEvent.press(screen.getByTestId('journal-widget-day-day-2'));

    expect(resolveMutate).toHaveBeenCalledTimes(1);
  });
});
