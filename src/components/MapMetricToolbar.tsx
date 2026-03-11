import { useRef, useEffect, useState } from 'react';
import { getMetricIconPath } from '../icons/metricIcons';

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
  | 'outOfSchoolSecondaryPct'
  | 'outOfSchoolTertiaryPct'
  | 'primaryCompletionRate'
  | 'secondaryCompletionRate'
  | 'tertiaryCompletionRate'
  | 'minProficiencyReadingPct'
  | 'literacyRateAdultPct'
  | 'genderParityIndexPrimary'
  | 'genderParityIndexSecondary'
  | 'genderParityIndexTertiary'
  | 'trainedTeachersPrimaryPct'
  | 'trainedTeachersSecondaryPct'
  | 'trainedTeachersTertiaryPct'
  | 'publicExpenditureEducationPctGDP'
  | 'primaryPupilsTotal'
  | 'primaryEnrollmentPct'
  | 'secondaryPupilsTotal'
  | 'secondaryEnrollmentPct'
  | 'tertiaryEnrollmentPct'
  | 'tertiaryEnrollmentTotal'
  | 'primarySchoolsTotal'
  | 'secondarySchoolsTotal'
  | 'tertiaryInstitutionsTotal'
  | 'primarySchoolCount'
  | 'secondarySchoolCount'
  | 'tertiaryInstitutionCount';

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
    <path d={d} fill="currentColor" />
  </svg>
);

const MAP_METRIC_CATEGORIES: MapMetricCategory[] = [
  {
    id: 'financial',
    label: 'Financial',
    icon: <SvgIcon d={getMetricIconPath('gdpNominal')} />,
    metrics: [
      { id: 'gdpNominal', label: 'GDP Nominal', icon: <SvgIcon d={getMetricIconPath('gdpNominal')} /> },
      { id: 'gdpPPP', label: 'GDP PPP', icon: <SvgIcon d={getMetricIconPath('gdpPPP')} /> },
      { id: 'gdpNominalPerCapita', label: 'GDP / Capita', icon: <SvgIcon d={getMetricIconPath('gdpNominalPerCapita')} /> },
      { id: 'gdpPPPPerCapita', label: 'GDP / Capita PPP', icon: <SvgIcon d={getMetricIconPath('gdpPPPPerCapita')} /> },
      { id: 'govDebtUSD', label: 'Gov. debt (USD)', icon: <SvgIcon d={getMetricIconPath('govDebtUSD')} /> },
      { id: 'inflationCPI', label: 'Inflation (CPI, %)', icon: <SvgIcon d={getMetricIconPath('inflationCPI')} /> },
      { id: 'govDebtPercentGDP', label: 'Gov. debt (% GDP)', icon: <SvgIcon d={getMetricIconPath('govDebtPercentGDP')} /> },
      { id: 'interestRate', label: 'Lending rate (%)', icon: <SvgIcon d={getMetricIconPath('interestRate')} /> },
      { id: 'unemploymentRate', label: 'Unemployment rate (%)', icon: <SvgIcon d={getMetricIconPath('unemploymentRate')} /> },
      { id: 'unemployedTotal', label: 'Unemployed (number)', icon: <SvgIcon d={getMetricIconPath('unemployedTotal')} /> },
      { id: 'labourForceTotal', label: 'Labour force (total)', icon: <SvgIcon d={getMetricIconPath('labourForceTotal')} /> },
      { id: 'povertyHeadcount215', label: 'Poverty ($2.15/day, %)', icon: <SvgIcon d={getMetricIconPath('povertyHeadcount215')} /> },
      { id: 'povertyHeadcountNational', label: 'Poverty (national line, %)', icon: <SvgIcon d={getMetricIconPath('povertyHeadcountNational')} /> },
    ],
  },
  {
    id: 'demographics',
    label: 'Demographics & Health',
    icon: <SvgIcon d={getMetricIconPath('populationTotal')} />,
    metrics: [
      { id: 'populationTotal', label: 'Population', icon: <SvgIcon d={getMetricIconPath('populationTotal')} /> },
      { id: 'pop0_14Share', label: 'Pop. 0–14 (%)', icon: <SvgIcon d={getMetricIconPath('pop0_14Share')} /> },
      { id: 'pop15_64Share', label: 'Pop. 15–64 (%)', icon: <SvgIcon d={getMetricIconPath('pop15_64Share')} /> },
      { id: 'pop65PlusShare', label: 'Pop. 65+ (%)', icon: <SvgIcon d={getMetricIconPath('pop65PlusShare')} /> },
      { id: 'lifeExpectancy', label: 'Life expectancy', icon: <SvgIcon d={getMetricIconPath('lifeExpectancy')} /> },
      { id: 'maternalMortalityRatio', label: 'Maternal mortality (per 100k)', icon: <SvgIcon d={getMetricIconPath('maternalMortalityRatio')} /> },
      { id: 'under5MortalityRate', label: 'Under‑5 mortality (per 1k)', icon: <SvgIcon d={getMetricIconPath('under5MortalityRate')} /> },
      { id: 'undernourishmentPrevalence', label: 'Undernourishment (%)', icon: <SvgIcon d={getMetricIconPath('undernourishmentPrevalence')} /> },
    ],
  },
  {
    id: 'geography',
    label: 'Geography',
    icon: <SvgIcon d={getMetricIconPath('landAreaKm2')} />,
    metrics: [
      { id: 'landAreaKm2', label: 'Land area (km²)', icon: <SvgIcon d={getMetricIconPath('landAreaKm2')} /> },
      { id: 'totalAreaKm2', label: 'Total area (km²)', icon: <SvgIcon d={getMetricIconPath('totalAreaKm2')} /> },
      { id: 'eezKm2', label: 'EEZ (km²)', icon: <SvgIcon d={getMetricIconPath('eezKm2')} /> },
    ],
  },
  {
    id: 'government',
    label: 'Government',
    icon: <SvgIcon d={getMetricIconPath('governmentType')} />,
    metrics: [
      { id: 'headOfGovernmentType', label: 'Head of government', icon: <SvgIcon d={getMetricIconPath('headOfGovernmentType')} /> },
      { id: 'governmentType', label: 'Government type', icon: <SvgIcon d={getMetricIconPath('governmentType')} /> },
      { id: 'region', label: 'Region', icon: <SvgIcon d={getMetricIconPath('region')} /> },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    icon: <SvgIcon d={getMetricIconPath('primaryCompletionRate')} />,
    metrics: [
      { id: 'outOfSchoolPrimaryPct', label: 'Out-of-school (primary, %)', icon: <SvgIcon d={getMetricIconPath('outOfSchoolPrimaryPct')} /> },
      { id: 'outOfSchoolSecondaryPct', label: 'Out-of-school (secondary, %)', icon: <SvgIcon d={getMetricIconPath('outOfSchoolSecondaryPct')} /> },
      { id: 'outOfSchoolTertiaryPct', label: 'Out-of-school (tertiary, %)', icon: <SvgIcon d={getMetricIconPath('outOfSchoolTertiaryPct')} /> },
      { id: 'primaryCompletionRate', label: 'Primary completion (gross, %)', icon: <SvgIcon d={getMetricIconPath('primaryCompletionRate')} /> },
      { id: 'secondaryCompletionRate', label: 'Secondary completion (gross, %)', icon: <SvgIcon d={getMetricIconPath('secondaryCompletionRate')} /> },
      { id: 'tertiaryCompletionRate', label: 'Tertiary completion (gross, %)', icon: <SvgIcon d={getMetricIconPath('tertiaryCompletionRate')} /> },
      { id: 'minProficiencyReadingPct', label: 'Min. reading proficiency (%)', icon: <SvgIcon d={getMetricIconPath('minProficiencyReadingPct')} /> },
      { id: 'literacyRateAdultPct', label: 'Adult literacy (%)', icon: <SvgIcon d={getMetricIconPath('literacyRateAdultPct')} /> },
      { id: 'genderParityIndexPrimary', label: 'GPI (primary)', icon: <SvgIcon d={getMetricIconPath('genderParityIndexPrimary')} /> },
      { id: 'genderParityIndexSecondary', label: 'GPI (secondary)', icon: <SvgIcon d={getMetricIconPath('genderParityIndexSecondary')} /> },
      { id: 'genderParityIndexTertiary', label: 'GPI (tertiary)', icon: <SvgIcon d={getMetricIconPath('genderParityIndexTertiary')} /> },
      { id: 'trainedTeachersPrimaryPct', label: 'Trained teachers primary (%)', icon: <SvgIcon d={getMetricIconPath('trainedTeachersPrimaryPct')} /> },
      { id: 'trainedTeachersSecondaryPct', label: 'Trained teachers secondary (%)', icon: <SvgIcon d={getMetricIconPath('trainedTeachersSecondaryPct')} /> },
      { id: 'trainedTeachersTertiaryPct', label: 'Trained teachers tertiary (%)', icon: <SvgIcon d={getMetricIconPath('trainedTeachersTertiaryPct')} /> },
      { id: 'publicExpenditureEducationPctGDP', label: 'Education expenditure (% GDP)', icon: <SvgIcon d={getMetricIconPath('publicExpenditureEducationPctGDP')} /> },
      { id: 'primaryPupilsTotal', label: 'Primary enrollment (total)', icon: <SvgIcon d={getMetricIconPath('primaryPupilsTotal')} /> },
      { id: 'primaryEnrollmentPct', label: 'Primary enrollment (% gross)', icon: <SvgIcon d={getMetricIconPath('primaryEnrollmentPct')} /> },
      { id: 'secondaryPupilsTotal', label: 'Secondary enrollment (total)', icon: <SvgIcon d={getMetricIconPath('secondaryPupilsTotal')} /> },
      { id: 'secondaryEnrollmentPct', label: 'Secondary enrollment (% gross)', icon: <SvgIcon d={getMetricIconPath('secondaryEnrollmentPct')} /> },
      { id: 'tertiaryEnrollmentPct', label: 'Tertiary enrollment (% gross)', icon: <SvgIcon d={getMetricIconPath('tertiaryEnrollmentPct')} /> },
      { id: 'tertiaryEnrollmentTotal', label: 'Tertiary enrollment (total)', icon: <SvgIcon d={getMetricIconPath('tertiaryEnrollmentTotal')} /> },
      { id: 'primarySchoolsTotal', label: 'Primary education, teachers (total)', icon: <SvgIcon d={getMetricIconPath('primarySchoolsTotal')} /> },
      { id: 'secondarySchoolsTotal', label: 'Secondary education, teachers (total)', icon: <SvgIcon d={getMetricIconPath('secondarySchoolsTotal')} /> },
      { id: 'tertiaryInstitutionsTotal', label: 'Tertiary education, teachers (total)', icon: <SvgIcon d={getMetricIconPath('tertiaryInstitutionsTotal')} /> },
      { id: 'primarySchoolCount', label: 'Number of primary schools', icon: <SvgIcon d={getMetricIconPath('primarySchoolCount')} /> },
      { id: 'secondarySchoolCount', label: 'Number of secondary schools', icon: <SvgIcon d={getMetricIconPath('secondarySchoolCount')} /> },
      { id: 'tertiaryInstitutionCount', label: 'Number of universities and tertiary institutions', icon: <SvgIcon d={getMetricIconPath('tertiaryInstitutionCount')} /> },
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
