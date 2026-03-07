import { useEffect, useMemo, useState } from 'react';
import type { CountryDashboardData, CountrySummary } from '../types';
import { fetchAllCountries } from '../api/worldBank';

interface Props {
  setCountryCode: (code: string) => void;
  data?: CountryDashboardData;
}

export function CountrySelector({ setCountryCode, data }: Props) {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await fetchAllCountries();
        if (!cancelled) setCountries(list);
      } catch {
        // Best-effort; fall back to current selection if API fails.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (data) {
      setSearch(`${data.summary.name} (${data.summary.iso2Code})`);
    }
  }, [data]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    const term = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.iso2Code.toLowerCase().includes(term) ||
        (c.iso3Code && c.iso3Code.toLowerCase().includes(term)),
    );
  }, [countries, search]);

  const suggestions = useMemo(
    () => filteredCountries.slice(0, 8),
    [filteredCountries],
  );

  const handleSelect = (c: CountrySummary) => {
    setCountryCode(c.iso2Code);
    setSearch(`${c.name} (${c.iso2Code})`);
    setIsOpen(false);
  };

  return (
    <div className="country-selector">
      <div className="country-selector-main">
        <label className="country-label">
          <span className="country-label-title">Country</span>
          <span className="country-label-sub">
            Choose the focus country for the dashboard and map.
          </span>
        </label>
        <div className="country-select-row">
          <div className="country-combobox">
            <div className="input-with-icon">
              <input
                className="country-search"
                type="text"
                placeholder="Search by name or code…"
                value={search}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setIsOpen(true);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                    setIsOpen(true);
                    return;
                  }
                  if (!suggestions.length) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex((prev) =>
                      prev + 1 < suggestions.length ? prev + 1 : prev,
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const sel = suggestions[activeIndex];
                    if (sel) handleSelect(sel);
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
              <span className="input-inline-icon" aria-hidden="true">
                <svg viewBox="0 0 16 16">
                  <path d="M7.25 2.5a4.75 4.75 0 1 0 2.98 8.48l2.64 2.63a.75.75 0 1 0 1.06-1.06l-2.63-2.64A4.75 4.75 0 0 0 7.25 2.5Zm0 1.5a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z" />
                </svg>
              </span>
            </div>
            {isOpen && suggestions.length > 0 && (
              <div className="country-suggestions">
                {suggestions.map((c, index) => (
                  <button
                    key={c.iso2Code}
                    type="button"
                    className={`country-suggestion ${
                      index === activeIndex ? 'country-suggestion-active' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(c);
                    }}
                  >
                    <span className="country-suggestion-name">{c.name}</span>
                    <span className="country-suggestion-meta">
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
    </div>
  );
}

