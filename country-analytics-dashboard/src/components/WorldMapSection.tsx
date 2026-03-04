import { useEffect, useMemo, useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type {
  CountryDashboardData,
  GlobalCountryMetricsRow,
  MetricId,
} from '../types';
import { formatCompactNumber, formatPercentage } from '../utils/numberFormat';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { DATA_MAX_YEAR } from '../config';
import { getNumericCountryCodeMap, type CountryCodeInfo } from '../api/countryCodes';
import { useToast } from './ToastProvider';

type MapMetricId =
  | MetricId
  | 'landAreaKm2'
  | 'totalAreaKm2'
  | 'eezKm2'
  | 'headOfGovernmentType'
  | 'governmentType'
  | 'region';

const CATEGORICAL_METRICS: MapMetricId[] = [
  'headOfGovernmentType',
  'governmentType',
  'region',
];

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Props {
  data?: CountryDashboardData;
  selectedMetricId: MapMetricId;
  year: number;
}

function getMetricFromRow(
  row: GlobalCountryMetricsRow | undefined,
  metricId: MapMetricId,
): number | string | null {
  if (!row) return null;
  switch (metricId) {
    case 'gdpNominal':
      return row.gdpNominal ?? null;
    case 'gdpPPP':
      return row.gdpPPP ?? null;
    case 'gdpNominalPerCapita':
      return row.gdpNominalPerCapita ?? null;
    case 'gdpPPPPerCapita':
      return row.gdpPPPPerCapita ?? null;
    case 'populationTotal':
      return row.populationTotal ?? null;
    case 'lifeExpectancy':
      return row.lifeExpectancy ?? null;
    case 'inflationCPI':
      return row.inflationCPI ?? null;
    case 'govDebtPercentGDP':
      return row.govDebtPercentGDP ?? null;
    case 'govDebtUSD':
      return row.govDebtUSD ?? null;
    case 'interestRate':
      return row.interestRate ?? null;
    case 'unemploymentRate':
      return row.unemploymentRate ?? null;
    case 'povertyHeadcount215':
      return row.povertyHeadcount215 ?? null;
    case 'povertyHeadcountNational':
      return row.povertyHeadcountNational ?? null;
    case 'landAreaKm2':
      return row.landAreaKm2 ?? null;
    case 'totalAreaKm2':
      return row.totalAreaKm2 ?? null;
    case 'eezKm2':
      return row.eezKm2 ?? null;
    case 'headOfGovernmentType':
      return row.headOfGovernmentType ?? null;
    case 'governmentType':
      return row.governmentType ?? null;
    case 'region':
      return row.region ?? null;
    default:
      return null;
  }
}

function getMetricLabel(metricId: MapMetricId): string {
  switch (metricId) {
    case 'gdpNominal':
      return 'GDP (Nominal, US$)';
    case 'gdpPPP':
      return 'GDP (PPP, Intl$)';
    case 'gdpNominalPerCapita':
      return 'GDP per capita (Nominal, US$)';
    case 'gdpPPPPerCapita':
      return 'GDP per capita (PPP, Intl$)';
    case 'populationTotal':
      return 'Total population';
    case 'inflationCPI':
      return 'Inflation (CPI, %)';
    case 'govDebtPercentGDP':
      return 'Government debt (% of GDP)';
    case 'govDebtUSD':
      return 'Government debt (USD)';
    case 'interestRate':
      return 'Lending interest rate (%)';
    case 'unemploymentRate':
      return 'Unemployment rate (% of labour force)';
    case 'povertyHeadcount215':
      return 'Poverty ($2.15/day, %)';
    case 'povertyHeadcountNational':
      return 'Poverty (national line, %)';
    case 'lifeExpectancy':
      return 'Life expectancy (years)';
    case 'landAreaKm2':
      return 'Land area (km²)';
    case 'totalAreaKm2':
      return 'Total area (km²)';
    case 'eezKm2':
      return 'EEZ (km²)';
    case 'headOfGovernmentType':
      return 'Head of government';
    case 'governmentType':
      return 'Government type';
    case 'region':
      return 'Region';
    case 'pop0_14Share':
      return 'Population 0–14 (% of total)';
    case 'pop15_64Share':
      return 'Population 15–64 (% of total)';
    case 'pop65PlusShare':
      return 'Population 65+ (% of total)';
    default:
      return String(metricId);
  }
}

function formatMetricValue(
  metricId: MapMetricId,
  value: number | string | null,
): string {
  if (value == null) return '–';
  if (typeof value === 'string') return value;

  if (Number.isNaN(value)) return '–';

  switch (metricId) {
    case 'inflationCPI':
    case 'govDebtPercentGDP':
    case 'interestRate':
    case 'unemploymentRate':
    case 'povertyHeadcount215':
    case 'povertyHeadcountNational':
      return formatPercentage(value);
    case 'govDebtUSD':
      return formatCompactNumber(value);
    case 'lifeExpectancy':
      return `${value.toFixed(1)} yrs`;
    case 'gdpNominal':
    case 'gdpPPP':
    case 'gdpNominalPerCapita':
    case 'gdpPPPPerCapita':
    case 'populationTotal':
      return formatCompactNumber(value);
    case 'landAreaKm2':
    case 'totalAreaKm2':
    case 'eezKm2':
      return `${formatCompactNumber(value)} km²`;
    default:
      return formatCompactNumber(value);
  }
}

interface MapTooltipState {
  visible: boolean;
  x: number;
  y: number;
  name: string;
  iso2?: string;
  metricLabel: string;
  metricValue: string;
}

export function WorldMapSection({ data, selectedMetricId, year }: Props) {
  if (!data) {
    return (
      <section className="card map-section">
        <h2 className="section-title">Global map</h2>
        <p className="muted">
          Loading a dynamic world map with per-country tooltips and analytics...
        </p>
      </section>
    );
  }

  const [globalRows, setGlobalRows] = useState<GlobalCountryMetricsRow[]>([]);
  const [tooltip, setTooltip] = useState<MapTooltipState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [effectiveYear, setEffectiveYear] = useState<number>(year);
  const [codeMap, setCodeMap] = useState<Map<string, CountryCodeInfo> | null>(
    null,
  );
  const { showToast, dismissToast } = useToast();

  useEffect(() => {
    const targetYear = year;
    let cancelled = false;
    const loadingId = showToast({
      type: 'loading',
      message: `Loading global map metrics for ${targetYear}…`,
    });
    async function load() {
      try {
        const rows = await fetchGlobalCountryMetricsForYear(targetYear);
        if (!cancelled) {
          setGlobalRows(rows);
          if (rows.length > 0) {
            setEffectiveYear(rows[0].year);
          } else {
            setEffectiveYear(targetYear);
          }
          showToast({
            type: 'success',
            message: `Global map metrics updated for ${targetYear}.`,
          });
        }
      } catch {
        // Fail silently; map will just not show metric values.
        if (!cancelled) {
          showToast({
            type: 'error',
            message: 'Failed to load global map metrics.',
          });
        }
      } finally {
        dismissToast(loadingId);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [year, dismissToast, showToast]);

  useEffect(() => {
    let cancelled = false;
    getNumericCountryCodeMap()
      .then((map) => {
        if (!cancelled) setCodeMap(map);
      })
      .catch(() => {
        if (!cancelled) setCodeMap(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Index by ISO3 for quick metric lookup.
  const byIso3 = useMemo(() => {
    const map = new Map<string, GlobalCountryMetricsRow>();
    for (const row of globalRows) {
      if (row.iso3Code) {
        map.set(row.iso3Code.toUpperCase(), row);
      }
    }
    return map;
  }, [globalRows]);

  const isCategorical = CATEGORICAL_METRICS.includes(selectedMetricId);

  const { minValue, maxValue } = useMemo(() => {
    if (isCategorical) {
      return { minValue: null as number | null, maxValue: null as number | null };
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const row of globalRows) {
      const v = getMetricFromRow(row, selectedMetricId);
      if (v == null || typeof v === 'string' || Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { minValue: null as number | null, maxValue: null as number | null };
    }
    return { minValue: min, maxValue: max };
  }, [globalRows, selectedMetricId, isCategorical]);

  const categoricalPalette = [
    '#fbbf24', '#b45309', '#dc2626', '#ea580c', '#ca8a04',
    '#65a30d', '#059669', '#0d9488', '#2563eb', '#7c3aed',
    '#9333ea', '#c026d3',
  ];

  function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function getColorForCategory(category: string): string {
    const idx = hashString(category) % categoricalPalette.length;
    return categoricalPalette[idx];
  }

  const categoricalLegendItems = useMemo(() => {
    if (!isCategorical) return [];
    const seen = new Set<string>();
    for (const row of globalRows) {
      const v = getMetricFromRow(row, selectedMetricId);
      if (typeof v === 'string' && v.trim()) seen.add(v);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [globalRows, selectedMetricId, isCategorical]);

  const getFillColor = (metricValue: number | string | null) => {
    if (metricValue == null) {
      return '#e5e7eb'; // light gray for no data
    }
    if (isCategorical && typeof metricValue === 'string') {
      const idx = hashString(metricValue) % categoricalPalette.length;
      return categoricalPalette[idx];
    }
    if (minValue == null || maxValue == null) {
      return '#e5e7eb';
    }
    const numVal = typeof metricValue === 'number' ? metricValue : null;
    if (numVal == null) return '#e5e7eb';
    if (minValue === maxValue) {
      return '#fbbf24';
    }
    const t = Math.max(
      0,
      Math.min(1, (numVal - minValue) / (maxValue - minValue)),
    );
    const low = { r: 229, g: 231, b: 235 }; // light gray
    const mid = { r: 251, g: 191, b: 36 }; // warm gold
    const high = { r: 184, g: 28, b: 28 }; // deep red

    let colorFrom;
    let colorTo;
    let localT;
    if (t < 0.5) {
      localT = t / 0.5;
      colorFrom = low;
      colorTo = mid;
    } else {
      localT = (t - 0.5) / 0.5;
      colorFrom = mid;
      colorTo = high;
    }

    const r = Math.round(colorFrom.r + (colorTo.r - colorFrom.r) * localT);
    const g = Math.round(colorFrom.g + (colorTo.g - colorFrom.g) * localT);
    const b = Math.round(colorFrom.b + (colorTo.b - colorFrom.b) * localT);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <section className="card map-section">
      <h2 className="section-title">Interactive country map</h2>
      <p className="muted">
        Hover to see country name, flag, and the currently selected metric. Values are shown for year{' '}
        {effectiveYear}.
      </p>
      <div className={`map-legend ${isCategorical ? 'map-legend-categorical' : ''}`}>
        {isCategorical ? (
          <div className="map-legend-categorical-list">
            {categoricalLegendItems.map((label) => (
              <div key={label} className="map-legend-categorical-item">
                <span
                  className="map-legend-categorical-swatch"
                  style={{ backgroundColor: getColorForCategory(label) }}
                />
                <span className="map-legend-categorical-label">{label}</span>
              </div>
            ))}
            <div className="map-legend-categorical-item">
              <span
                className="map-legend-categorical-swatch"
                style={{ backgroundColor: '#e5e7eb' }}
              />
              <span className="map-legend-categorical-label">No data</span>
            </div>
          </div>
        ) : (
          <>
            <span className="map-legend-label">Lower values</span>
            <div className="map-legend-gradient" />
            <span className="map-legend-label">Higher values</span>
          </>
        )}
      </div>
      <div ref={wrapperRef} className="map-wrapper">
        <ComposableMap projectionConfig={{ scale: 140 }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numericId =
                  typeof geo.id === 'string'
                    ? geo.id
                    : geo.id != null
                      ? String(geo.id)
                      : undefined;

                const mapping =
                  numericId && codeMap ? codeMap.get(numericId) : undefined;
                const iso3 = mapping?.iso3;
                const row = iso3 ? byIso3.get(iso3.toUpperCase()) : undefined;
                const metricValue = getMetricFromRow(row, selectedMetricId);
                const metricLabel = getMetricLabel(selectedMetricId);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: getFillColor(metricValue),
                        outline: 'none',
                        stroke: '#111',
                        strokeWidth: 0.4,
                      },
                      hover: {
                        fill: getFillColor(metricValue),
                        outline: 'none',
                      },
                      pressed: {
                        fill: '#c8102e',
                        outline: 'none',
                      },
                    }}
                    onMouseEnter={(evt) => {
                      const name =
                        mapping?.name ||
                        row?.name ||
                        geo.properties.name ||
                        'Unknown';
                      const iso2 = mapping?.iso2 || geo.properties.ISO_A2;
                      if (!wrapperRef.current) return;

                      const margin = 16;
                      const wrapperRect = wrapperRef.current.getBoundingClientRect();
                      const tooltipWidth = 220;
                      const tooltipHeight = 88;

                      let x = evt.clientX - wrapperRect.left + margin;
                      let y = evt.clientY - wrapperRect.top + margin;

                      const maxX = wrapperRect.width - tooltipWidth - margin;
                      const maxY = wrapperRect.height - tooltipHeight - margin;

                      if (x < margin) x = margin;
                      if (y < margin) y = margin;
                      if (x > maxX) x = maxX;
                      if (y > maxY) y = maxY;

                      setTooltip({
                        visible: true,
                        x,
                        y,
                        name,
                        iso2: iso2 && iso2 !== '-99' ? iso2 : undefined,
                        metricLabel,
                        metricValue: formatMetricValue(
                          selectedMetricId,
                          metricValue,
                        ),
                      });
                    }}
                    onMouseMove={(evt) => {
                      if (!wrapperRef.current) return;

                      const margin = 16;
                      const wrapperRect = wrapperRef.current.getBoundingClientRect();
                      const tooltipWidth = 220;
                      const tooltipHeight = 88;

                      let x = evt.clientX - wrapperRect.left + margin;
                      let y = evt.clientY - wrapperRect.top + margin;

                      const maxX = wrapperRect.width - tooltipWidth - margin;
                      const maxY = wrapperRect.height - tooltipHeight - margin;

                      if (x < margin) x = margin;
                      if (y < margin) y = margin;
                      if (x > maxX) x = maxX;
                      if (y > maxY) y = maxY;

                      setTooltip((prev) =>
                        prev ? { ...prev, x, y } : null,
                      );
                    }}
                    onMouseLeave={() => {
                      setTooltip(null);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        {tooltip && (
          <div
            className="map-tooltip map-tooltip-visible"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            <div className="map-tooltip-inner">
              <div className="map-tooltip-header">
                {tooltip.iso2 && (
                  <img
                    src={`https://flagcdn.com/w40/${tooltip.iso2.toLowerCase()}.png`}
                    alt={`${tooltip.name} flag`}
                    className="map-tooltip-flag"
                  />
                )}
                <span className="map-tooltip-country">{tooltip.name}</span>
              </div>
              <div className="map-tooltip-divider" />
              <div className="map-tooltip-metric">
                <span className="map-tooltip-metric-label">
                  {tooltip.metricLabel}
                </span>
                <strong className="map-tooltip-metric-value">
                  {tooltip.metricValue}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

