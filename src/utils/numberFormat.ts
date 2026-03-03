const ABS_T = 1_000_000_000_000;
const ABS_B = 1_000_000_000;
const ABS_M = 1_000_000;
const ABS_K = 1_000;

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '–';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= ABS_T) {
    return `${sign}${(abs / ABS_T).toFixed(2).replace(/\.00$/, '')} Tn`;
  }
  if (abs >= ABS_B) {
    return `${sign}${(abs / ABS_B).toFixed(2).replace(/\.00$/, '')} Bn`;
  }
  if (abs >= ABS_M) {
    return `${sign}${(abs / ABS_M).toFixed(2).replace(/\.00$/, '')} Mn`;
  }
  if (abs >= ABS_K) {
    return `${sign}${(abs / ABS_K).toFixed(2).replace(/\.00$/, '')}k`;
  }

  return `${value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercentage(
  value: number | null | undefined,
  options?: { decimals?: number },
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '–';
  }
  const decimals = options?.decimals ?? 1;
  return `${value.toFixed(decimals)}%`;
}

export function formatYearRange(startYear: number, endYear: number): string {
  if (startYear === endYear) return `${startYear}`;
  return `${startYear}–${endYear}`;
}

