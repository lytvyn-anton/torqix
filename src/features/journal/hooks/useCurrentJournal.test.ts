import { renderHook } from '@testing-library/react-native';

import { useCurrentJournal } from './useCurrentJournal';
import { useJournals } from './useJournals';
import type { JournalSummary } from '../types';

jest.mock('./useJournals', () => ({ useJournals: jest.fn() }));

const mockedUseJournals = jest.mocked(useJournals);

function journal(overrides: Partial<JournalSummary>): JournalSummary {
  return {
    id: 'journal-1',
    name: 'Push / Pull / Legs',
    status: 'active',
    programName: 'Push / Pull / Legs',
    createdAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('useCurrentJournal', () => {
  it('picks the newest active journal, skipping archived ones ahead of it', async () => {
    mockedUseJournals.mockReturnValue({
      data: [
        journal({ id: 'archived-newest', status: 'archived' }),
        journal({ id: 'active-1', status: 'active' }),
        journal({ id: 'active-2', status: 'active' }),
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournals>);

    const { result } = await renderHook(() => useCurrentJournal('user-1'));

    expect(result.current.data?.id).toBe('active-1');
  });

  it('returns null when there is no active journal', async () => {
    mockedUseJournals.mockReturnValue({
      data: [journal({ id: 'archived-1', status: 'archived' })],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useJournals>);

    const { result } = await renderHook(() => useCurrentJournal('user-1'));

    expect(result.current.data).toBeNull();
  });

  it('passes through undefined (not yet loaded) without picking anything', async () => {
    mockedUseJournals.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useJournals>);

    const { result } = await renderHook(() => useCurrentJournal('user-1'));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});
