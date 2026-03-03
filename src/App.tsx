import './App.css';
import { useState } from 'react';
import { useCountryDashboard } from './hooks/useCountryDashboard';
import { SummarySection } from './components/SummarySection';
import { TimeSeriesSection } from './components/TimeSeriesSection';
import { PopulationPieSection } from './components/PopulationPieSection';
import { CountryTableSection } from './components/CountryTableSection';
import { WorldMapSection } from './components/WorldMapSection';
import { CountrySelector } from './components/CountrySelector';
import { AllCountriesTableSection } from './components/AllCountriesTableSection';
import { YearRangeSelector } from './components/YearRangeSelector';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from './config';
import type { MetricId } from './types';

function App() {
  const {
    data,
    loading,
    error,
    countryCode,
    setCountryCode,
    frequency,
    setFrequency,
    startYear,
    endYear,
    setStartYear,
    setEndYear,
    selectedMetricIds,
    setSelectedMetricIds,
    resampled,
  } = useCountryDashboard();

  const [mainTab, setMainTab] = useState<'country' | 'global'>('country');
  const [globalViewTab, setGlobalViewTab] = useState<'map' | 'table'>('map');
  const [mapMetricId, setMapMetricId] = useState<MetricId>('gdpNominal');
  const [globalYear, setGlobalYear] = useState<number>(DATA_MAX_YEAR);
  const [globalYearInput, setGlobalYearInput] =
    useState<number>(DATA_MAX_YEAR);

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <h1 className="app-title">Country Analytics Platform</h1>
          <p className="app-subtitle">
            A modern, analyst-grade view across financial, demographic, and health metrics for every
            country (2000 – latest), powered by World Bank, UN, WHO, and IMF data.
          </p>
        </div>
      </header>

      {loading && !data && <div className="banner banner-loading">Loading country analytics…</div>}
      {error && <div className="banner banner-error">{error}</div>}

      <main className="app-main">
        <div className="main-tabs">
          <button
            type="button"
            className={`main-tab ${mainTab === 'country' ? 'main-tab-active' : ''}`}
            onClick={() => setMainTab('country')}
          >
            <span className="icon-16">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M8 1.5a5 5 0 0 0-5 5c0 3.25 3.5 6 4.4 6.7.36.28.84.28 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
              </svg>
            </span>
            <span>Country dashboard</span>
          </button>
          <button
            type="button"
            className={`main-tab ${mainTab === 'global' ? 'main-tab-active' : ''}`}
            onClick={() => setMainTab('global')}
          >
            <span className="icon-16">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M8 1.25a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5Zm4.25 6.75c0 .5-.06.98-.18 1.44H9.9c.07-.46.1-.94.1-1.44 0-.5-.03-.98-.1-1.44h2.17c.12.46.18.94.18 1.44Zm-3-1.44A13 13 0 0 1 9.1 8c0 .52-.03 1.01-.09 1.47H7V6.56h2.25ZM7 5.06V2.7c.5.16 1.16.98 1.53 2.36H7Zm-1.5 0C5.87 3.68 6.53 2.86 7 2.7v2.36H5.5Zm0 1.5H7V9.5H4.9A11.5 11.5 0 0 1 4.75 8c0-.52.06-1.01.18-1.44Zm-1.7 0c-.12.46-.18.94-.18 1.44 0 .5.06.98.18 1.44H2.9A5.25 5.25 0 0 1 2.75 8c0-.5.06-.98.18-1.44h.87Zm.52-1.5H4.9c.2-.9.5-1.67.87-2.22A5.27 5.27 0 0 0 3.32 5.06Zm6.18 0h1.58A5.27 5.27 0 0 0 10 3.34c-.37.55-.67 1.32-.87 2.22Zm1.58 4.44H9.5c-.2.9-.5 1.67-.87 2.22a5.27 5.27 0 0 0 2.87-2.22ZM6.9 11.72c-.37-.55-.67-1.32-.87-2.22H4.44A5.27 5.27 0 0 0 6.9 11.72Z" />
              </svg>
            </span>
            <span>Global analytics</span>
          </button>
        </div>

        {mainTab === 'country' ? (
          <>
            <div className="top-filters">
              <CountrySelector
                countryCode={countryCode}
                setCountryCode={setCountryCode}
                data={data}
              />
              <YearRangeSelector
                startYear={startYear}
                endYear={endYear}
                setStartYear={setStartYear}
                setEndYear={setEndYear}
                minYear={DATA_MIN_YEAR}
                maxYear={DATA_MAX_YEAR}
                data={data}
              />
            </div>

            <SummarySection data={data} />

            <section className="dashboard-grid">
              <TimeSeriesSection
                data={data}
                frequency={frequency}
                setFrequency={setFrequency}
                selectedMetricIds={selectedMetricIds}
                setSelectedMetricIds={setSelectedMetricIds}
                resampledSeries={resampled}
              />
              <PopulationPieSection data={data} />
            </section>

            <CountryTableSection data={data} />
          </>
        ) : (
          <section className="card global-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Global view</h2>
                <p className="muted">
                  Switch between an interactive world map and a full global country table for cross-country
                  comparison.
                </p>
              </div>
              <div className="global-header-controls">
                <div className="year-selector">
                  <label>
                    <span className="year-label">
                      <span className="icon-16 icon-muted">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M5 1.5a.75.75 0 0 1 .75.75V3h4.5V2.25a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v8.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-8.5A1.75 1.75 0 0 1 3.75 3h.5V2.25A.75.75 0 0 1 5 1.5Zm7 5H4a.5.5 0 0 0-.5.5v6.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5Z" />
                        </svg>
                      </span>
                      <span>Year</span>
                    </span>
                    <div className="input-with-icon">
                      <input
                        type="number"
                        min={DATA_MIN_YEAR}
                        max={DATA_MAX_YEAR}
                        value={globalYearInput}
                        onChange={(e) =>
                          setGlobalYearInput(
                            Number(e.target.value) || globalYearInput,
                          )
                        }
                        onBlur={() => {
                          const clamped = Math.min(
                            DATA_MAX_YEAR,
                            Math.max(DATA_MIN_YEAR, globalYearInput),
                          );
                          setGlobalYear(clamped);
                          setGlobalYearInput(clamped);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const clamped = Math.min(
                              DATA_MAX_YEAR,
                              Math.max(DATA_MIN_YEAR, globalYearInput),
                            );
                            setGlobalYear(clamped);
                            setGlobalYearInput(clamped);
                          }
                        }}
                      />
                      <span className="input-inline-icon" aria-hidden="true">
                        <svg viewBox="0 0 16 16">
                          <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm.75 3.25a.75.75 0 0 0-1.5 0v3.5c0 .2.08.39.22.53l2 2a.75.75 0 0 0 1.06-1.06L8.75 8.6V5.25Z" />
                        </svg>
                      </span>
                    </div>
                  </label>
                </div>
                <div className="tab-group">
                  <button
                    type="button"
                    className={`tab ${globalViewTab === 'map' ? 'tab-active' : ''}`}
                    onClick={() => setGlobalViewTab('map')}
                  >
                    <span className="icon-16">
                      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path d="M6 2.25 2.75 3.5A1 1 0 0 0 2 4.44v8.06a.75.75 0 0 0 1 .7L6 11.75l4 1.5 3.25-1.25a1 1 0 0 0 .75-.95V3a.75.75 0 0 0-1-.7L10 3.75 6 2.25Zm0 1.7 4 1.5v6.3l-4-1.5v-6.3Z" />
                      </svg>
                    </span>
                    <span>Map</span>
                  </button>
                  <button
                    type="button"
                    className={`tab ${globalViewTab === 'table' ? 'tab-active' : ''}`}
                    onClick={() => setGlobalViewTab('table')}
                  >
                    <span className="icon-16">
                      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                        <path d="M3 2.25A1.75 1.75 0 0 0 1.25 4v8A1.75 1.75 0 0 0 3 13.75h10A1.75 1.75 0 0 0 14.75 12V4A1.75 1.75 0 0 0 13 2.25H3Zm-.25 3.5h10.5v2H2.75v-2Zm0 3.5h10.5V12A.25.25 0 0 1 13 12.25H3A.25.25 0 0 1 2.75 12v-2.75Z" />
                      </svg>
                    </span>
                    <span>Global table</span>
                  </button>
                </div>
              </div>
            </div>

            {globalViewTab === 'map' ? (
              <>
                <div className="map-metric-row">
                  <span className="map-metric-label">Metric on map</span>
                  <div className="map-metric-tags">
                    <button
                      type="button"
                      className={`tag ${mapMetricId === 'gdpNominal' ? 'tag-active' : ''}`}
                      onClick={() => setMapMetricId('gdpNominal')}
                    >
                      <span className="icon-12">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M3 11.5a.75.75 0 0 1 .75-.75h2V4.5a.75.75 0 0 1 1.5 0v6.25h2l.1.01a.75.75 0 0 1-.1 1.49h-2v.75a.75.75 0 0 1-1.5 0V12.5h-2A.75.75 0 0 1 3 11.5Z" />
                        </svg>
                      </span>
                      <span>GDP Nominal</span>
                    </button>
                    <button
                      type="button"
                      className={`tag ${mapMetricId === 'gdpPPP' ? 'tag-active' : ''}`}
                      onClick={() => setMapMetricId('gdpPPP')}
                    >
                      <span className="icon-12">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M4 3.25A1.25 1.25 0 0 1 5.25 2h5.5A1.25 1.25 0 0 1 12 3.25v9.5a.75.75 0 0 1-1.2.6L8 11.5l-2.8 1.85A.75.75 0 0 1 4 12.75v-9.5ZM7 6h3V4.5H7V6Zm0 2.5h3V7H7v1.5Z" />
                        </svg>
                      </span>
                      <span>GDP PPP</span>
                    </button>
                    <button
                      type="button"
                      className={`tag ${
                        mapMetricId === 'gdpNominalPerCapita' ? 'tag-active' : ''
                      }`}
                      onClick={() => setMapMetricId('gdpNominalPerCapita')}
                    >
                      <span className="icon-12">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z" />
                        </svg>
                      </span>
                      <span>GDP / Capita</span>
                    </button>
                    <button
                      type="button"
                      className={`tag ${
                        mapMetricId === 'gdpPPPPerCapita' ? 'tag-active' : ''
                      }`}
                      onClick={() => setMapMetricId('gdpPPPPerCapita')}
                    >
                      <span className="icon-12">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M3.25 3A.75.75 0 0 1 4 2.25h8A.75.75 0 0 1 12.75 3v2A2.75 2.75 0 0 1 10 7.75H8.5v1H11a.75.75 0 0 1 0 1.5H8.5v1.5a.75.75 0 0 1-1.5 0V10.25H5a.75.75 0 0 1 0-1.5h2V7.75H6A2.75 2.75 0 0 1 3.25 5V3Zm7.5 2V3.75h-6.5V5c0 .69.56 1.25 1.25 1.25h4A1.25 1.25 0 0 0 10.75 5Z" />
                        </svg>
                      </span>
                      <span>GDP / Capita PPP</span>
                    </button>
                    <button
                      type="button"
                      className={`tag ${
                        mapMetricId === 'populationTotal' ? 'tag-active' : ''
                      }`}
                      onClick={() => setMapMetricId('populationTotal')}
                    >
                      <span className="icon-12">
                        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Zm4.75-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 2.5c1.3 0 2.4.86 2.75 2.05a.75.75 0 0 1-.73.95H11a3.74 3.74 0 0 0-.9-2.37c.05-.43.23-.83.5-1.17Z" />
                        </svg>
                      </span>
                      <span>Population</span>
                    </button>
                  </div>
                </div>
                <WorldMapSection
                  data={data}
                  selectedMetricId={mapMetricId}
                  year={globalYear}
                />
              </>
            ) : (
              <AllCountriesTableSection
                year={globalYear}
                setYear={setGlobalYear}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
