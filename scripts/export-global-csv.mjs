import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Align with app config: 2000 to currentYear - 2
const DATA_MIN_YEAR = 2000;
const CURRENT_YEAR = new Date().getFullYear();
const DATA_MAX_YEAR = CURRENT_YEAR - 2;

// World Bank indicator codes (subset matching the app's core metrics)
const INDICATORS = {
  gdpNominal: 'NY.GDP.MKTP.CD',
  gdpPPP: 'NY.GDP.MKTP.PP.CD',
  gdpNominalPerCapita: 'NY.GDP.PCAP.CD',
  gdpPPPPerCapita: 'NY.GDP.PCAP.PP.CD',
  inflationCPI: 'FP.CPI.TOTL.ZG',
  govDebtPercentGDP: 'GC.DOD.TOTL.GD.ZS',
  interestRate: 'FR.INR.LEND',
  unemploymentRate: 'SL.UEM.TOTL.ZS',
  unemployedTotal: 'SL.UEM.TOTL',
  labourForceTotal: 'SL.TLF.TOTL.IN',
  povertyHeadcount215: 'SI.POV.DDAY',
  povertyHeadcountNational: 'SI.POV.NAHC',
  populationTotal: 'SP.POP.TOTL',
  pop0_14Pct: 'SP.POP.0014.TO.ZS',
  pop15_64Pct: 'SP.POP.1564.TO.ZS',
  pop65PlusPct: 'SP.POP.65UP.TO.ZS',
  lifeExpectancy: 'SP.DYN.LE00.IN',
  maternalMortalityRatio: 'SH.STA.MMRT',
  under5MortalityRate: 'SH.DYN.MORT',
  undernourishmentPrevalence: 'SN.ITK.DEFC.ZS',
};

const WORLD_BANK_BASE = 'https://api.worldbank.org/v2';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function fetchIndicatorAllCountries(indicatorId) {
  const url = `${WORLD_BANK_BASE}/country/all/indicator/${indicatorId}?format=json&per_page=20000&date=${DATA_MIN_YEAR}:${DATA_MAX_YEAR}`;
  const res = await axios.get(url);
  const data = res.data?.[1] ?? [];
  return data;
}

async function exportIndicator(key, code, outDir) {
  // eslint-disable-next-line no-console
  console.log(`[export-global-csv] Fetching ${key} (${code})…`);
  const data = await fetchIndicatorAllCountries(code);

  const header = ['countryName', 'countryCode', 'iso3Code', 'year', key].join(',');
  const lines = data
    .map((entry) => {
      const year = Number.parseInt(entry.date, 10);
      if (Number.isNaN(year)) return null;
      const countryName = entry.country?.value ?? '';
      const countryCode = entry.country?.id ?? '';
      const iso3Code = entry.countryiso3code ?? '';
      return [
        escapeCsv(countryName),
        escapeCsv(countryCode),
        escapeCsv(iso3Code),
        escapeCsv(year),
        escapeCsv(entry.value),
      ].join(',');
    })
    .filter(Boolean);

  const csv = [header, ...lines].join('\n');
  const filePath = path.join(outDir, `worldbank-${key}.csv`);
  fs.writeFileSync(filePath, csv, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[export-global-csv] Wrote ${lines.length} rows to ${filePath}`);
}

async function main() {
  const outDir = path.join(__dirname, '..', 'exports', 'worldbank');
  ensureDir(outDir);

  // eslint-disable-next-line no-console
  console.log(
    `[export-global-csv] Exporting World Bank metrics for all countries and all years ${DATA_MIN_YEAR}-${DATA_MAX_YEAR} into separate CSV files under ${outDir}`,
  );

  const entries = Object.entries(INDICATORS);
  for (let i = 0; i < entries.length; i += 1) {
    const [key, code] = entries[i];
    try {
      // eslint-disable-next-line no-await-in-loop
      await exportIndicator(key, code, outDir);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[export-global-csv] Failed for ${key} (${code}):`, err?.message ?? err);
      // Be gentle with public API.
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
    }
  }

  // eslint-disable-next-line no-console
  console.log('[export-global-csv] Done.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[export-global-csv] Fatal error:', err);
  process.exitCode = 1;
});

