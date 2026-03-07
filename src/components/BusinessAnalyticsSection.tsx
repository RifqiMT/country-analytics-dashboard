import { useState, useEffect, useMemo } from 'react';
import { fetchGlobalCountryMetricsForYear, fetchAllCountries } from '../api/worldBank';
import {
  CorrelationScatterPlot,
  SCATTER_METRIC_OPTIONS_GROUPED,
  SCATTER_METRIC_OPTIONS,
  type ScatterMetricKey,
} from './CorrelationScatterPlot';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import type { CountryDashboardData, GlobalCountryMetricsRow, CountrySummary } from '../types';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from '../config';
import { computeCorrelationAnalysis } from '../utils/correlationAnalysis';

interface BusinessAnalyticsSectionProps {
  dashboardData?: CountryDashboardData | null;
  /** Increment to force refetch of global data (e.g. after "Refresh all data"). */
  refreshTrigger?: number;
}

export function BusinessAnalyticsSection({
  dashboardData,
  refreshTrigger = 0,
}: BusinessAnalyticsSectionProps) {
  const [globalMetrics, setGlobalMetrics] = useState<GlobalCountryMetricsRow[]>([]);
  const [xMetric, setXMetric] = useState<ScatterMetricKey>('gdpNominalPerCapita');
  const [yMetric, setYMetric] = useState<ScatterMetricKey>('lifeExpectancy');
  const [excludeOutliers, setExcludeOutliers] = useState<boolean>(false);

  const dashboardYear =
    dashboardData?.latestSnapshot?.year ??
    dashboardData?.range?.endYear ??
    DATA_MAX_YEAR;
  const [startYear, setStartYear] = useState<number>(Math.max(DATA_MIN_YEAR, dashboardYear - 4));
  const [endYear, setEndYear] = useState<number>(dashboardYear);
  const [highlightCountryIso2, setHighlightCountryIso2] = useState<string | null>(
    () => dashboardData?.summary?.iso2Code ?? null,
  );

  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryActiveIndex, setCountryActiveIndex] = useState(0);

  useEffect(() => {
    setEndYear(dashboardYear);
    setStartYear(Math.max(DATA_MIN_YEAR, dashboardYear - 4));
  }, [dashboardYear]);

  const selectedYears = useMemo(() => {
    const start = Math.min(startYear, endYear);
    const end = Math.max(startYear, endYear);
    const s = Math.max(DATA_MIN_YEAR, Math.min(DATA_MAX_YEAR, start));
    const e = Math.max(DATA_MIN_YEAR, Math.min(DATA_MAX_YEAR, end));
    const years: number[] = [];
    for (let y = s; y <= e; y++) years.push(y);
    return years;
  }, [startYear, endYear]);

  useEffect(() => {
    if (dashboardData?.summary?.iso2Code != null) {
      setHighlightCountryIso2(dashboardData.summary.iso2Code);
    }
  }, [dashboardData?.summary?.iso2Code]);

  useEffect(() => {
    let cancelled = false;
    fetchAllCountries().then((list) => {
      if (!cancelled) setCountries(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const term = countrySearch.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.iso2Code.toLowerCase().includes(term) ||
        (c.iso3Code && c.iso3Code.toLowerCase().includes(term)),
    );
  }, [countries, countrySearch]);

  const countrySuggestions = useMemo(() => filteredCountries.slice(0, 8), [filteredCountries]);

  const selectedCountryLabel =
    highlightCountryIso2 && countries.length > 0
      ? countries.find((c) => c.iso2Code === highlightCountryIso2)?.name ?? highlightCountryIso2
      : '';

  useEffect(() => {
    let cancelled = false;
    if (selectedYears.length === 0) {
      setGlobalMetrics([]);
      return () => {
        cancelled = true;
      };
    }
    Promise.all(selectedYears.map((y) => fetchGlobalCountryMetricsForYear(y)))
      .then((arrays) => {
        if (cancelled) return;
        const combined = arrays.flat();
        setGlobalMetrics(combined);
      })
      .catch(() => {
        if (!cancelled) setGlobalMetrics([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYears, refreshTrigger]);

  const correlationResult = globalMetrics.length > 0
    ? computeCorrelationAnalysis(
        globalMetrics as unknown as Record<string, unknown>[],
        xMetric,
        yMetric,
        excludeOutliers,
      )
    : null;

  const scatterData = useMemo(() => {
    if (!correlationResult || !correlationResult.dataPrep.cleanedRows.length) return globalMetrics;
    const included = new Set(correlationResult.dataPrep.cleanedRows.map((r) => r.originalIndex));
    return globalMetrics.filter((_, i) => included.has(i));
  }, [globalMetrics, correlationResult]);

  const xLabel = SCATTER_METRIC_OPTIONS.find((o) => o.key === xMetric)?.label ?? xMetric;
  const yLabel = SCATTER_METRIC_OPTIONS.find((o) => o.key === yMetric)?.label ?? yMetric;

  const hypothesisDirection = useMemo(() => {
    if (!correlationResult) return '';
    const r = correlationResult.r;
    if (r > 0.05) return 'Countries with higher values on the X-axis tend to also have higher values on the Y-axis.';
    if (r < -0.05)
      return 'Countries with higher values on the X-axis tend to have lower values on the Y-axis (and vice versa).';
    return 'There is no clear monotonic pattern: countries are fairly dispersed around the scatter cloud.';
  }, [correlationResult]);

  return (
    <section className="card business-analytics-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Business Analytics</h2>
          <p className="muted">
            Multi-metric correlation analysis: compare countries across two metrics to explore
            market positioning and correlations. Uses the same analyst-grade data as the platform (World Bank, UN, WHO, IMF; 2000 – latest). Use the year range and highlight country filters below; then select X and Y axes. Each country–year in the range is a point.
          </p>
        </div>
      </div>

      <div className="business-analytics-filters">
        <div className="business-analytics-filter-group business-analytics-year-range">
          <label className="business-analytics-filter-label">
            <span className="business-analytics-filter-title">Year range</span>
            <span className="business-analytics-filter-desc">Start and end year (inclusive); scatter and correlation use all years in range</span>
          </label>
          <div className="business-analytics-year-inputs">
            <input
              type="number"
              className="business-analytics-year-input"
              min={DATA_MIN_YEAR}
              max={DATA_MAX_YEAR}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value) || startYear)}
              onBlur={() => {
                const v = Math.min(DATA_MAX_YEAR, Math.max(DATA_MIN_YEAR, startYear));
                setStartYear(v);
                if (endYear < v) setEndYear(v);
              }}
              aria-label="Start year"
            />
            <span className="business-analytics-year-sep" aria-hidden="true">–</span>
            <input
              type="number"
              className="business-analytics-year-input"
              min={DATA_MIN_YEAR}
              max={DATA_MAX_YEAR}
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value) || endYear)}
              onBlur={() => {
                const v = Math.min(DATA_MAX_YEAR, Math.max(DATA_MIN_YEAR, endYear));
                setEndYear(v);
                if (startYear > v) setStartYear(v);
              }}
              aria-label="End year"
            />
          </div>
          {selectedYears.length > 0 && (
            <p className="business-analytics-year-count muted small">
              {selectedYears.length} year{selectedYears.length !== 1 ? 's' : ''} selected ({selectedYears[0]}
              {selectedYears.length > 1 ? `–${selectedYears[selectedYears.length - 1]}` : ''})
            </p>
          )}
        </div>
        <div className="business-analytics-filter-group">
          <label className="business-analytics-filter-label business-analytics-checkbox-label">
            <input
              type="checkbox"
              checked={excludeOutliers}
              onChange={(e) => setExcludeOutliers(e.target.checked)}
              aria-label="Exclude IQR outliers"
            />
            <span className="business-analytics-filter-title">Exclude IQR outliers</span>
            <span className="business-analytics-filter-desc">Remove points &gt;1.5×IQR from Q1/Q3 (univariate on X and Y)</span>
          </label>
        </div>
        <div className="business-analytics-filter-group business-analytics-country-wrap">
          <label className="business-analytics-filter-label">
            <span className="business-analytics-filter-title">Highlight country</span>
            <span className="business-analytics-filter-desc">Country to highlight on the scatter (optional)</span>
          </label>
          <div className="business-analytics-country-combobox">
            <div className="input-with-icon">
              <input
                type="text"
                className="business-analytics-country-input"
                placeholder="Search by name or code…"
                value={countryOpen ? countrySearch : selectedCountryLabel || countrySearch || ''}
                onFocus={() => {
                  setCountryOpen(true);
                  setCountrySearch(selectedCountryLabel);
                }}
                onChange={(e) => {
                  setCountrySearch(e.target.value);
                  setCountryOpen(true);
                  setCountryActiveIndex(0);
                }}
                onBlur={() => {
                  setTimeout(() => setCountryOpen(false), 150);
                }}
                onKeyDown={(e) => {
                  if (!countryOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                    setCountryOpen(true);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCountryActiveIndex((i) =>
                      i + 1 < countrySuggestions.length ? i + 1 : i,
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCountryActiveIndex((i) => (i - 1 >= 0 ? i - 1 : i));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const sel = countrySuggestions[countryActiveIndex];
                    if (sel) {
                      setHighlightCountryIso2(sel.iso2Code);
                      setCountrySearch('');
                      setCountryOpen(false);
                    }
                  } else if (e.key === 'Escape') {
                    setCountryOpen(false);
                  }
                }}
              />
              <span className="input-inline-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16">
                  <path d="M7.25 2.5a4.75 4.75 0 1 0 2.98 8.48l2.64 2.63a.75.75 0 1 0 1.06-1.06l-2.63-2.64A4.75 4.75 0 0 0 7.25 2.5Zm0 1.5a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z" />
                </svg>
              </span>
            </div>
            {highlightCountryIso2 && (
              <button
                type="button"
                className="business-analytics-clear-country"
                onClick={() => {
                  setHighlightCountryIso2(null);
                  setCountrySearch('');
                  setCountryOpen(false);
                }}
                aria-label="Clear highlight country"
              >
                Clear
              </button>
            )}
            {countryOpen && countrySuggestions.length > 0 && (
              <div className="business-analytics-country-suggestions">
                {countrySuggestions.map((c, index) => (
                  <button
                    key={c.iso2Code}
                    type="button"
                    className={`business-analytics-country-option ${
                      index === countryActiveIndex ? 'business-analytics-country-option-active' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setHighlightCountryIso2(c.iso2Code);
                      setCountrySearch('');
                      setCountryOpen(false);
                    }}
                  >
                    <span className="business-analytics-country-option-name">{c.name}</span>
                    <span className="business-analytics-country-option-meta">
                      {c.iso2Code}
                      {c.region ? ` · ${c.region}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pestel-scatter-section">
        <h3 className="pestel-scatter-title">Multi-metric correlation analysis</h3>
        <p className="pestel-scatter-desc muted">
          Compare countries across two metrics to explore market positioning and correlations.
            The selected country is highlighted in gold on the scatter.
        </p>
        <div className="pestel-scatter-controls">
          <label className="pestel-scatter-label">
            <span>X axis</span>
            <select
              value={xMetric}
              onChange={(e) => setXMetric(e.target.value as ScatterMetricKey)}
              aria-label="X-axis metric"
            >
              {SCATTER_METRIC_OPTIONS_GROUPED.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="pestel-scatter-label">
            <span>Y axis</span>
            <select
              value={yMetric}
              onChange={(e) => setYMetric(e.target.value as ScatterMetricKey)}
              aria-label="Y-axis metric"
            >
              {SCATTER_METRIC_OPTIONS_GROUPED.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        {globalMetrics.length > 0 ? (
          <CorrelationScatterPlot
            data={scatterData}
            xMetric={xMetric}
            yMetric={yMetric}
            highlightCountryIso2={highlightCountryIso2}
            years={selectedYears}
            correlationR={correlationResult?.r}
            regressionCI={correlationResult?.regressionCI}
          />
        ) : (
          <div className="correlation-scatter-empty">
            <p className="muted">
              {selectedYears.length > 0
                ? `Loading global metrics for ${selectedYears.length} year${selectedYears.length !== 1 ? 's' : ''}…`
                : 'Select a year range.'}
            </p>
          </div>
        )}
      </div>

      {globalMetrics.length > 0 && (
        <div className="correlation-causation-analysis">
          <h3 className="correlation-analysis-title">Correlation &amp; causation analysis</h3>
          <p className="muted correlation-analysis-subtitle">
            Statistical summary and interpretation for the selected pair: <strong>{xLabel}</strong> (X) vs <strong>{yLabel}</strong> (Y).{' '}
            {selectedYears.length === 1
              ? `Year: ${selectedYears[0]}.`
              : `Years: ${selectedYears[0]}–${selectedYears[selectedYears.length - 1]} (${selectedYears.length} years, each country–year is a point).`}
          </p>
          {correlationResult ? (
            <div className="correlation-analysis-content">
              <p className="correlation-causation-disclaimer" role="alert">
                <strong>Correlation does NOT imply causation.</strong> The following describes association and strength of linear relationship. Causal claims require additional evidence (e.g. temporality, experiments).
              </p>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Data preparation</h4>
                <ul className="correlation-analysis-list">
                  <li>Missing: {correlationResult.dataPrep.removedMissing} point(s) removed.</li>
                  <li>IQR outliers: {correlationResult.dataPrep.outlierIndices.size} flagged (&gt;1.5×IQR). {excludeOutliers ? 'Excluded.' : 'Included; toggle "Exclude IQR outliers" to remove.'}</li>
                  <li>Points used: n = {correlationResult.n}.</li>
                </ul>
              </div>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Executive summary</h4>
                <table className="correlation-executive-table">
                  <thead>
                    <tr><th>Metric</th><th>Value</th><th>Interpretation</th></tr>
                  </thead>
                  <tbody>
                    {correlationResult.executiveSummaryTable.map((row, i) => (
                      <tr key={i}><td>{row.metric}</td><td>{row.value}</td><td>{row.interpretation}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Correlation (Pearson)</h4>
                <p className="correlation-analysis-stat">
                  <span className="correlation-r">r = {correlationResult.r.toFixed(3)}</span>
                  <span className="correlation-meta">
                    {' '}(n = {correlationResult.n}) {correlationResult.pValue != null && <>· p-value {correlationResult.pValue < 0.001 ? '< 0.001' : correlationResult.pValue.toFixed(3)}</>}
                    {' '}· Strength: <strong>{correlationResult.strengthLabel}</strong>
                  </span>
                </p>
                <p className="correlation-interpretation">{correlationResult.interpretation}</p>
                <p className="correlation-quantify">
                  A 1-unit increase in X predicts {correlationResult.betaCoefficient >= 0 ? '' : '−'}{Math.abs(correlationResult.betaCoefficient).toFixed(4)} change in Y
                  {correlationResult.betaPValue != null && correlationResult.betaPValue < 0.05 && <> (p = {correlationResult.betaPValue < 0.001 ? '<0.001' : correlationResult.betaPValue.toFixed(3)})</>}.
                </p>
                {correlationResult.pValue != null && correlationResult.pValue < 0.05 && (
                  <p className="correlation-significance muted">
                    The correlation is statistically significant at the 5% level (two-tailed test of no linear relationship).
                  </p>
                )}
              </div>
              {correlationResult.residuals.length >= 3 && (
                <div className="correlation-analysis-block">
                  <h4 className="correlation-analysis-heading">Residuals vs fitted</h4>
                  <p className="muted small">Check for heteroscedasticity: residuals should be scattered around zero.</p>
                  <div className="correlation-residuals-plot">
                    <ResponsiveContainer width="100%" height={220}>
                      <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis type="number" dataKey="fitted" name="Fitted" stroke="var(--text-muted)" fontSize={10} />
                        <YAxis type="number" dataKey="residual" name="Residual" stroke="var(--text-muted)" fontSize={10} />
                        <Scatter
                          data={correlationResult.fitted.map((f, i) => ({ fitted: f, residual: correlationResult.residuals[i] }))}
                          fill="var(--accent-red)"
                          fillOpacity={0.5}
                          stroke="var(--accent-red)"
                        />
                        <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="2 2" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {correlationResult.subgroupResults.length > 0 && (
                <div className="correlation-analysis-block">
                  <h4 className="correlation-analysis-heading">Subgroup analysis (by region)</h4>
                  <p className="muted small">Consistency across regions (Bradford Hill).</p>
                  <table className="correlation-executive-table correlation-subgroup-table">
                    <thead>
                      <tr><th>Region</th><th>r</th><th>n</th><th>p-value</th></tr>
                    </thead>
                    <tbody>
                      {correlationResult.subgroupResults.map((s, i) => (
                        <tr key={i}>
                          <td>{s.group}</td>
                          <td>{s.r.toFixed(3)}</td>
                          <td>{s.n}</td>
                          <td>{s.pValue != null ? (s.pValue < 0.001 ? '<0.001' : s.pValue.toFixed(3)) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Causation &amp; context</h4>
                <p className="correlation-causation-note">{correlationResult.causationNote}</p>
                <p className="correlation-disclaimer muted small">
                  Confounding, reverse causality, and country-specific factors can affect the relationship. Use for hypothesis generation; complement with time-series or experimental evidence.
                </p>
              </div>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Actionable insight</h4>
                <p className="correlation-actionable">{correlationResult.actionableInsight}</p>
              </div>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">If causation is not supported</h4>
                <p className="correlation-next-steps muted small">{correlationResult.causationNextSteps}</p>
              </div>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Comprehensive hypothesis for business analysis</h4>
                <p className="correlation-causation-note">
                  Working hypothesis for <strong>{xLabel}</strong> (X) vs <strong>{yLabel}</strong> (Y){' '}
                  {selectedYears.length === 1 ? `in ${selectedYears[0]}` : `across ${selectedYears.length} years (${selectedYears[0]}–${selectedYears[selectedYears.length - 1]})`}:
                </p>
                <ul className="correlation-hypothesis-list">
                  <li>
                    Based on the scatter and Pearson statistics, {hypothesisDirection}{' '}
                    This pattern is estimated from {correlationResult.n} points with valid data.
                  </li>
                  <li>
                    If this relationship holds within your target segment (e.g. region, income group, or portfolio
                    markets), then shifts in <strong>{xLabel}</strong> may be informative about expected movements in{' '}
                    <strong>{yLabel}</strong> (and vice versa). Use segmentation to check whether the pattern is stronger
                    for specific country clusters.
                  </li>
                  <li>
                    Countries that sit far above the main cloud (higher <strong>{yLabel}</strong> than peers with similar{' '}
                    <strong>{xLabel}</strong>) can be treated as potential out-performers or resilience cases; those far
                    below may represent structural risk or underperformance.
                  </li>
                  <li>
                    Limitations: sample size, possible multicollinearity, non-linear effects. Re-run for different years and metrics; complement with time-series or microdata where available.
                  </li>
                </ul>
                <p className="correlation-disclaimer muted small">
                  This hypothesis is exploratory. Stress-test before driving capital allocation or policy decisions.
                </p>
              </div>
            </div>
          ) : (
            <p className="muted">Insufficient data (fewer than 3 country–year points with valid values for both metrics) to compute correlation for this pair{selectedYears.length === 1 ? ` in ${selectedYears[0]}` : ''}.</p>
          )}
        </div>
      )}
    </section>
  );
}
