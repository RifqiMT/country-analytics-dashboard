/* ETL pipeline to materialise canonical country-year snapshots used by
 * Global Analytics (and optionally other backends).
 *
 * This script:
 * - Iterates years from DATA_MIN_YEAR to DATA_MAX_YEAR
 * - Uses the existing fetchGlobalCountryMetricsForYear(year) pipeline
 *   (World Bank + IMF fallbacks, population breakdown, education, area)
 * - Writes one JSON file per year under etl-cache/:
 *     etl-cache/country_metrics_{year}.json
 *
 * Each file contains an array<GlobalCountryMetricsRow> as defined in src/types.ts.
 *
 * Run manually:
 *   npm run etl:country-metrics
 */

/* eslint-disable no-console */

import path from 'path';
import fs from 'fs';
import { fetchGlobalCountryMetricsForYear } from '../src/api/worldBank';

// Keep in sync with src/config.ts (DATA_MIN_YEAR / DATA_MAX_YEAR).
const DATA_MIN_YEAR = 2000;
const DATA_MAX_YEAR = 2024;

async function main() {
  const cwd = process.cwd();
  const outDir = path.resolve(cwd, 'etl-cache');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(
    `Building ETL country metrics snapshots into ${outDir} for years ${DATA_MIN_YEAR}–${DATA_MAX_YEAR}…`,
  );

  for (let year = DATA_MIN_YEAR; year <= DATA_MAX_YEAR; year += 1) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await fetchGlobalCountryMetricsForYear(year);
    const filePath = path.join(outDir, `country_metrics_${year}.json`);
    fs.writeFileSync(filePath, JSON.stringify(rows), 'utf8');
    console.log(`Wrote ${rows.length} rows for year ${year} → ${filePath}`);
  }

  console.log('ETL country metrics snapshots completed.');
}

main().catch((err) => {
  console.error('ETL failed:', err);
  process.exitCode = 1;
});

