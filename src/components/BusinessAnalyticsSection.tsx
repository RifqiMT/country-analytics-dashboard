import { useState, useEffect, useMemo } from 'react';
import { fetchGlobalCountryMetricsForYear, fetchAllCountries } from '../api/worldBank';
import {
  CorrelationScatterPlot,
  SCATTER_METRIC_OPTIONS_GROUPED,
  SCATTER_METRIC_OPTIONS,
  type ScatterMetricKey,
} from './CorrelationScatterPlot';
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

  const dashboardYear =
    dashboardData?.latestSnapshot?.year ??
    dashboardData?.range?.endYear ??
    DATA_MAX_YEAR;
  const [selectedYear, setSelectedYear] = useState<number>(dashboardYear);
  const [highlightCountryIso2, setHighlightCountryIso2] = useState<string | null>(
    () => dashboardData?.summary?.iso2Code ?? null,
  );

  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryActiveIndex, setCountryActiveIndex] = useState(0);

  useEffect(() => {
    setSelectedYear((prev) => (dashboardYear !== prev ? dashboardYear : prev));
  }, [dashboardYear]);

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

  const year = selectedYear;

  useEffect(() => {
    let cancelled = false;
    fetchGlobalCountryMetricsForYear(year).then((rows) => {
      if (!cancelled) setGlobalMetrics(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [year, refreshTrigger]);

  const correlationResult = globalMetrics.length > 0
    ? computeCorrelationAnalysis(globalMetrics as unknown as Record<string, unknown>[], xMetric, yMetric)
    : null;

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
            market positioning and correlations. Use the year and highlight country filters below; then select X and Y axes.
          </p>
        </div>
      </div>

      <div className="business-analytics-filters">
        <div className="business-analytics-filter-group">
          <label className="business-analytics-filter-label">
            <span className="business-analytics-filter-title">Year</span>
            <span className="business-analytics-filter-desc">Data year for scatter and correlation</span>
          </label>
          <input
            type="number"
            className="business-analytics-year-input"
            min={DATA_MIN_YEAR}
            max={DATA_MAX_YEAR}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value) || selectedYear)}
            onBlur={() => {
              const v = Math.min(DATA_MAX_YEAR, Math.max(DATA_MIN_YEAR, selectedYear));
              setSelectedYear(v);
            }}
            aria-label="Year"
          />
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
            data={globalMetrics}
            xMetric={xMetric}
            yMetric={yMetric}
            highlightCountryIso2={highlightCountryIso2}
            year={year}
          />
        ) : (
          <div className="correlation-scatter-empty">
            <p className="muted">Loading global metrics for {year}…</p>
          </div>
        )}
      </div>

      {globalMetrics.length > 0 && (
        <div className="correlation-causation-analysis">
          <h3 className="correlation-analysis-title">Correlation &amp; causation analysis</h3>
          <p className="muted correlation-analysis-subtitle">
            Statistical summary and interpretation for the selected pair: <strong>{xLabel}</strong> (X) vs <strong>{yLabel}</strong> (Y). Year: {year}.
          </p>
          {correlationResult ? (
            <div className="correlation-analysis-content">
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Correlation (Pearson)</h4>
                <p className="correlation-analysis-stat">
                  <span className="correlation-r">r = {correlationResult.r.toFixed(3)}</span>
                  <span className="correlation-meta">
                    {' '}(n = {correlationResult.n} countries)
                    {correlationResult.pValue != null && (
                      <> · p-value {correlationResult.pValue < 0.001 ? '< 0.001' : correlationResult.pValue.toFixed(3)}</>
                    )}
                  </span>
                </p>
                <p className="correlation-interpretation">{correlationResult.interpretation}</p>
                {correlationResult.pValue != null && correlationResult.pValue < 0.05 && (
                  <p className="correlation-significance muted">
                    The correlation is statistically significant at the 5% level (two-tailed test of no linear relationship).
                  </p>
                )}
              </div>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Causation &amp; context</h4>
                <p className="correlation-causation-note">{correlationResult.causationNote}</p>
                <p className="correlation-disclaimer muted small">
                  Cross-sectional correlation does not prove causation. Confounding, reverse causality, and country-specific factors can affect the relationship. Use for hypothesis generation and complement with time-series or experimental evidence where appropriate.
                </p>
              </div>
              <div className="correlation-analysis-block">
                <h4 className="correlation-analysis-heading">Comprehensive hypothesis for business analysis</h4>
                <p className="correlation-causation-note">
                  Working hypothesis for <strong>{xLabel}</strong> (X) vs <strong>{yLabel}</strong> (Y) in {year}:
                </p>
                <ul className="correlation-hypothesis-list">
                  <li>
                    Based on the scatter and Pearson statistics, {hypothesisDirection}{' '}
                    This pattern is estimated from {correlationResult.n} countries with valid data.
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
                    A practical next step is to pick 3–5 countries in each quadrant (high/low X vs high/low Y) and run a
                    qualitative review: recent policy changes, sector mix, demographic profile, and institutional
                    factors that might explain why they deviate from the average pattern.
                  </li>
                </ul>
                <p className="correlation-disclaimer muted small">
                  This hypothesis is intentionally exploratory and should be stress-tested before driving capital
                  allocation or policy decisions. Re-run the analysis for different years, check robustness to metric
                  choices (e.g. per-capita vs levels), and complement with time-series or microdata where available.
                </p>
              </div>
            </div>
          ) : (
            <p className="muted">Insufficient data (fewer than 3 countries with valid values for both metrics) to compute correlation for this pair in {year}.</p>
          )}
        </div>
      )}
    </section>
  );
}
