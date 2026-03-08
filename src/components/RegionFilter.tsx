import { useEffect, useMemo, useRef, useState } from 'react';

const ALL_REGIONS_VALUE = '__all__';

interface Props {
  /** Unique region names (e.g. from World Bank country list). Sorted display. */
  regions: string[];
  /** Selected region or null for "All regions". */
  value: string | null;
  onChange: (region: string | null) => void;
  /** Optional placeholder when empty. */
  placeholder?: string;
  disabled?: boolean;
}

export function RegionFilter({
  regions,
  value,
  onChange,
  placeholder = 'All regions',
  disabled = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = value ?? placeholder;

  const options = useMemo(() => {
    const all = [ALL_REGIONS_VALUE, ...regions];
    if (!search.trim()) return all;
    const term = search.toLowerCase();
    return all.filter((r) => {
      if (r === ALL_REGIONS_VALUE) return 'all'.includes(term) || placeholder.toLowerCase().includes(term);
      return r.toLowerCase().includes(term);
    });
  }, [regions, search, placeholder]);

  const suggestions = useMemo(() => options.slice(0, 12), [options]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search, options.length]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (option: string) => {
    if (option === ALL_REGIONS_VALUE) {
      onChange(null);
      setSearch('');
    } else {
      onChange(option);
      setSearch('');
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      return;
    }
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = suggestions[activeIndex];
      if (sel) handleSelect(sel);
    }
  };

  return (
    <div className="region-filter" ref={containerRef}>
      <label>
        <span className="region-filter-label">
          <span className="icon-16 icon-muted" aria-hidden>
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M8 1.5a5 5 0 0 0-5 5c0 3.25 3.5 6 4.4 6.7.36.28.84.28 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />
            </svg>
          </span>
          <span>Region</span>
        </span>
        <div className="region-filter-combobox">
          <input
            type="text"
            className="region-filter-input"
            placeholder={placeholder}
            value={isOpen ? search : displayValue}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="region-filter-list"
            aria-activedescendant={suggestions[activeIndex] ? `region-option-${activeIndex}` : undefined}
            id="region-filter-input"
          />
          <span className="input-inline-icon region-filter-chevron" aria-hidden>
            <svg viewBox="0 0 16 16" className={isOpen ? 'open' : ''}>
              <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L8.53 10.53a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </span>
          {isOpen && (
            <ul
              id="region-filter-list"
              className="region-filter-list"
              role="listbox"
              aria-labelledby="region-filter-input"
            >
              {suggestions.map((option, index) => (
                <li key={option === ALL_REGIONS_VALUE ? ALL_REGIONS_VALUE : option} role="option">
                  <button
                    type="button"
                    id={`region-option-${index}`}
                    className={`region-filter-option ${index === activeIndex ? 'region-filter-option-active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(option);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {option === ALL_REGIONS_VALUE ? placeholder : option}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>
    </div>
  );
}
