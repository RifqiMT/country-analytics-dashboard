/**
 * Shared subsection config for Country Dashboard "Graphs" and Global Analytics "Global Charts".
 * Keeps section and sub-section labels and order in sync.
 */

export type GraphsSubsectionId =
  | 'unified'
  | 'macroEconomic'
  | 'macroHealth'
  | 'educationOOS'
  | 'educationEnrollment'
  | 'educationInstitutions'
  | 'labour'
  | 'populationStructure';

export const GRAPHS_SUBSECTION_CONFIG: Array<{ id: GraphsSubsectionId; label: string }> = [
  { id: 'unified', label: 'GDP, government debt & population' },
  { id: 'macroEconomic', label: 'Inflation, interest rates, unemployment & poverty' },
  { id: 'macroHealth', label: 'Health: mortality, nutrition & life expectancy' },
  { id: 'educationOOS', label: 'Education access & completion' },
  { id: 'educationEnrollment', label: 'Education enrollment & teaching workforce' },
  { id: 'educationInstitutions', label: 'Schools & universities' },
  { id: 'labour', label: 'Labour force & unemployment levels' },
  { id: 'populationStructure', label: 'Population age structure' },
];
