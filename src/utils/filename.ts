export function sanitizeFilenameSegment(raw: string): string {
  if (!raw) return '';
  const replaced = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '-');
  return replaced.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

