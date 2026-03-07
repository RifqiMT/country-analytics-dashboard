/**
 * Correlation and causation analysis for the multi-metric scatter plot.
 * Includes: data preparation (missing, IQR outliers), Pearson r, linear regression (R², beta, 95% CI),
 * strength/direction interpretation, subgroup analysis by region, causation caveats, and executive summary.
 */

export type ScatterMetricKey = string;

/** Row with x, y and optional region for subgroup analysis */
export interface ScatterRow {
  x: number;
  y: number;
  region?: string;
  /** Index in the original rows array (for mapping back to globalMetrics) */
  originalIndex: number;
}

export interface DataPreparationResult {
  /** Rows with valid x,y (missing removed) */
  rows: ScatterRow[];
  /** Number of points dropped due to missing x or y */
  removedMissing: number;
  /** Indices (in rows) that are IQR outliers (|z| > 1.5*IQR from Q1/Q3) */
  outlierIndices: Set<number>;
  /** Rows after optionally excluding outliers */
  cleanedRows: ScatterRow[];
}

/** Result of simple linear regression Y = intercept + slope * X */
export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  fitted: number[];
  residuals: number[];
  /** SE of slope for t-test and CI */
  seSlope: number;
  /** Mean squared error */
  mse: number;
  /** Sum of squared deviations of X from mean */
  sxx: number;
  meanX: number;
  n: number;
}

/** Subgroup correlation (e.g. by region) for consistency (Bradford Hill) */
export interface SubgroupResult {
  group: string;
  r: number;
  n: number;
  pValue: number | null;
}

export interface CorrelationResult {
  r: number;
  n: number;
  /** Approximate two-tailed p-value (null: r=0) */
  pValue: number | null;
  /** Human-readable strength and direction */
  interpretation: string;
  /** Short guidance on causation / confounders */
  causationNote: string;
  /** Strength band: |r|<0.3 weak, 0.3–0.7 moderate, >0.7 strong */
  strengthLabel: 'weak' | 'moderate' | 'strong';
  /** R² = explained variance */
  rSquared: number;
  /** Regression slope (beta): predicted change in Y per 1-unit increase in X */
  betaCoefficient: number;
  /** p-value for slope (two-tailed) */
  betaPValue: number | null;
  /** Fitted values and residuals for residuals plot */
  fitted: number[];
  residuals: number[];
  /** 95% CI for regression line: [ { x, yLower, yFit, yUpper } ] at min/mid/max X */
  regressionCI: Array<{ x: number; yFit: number; yLower: number; yUpper: number }>;
  /** Data preparation summary */
  dataPrep: DataPreparationResult;
  /** Subgroup correlations by region (consistency) */
  subgroupResults: SubgroupResult[];
  /** Executive summary table rows */
  executiveSummaryTable: Array<{ metric: string; value: string; interpretation: string }>;
  /** One-paragraph actionable business insight */
  actionableInsight: string;
  /** If causation is not supported, recommended next steps */
  causationNextSteps: string;
}

export function getValue(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v == null || typeof v !== 'number' || Number.isNaN(v)) return null;
  return v;
}

function getRegion(row: Record<string, unknown>): string | undefined {
  const r = row.region;
  if (typeof r === 'string' && r.trim()) return r.trim();
  return undefined;
}

/** IQR outlier flag: true if value is below Q1 - 1.5*IQR or above Q3 + 1.5*IQR */
function isOutlierIQR(values: number[], index: number): boolean {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1Idx = Math.floor(0.25 * (n - 1));
  const q3Idx = Math.floor(0.75 * (n - 1));
  const q1 = sorted[q1Idx];
  const q3 = sorted[q3Idx];
  const iqr = q3 - q1;
  if (iqr <= 0) return false;
  const v = values[index];
  return v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr;
}

/**
 * Prepare scatter data: remove missing, flag IQR outliers (univariate on X and Y).
 * If excludeOutliers is true, cleanedRows exclude flagged points.
 */
export function prepareScatterData(
  rows: Record<string, unknown>[],
  xKey: ScatterMetricKey,
  yKey: ScatterMetricKey,
  excludeOutliers: boolean,
): DataPreparationResult {
  const scatterRows: ScatterRow[] = [];
  let removedMissing = 0;
  for (let i = 0; i < rows.length; i++) {
    const x = getValue(rows[i], xKey);
    const y = getValue(rows[i], yKey);
    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
      removedMissing++;
      continue;
    }
    scatterRows.push({
      x,
      y,
      region: getRegion(rows[i]),
      originalIndex: i,
    });
  }
  const xs = scatterRows.map((r) => r.x);
  const ys = scatterRows.map((r) => r.y);
  const outlierIndices = new Set<number>();
  for (let i = 0; i < scatterRows.length; i++) {
    if (isOutlierIQR(xs, i) || isOutlierIQR(ys, i)) outlierIndices.add(i);
  }
  const cleanedRows = excludeOutliers
    ? scatterRows.filter((_, i) => !outlierIndices.has(i))
    : scatterRows;
  return { rows: scatterRows, removedMissing, outlierIndices, cleanedRows };
}

/**
 * Simple linear regression: Y = intercept + slope * X.
 * Returns slope, intercept, R², fitted, residuals, SE(slope), MSE, Sxx.
 */
export function linearRegression(xs: number[], ys: number[]): RegressionResult | null {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx <= 0) return null;
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const fitted: number[] = [];
  const residuals: number[] = [];
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const fit = intercept + slope * xs[i];
    fitted.push(fit);
    const res = ys[i] - fit;
    residuals.push(res);
    ssRes += res * res;
  }
  const mse = n > 2 ? ssRes / (n - 2) : 0;
  const seSlope = mse > 0 && sxx > 0 ? Math.sqrt(mse / sxx) : 0;
  const ssTot = syy;
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return {
    slope,
    intercept,
    rSquared,
    fitted,
    residuals,
    seSlope,
    mse,
    sxx,
    meanX,
    n,
  };
}

/** 95% CI for mean response E[Y|X=x]. t ≈ 1.96 for large df. */
function regressionCI95(
  reg: RegressionResult,
  xValues: number[],
  tCritical: number = 1.96,
): Array<{ x: number; yFit: number; yLower: number; yUpper: number }> {
  const { slope, intercept, mse, sxx, meanX, n } = reg;
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const points = [minX, (minX + maxX) / 2, maxX];
  return points.map((x) => {
    const yFit = intercept + slope * x;
    const seFit = Math.sqrt(mse * (1 / n + ((x - meanX) ** 2) / sxx));
    const margin = tCritical * seFit;
    return { x, yFit, yLower: yFit - margin, yUpper: yFit + margin };
  });
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

  let pValue = 1;
  if (n > 2 && Math.abs(rClamped) < 1) {
    const t = rClamped * Math.sqrt((n - 2) / (1 - rClamped * rClamped));
    const tAbs = Math.abs(t);
    if (Number.isFinite(tAbs)) {
      const z = tAbs;
      pValue = Math.max(1e-10, Math.min(1, 2 * (1 - normalCDF(z))));
    }
  }
  return { r: rClamped, n, pValue };
}

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

/** Strength band per requirement: |r|<0.3 weak, 0.3–0.7 moderate, >0.7 strong */
function strengthBand(r: number): 'weak' | 'moderate' | 'strong' {
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.3) return 'moderate';
  return 'weak';
}

function interpretStrength(r: number): string {
  const band = strengthBand(r);
  if (band === 'strong') return 'strong';
  if (band === 'moderate') return 'moderate';
  return 'weak';
}

function interpretDirection(r: number): string {
  if (r > 0.05) return 'positive';
  if (r < -0.05) return 'negative';
  return 'no clear linear';
}

/** Subgroup correlations by region (for consistency - Bradford Hill) */
function subgroupCorrelations(
  rows: ScatterRow[],
): SubgroupResult[] {
  const byRegion = new Map<string, ScatterRow[]>();
  for (const row of rows) {
    const region = row.region ?? 'Unknown';
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region)!.push(row);
  }
  const results: SubgroupResult[] = [];
  byRegion.forEach((groupRows, group) => {
    if (groupRows.length < 3) return;
    const xs = groupRows.map((r) => r.x);
    const ys = groupRows.map((r) => r.y);
    const { r, n, pValue } = pearsonCorrelation(xs, ys);
    results.push({ group, r, n, pValue });
  });
  return results.sort((a, b) => b.n - a.n);
}

/**
 * Get causation and interpretation notes for a metric pair.
 * Explicit: "Correlation does NOT imply causation."
 */
function getCausationNote(xKey: ScatterMetricKey, yKey: ScatterMetricKey): string {
  const pair = [xKey, yKey].sort().join('|');
  const notes: Record<string, string> = {
    'gdpNominalPerCapita|lifeExpectancy':
      'Higher income per capita is associated with better health outcomes. Confounders include governance, education, and geography. Causation may run both ways.',
    'gdpPPPPerCapita|lifeExpectancy':
      'PPP-adjusted income and life expectancy are strongly linked. Causation is bidirectional; development and health reinforce each other.',
    'gdpNominalPerCapita|under5MortalityRate':
      'Higher GDP per capita is typically associated with lower under-5 mortality. Income enables investment in sanitation and healthcare.',
    'gdpNominalPerCapita|maternalMortalityRatio':
      'Wealthier countries generally have lower maternal mortality. Confounders: healthcare access, education.',
    'gdpNominalPerCapita|undernourishmentPrevalence':
      'Higher income correlates with lower undernourishment. Reverse causation (malnutrition → productivity) also applies.',
    'gdpNominalPerCapita|povertyHeadcount215':
      'GDP per capita and extreme poverty are inversely related. Confounders: inequality, sectoral mix.',
    'inflationCPI|unemploymentRate':
      'Phillips curve suggests a short-run trade-off. Cross-country correlation may be weak due to different policy regimes.',
    'govDebtPercentGDP|interestRate':
      'Government debt and interest rates: central bank policy and investor demand matter. Correlation varies by country.',
    'populationTotal|gdpNominal':
      'Larger populations often have larger GDP in absolute terms. GDP per capita is better for living-standard comparison.',
    'unemploymentRate|labourForceTotal':
      'Unemployment rate and labour force size are conceptually related; labour force participation and demographics matter.',
  };
  const generic =
    'Correlation does NOT imply causation. The relationship may be driven by omitted variables (e.g. institutions, education, geography), reverse causality, or country-specific shocks. Treat as a hypothesis; validate with time-series or experimental evidence.';
  return notes[pair] ? `${generic} ${notes[pair]}` : generic;
}

/**
 * Compute full correlation and causation analysis with data preparation, regression, subgroup, and executive summary.
 */
export function computeCorrelationAnalysis(
  rows: Record<string, unknown>[],
  xKey: ScatterMetricKey,
  yKey: ScatterMetricKey,
  excludeOutliers: boolean = false,
): CorrelationResult | null {
  const dataPrep = prepareScatterData(rows, xKey, yKey, excludeOutliers);
  const cleaned = dataPrep.cleanedRows;
  if (cleaned.length < 3) return null;

  const xs = cleaned.map((r) => r.x);
  const ys = cleaned.map((r) => r.y);
  const { r, n, pValue } = pearsonCorrelation(xs, ys);
  const reg = linearRegression(xs, ys);
  if (!reg) return null;

  const strength = interpretStrength(r);
  const strengthLabel = strengthBand(r);
  const direction = interpretDirection(r);

  // t-test for slope: H0 slope = 0
  const tSlope = reg.seSlope > 0 ? reg.slope / reg.seSlope : 0;
  const betaPValue = Number.isFinite(tSlope) ? 2 * (1 - normalCDF(Math.abs(tSlope))) : null;

  const regressionCI = regressionCI95(reg, xs);
  const subgroupResults = subgroupCorrelations(cleaned);

  let interpretation: string;
  if (direction === 'no clear linear') {
    interpretation = `There is ${strength} linear relationship (r ≈ ${r.toFixed(3)}). Across ${n} points with valid data, no clear positive or negative trend.`;
  } else {
    interpretation = `There is a ${strength} ${direction} linear relationship (r = ${r.toFixed(3)}) across ${n} points: higher X tends to ${direction === 'positive' ? 'higher' : 'lower'} Y.`;
  }
  if (pValue != null) {
    if (pValue < 0.001) interpretation += ' Significant at <0.1% (two-tailed).';
    else if (pValue < 0.05) interpretation += ' Significant at 5% level.';
    else interpretation += ' Not statistically significant at 5%; treat as suggestive.';
  }
  if (n < 15) interpretation += ' Small sample; estimates may be sensitive to outliers.';
  if (dataPrep.outlierIndices.size > 0) {
    interpretation += ` ${dataPrep.outlierIndices.size} point(s) flagged as IQR outliers (1.5×IQR rule).`;
  }

  const rSquaredPct = (reg.rSquared * 100).toFixed(1);
  const executiveSummaryTable: Array<{ metric: string; value: string; interpretation: string }> = [
    { metric: 'Pearson r', value: r.toFixed(3), interpretation: strengthLabel },
    { metric: 'P-value', value: pValue != null ? (pValue < 0.001 ? '<0.001' : pValue.toFixed(3)) : '—', interpretation: pValue != null && pValue < 0.05 ? 'Significant' : 'Not significant' },
    { metric: 'R²', value: reg.rSquared.toFixed(3), interpretation: `Explained variance: ${rSquaredPct}%` },
    { metric: 'Beta (slope)', value: reg.slope.toFixed(4), interpretation: `1-unit increase in X predicts ${reg.slope >= 0 ? '' : '−'}${Math.abs(reg.slope).toFixed(4)} change in Y` },
  ];

  const betaPStr = betaPValue != null && betaPValue < 0.05 ? ` (p=${betaPValue < 0.001 ? '<0.001' : betaPValue.toFixed(3)})` : '';
  const actionableInsight =
    `A 1-unit increase in X (${xKey}) predicts a ${reg.slope >= 0 ? '' : 'negative '}change of ${Math.abs(reg.slope).toFixed(4)} in Y (${yKey})${betaPStr}. ` +
    (Math.abs(r) >= 0.7 && pValue != null && pValue < 0.05
      ? `Strong ${direction} correlation (r=${r.toFixed(2)}, p<0.05) suggests the relationship is worth investigating further; however, correlation does not prove causation. Consider A/B tests or time-series analysis to test causality.`
      : Math.abs(r) >= 0.3
      ? `Moderate correlation. Use for hypothesis generation; confirm with subgroup analysis and robustness checks.`
      : `Weak or no linear relationship. Consider non-linear transformations (e.g. log, sqrt) or other drivers.`);

  const causationNextSteps =
    'Causation is not established by correlation alone. Recommended next steps: (1) Subgroup analysis by region/income (consistency); (2) Time-lagged or panel analysis if multiple years (temporality); (3) Control for confounders (e.g. multiple regression); (4) Where possible, use experiments (RCTs) or instrumental variables to test causal claims.';

  return {
    r,
    n,
    pValue,
    interpretation,
    causationNote: getCausationNote(xKey, yKey),
    strengthLabel,
    rSquared: reg.rSquared,
    betaCoefficient: reg.slope,
    betaPValue,
    fitted: reg.fitted,
    residuals: reg.residuals,
    regressionCI,
    dataPrep,
    subgroupResults,
    executiveSummaryTable,
    actionableInsight,
    causationNextSteps,
  };
}
