import { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type {
  CountryDashboardData,
  GlobalCountryMetricsRow,
  MetricId,
} from '../types';
import { formatCompactNumber } from '../utils/numberFormat';
import { fetchGlobalCountryMetricsForYear } from '../api/worldBank';
import { DATA_MAX_YEAR } from '../config';
import { getNumericCountryCodeMap, type CountryCodeInfo } from '../api/countryCodes';

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Props {
  data?: CountryDashboardData;
  selectedMetricId: MetricId;
  year: number;
}

function getMetricFromRow(
  row: GlobalCountryMetricsRow | undefined,
  metricId: MetricId,
): number | null {
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
    default:
      return null;
  }
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
  const [effectiveYear, setEffectiveYear] = useState<number>(year);
  const [codeMap, setCodeMap] = useState<Map<string, CountryCodeInfo> | null>(
    null,
  );

  useEffect(() => {
    const targetYear = year;
    let cancelled = false;
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
        }
      } catch {
        // Fail silently; map will just not show metric values.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [year]);

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

  const { minValue, maxValue } = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const row of globalRows) {
      const v = getMetricFromRow(row, selectedMetricId);
      if (v == null || Number.isNaN(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { minValue: null as number | null, maxValue: null as number | null };
    }
    return { minValue: min, maxValue: max };
  }, [globalRows, selectedMetricId]);

  const getFillColor = (metricValue: number | null) => {
    if (metricValue == null || minValue == null || maxValue == null) {
      return '#e5e7eb'; // light gray for no data
    }
    if (minValue === maxValue) {
      return '#fbbf24';
    }
    const t = Math.max(
      0,
      Math.min(1, (metricValue - minValue) / (maxValue - minValue)),
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
      <div className="map-legend">
        <span className="map-legend-label">Lower values</span>
        <div className="map-legend-gradient" />
        <span className="map-legend-label">Higher values</span>
      </div>
      <div className="map-wrapper">
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
                      const tooltip = document.getElementById('map-tooltip');
                      if (!tooltip) return;

                      const rect = (
                        evt.target as SVGPathElement
                      ).getBoundingClientRect();
                      const x = rect.left + rect.width / 2;
                      const y = rect.top;

                      tooltip.style.display = 'block';
                      tooltip.style.left = `${x}px`;
                      tooltip.style.top = `${y - 10}px`;

                      const flagUrl =
                        iso2 && iso2 !== '-99'
                          ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`
                          : '';

                      tooltip.innerHTML = `
                        <div class="map-tooltip-inner">
                          <div class="map-tooltip-header">
                            ${
                              flagUrl
                                ? `<img src="${flagUrl}" alt="${name} flag" />`
                                : ''
                            }
                            <span>${name}</span>
                          </div>
                          <div class="map-tooltip-metric">
                            <span>Selected metric:</span>
                            <strong>${formatCompactNumber(
                              metricValue,
                            )}</strong>
                          </div>
                        </div>
                      `;
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.getElementById('map-tooltip');
                      if (tooltip) {
                        tooltip.style.display = 'none';
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        <div id="map-tooltip" className="map-tooltip" />
      </div>
    </section>
  );
}

