import type { FutureMatchItem } from "@/apps/future-matches/api/client";
import {
  addDays,
  formatLocaleDateMedium,
  formatLocaleDateTimeMediumShort,
  parseMonthDayRangeMinDate,
  startOfDay,
} from "@/core/utils/datesUtils";

export type Bucket = "finished" | "today" | "week" | "later" | "too_old";

/** Sentinel when no sortable instant is available (sort last). */
const SORT_UNIX_MISSING = Number.MAX_SAFE_INTEGER;

export function itemKind(m: FutureMatchItem): "match" | "tournament" {
  return m.kind === "tournament" ? "tournament" : "match";
}

/** Unix seconds for sorting/bucketing: match timestamp, or min day parsed from tournament range text. */
export function effectiveSortUnix(m: FutureMatchItem, now: Date): number {
  if (m.dateUnix != null && m.dateUnix > 0) {
    return m.dateUnix;
  }
  if (itemKind(m) === "tournament" && m.dateStr != null && m.dateStr !== "") {
    const d = parseMonthDayRangeMinDate(m.dateStr, now);
    if (d != null) {
      return Math.floor(d.getTime() / 1000);
    }
  }
  return SORT_UNIX_MISSING;
}

export function bucketForItem(
  m: FutureMatchItem,
  today0: Date,
  tomorrow0: Date,
  week8: Date,
  now: Date,
): Bucket {
  const ts = effectiveSortUnix(m, now);
  if (ts === SORT_UNIX_MISSING) {
    return "later";
  }
  const t = new Date(ts * 1000);
  const now5m = new Date(Date.now() - 5 * 60_000);
  if (t <= now5m) {
    return "too_old";
  }
  if (t >= now5m && t < today0) {
    return "finished";
  }
  if (t >= today0 && t < tomorrow0) {
    return "today";
  }
  if (t >= tomorrow0 && t < week8) {
    return "week";
  }
  return "later";
}

export function splitMatchesByBucket(
  matches: FutureMatchItem[],
): Record<Bucket, FutureMatchItem[]> {
  const now = new Date();
  const today0 = startOfDay(now);
  const tomorrow0 = addDays(today0, 1);
  const week8 = addDays(today0, 8);

  const out: Record<Bucket, FutureMatchItem[]> = { finished: [], today: [], week: [], later: [], too_old: [] };
  for (const m of matches) {
    out[bucketForItem(m, today0, tomorrow0, week8, now)].push(m);
  }
  for (const k of Object.keys(out) as Bucket[]) {
    out[k].sort((a, b) => compareRows(a, b, now));
  }
  return out;
}

function compareRows(a: FutureMatchItem, b: FutureMatchItem, now: Date): number {
  const ua = effectiveSortUnix(a, now);
  const ub = effectiveSortUnix(b, now);
  if (ua !== ub) {
    return ua - ub;
  }
  const na = (a.tournament?.name ?? a.team1?.name ?? "").toLowerCase();
  const nb = (b.tournament?.name ?? b.team1?.name ?? "").toLowerCase();
  return na.localeCompare(nb);
}

export function formatWhen(m: FutureMatchItem): string {
  const now = new Date();
  if (itemKind(m) === "tournament") {
    const u = effectiveSortUnix(m, now);
    if (u !== SORT_UNIX_MISSING) {
      return formatLocaleDateMedium(new Date(u * 1000));
    }
    return m.dateStr ?? "—";
  }
  if (m.dateUnix != null && m.dateUnix > 0) {
    return formatLocaleDateTimeMediumShort(new Date(m.dateUnix * 1000));
  }
  return m.dateStr ?? "—";
}
