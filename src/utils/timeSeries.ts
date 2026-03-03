import type { Frequency, MetricSeries, TimePoint } from '../types';

function interpolate(
  start: TimePoint,
  end: TimePoint,
  t: number,
): number | null {
  if (start.value === null || end.value === null) return null;
  return start.value + (end.value - start.value) * t;
}

export function resampleSeries(
  series: MetricSeries,
  frequency: Frequency,
): MetricSeries {
  if (frequency === 'yearly') return series;

  const points = [...series.points].sort((a, b) => a.year - b.year);
  if (points.length <= 1) {
    return { ...series, points };
  }

  const stepCountByFrequency: Record<Exclude<Frequency, 'yearly'>, number> = {
    quarterly: 4,
    monthly: 12,
    weekly: 52,
  };

  const targetSteps = stepCountByFrequency[frequency as Exclude<Frequency, 'yearly'>];
  const resampled: TimePoint[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const yearDiff = end.year - start.year;

    for (let y = 0; y < yearDiff; y += 1) {
      const baseYear = start.year + y;
      for (let s = 0; s < targetSteps; s += 1) {
        const globalStepIndex = y * targetSteps + s;
        const t =
          yearDiff === 0
            ? 0
            : globalStepIndex / (yearDiff * targetSteps);

        const interpolated = interpolate(start, end, t);

        const date = new Date(baseYear, 0, 1);
        if (frequency === 'quarterly') {
          date.setMonth((s % targetSteps) * 3);
        } else if (frequency === 'monthly') {
          date.setMonth(s % targetSteps);
        } else if (frequency === 'weekly') {
          date.setDate(1 + (s % targetSteps) * 7);
        }

        resampled.push({
          date: date.toISOString().slice(0, 10),
          year: baseYear,
          value: interpolated,
        });
      }
    }
  }

  const last = points[points.length - 1];
  resampled.push({
    date: `${last.year}-01-01`,
    year: last.year,
    value: last.value,
  });

  return {
    ...series,
    points: resampled,
  };
}

