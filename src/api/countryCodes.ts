import axios from 'axios';

export interface CountryCodeInfo {
  iso2: string;
  iso3: string;
  numeric: string;
  name: string;
}

let numericCodeMapPromise:
  | Promise<Map<string, CountryCodeInfo>>
  | null = null;

async function loadCountryCodes(): Promise<Map<string, CountryCodeInfo>> {
  const url =
    'https://restcountries.com/v3.1/all?fields=cca2,cca3,ccn3,name';
  const res = await axios.get<
    Array<{
      cca2?: string;
      cca3?: string;
      ccn3?: string;
      name?: { common?: string };
    }>
  >(url);

  const map = new Map<string, CountryCodeInfo>();
  for (const entry of res.data) {
    if (!entry.ccn3 || !entry.cca3) continue;
    map.set(entry.ccn3, {
      iso2: entry.cca2 ?? '',
      iso3: entry.cca3,
      numeric: entry.ccn3,
      name: entry.name?.common ?? entry.cca3,
    });
  }
  return map;
}

export function getNumericCountryCodeMap(): Promise<
  Map<string, CountryCodeInfo>
> {
  if (!numericCodeMapPromise) {
    numericCodeMapPromise = loadCountryCodes().catch(() => new Map());
  }
  return numericCodeMapPromise;
}

