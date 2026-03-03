import { useEffect, useState } from 'react';
import type { CountryDashboardData } from '../types';

interface Props {
  startYear: number;
  endYear: number;
  setStartYear: (year: number) => void;
  setEndYear: (year: number) => void;
  minYear: number;
  maxYear: number;
  data?: CountryDashboardData;
}

export function YearRangeSelector({
  startYear,
  endYear,
  setStartYear,
  setEndYear,
  minYear,
  maxYear,
  data,
}: Props) {
  const effectiveMin = minYear;
  const effectiveMax = maxYear;

  const [localStart, setLocalStart] = useState(startYear);
  const [localEnd, setLocalEnd] = useState(endYear);

  useEffect(() => {
    setLocalStart(startYear);
    setLocalEnd(endYear);
  }, [startYear, endYear]);

  const commitStart = () => {
    const clamped = Math.min(
      Math.max(localStart, effectiveMin),
      localEnd,
    );
    if (clamped !== startYear) setStartYear(clamped);
    setLocalStart(clamped);
  };

  const commitEnd = () => {
    const clamped = Math.max(
      Math.min(localEnd, effectiveMax),
      localStart,
    );
    if (clamped !== endYear) setEndYear(clamped);
    setLocalEnd(clamped);
  };

  const label =
    startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`;

  const applyPreset = (preset: 'full' | 'last10' | 'last5') => {
    let newStart = effectiveMin;
    let newEnd = effectiveMax;

    if (preset === 'last10') {
      newEnd = effectiveMax;
      newStart = Math.max(effectiveMin, newEnd - 9);
    } else if (preset === 'last5') {
      newEnd = effectiveMax;
      newStart = Math.max(effectiveMin, newEnd - 4);
    }

    setStartYear(newStart);
    setEndYear(newEnd);
    setLocalStart(newStart);
    setLocalEnd(newEnd);
  };

  const isFullRange =
    startYear === effectiveMin && endYear === effectiveMax;
  const isLast10 =
    endYear === effectiveMax && endYear - startYear + 1 === 10;
  const isLast5 =
    endYear === effectiveMax && endYear - startYear + 1 === 5;

  return (
    <div className="year-range">
      <div className="year-range-label">
        <span className="year-range-title">
          <span className="icon-16 icon-muted">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M5 1.75a.75.75 0 0 1 .75.75V3h4.5V2.5a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v7.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-7.5A1.75 1.75 0 0 1 3.75 3h.5V2.5A.75.75 0 0 1 5 1.75ZM4 6.5a.5.5 0 0 0-.5.5v5.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5H4Z" />
            </svg>
          </span>
          <span>Year range</span>
        </span>
        <span className="year-range-sub">
          Filter the dashboard window between {effectiveMin} and {effectiveMax}. Currently:{' '}
          <strong>{label}</strong>
          {data?.range && (
            <>
              {' '}
              · data available from {data.range.startYear} to {data.range.endYear}
            </>
          )}
        </span>
      </div>
      <div className="year-range-inputs">
        <div className="year-input">
          <span className="year-input-label">From</span>
          <div className="input-with-icon">
            <input
              className="year-input-field"
              type="number"
              min={effectiveMin}
              max={endYear}
              value={localStart}
              onChange={(e) =>
                setLocalStart(Number(e.target.value) || localStart)
              }
              onBlur={commitStart}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitStart();
              }}
            />
            <span className="input-inline-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path d="M5 1.75a.75.75 0 0 1 .75.75V3h4.5V2.5a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v7.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-7.5A1.75 1.75 0 0 1 3.75 3h.5V2.5A.75.75 0 0 1 5 1.75ZM4 6.5a.5.5 0 0 0-.5.5v5.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5H4Z" />
              </svg>
            </span>
          </div>
        </div>
        <span className="year-range-separator">to</span>
        <div className="year-input">
          <span className="year-input-label">To</span>
          <div className="input-with-icon">
            <input
              className="year-input-field"
              type="number"
              min={startYear}
              max={effectiveMax}
              value={localEnd}
              onChange={(e) =>
                setLocalEnd(Number(e.target.value) || localEnd)
              }
              onBlur={commitEnd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEnd();
              }}
            />
            <span className="input-inline-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16">
                <path d="M5 1.75a.75.75 0 0 1 .75.75V3h4.5V2.5a.75.75 0 0 1 1.5 0V3h.5A1.75 1.75 0 0 1 14 4.75v7.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-7.5A1.75 1.75 0 0 1 3.75 3h.5V2.5A.75.75 0 0 1 5 1.75ZM4 6.5a.5.5 0 0 0-.5.5v5.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V7a.5.5 0 0 0-.5-.5H4Z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <div className="year-range-presets">
        <button
          type="button"
          className={`pill ${isFullRange ? 'pill-active' : ''}`}
          onClick={() => applyPreset('full')}
        >
          Full range
        </button>
        <button
          type="button"
          className={`pill ${isLast10 ? 'pill-active' : ''}`}
          onClick={() => applyPreset('last10')}
        >
          Last 10 years
        </button>
        <button
          type="button"
          className={`pill ${isLast5 ? 'pill-active' : ''}`}
          onClick={() => applyPreset('last5')}
        >
          Last 5 years
        </button>
      </div>
    </div>
  );
}

