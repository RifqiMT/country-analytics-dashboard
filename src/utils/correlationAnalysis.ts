/**
 * Correlation and causation analysis for the multi-metric scatter plot.
 * Computes Pearson r, interprets strength/direction, and provides causation caveats.
 */

export type ScatterMetricKey = string;

export interface CorrelationResult {
  r: number;
  n: number;
  /** Approximate two-tailed p-value (null: r=0) */
  pValue: number | null;
  /** Human-readable strength and direction */
  interpretation: string;
  /** Short guidance on causation / confounders */
  causationNote: string;
}

function getValue(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v == null || typeof v !== 'number' || Number.isNaN(v)) return null;
  return v;
}

/**
 * Pearson correlation coefficient and approximate p-value.
 * Returns { r, n, pValue } where pValue is two-tailed test of H0: r = 0.
 */
export function pearsonCorrelation(
  xs: number[],
  ys: number[],
): { r: number; n: number; pValue: number } {
  const n = xs.length;
  if (n < 3) return { r: 0, n, pValue: 1 };

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  const sumY2 = ys.reduce((a, b) => a + b * b, 0);
  let sumXY = 0;
  for (let i = 0; i < n; i++) sumXY += xs[i] * ys[i];

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const r = den === 0 ? 0 : num / den;
  const rClamped = Math.max(-1, Math.min(1, r));

  // t = r * sqrt((n-2) / (1 - r^2)); two-tailed p-value from t-distribution approximation
  let pValue = 1;
  if (n > 2 && Math.abs(rClamped) < 1) {
    const t = rClamped * Math.sqrt((n - 2) / (1 - rClamped * rClamped));
    const df = n - 2;
    // Approximate p-value: use normal approximation for large df, rough for small
    const tAbs = Math.abs(t);
    if (Number.isFinite(tAbs) && df > 0) {
      const z = tAbs;
      const approxP = 2 * (1 - normalCDF(z));
      pValue = Math.max(1e-10, Math.min(1, approxP));
    }
  }
  return { r: rClamped, n, pValue };
}

/** Normal CDF approximation (Abramowitz and Stegun) for p-value */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * Math.abs(z));
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  const y = 1.0 - (((a5 * t5 + a4 * t4 + a3 * t3) + a2 * t2) + a1 * t) * Math.exp(-z * z * 0.5);
  return z < 0 ? 1 - y : y;
}

function interpretStrength(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.8) return 'very strong';
  if (abs >= 0.6) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'very weak or none';
}

function interpretDirection(r: number): string {
  if (r > 0.05) return 'positive';
  if (r < -0.05) return 'negative';
  return 'no clear linear';
}

/**
 * Get causation and interpretation notes for a metric pair.
 * Order-agnostic: (A, B) and (B, A) can share the same note.
 */
function getCausationNote(xKey: ScatterMetricKey, yKey: ScatterMetricKey): string {
  const pair = [xKey, yKey].sort().join('|');
  const notes: Record<string, string> = {
    'gdpNominalPerCapita|lifeExpectancy':
      'Higher income per capita is associated with better health outcomes (e.g. access to healthcare, nutrition). Causation runs both ways: growth can fund health spending; healthier populations are more productive. Confounders include governance, education, and geography.',
    'gdpPPPPerCapita|lifeExpectancy':
      'PPP-adjusted income and life expectancy are strongly linked across countries. Causation is bidirectional; development and health reinforce each other over time.',
    'gdpNominalPerCapita|under5MortalityRate':
      'Higher GDP per capita is typically associated with lower under-5 mortality (better child health). Income enables investment in sanitation, vaccination, and maternal care.',
    'gdpNominalPerCapita|maternalMortalityRatio':
      'Wealthier countries generally have lower maternal mortality due to healthcare access and quality. Causation is partly from income → health systems.',
    'gdpNominalPerCapita|undernourishmentPrevalence':
      'Higher income correlates with lower undernourishment. Economic growth and food security are linked; reverse causation (malnutrition → productivity) also applies.',
    'gdpNominalPerCapita|povertyHeadcount215':
      'GDP per capita and extreme poverty are inversely related. Growth can reduce poverty; poverty reduction can support growth through human capital.',
    'inflationCPI|unemploymentRate':
      'The Phillips curve suggests a short-run trade-off between inflation and unemployment in some economies. Cross-country correlation may be weak due to different policy regimes and structures.',
    'govDebtPercentGDP|interestRate':
      'Higher government debt can push up interest rates (crowding out), but central bank policy and investor demand also matter. Correlation varies by country and period.',
    'populationTotal|gdpNominal':
      'Larger populations often have larger GDP in absolute terms. Correlation is mechanical; GDP per capita is better for living-standard comparison.',
    'unemploymentRate|labourForceTotal':
      'Unemployment rate and labour force size are conceptually related but need not correlate strongly across countries; labour force participation and demographics matter.',
  };

  const genericPrefix =
    'This is a cross-sectional correlation across countries. It is useful for identifying patterns and outliers, ' +
    'but it does not, on its own, establish causality. The relationship may be driven by omitted variables ' +
    '(e.g. institutions, education, geography), reverse causality, or country-specific shocks. Treat this as a ' +
    'starting point for hypotheses, then validate with country case studies, time-series analysis, or experimental evidence.';

  if (notes[pair]) {
    return `${genericPrefix} ${notes[pair]}`;
  }

  // Generic note when no pair-specific guidance exists
  return (
    genericPrefix +
    ' In this metric pair, think about whether the drivers are primarily structural (e.g. demographics, institutions), ' +
    'policy-driven (e.g. fiscal or monetary settings), or cyclical. Check for outliers that may dominate the correlation, ' +
    'and consider whether normalising (e.g. per capita, % of GDP) would give a more meaningful relationship.'
  );
}

/**
 * Compute full correlation and causation analysis from rows and two metric keys.
 */
export function computeCorrelationAnalysis(
  rows: Record<string, unknown>[],
  xKey: ScatterMetricKey,
  yKey: ScatterMetricKey,
): CorrelationResult | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of rows) {
    const x = getValue(row, xKey);
    const y = getValue(row, yKey);
    if (x != null && y != null && Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }
  if (xs.length < 3) return null;

  const { r, n, pValue } = pearsonCorrelation(xs, ys);
  const strength = interpretStrength(r);
  const direction = interpretDirection(r);
  let interpretation: string;

  if (direction === 'no clear linear') {
    interpretation = `There is ${strength} linear relationship between these metrics (r ≈ ${r.toFixed(
      3,
    )}). Across ${n} countries with valid data, there is no clear positive or negative trend.`;
  } else {
    interpretation = `There is a ${strength} ${direction} linear relationship (r = ${r.toFixed(
      3,
    )}) across ${n} countries with valid data: on average, countries with higher values on the X-axis tend to have ${
      direction === 'positive' ? 'higher' : 'lower'
    } values on the Y-axis.`;
  }

  if (Number.isFinite(pValue) && pValue != null) {
    if (pValue < 0.001) {
      interpretation +=
        ' The correlation is statistically significant at well below the 1% level (very strong evidence against the null of no linear relationship).';
    } else if (pValue < 0.05) {
      interpretation +=
        ' The correlation is statistically significant at the 5% level, so it is unlikely to be explained purely by random sampling noise.';
    } else {
      interpretation +=
        ' However, the p-value is relatively large, so this pattern is not statistically distinguishable from zero in this cross-section; treat it as suggestive rather than conclusive.';
    }
  }

  if (n < 15) {
    interpretation +=
      ' Because the sample includes relatively few countries, correlation estimates may be unstable and sensitive to single-country outliers.';
  } else if (n > 80 && Math.abs(r) < 0.2 && pValue < 0.05) {
    interpretation +=
      ' Note that with many countries even very small correlations can be statistically significant; focus on whether the effect size is meaningful in your context.';
  }

  return {
    r,
    n,
    pValue,
    interpretation,
    causationNote: getCausationNote(xKey, yKey),
  };
}
