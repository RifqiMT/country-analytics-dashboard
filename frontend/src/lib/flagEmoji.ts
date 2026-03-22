/** Regional-indicator pair from ISO 3166-1 alpha-2 (e.g. `"US"` → 🇺🇸). */
export function flagEmojiFromAlpha2(cc: string): string {
  const u = cc.trim().toUpperCase();
  if (u.length !== 2 || !/^[A-Z]{2}$/.test(u)) return "";
  const base = 0x1f1e6;
  const cp = (ch: string) => base + (ch.charCodeAt(0) - 65);
  return String.fromCodePoint(cp(u[0]), cp(u[1]));
}
