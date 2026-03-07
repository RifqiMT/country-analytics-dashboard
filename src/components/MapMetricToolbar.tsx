import { useRef, useEffect, useState } from 'react';

export type MapMetricId =
  | 'gdpNominal'
  | 'gdpPPP'
  | 'gdpNominalPerCapita'
  | 'gdpPPPPerCapita'
  | 'populationTotal'
  | 'inflationCPI'
  | 'govDebtPercentGDP'
  | 'govDebtUSD'
  | 'interestRate'
  | 'unemploymentRate'
  | 'unemployedTotal'
  | 'labourForceTotal'
  | 'povertyHeadcount215'
  | 'povertyHeadcountNational'
  | 'lifeExpectancy'
  | 'maternalMortalityRatio'
  | 'under5MortalityRate'
  | 'undernourishmentPrevalence'
  | 'pop0_14Share'
  | 'pop15_64Share'
  | 'pop65PlusShare'
  | 'landAreaKm2'
  | 'totalAreaKm2'
  | 'eezKm2'
  | 'headOfGovernmentType'
  | 'governmentType'
  | 'region'
  | 'outOfSchoolPrimaryPct'
  | 'primaryCompletionRate'
  | 'minProficiencyReadingPct'
  | 'preprimaryEnrollmentPct'
  | 'literacyRateAdultPct'
  | 'genderParityIndexPrimary'
  | 'trainedTeachersPrimaryPct'
  | 'publicExpenditureEducationPctGDP';

interface MapMetricOption {
  id: MapMetricId;
  label: string;
  icon: React.ReactNode;
}

interface MapMetricCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  metrics: MapMetricOption[];
}

const SvgIcon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d={d} />
  </svg>
);

const MAP_METRIC_CATEGORIES: MapMetricCategory[] = [
  {
    id: 'financial',
    label: 'Financial',
    icon: <SvgIcon d="M3 11.5a.75.75 0 0 1 .75-.75h2V4.5a.75.75 0 0 1 1.5 0v6.25h2l.1.01a.75.75 0 0 1-.1 1.49h-2v.75a.75.75 0 0 1-1.5 0V12.5h-2A.75.75 0 0 1 3 11.5Z" />,
    metrics: [
      { id: 'gdpNominal', label: 'GDP Nominal', icon: <SvgIcon d="M3 11.5a.75.75 0 0 1 .75-.75h2V4.5a.75.75 0 0 1 1.5 0v6.25h2l.1.01a.75.75 0 0 1-.1 1.49h-2v.75a.75.75 0 0 1-1.5 0V12.5h-2A.75.75 0 0 1 3 11.5Z" /> },
      { id: 'gdpPPP', label: 'GDP PPP', icon: <SvgIcon d="M4 3.25A1.25 1.25 0 0 1 5.25 2h5.5A1.25 1.25 0 0 1 12 3.25v9.5a.75.75 0 0 1-1.2.6L8 11.5l-2.8 1.85A.75.75 0 0 1 4 12.75v-9.5ZM7 6h3V4.5H7V6Zm0 2.5h3V7H7v1.5Z" /> },
      { id: 'gdpNominalPerCapita', label: 'GDP / Capita', icon: <SvgIcon d="M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z" /> },
      { id: 'gdpPPPPerCapita', label: 'GDP / Capita PPP', icon: <SvgIcon d="M3.25 3A.75.75 0 0 1 4 2.25h8A.75.75 0 0 1 12.75 3v2A2.75 2.75 0 0 1 10 7.75H8.5v1H11a.75.75 0 0 1 0 1.5H8.5v1.5a.75.75 0 0 1-1.5 0V10.25H5a.75.75 0 0 1 0-1.5h2V7.75H6A2.75 2.75 0 0 1 3.25 5V3Zm7.5 2V3.75h-6.5V5c0 .69.56 1.25 1.25 1.25h4A1.25 1.25 0 0 0 10.75 5Z" /> },
      { id: 'govDebtUSD', label: 'Gov. debt (USD)', icon: <SvgIcon d="M3 11.5a.75.75 0 0 1 .75-.75h2V4.5a.75.75 0 0 1 1.5 0v6.25h2l.1.01a.75.75 0 0 1-.1 1.49h-2v.75a.75.75 0 0 1-1.5 0V12.5h-2A.75.75 0 0 1 3 11.5Z" /> },
      { id: 'inflationCPI', label: 'Inflation (CPI, %)', icon: <SvgIcon d="M3.25 8A4.75 4.75 0 0 1 8 3.25a.75.75 0 0 1 0 1.5A3.25 3.25 0 1 0 11.25 8a.75.75 0 0 1 1.5 0A4.75 4.75 0 1 1 3.25 8Z" /> },
      { id: 'govDebtPercentGDP', label: 'Gov. debt (% GDP)', icon: <SvgIcon d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .14.11.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z" /> },
      { id: 'interestRate', label: 'Lending rate (%)', icon: <SvgIcon d="M4.75 2A1.75 1.75 0 0 0 3 3.75v8.5c0 .97.78 1.75 1.75 1.75h6.5A1.75 1.75 0 0 0 13 12.25v-8.5A1.75 1.75 0 0 0 11.25 2h-6.5Zm0 1.5h6.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-6.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25ZM6 4.75a.75.75 0 0 1 .75.75v1.19l1.72-.99a.75.75 0 0 1 1.13.65v3a.75.75 0 0 1-1.13.65L6.75 9.46V11a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 6 4.75Z" /> },
      { id: 'unemploymentRate', label: 'Unemployment rate (%)', icon: <SvgIcon d="M8 1.5a5 5 0 0 0-5 5c0 3.25 3.5 6 4.4 6.7.36.28.84.28 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /> },
      { id: 'unemployedTotal', label: 'Unemployed (number)', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z" /> },
      { id: 'labourForceTotal', label: 'Labour force (total)', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z" /> },
      { id: 'povertyHeadcount215', label: 'Poverty ($2.15/day, %)', icon: <SvgIcon d="M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z" /> },
      { id: 'povertyHeadcountNational', label: 'Poverty (national line, %)', icon: <SvgIcon d="M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z" /> },
    ],
  },
  {
    id: 'demographics',
    label: 'Demographics & Health',
    icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z" />,
    metrics: [
      { id: 'populationTotal', label: 'Population', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Zm4.75-1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 2.5c1.3 0 2.4.86 2.75 2.05a.75.75 0 0 1-.73.95H11a3.74 3.74 0 0 0-.9-2.37c.05-.43.23-.83.5-1.17Z" /> },
      { id: 'pop0_14Share', label: 'Pop. 0–14 (%)', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z" /> },
      { id: 'pop15_64Share', label: 'Pop. 15–64 (%)', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z" /> },
      { id: 'pop65PlusShare', label: 'Pop. 65+ (%)', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z" /> },
      { id: 'lifeExpectancy', label: 'Life expectancy', icon: <SvgIcon d="M8 3.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5ZM5.75 8.5A2.75 2.75 0 0 0 3 11.25v.5c0 .69.56 1.25 1.25 1.25h7.5A1.25 1.25 0 0 0 13 11.75v-.5A2.75 2.75 0 0 0 10.25 8.5h-4.5Z" /> },
      { id: 'maternalMortalityRatio', label: 'Maternal mortality (per 100k)', icon: <SvgIcon d="M8 3.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5ZM5.75 8.5A2.75 2.75 0 0 0 3 11.25v.5c0 .69.56 1.25 1.25 1.25h7.5A1.25 1.25 0 0 0 13 11.75v-.5A2.75 2.75 0 0 0 10.25 8.5h-4.5Z" /> },
      { id: 'under5MortalityRate', label: 'Under‑5 mortality (per 1k)', icon: <SvgIcon d="M8 3.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5ZM5.75 8.5A2.75 2.75 0 0 0 3 11.25v.5c0 .69.56 1.25 1.25 1.25h7.5A1.25 1.25 0 0 0 13 11.75v-.5A2.75 2.75 0 0 0 10.25 8.5h-4.5Z" /> },
      { id: 'undernourishmentPrevalence', label: 'Undernourishment (%)', icon: <SvgIcon d="M8 2.25a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm0 5.5a4.25 4.25 0 0 1 4.24 3.8.75.75 0 0 1-.74.7H4.5a.75.75 0 0 1-.74-.7A4.25 4.25 0 0 1 8 7.75Z" /> },
    ],
  },
  {
    id: 'geography',
    label: 'Geography',
    icon: <SvgIcon d="M8 1.5a5 5 0 0 0-5 5c0 3.25 3.5 6 4.4 6.7.36.28.84.28 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />,
    metrics: [
      { id: 'landAreaKm2', label: 'Land area (km²)', icon: <SvgIcon d="M3 4.25A1.25 1.25 0 0 1 4.25 3h7.5A1.25 1.25 0 0 1 13 4.25v7.5A1.25 1.25 0 0 1 11.75 13h-7.5A1.25 1.25 0 0 1 3 11.75v-7.5Zm1.5.25v7h7v-7h-7Z" /> },
      { id: 'totalAreaKm2', label: 'Total area (km²)', icon: <SvgIcon d="M2.75 4A1.75 1.75 0 0 1 4.5 2.25h7A1.75 1.75 0 0 1 13.25 4v7A1.75 1.75 0 0 1 11.5 12.75h-7A1.75 1.75 0 0 1 2.75 11V4Zm1.75-.25a.25.25 0 0 0-.25.25v7c0 .14.11.25.25.25h7a.25.25 0 0 0 .25-.25v-7a.25.25 0 0 0-.25-.25h-7Z" /> },
      { id: 'eezKm2', label: 'EEZ (km²)', icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" /> },
    ],
  },
  {
    id: 'government',
    label: 'Government',
    icon: <SvgIcon d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z" />,
    metrics: [
      { id: 'headOfGovernmentType', label: 'Head of government', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Zm-.5 3.5a3.25 3.25 0 0 0-3.2 2.6.75.75 0 0 0 .73.9h5.84a.75.75 0 0 0 .73-.9 3.25 3.25 0 0 0-3.2-2.6H7.5Z" /> },
      { id: 'governmentType', label: 'Government type', icon: <SvgIcon d="M3 3.75A1.75 1.75 0 0 1 4.75 2h6.5A1.75 1.75 0 0 1 13 3.75v8.5A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25v-8.5Z" /> },
      { id: 'region', label: 'Region', icon: <SvgIcon d="M8 1.5a5 5 0 0 0-5 5c0 3.25 3.5 6 4.4 6.7.36.28.84.28 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" /> },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" />,
    metrics: [
      { id: 'outOfSchoolPrimaryPct', label: 'Out-of-school (primary, %)', icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" /> },
      { id: 'primaryCompletionRate', label: 'Primary completion (%)', icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" /> },
      { id: 'minProficiencyReadingPct', label: 'Min. reading proficiency (%)', icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" /> },
      { id: 'preprimaryEnrollmentPct', label: 'Preprimary enrollment (%)', icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" /> },
      { id: 'literacyRateAdultPct', label: 'Adult literacy (%)', icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" /> },
      { id: 'genderParityIndexPrimary', label: 'GPI (primary)', icon: <SvgIcon d="M8 4.25a1.75 1.75 0 1 1-3.5 0A1.75 1.75 0 0 1 8 4.25Z" /> },
      { id: 'trainedTeachersPrimaryPct', label: 'Trained teachers primary (%)', icon: <SvgIcon d="M2 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" /> },
      { id: 'publicExpenditureEducationPctGDP', label: 'Education expenditure (% GDP)', icon: <SvgIcon d="M3 11.5a.75.75 0 0 1 .75-.75h2V4.5a.75.75 0 0 1 1.5 0v6.25h2l.1.01a.75.75 0 0 1-.1 1.49h-2v.75a.75.75 0 0 1-1.5 0V12.5h-2A.75.75 0 0 1 3 11.5Z" /> },
    ],
  },
];

function getMetricLabel(id: MapMetricId): string {
  for (const cat of MAP_METRIC_CATEGORIES) {
    const m = cat.metrics.find((x) => x.id === id);
    if (m) return m.label;
  }
  return String(id);
}

function getMetricIcon(id: MapMetricId): React.ReactNode {
  for (const cat of MAP_METRIC_CATEGORIES) {
    const m = cat.metrics.find((x) => x.id === id);
    if (m) return m.icon;
  }
  return null;
}

interface Props {
  value: MapMetricId;
  onChange: (id: MapMetricId) => void;
}

export function MapMetricToolbar({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(evt: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evt.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="map-metric-toolbar">
      <button
        type="button"
        className="map-metric-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="map-metric-trigger-icon">
          {getMetricIcon(value)}
        </span>
        <span className="map-metric-trigger-label">
          {getMetricLabel(value)}
        </span>
        <span className={`map-metric-trigger-chevron ${open ? 'open' : ''}`}>
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="map-metric-dropdown" role="listbox">
          {MAP_METRIC_CATEGORIES.map((category) => (
            <div key={category.id} className="map-metric-category">
              <div className="map-metric-category-header">
                <span className="map-metric-category-icon">{category.icon}</span>
                <span className="map-metric-category-label">{category.label}</span>
              </div>
              <div className="map-metric-category-items">
                {category.metrics.map((metric) => (
                  <button
                    key={metric.id}
                    type="button"
                    role="option"
                    aria-selected={value === metric.id}
                    className={`map-metric-option ${value === metric.id ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(metric.id);
                      setOpen(false);
                    }}
                  >
                    <span className="map-metric-option-icon">{metric.icon}</span>
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
