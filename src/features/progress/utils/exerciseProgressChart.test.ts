import type { ExerciseProgressEntry } from '../../workouts/types';
import { buildExerciseProgressChartData } from './exerciseProgressChart';

function entry(overrides: Partial<ExerciseProgressEntry>): ExerciseProgressEntry {
  return {
    id: 'log-1',
    scheduledDate: '2026-09-01',
    setIndex: 0,
    repsDone: 10,
    weight: 40,
    ...overrides,
  };
}

describe('buildExerciseProgressChartData', () => {
  it('returns empty series for no entries', () => {
    expect(buildExerciseProgressChartData([], 'en')).toEqual({ topSet: [], volume: [] });
  });

  it('collapses multiple sets on the same date into one point per series', () => {
    const entries = [
      entry({ id: 'a', scheduledDate: '2026-09-01', setIndex: 0, weight: 40, repsDone: 10 }),
      entry({ id: 'b', scheduledDate: '2026-09-01', setIndex: 1, weight: 42.5, repsDone: 8 }),
    ];

    const { topSet, volume } = buildExerciseProgressChartData(entries, 'en-US');

    expect(topSet).toEqual([{ label: 'Sep 1, 26', value: 42.5 }]);
    expect(volume).toEqual([{ label: 'Sep 1, 26', value: 40 * 10 + 42.5 * 8 }]);
  });

  it('sorts points chronologically regardless of input order', () => {
    const entries = [
      entry({ id: 'a', scheduledDate: '2026-09-05', weight: 50, repsDone: 5 }),
      entry({ id: 'b', scheduledDate: '2026-09-01', weight: 40, repsDone: 10 }),
    ];

    const { topSet } = buildExerciseProgressChartData(entries, 'en-US');

    expect(topSet.map((point) => point.label)).toEqual(['Sep 1, 26', 'Sep 5, 26']);
  });

  it('skips a top-set point on dates with no weight logged', () => {
    const entries = [entry({ scheduledDate: '2026-09-01', weight: null, repsDone: 12 })];

    const { topSet, volume } = buildExerciseProgressChartData(entries, 'en-US');

    expect(topSet).toEqual([]);
    expect(volume).toEqual([]);
  });

  it('skips a volume point when reps are missing even if weight is logged', () => {
    const entries = [entry({ scheduledDate: '2026-09-01', weight: 40, repsDone: null })];

    const { topSet, volume } = buildExerciseProgressChartData(entries, 'en-US');

    expect(topSet).toEqual([{ label: 'Sep 1, 26', value: 40 }]);
    expect(volume).toEqual([]);
  });
});
