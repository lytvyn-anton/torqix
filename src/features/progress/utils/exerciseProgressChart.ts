import type { ExerciseProgressEntry } from '../../journal/types';
import { formatUtcDate } from '../../../shared/utils/formatUtcDate';

export type ChartPoint = {
  label: string;
  value: number;
};

// One session can log several sets of the same exercise, so a chart needs one point per
// session date rather than per set: the heaviest set that day (progressive-overload signal)
// and total volume (weight x reps summed across sets, the overall-effort signal). A date
// contributes a point to a series only when it has the data that series needs — a bodyweight
// set (no weight) skips the top-set point, for example.
export function buildExerciseProgressChartData(
  entries: ExerciseProgressEntry[],
  locale: string,
): { topSet: ChartPoint[]; volume: ChartPoint[] } {
  const setsByDate = new Map<string, ExerciseProgressEntry[]>();
  for (const entry of entries) {
    const sets = setsByDate.get(entry.entryDate) ?? [];
    sets.push(entry);
    setsByDate.set(entry.entryDate, sets);
  }

  const dates = [...setsByDate.keys()].sort();

  const topSet: ChartPoint[] = [];
  const volume: ChartPoint[] = [];

  for (const date of dates) {
    const sets = setsByDate.get(date) as ExerciseProgressEntry[];
    // A 2-digit year keeps points from different years on the same calendar day (e.g. two
    // Sep 1sts a year apart) from landing on identical, indistinguishable x-axis labels.
    const label = formatUtcDate(date, locale, { month: 'short', day: 'numeric', year: '2-digit' });

    const weights = sets
      .map((set) => set.weight)
      .filter((weight): weight is number => weight != null);
    if (weights.length > 0) {
      topSet.push({ label, value: Math.max(...weights) });
    }

    const setsWithVolume = sets.filter((set) => set.weight != null && set.repsDone != null);
    if (setsWithVolume.length > 0) {
      const totalVolume = setsWithVolume.reduce(
        (sum, set) => sum + (set.weight as number) * (set.repsDone as number),
        0,
      );
      volume.push({ label, value: totalVolume });
    }
  }

  return { topSet, volume };
}
