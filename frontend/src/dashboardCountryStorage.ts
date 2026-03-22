const KEY = "cap-selected-country-cca3";

export function readStoredDashboardCountry(): string | null {
  try {
    const s = sessionStorage.getItem(KEY);
    if (s && /^[A-Za-z]{3}$/.test(s)) return s.toUpperCase();
  } catch {
    /* private mode */
  }
  return null;
}

export function writeStoredDashboardCountry(cca3: string): void {
  try {
    if (/^[A-Za-z]{3}$/.test(cca3)) sessionStorage.setItem(KEY, cca3.toUpperCase());
  } catch {
    /* ignore */
  }
}
