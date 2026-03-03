export const DATA_MIN_YEAR = 2000;

// World Bank / UN style macro data is typically fully available
// with a lag; we assume up to 2 years of lag from the current year.
const CURRENT_YEAR = new Date().getFullYear();
export const DATA_MAX_YEAR = CURRENT_YEAR - 2;

