/**
 * ILO / ISIC-aligned industry and sector categorization for Porter 5 Forces analysis.
 * Based on International Standard Industrial Classification of All Economic Activities (ISIC Rev. 4),
 * used by ILO (International Labour Organization) and national statistical offices.
 * Structure: Sections (A–U) contain Divisions (2-digit codes) for granular selection.
 * @see https://ilostat.ilo.org/methods/concepts-and-definitions/classification-economic-activities/
 * @see https://unstats.un.org/unsd/classifications/ISIC
 */

export interface IloIndustryDivision {
  /** ISIC Rev. 4 division code (2 digits, e.g. "01", "10", "35") */
  code: string;
  /** Full division label */
  label: string;
}

export interface IloIndustrySection {
  /** ISIC Rev. 4 section letter (A–U) */
  sectionLetter: string;
  /** Section title */
  sectionLabel: string;
  /** Divisions under this section (granular ILO/ISIC level) */
  divisions: IloIndustryDivision[];
}

/**
 * ILO/ISIC industry and sector list at **division** level (granular).
 * Grouped by section for optgroup display. Use division code as value (e.g. "10", "35").
 */
export const ILO_INDUSTRY_SECTORS_GRANULAR: IloIndustrySection[] = [
  {
    sectionLetter: 'A',
    sectionLabel: 'Agriculture, forestry and fishing',
    divisions: [
      { code: '01', label: 'Crop and animal production, hunting and related service activities' },
      { code: '02', label: 'Forestry and logging' },
      { code: '03', label: 'Fishing and aquaculture' },
    ],
  },
  {
    sectionLetter: 'B',
    sectionLabel: 'Mining and quarrying',
    divisions: [
      { code: '05', label: 'Mining of coal and lignite' },
      { code: '06', label: 'Extraction of crude petroleum and natural gas' },
      { code: '07', label: 'Mining of metal ores' },
      { code: '08', label: 'Other mining and quarrying' },
      { code: '09', label: 'Mining support service activities' },
    ],
  },
  {
    sectionLetter: 'C',
    sectionLabel: 'Manufacturing',
    divisions: [
      { code: '10', label: 'Manufacture of food products' },
      { code: '11', label: 'Manufacture of beverages' },
      { code: '12', label: 'Manufacture of tobacco products' },
      { code: '13', label: 'Manufacture of textiles' },
      { code: '14', label: 'Manufacture of wearing apparel' },
      { code: '15', label: 'Manufacture of leather and related products' },
      { code: '16', label: 'Manufacture of wood and of products of wood and cork' },
      { code: '17', label: 'Manufacture of paper and paper products' },
      { code: '18', label: 'Printing and reproduction of recorded media' },
      { code: '19', label: 'Manufacture of coke and refined petroleum products' },
      { code: '20', label: 'Manufacture of chemicals and chemical products' },
      { code: '21', label: 'Manufacture of pharmaceuticals, medicinal chemical and botanical products' },
      { code: '22', label: 'Manufacture of rubber and plastics products' },
      { code: '23', label: 'Manufacture of other non-metallic mineral products' },
      { code: '24', label: 'Manufacture of basic metals' },
      { code: '25', label: 'Manufacture of fabricated metal products, except machinery and equipment' },
      { code: '26', label: 'Manufacture of computer, electronic and optical products' },
      { code: '27', label: 'Manufacture of electrical equipment' },
      { code: '28', label: 'Manufacture of machinery and equipment n.e.c.' },
      { code: '29', label: 'Manufacture of motor vehicles, trailers and semi-trailers' },
      { code: '30', label: 'Manufacture of other transport equipment' },
      { code: '31', label: 'Manufacture of furniture' },
      { code: '32', label: 'Other manufacturing' },
      { code: '33', label: 'Repair and installation of machinery and equipment' },
    ],
  },
  {
    sectionLetter: 'D',
    sectionLabel: 'Electricity, gas, steam and air conditioning',
    divisions: [
      { code: '35', label: 'Electricity, gas, steam and air conditioning supply' },
    ],
  },
  {
    sectionLetter: 'E',
    sectionLabel: 'Water supply; sewerage, waste management',
    divisions: [
      { code: '36', label: 'Water collection, treatment and supply' },
      { code: '37', label: 'Sewerage' },
      { code: '38', label: 'Waste collection, treatment and disposal; materials recovery' },
      { code: '39', label: 'Remediation and other waste management services' },
    ],
  },
  {
    sectionLetter: 'F',
    sectionLabel: 'Construction',
    divisions: [
      { code: '41', label: 'Construction of buildings' },
      { code: '42', label: 'Civil engineering' },
      { code: '43', label: 'Specialised construction activities' },
    ],
  },
  {
    sectionLetter: 'G',
    sectionLabel: 'Wholesale and retail trade; repair of motor vehicles',
    divisions: [
      { code: '45', label: 'Wholesale and retail trade and repair of motor vehicles and motorcycles' },
      { code: '46', label: 'Wholesale trade, except of motor vehicles and motorcycles' },
      { code: '47', label: 'Retail trade, except of motor vehicles and motorcycles' },
    ],
  },
  {
    sectionLetter: 'H',
    sectionLabel: 'Transportation and storage',
    divisions: [
      { code: '49', label: 'Land transport and transport via pipelines' },
      { code: '50', label: 'Water transport' },
      { code: '51', label: 'Air transport' },
      { code: '52', label: 'Warehousing and support activities for transportation' },
      { code: '53', label: 'Postal and courier activities' },
    ],
  },
  {
    sectionLetter: 'I',
    sectionLabel: 'Accommodation and food service activities',
    divisions: [
      { code: '55', label: 'Accommodation' },
      { code: '56', label: 'Food and beverage service activities' },
    ],
  },
  {
    sectionLetter: 'J',
    sectionLabel: 'Information and communication',
    divisions: [
      { code: '58', label: 'Publishing activities' },
      { code: '59', label: 'Motion picture, video and television programme production; sound recording; music publishing' },
      { code: '60', label: 'Broadcasting and programming activities' },
      { code: '61', label: 'Telecommunications' },
      { code: '62', label: 'Computer programming, consultancy and related activities' },
      { code: '63', label: 'Information service activities' },
    ],
  },
  {
    sectionLetter: 'K',
    sectionLabel: 'Financial and insurance activities',
    divisions: [
      { code: '64', label: 'Financial service activities, except insurance and pension funding' },
      { code: '65', label: 'Insurance, reinsurance and pension funding, except compulsory social security' },
      { code: '66', label: 'Activities auxiliary to financial services and insurance' },
    ],
  },
  {
    sectionLetter: 'L',
    sectionLabel: 'Real estate activities',
    divisions: [
      { code: '68', label: 'Real estate activities' },
    ],
  },
  {
    sectionLetter: 'M',
    sectionLabel: 'Professional, scientific and technical activities',
    divisions: [
      { code: '69', label: 'Legal and accounting activities' },
      { code: '70', label: 'Activities of head offices; management consultancy' },
      { code: '71', label: 'Architectural and engineering activities; technical testing and analysis' },
      { code: '72', label: 'Scientific research and development' },
      { code: '73', label: 'Advertising and market research' },
      { code: '74', label: 'Other professional, scientific and technical activities' },
      { code: '75', label: 'Veterinary activities' },
    ],
  },
  {
    sectionLetter: 'N',
    sectionLabel: 'Administrative and support service activities',
    divisions: [
      { code: '77', label: 'Rental and leasing activities' },
      { code: '78', label: 'Employment activities' },
      { code: '79', label: 'Travel agency, tour operator and other reservation service activities' },
      { code: '80', label: 'Security and investigation activities' },
      { code: '81', label: 'Services to buildings and landscape activities' },
      { code: '82', label: 'Office administrative, office support and other business support activities' },
    ],
  },
  {
    sectionLetter: 'O',
    sectionLabel: 'Public administration and defence; compulsory social security',
    divisions: [
      { code: '84', label: 'Public administration and defence; compulsory social security' },
    ],
  },
  {
    sectionLetter: 'P',
    sectionLabel: 'Education',
    divisions: [
      { code: '85', label: 'Education' },
    ],
  },
  {
    sectionLetter: 'Q',
    sectionLabel: 'Human health and social work activities',
    divisions: [
      { code: '86', label: 'Human health activities' },
      { code: '87', label: 'Residential care activities' },
      { code: '88', label: 'Social work activities without accommodation' },
    ],
  },
  {
    sectionLetter: 'R',
    sectionLabel: 'Arts, entertainment and recreation',
    divisions: [
      { code: '90', label: 'Creative, arts and entertainment activities' },
      { code: '91', label: 'Libraries, archives, museums and other cultural activities' },
      { code: '92', label: 'Gambling and betting activities' },
      { code: '93', label: 'Sports activities and amusement and recreation activities' },
    ],
  },
  {
    sectionLetter: 'S',
    sectionLabel: 'Other service activities',
    divisions: [
      { code: '94', label: 'Activities of membership organisations' },
      { code: '95', label: 'Repair of computers, personal and household goods' },
      { code: '96', label: 'Other personal service activities' },
    ],
  },
  {
    sectionLetter: 'T',
    sectionLabel: 'Activities of households as employers',
    divisions: [
      { code: '97', label: 'Activities of households as employers of domestic personnel' },
      { code: '98', label: 'Undifferentiated goods- and services-producing activities of private households' },
    ],
  },
  {
    sectionLetter: 'U',
    sectionLabel: 'Activities of extraterritorial organisations',
    divisions: [
      { code: '99', label: 'Activities of extraterritorial organisations and bodies' },
    ],
  },
];

/** Default division code for initial selection (Manufacture of food products – widely used) */
export const DEFAULT_INDUSTRY_DIVISION_CODE = '10';

/**
 * Resolve division code to full label (section + division).
 * e.g. "10" -> "Manufacture of food products (Section C - Manufacturing)"
 */
export function getIndustryDivisionLabel(divisionCode: string): string {
  for (const section of ILO_INDUSTRY_SECTORS_GRANULAR) {
    const division = section.divisions.find((d) => d.code === divisionCode);
    if (division) {
      return `${division.label} (Section ${section.sectionLetter} – ${section.sectionLabel})`;
    }
  }
  return divisionCode;
}

/** Get division label only (no section), for short display or API. */
export function getIndustryDivisionLabelShort(divisionCode: string): string {
  for (const section of ILO_INDUSTRY_SECTORS_GRANULAR) {
    const division = section.divisions.find((d) => d.code === divisionCode);
    if (division) return division.label;
  }
  return divisionCode;
}

/** Get section for a division code (e.g. "10" -> "C"). */
export function getSectionLetterForDivision(divisionCode: string): string | undefined {
  for (const section of ILO_INDUSTRY_SECTORS_GRANULAR) {
    if (section.divisions.some((d) => d.code === divisionCode)) return section.sectionLetter;
  }
  return undefined;
}
