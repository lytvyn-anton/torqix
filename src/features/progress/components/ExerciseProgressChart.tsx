import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import type { ExerciseProgressEntry } from '../../workouts/types';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { radii, spacing, type ThemeColors } from '../../../shared/theme/theme';
import { buildExerciseProgressChartData, type ChartPoint } from '../utils/exerciseProgressChart';

type Metric = 'topSet' | 'volume';

const METRICS: { metric: Metric; labelKey: string }[] = [
  { metric: 'topSet', labelKey: 'progress.chartTopSetTab' },
  { metric: 'volume', labelKey: 'progress.chartVolumeTab' },
];

type Props = {
  entries: ExerciseProgressEntry[];
  locale: string;
};

export function ExerciseProgressChart({ entries, locale }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [metric, setMetric] = useState<Metric>('topSet');

  const { topSet, volume } = useMemo(
    () => buildExerciseProgressChartData(entries, locale),
    [entries, locale],
  );

  // Two measures of the same unit (kg), shown one at a time behind a toggle rather than on a
  // dual-axis chart — a trend line needs at least 2 points, so hide the whole section rather
  // than plotting a single dot if there's not enough data yet. A volume point requires a
  // weight (and reps) on that date, so volume.length can never exceed topSet.length — checking
  // topSet alone is enough.
  if (topSet.length < 2) {
    return null;
  }

  const points = metric === 'topSet' ? topSet : volume;

  return (
    <View style={styles.container} testID="exercise-progress-chart">
      <View style={styles.segmented}>
        {METRICS.map(({ metric: optionMetric, labelKey }) => {
          const selected = metric === optionMetric;
          return (
            <TouchableOpacity
              key={optionMetric}
              onPress={() => setMetric(optionMetric)}
              style={[styles.segment, selected && styles.segmentSelected]}
              testID={`exercise-progress-chart-tab-${optionMetric}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {points.length < 2 ? (
        <Text style={styles.insufficientData} testID="exercise-progress-chart-insufficient-data">
          {t('progress.chartInsufficientData')}
        </Text>
      ) : (
        <ChartBody
          points={points}
          colors={colors}
          formatValue={(value) => t('progress.chartValueKg', { value })}
        />
      )}
    </View>
  );
}

function ChartBody({
  points,
  colors,
  formatValue,
}: {
  points: ChartPoint[];
  colors: ThemeColors;
  formatValue: (value: number) => string;
}) {
  const styles = useMemo(() => buildChartBodyStyles(colors), [colors]);

  return (
    <LineChart
      data={points}
      height={160}
      color={colors.accent}
      thickness={2}
      curved
      dataPointsColor={colors.accent}
      dataPointsRadius={4}
      noOfSections={3}
      rulesColor={colors.border}
      rulesType="solid"
      xAxisColor={colors.border}
      yAxisColor={colors.border}
      yAxisTextStyle={styles.axisText}
      xAxisLabelTextStyle={styles.axisText}
      initialSpacing={16}
      endSpacing={16}
      isAnimated
      animationDuration={300}
      pointerConfig={{
        pointerStripColor: colors.border,
        pointerColor: colors.accent,
        radius: 5,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        pointerLabelComponent: (items: { value: number }[]) => (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{formatValue(items[0].value)}</Text>
          </View>
        ),
      }}
    />
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    segmented: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentSelected: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 13,
    },
    segmentTextSelected: {
      color: colors.onAccent,
    },
    insufficientData: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
  });
}

function buildChartBodyStyles(colors: ThemeColors) {
  return StyleSheet.create({
    axisText: {
      color: colors.textMuted,
      fontSize: 11,
    },
    tooltip: {
      backgroundColor: colors.surfaceTranslucent,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    tooltipText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
