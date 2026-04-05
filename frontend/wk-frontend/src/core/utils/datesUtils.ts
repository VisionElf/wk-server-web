/**
 * Shared date helpers (locale-aware formatting, calendar math, English month/day range strings).
 */

/** Local calendar day at 00:00:00.000. */
export function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Add n calendar days in local time. */
export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** Local calendar day at 23:59:59.999 (inclusive end for same-day ranges). */
export function endOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(23, 59, 59, 999);
  return x;
}

const ENGLISH_MONTH_BY_PREFIX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Maps "April" / "Apr" → 0–11, or `null` if unknown. */
export function parseEnglishMonthIndex(name: string): number | null {
  const key = name.toLowerCase().slice(0, 3);
  const m = ENGLISH_MONTH_BY_PREFIX[key];
  return m !== undefined ? m : null;
}

export type EnglishMonthDayParts = {
  /** 0–11 */
  month: number;
  day: number;
  year?: number;
};

/**
 * Parses tokens like "Apr 29", "April 29", "Apr 29, 2025".
 * Month names must be English (Liquipedia-style).
 */
export function parseEnglishMonthDayToken(token: string): EnglishMonthDayParts | null {
  const m = token.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) {
    return null;
  }
  const month = parseEnglishMonthIndex(m[1]);
  if (month === null) {
    return null;
  }
  const day = parseInt(m[2], 10);
  if (day < 1 || day > 31) {
    return null;
  }
  const year = m[3] != null ? parseInt(m[3], 10) : undefined;
  return { month, day, year };
}

/** Parses a standalone day "17" (e.g. second segment of "May 11–17"). */
export function parseDayOfMonthOnly(token: string): number | null {
  const m = /^(\d{1,2})$/.exec(token);
  if (!m) {
    return null;
  }
  const d = parseInt(m[1], 10);
  if (d < 1 || d > 31) {
    return null;
  }
  return d;
}

/** Replaces common dash Unicode characters with ASCII hyphen for splitting ranges. */
export function normalizeRangeDashSeparators(value: string): string {
  return value.replace(/\u2013|\u2014|\u2212/g, "-");
}

/**
 * If `d` has no explicit year in the source string, roll the year forward until
 * the calendar day is on or after `referenceNow`'s calendar day (typical "next upcoming" month/day).
 */
function rollYearUntilOnOrAfterCalendarDay(d: Date, referenceNow: Date): Date {
  let result = new Date(d.getTime());
  const today0 = startOfDay(referenceNow);
  while (startOfDay(result) < today0) {
    result = new Date(result.getFullYear() + 1, result.getMonth(), result.getDate());
  }
  return result;
}

/**
 * Parses human month/day ranges using English months, e.g.:
 * - `"Apr 29 – May 03"` (two full month-day segments)
 * - `"May 11–17"` (same month; second segment is day-only)
 *
 * Returns the **earliest** calendar day in the range (local). When the year is omitted, uses
 * `referenceNow`'s year, then rolls forward year-by-year until that day is not before `referenceNow`'s
 * calendar start (unless the first segment includes an explicit `year`).
 */
export function parseMonthDayRangeMinDate(rangeText: string, referenceNow: Date): Date | null {
  const normalized = normalizeRangeDashSeparators(rangeText).replace(/\s+/g, " ").trim();
  const parts = normalized.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const first = parseEnglishMonthDayToken(parts[0]);
  if (!first) {
    return null;
  }

  const refYear = first.year ?? referenceNow.getFullYear();
  const dates: Date[] = [];
  dates.push(new Date(refYear, first.month, first.day));

  if (parts.length >= 2) {
    const second = parts[1];
    const secondMd = parseEnglishMonthDayToken(second);
    if (secondMd) {
      let y2 = secondMd.year ?? refYear;
      if (secondMd.year == null) {
        if (
          secondMd.month < first.month ||
          (secondMd.month === first.month && secondMd.day < first.day)
        ) {
          y2 = refYear + 1;
        }
      }
      dates.push(new Date(y2, secondMd.month, secondMd.day));
    } else {
      const dayOnly = parseDayOfMonthOnly(second);
      if (dayOnly != null) {
        dates.push(new Date(refYear, first.month, dayOnly));
      }
    }
  }

  const minMs = Math.min(...dates.map((d) => d.getTime()));
  let result = new Date(minMs);

  if (first.year == null) {
    result = rollYearUntilOnOrAfterCalendarDay(result, referenceNow);
  }

  return result;
}

/** `dateStyle: "medium"` in the default or given locale. */
export function formatLocaleDateMedium(date: Date, locales?: Intl.LocalesArgument): string {
  return date.toLocaleDateString(locales, { dateStyle: "medium" });
}

/** `dateStyle: "medium"` + `timeStyle: "short"` (e.g. match rows with time). */
export function formatLocaleDateTimeMediumShort(date: Date, locales?: Intl.LocalesArgument): string {
  return date.toLocaleString(locales, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
