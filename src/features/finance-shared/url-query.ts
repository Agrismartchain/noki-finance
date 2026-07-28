/** Bounded pagination parsing shared by every Finance list page (COD, cash handovers, cash sessions, cash variances, reconciliations). */

const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Page numbers are not money -- parseInt is the correct, sanctioned tool here, unlike a decimal amount string. */
export function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parsePage(value: string | null | undefined): number {
  return parsePositiveInt(value, DEFAULT_PAGE);
}

export function parsePageSize(value: string | null | undefined): number {
  return clamp(parsePositiveInt(value, DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);
}

/** Restricts a raw URL value to one of a known set of valid values, normalizing anything else to "" (meaning "no filter"). */
export function parseEnumFilter<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

const MAX_SEARCH_LENGTH = 160;

export function parseSearch(value: string | null | undefined): string {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
}
