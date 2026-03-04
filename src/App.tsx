import './App.css';
import { useState } from 'react';
import { useCountryDashboard } from './hooks/useCountryDashboard';
import { SummarySection } from './components/SummarySection';
import { TimeSeriesSection } from './components/TimeSeriesSection';
import { MacroIndicatorsTimelineSection } from './components/MacroIndicatorsTimelineSection';
import { PopulationPieSection } from './components/PopulationPieSection';
import { CountryTableSection } from './components/CountryTableSection';
import { WorldMapSection } from './components/WorldMapSection';
import { CountrySelector } from './components/CountrySelector';
import { AllCountriesTableSection } from './components/AllCountriesTableSection';
import { SourceSection } from './components/SourceSection';
import { ChatbotSection } from './components/ChatbotSection';
import { PESTELSection } from './components/PESTELSection';
import { YearRangeSelector } from './components/YearRangeSelector';
import { MapMetricToolbar, type MapMetricId } from './components/MapMetricToolbar';
import { DATA_MAX_YEAR, DATA_MIN_YEAR } from './config';

function App() {
  const {
    data,
    loading,
    error,
    countryCode,
    setCountryCode,
    frequency,
    setFrequency,
    macroFrequency,
    setMacroFrequency,
    startYear,
    endYear,
    setStartYear,
    setEndYear,
    selectedMetricIds,
    setSelectedMetricIds,
    resampled,
    resampledMacro,
  } = useCountryDashboard();

  const [mainTab, setMainTab] = useState<'country' | 'global' | 'source' | 'pestel' | 'chat'>('country');
  const [globalViewTab, setGlobalViewTab] = useState<'map' | 'table'>('map');
  const [mapMetricId, setMapMetricId] = useState<MapMetricId>('gdpNominal');
  const [globalYear, setGlobalYear] = useState<number>(DATA_MAX_YEAR);
  const [globalYearInput, setGlobalYearInput] = useState<number>(DATA_MAX_YEAR);

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
            <span>Country Dashboard</span>
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
            <span>Global Analytics</span>
          </button>
          <button
            type="button"
            className={`main-tab ${mainTab === 'pestel' ? 'main-tab-active' : ''}`}
            onClick={() => setMainTab('pestel')}
          >
            <span className="icon-16">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M2 2.75A1.75 1.75 0 0 1 3.75 1h8.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-9.5Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25h-8.5ZM4.5 4.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5Z" />
              </svg>
            </span>
            <span>PESTEL</span>
          </button>
          <button
            type="button"
            className={`main-tab ${mainTab === 'chat' ? 'main-tab-active' : ''}`}
            onClick={() => setMainTab('chat')}
          >
            <span className="icon-16">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M8 1.5c-3.5 0-6 2.5-6 5.5 0 1.5.5 2.9 1.4 4-.2.6-.8 2.2-.8 2.2l.9-.3c.5.4 1.1.7 1.8.9.2 1 .9 1.8 1.8 2.2 2.9.9 6-.5 6-4.2 0-3-2.5-5.5-6-5.5Zm2.5 7.5h-5v-1h5v1Zm0-2h-5v-1h5v1Z" />
              </svg>
            </span>
            <span>Analytics Assistant</span>
          </button>
          <button
            type="button"
            className={`main-tab ${mainTab === 'source' ? 'main-tab-active' : ''}`}
            onClick={() => setMainTab('source')}
          >
            <span className="icon-16">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M2.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .14.11.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25H2.75ZM2 2.75C2 1.78 2.78 1 3.75 1h8.5C13.22 1 14 1.78 14 2.75v10.5c0 .97-.78 1.75-1.75 1.75h-8.5A1.75 1.75 0 0 1 2 13.25V2.75Zm1.5.25v9.5h9v-9.5h-9Zm1.5 0h6v1.5h-6V3Zm0 2.5h6v1h-6v-1Zm0 2.5h6v1h-6v-1Zm0 2.5h4v1h-4v-1Z" />
              </svg>
            </span>
            <span>Source</span>
          </button>
        </div>

        {mainTab === 'source' ? (
          <SourceSection />
        ) : mainTab === 'pestel' ? (
          <PESTELSection dashboardData={data} />
        ) : mainTab === 'chat' ? (
          <ChatbotSection dashboardData={data} />
        ) : mainTab === 'country' ? (
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
              <MacroIndicatorsTimelineSection
                data={data}
                frequency={macroFrequency}
                setFrequency={setMacroFrequency}
                resampledSeries={resampledMacro}
              />
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
                <div className="map-metric-toolbar-wrapper">
                  <span className="map-metric-toolbar-label">Metric on map</span>
                  <MapMetricToolbar
                    value={mapMetricId}
                    onChange={setMapMetricId}
                  />
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

      <footer className="app-footer">
        <span className="app-footer-text">
          Developed, managed, and maintained by Rifqi Tjahyono
        </span>
        <div className="app-footer-links">
          <a
            href="https://www.linkedin.com/in/rifqi-tjahjono/"
            target="_blank"
            rel="noopener noreferrer"
            className="app-footer-link"
            aria-label="LinkedIn profile"
            title="LinkedIn"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path
                fill="currentColor"
                d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
              />
            </svg>
          </a>
          <a
            href="https://rifqi-tjahyono.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="app-footer-link"
            aria-label="Personal website"
            title="Personal website"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"
              />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
