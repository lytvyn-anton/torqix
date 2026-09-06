import { fireEvent, screen } from '@testing-library/react-native';

import '../../../shared/i18n';
import { renderWithProviders as render } from '../../../shared/testing/renderWithProviders';
import type { ExerciseProgressEntry } from '../../workouts/types';
import { ExerciseProgressChart } from './ExerciseProgressChart';

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

describe('ExerciseProgressChart', () => {
  it('renders nothing when fewer than two sessions have been logged', async () => {
    const entries = [
      entry({ id: 'a', scheduledDate: '2026-09-01', setIndex: 0 }),
      entry({ id: 'b', scheduledDate: '2026-09-01', setIndex: 1 }),
    ];

    const { toJSON } = await render(<ExerciseProgressChart entries={entries} locale="en-US" />);

    expect(toJSON()).toBeNull();
  });

  it('shows a message instead of a chart when only one metric has enough data', async () => {
    // Two sessions with weight logged (enough for the top-set chart), but reps missing on
    // both, so the volume series never reaches 2 points.
    const entries = [
      entry({ id: 'a', scheduledDate: '2026-09-01', weight: 40, repsDone: null }),
      entry({ id: 'b', scheduledDate: '2026-09-03', weight: 42.5, repsDone: null }),
    ];

    await render(<ExerciseProgressChart entries={entries} locale="en-US" />);

    expect(screen.getByTestId('mock-line-chart')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('exercise-progress-chart-tab-volume'));

    expect(screen.getByTestId('exercise-progress-chart-insufficient-data')).toBeTruthy();
  });

  it('plots the top-set series by default and switches to volume on tab press', async () => {
    const entries = [
      entry({ id: 'a', scheduledDate: '2026-09-01', weight: 40, repsDone: 10 }),
      entry({ id: 'b', scheduledDate: '2026-09-03', weight: 42.5, repsDone: 8 }),
    ];

    await render(<ExerciseProgressChart entries={entries} locale="en-US" />);

    expect(screen.getByText('Sep 1, 26:40')).toBeTruthy();
    expect(screen.getByText('Sep 3, 26:42.5')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('exercise-progress-chart-tab-volume'));

    expect(screen.getByText('Sep 1, 26:400')).toBeTruthy();
    expect(screen.getByText('Sep 3, 26:340')).toBeTruthy();
  });
});
