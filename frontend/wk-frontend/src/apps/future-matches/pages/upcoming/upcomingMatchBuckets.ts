import type { FutureMatchItem } from "../../api/client";

export type Bucket = "today" | "week" | "later";

export function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

export function itemKind(m: FutureMatchItem): "match" | "tournament" {
  return m.kind === "tournament" ? "tournament" : "match";
}

export function bucketForItem(
  m: FutureMatchItem,
  today0: Date,
  tomorrow0: Date,
  weekEndExclusive: Date,
): Bucket {
  const ts = m.dateUnix;
  if (ts != null && ts > 0) {
    const t = new Date(ts * 1000);
    if (t >= today0 && t < tomorrow0) {
      return "today";
    }
    if (t >= tomorrow0 && t < weekEndExclusive) {
      return "week";
    }
  }
  return "later";
}

export function splitMatchesByBucket(
  matches: FutureMatchItem[],
): Record<Bucket, FutureMatchItem[]> {
  const now = new Date();
  const today0 = startOfDay(now);
  const tomorrow0 = addDays(today0, 1);
  const weekEndExclusive = addDays(today0, 8);

  const out: Record<Bucket, FutureMatchItem[]> = { today: [], week: [], later: [] };
  for (const m of matches) {
    out[bucketForItem(m, today0, tomorrow0, weekEndExclusive)].push(m);
  }
  for (const k of Object.keys(out) as Bucket[]) {
    out[k].sort(compareRows);
  }
  return out;
}

function compareRows(a: FutureMatchItem, b: FutureMatchItem): number {
  const ua = a.dateUnix ?? Number.MAX_SAFE_INTEGER;
  const ub = b.dateUnix ?? Number.MAX_SAFE_INTEGER;
  if (ua !== ub) {
    return ua - ub;
  }
  const na = (a.tournament?.name ?? a.team1?.name ?? "").toLowerCase();
  const nb = (b.tournament?.name ?? b.team1?.name ?? "").toLowerCase();
  return na.localeCompare(nb);
}

export function formatWhen(m: FutureMatchItem): string {
  if (itemKind(m) === "tournament" && m.dateStr != null && m.dateStr !== "") {
    return m.dateStr;
  }
  if (m.dateUnix != null && m.dateUnix > 0) {
    return new Date(m.dateUnix * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return m.dateStr ?? "—";
}
