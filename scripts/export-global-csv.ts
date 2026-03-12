import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_MIN_YEAR, DATA_MAX_YEAR } from '../src/config.ts';
import type { GlobalCountryMetricsRow } from '../src/types.ts';
import { fetchGlobalCountryMetricsForYear } from '../src/api/worldBank.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportYear(year: number, outDir: string): Promise<void> {
  // Reuse the same helper the app uses so exports match dashboard/global data.
  const rows: GlobalCountryMetricsRow[] = await fetchGlobalCountryMetricsForYear(year);

  if (!rows.length) {
    // eslint-disable-next-line no-console
    console.warn(`[export-global-csv] No data for year ${year}, skipping.`);
    return;
  }

  // Build a stable column list from the first row.
  const baseColumns: (keyof GlobalCountryMetricsRow)[] = [
    'name',
    'iso2Code',
    'year',
  ];
  const metricColumns = Object.keys(rows[0] as Record<string, unknown>)
    .filter((key) => !baseColumns.includes(key as keyof GlobalCountryMetricsRow))
    .sort() as (keyof GlobalCountryMetricsRow)[];

  const columns: (keyof GlobalCountryMetricsRow)[] = [...baseColumns, ...metricColumns];

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escape((row as Record<string, unknown>)[col])).join(','),
  );

  const csv = [header, ...lines].join('\n');
  const filePath = path.join(outDir, `global-metrics-${year}.csv`);
  writeFileSync(filePath, csv, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[export-global-csv] Wrote ${rows.length} rows for ${year} to ${filePath}`);
}

async function main(): Promise<void> {
  const outDir = path.join(__dirname, '..', 'exports');
  mkdirSync(outDir, { recursive: true });

  // eslint-disable-next-line no-console
  console.log(
    `[export-global-csv] Exporting global metrics for all countries from ${DATA_MIN_YEAR} to ${DATA_MAX_YEAR} into per-year CSV files under ${outDir}`,
  );

  for (let year = DATA_MIN_YEAR; year <= DATA_MAX_YEAR; year += 1) {
    // eslint-disable-next-line no-await-in-loop
    await exportYear(year, outDir);
  }

  // eslint-disable-next-line no-console
  console.log('[export-global-csv] Done.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[export-global-csv] Failed:', err);
  process.exitCode = 1;
});

