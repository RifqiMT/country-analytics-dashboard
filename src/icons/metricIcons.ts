/**
 * Professional, elegant, and relevant SVG path icons for each metric.
 * All paths use viewBox "0 0 16 16". Single source of truth for map toolbar and summary sections.
 */

export type MapMetricId = string;

/** SVG path `d` attribute for viewBox="0 0 16 16" */
const ICONS: Record<string, string> = {
  // —— Financial ——
  gdpNominal: 'M2 3.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9zm2 1v7h8v-7H4z', // banknote
  gdpPPP: 'M2 2h12v12H2V2zm2 2v8h8V4H4zm1 1h6v1H5V5zm0 3h6v1H5V8z', // document/currency
  gdpNominalPerCapita: 'M8 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 6.5c-2 0-4 1.5-4 3.5v1h8v-1c0-2-2-3.5-4-3.5z', // person (per capita)
  gdpPPPPerCapita: 'M8 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 6.5a4.5 4.5 0 0 0-4.5 4.5v1h9v-1c0-2.5-2-4.5-4.5-4.5z', // person with ring
  govDebtUSD: 'M3 2.5h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm1 1v7h8v-7H4zm1 1h6v1H5V4.5z', // document (debt)
  govDebtPercentGDP: 'M2 2h12v12H2V2zm2 2v8h8V4H4zm1 2l4 4m0-4l-4 4', // document + ratio
  inflationCPI: 'M8 2l1 4h4l-3 2.5 1 4L8 10l-3 2.5 1-4-3-2.5h4L8 2z', // star (price level)
  interestRate: 'M5.5 4L8 6.5 10.5 4 11 4.5 8.5 7v4h-1V7L5 4.5 5.5 4zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', // percent
  unemploymentRate: 'M4 3.5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2.5h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h1V3.5zm2 1v1.5h4V4.5H6z', // briefcase
  unemployedTotal: 'M8 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 7c-2.5 0-4.5 1.5-4.5 3.5v1h9v-1c0-2-2-3.5-4.5-3.5z', // person (single)
  labourForceTotal: 'M6 3.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm-2 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm8 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm-4 3c-1.5 0-2.5.8-2.5 2v1h5v-1c0-1.2-1-2-2.5-2z', // user group
  povertyHeadcount215: 'M8 2C5.5 2 3.5 4 3.5 6.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5C12.5 4 10.5 2 8 2zm0 7c-2 0-3.5 1.2-3.5 3v1h7v-1c0-1.8-1.5-3-3.5-3z', // person in need
  povertyHeadcountNational: 'M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-2.5-2-4.5-4.5-4.5z', // circle (threshold)

  // —— Demographics & Health ——
  populationTotal: 'M6 3a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm-2 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm8 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm-6 3.5c0 1.2 1.5 2 3 2s3-.8 3-2v1H6v-1zm6 0c0 1.2 1 2 2 2v1h-2v-3z', // people group
  pop0_14Share: 'M8 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 5.5c-1.5 0-2.5 1-2.5 2.5v1h5v-1c0-1.5-1-2.5-2.5-2.5z', // child
  pop15_64Share: 'M8 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 6.5c-2 0-3.5 1.2-3.5 3v1h7v-1c0-1.8-1.5-3-3.5-3z', // adult
  pop65PlusShare: 'M8 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 6.5c-2 0-3.5 1.5-3.5 3.5v1h7v-1c0-2-1.5-3.5-3.5-3.5z', // elder
  lifeExpectancy: 'M8 2.5c-2 0-3.5 1.5-3.5 3.5 0 2 2 4 3.5 5.5 1.5-1.5 3.5-3.5 3.5-5.5 0-2-1.5-3.5-3.5-3.5z', // heart
  maternalMortalityRatio: 'M8 2.5c-2 0-3.5 1.5-3.5 3.5 0 2 2 4 3.5 5.5 1.5-1.5 3.5-3.5 3.5-5.5 0-2-1.5-3.5-3.5-3.5zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z', // heart (maternal)
  under5MortalityRate: 'M8 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 5c-1.5 0-2.5 1-2.5 2.5v1h5v-1C10.5 9 9.5 8 8 8z', // child
  undernourishmentPrevalence: 'M8 2c-2 0-3.5 1.5-3.5 3.5 0 1.5.8 2.8 2 3.5V10h3V9c1.2-.7 2-2 2-3.5C11.5 3.5 10 2 8 2z', // apple/food

  // —— Geography ——
  landAreaKm2: 'M2 2h12v12H2V2zm2 2v8h8V4H4z', // square (land)
  totalAreaKm2: 'M2 2.5h12v11H2v-11zm2 2v7h8v-7H4z', // rounded square
  eezKm2: 'M2 4.5h12v1H2v-1zm0 3h12v1H2v-1zm0 3h12v1H2v-1z', // waves (EEZ)

  // —— Government ——
  headOfGovernmentType: 'M8 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 6.5c-2 0-3.5 1.5-3.5 3.5v1h7v-1c0-2-1.5-3.5-3.5-3.5z', // person
  governmentType: 'M3 2h10v4H3V2zm0 5h4v7H3V7zm6 0h4v7H9V7z', // building
  region: 'M8 1.5a5 5 0 0 0-5 5c0 3 3.5 6 4.4 6.7.4.3.9.3 1.2 0C9.5 12.5 13 9.75 13 6.5a5 5 0 0 0-5-5zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', // globe

  // —— Education ——
  outOfSchoolPrimaryPct: 'M3 4h10v1.5H3V4zm0 3h10v1.5H3V7zm0 3h6v1.5H3V10z', // list (out of school)
  outOfSchoolSecondaryPct: 'M3 4h10v1H3V4zm0 2.5h10v1H3v-1zm0 2.5h8v1H3v-1z', // tiers
  outOfSchoolTertiaryPct: 'M3 4h10v1H3V4zm0 2.5h10v1H3v-1zm0 2.5h10v1H3v-1z', // three lines
  primaryCompletionRate: 'M2 3.5h12v9H2v-9zm2 2v5h8v-5H4zm2 1h4v1H6v-1zm0 2h3v1H6v-1z', // certificate
  secondaryCompletionRate: 'M2 3.5h12v9H2v-9zm2 2v5h8v-5H4zm1 1h6v1H5v-1zm0 2h6v1H5v-1z', // certificate
  tertiaryCompletionRate: 'M2 3h12v10H2V3zm2 2v6h8V5H4zm2 1h4v1H6V6zm0 2h4v1H6V8z', // diploma
  minProficiencyReadingPct: 'M4 3v10l4-2 4 2V3H4zm2 2h4v5l-2-1-2 1V5z', // book open (reading)
  literacyRateAdultPct: 'M4 2.5h8v11H4v-11zm2 2v7h4v-7H6zm2 1h2v1H8v-1zm0 2h2v1H8v-1z', // book
  genderParityIndexPrimary: 'M5 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm1.5 5h1v2h-1v-2z', // balance (two pans + bar)
  genderParityIndexSecondary: 'M5 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm1.5 5h1v2h-1v-2z',
  genderParityIndexTertiary: 'M5 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm1.5 5h1v2h-1v-2z',
  trainedTeachersPrimaryPct: 'M2 4h5v2l-2.5 2 2.5 2v2H2V4zm7 0h5v8H9V4zm2 2v4h1V6h-1zm0-1v1h1V5h-1z', // chalkboard/teacher
  trainedTeachersSecondaryPct: 'M2 4h5v1.5H2V4zm0 2.5h5v1.5H2V6.5zm0 2.5h5v1.5H2V9zm7-5h5v8H9V4zm2 2v1.5h1V6H11zm0 2.5v1.5h1V8.5H11z', // chalkboard
  trainedTeachersTertiaryPct: 'M2 4h5v1H2V4zm0 2h5v1H2V6zm0 2h5v1H2V8zm0 2h5v1H2v-1zm7-6h5v8H9V4zm2 2v4h1V6h-1zm0-1v1h1V5h-1z', // chalkboard
  publicExpenditureEducationPctGDP: 'M3 2.5h10v2H3v-2zm0 4h10v1.5H3V6.5zm0 3h10v1.5H3V9.5zm0 3h6v1.5H3v-1.5z', // budget
  primaryPupilsTotal: 'M6 3a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm-2 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm6-1v2h2V6h-2zm-6 4v1h8v-1H4z', // pupils
  primaryEnrollmentPct: 'M4 3h8v2H4V3zm0 3h8v1.5H4V6zm0 2.5h6v1.5H4V8.5z', // enrollment bar
  secondaryPupilsTotal: 'M6 2.5a2.5 2.5 0 1 1 4 0 2.5 2.5 0 0 1-4 0zm-2 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm8 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm-6 3.5v1h8v-1H6z', // students
  secondaryEnrollmentPct: 'M3 4h10v1H3V4zm0 2.5h10v1H3v-1zm0 2.5h8v1H3v-1z', // enrollment
  tertiaryEnrollmentPct: 'M3 4h10v1H3V4zm0 2.5h10v1H3v-1zm0 2.5h10v1H3v-1z', // enrollment
  tertiaryEnrollmentTotal: 'M4 3h8v1.5H4V3zm0 2.5h8v1H4v-1zm0 2.5h8v1H4v-1zm0 2.5h6v1.5H4V9.5z', // graduation
  primarySchoolsTotal: 'M2 4h5v2l-2.5 2 2.5 2v2H2V4zm9 0h3v2h-2v1h2v2h-3v-2h2V6h-2V4z', // school/teacher
  secondarySchoolsTotal: 'M2 4h5v1.5H2V4zm0 2.5h5v1.5H2V6.5zm0 2.5h5v1.5H2V9zm8-5v8h3v-8h-3zm2 2v4h-1V6h1z', // school building
  tertiaryInstitutionsTotal: 'M2 3h12v2H2V3zm0 4h12v1.5H2V7zm0 2.5h12v1.5H2V9.5zm0 2.5h8v1.5H2V12z', // institution
  primarySchoolCount: 'M2 4h4v4H2V4zm8 0h4v4h-4V4zM2 10h4v2H2v-2zm8 0h4v2h-4v-2z', // schools
  secondarySchoolCount: 'M2 3h5v2H2V3zm0 3h5v2H2V6zm8-3h4v2h-4V3zm0 3h4v2h-4V6z', // buildings
  tertiaryInstitutionCount: 'M2 2h12v3H2V2zm0 4h12v2H2V6zm0 3h12v2H2V9zm0 3h8v2H2v-2z', // university
};

/** Default icon when metric is unknown */
const DEFAULT_ICON = 'M2 2h12v12H2V2zm2 2v8h8V4H4z';

/**
 * Returns the SVG path `d` for a metric. Use with viewBox="0 0 16 16".
 */
export function getMetricIconPath(metricId: MapMetricId): string {
  return ICONS[metricId] ?? DEFAULT_ICON;
}

export { ICONS };
