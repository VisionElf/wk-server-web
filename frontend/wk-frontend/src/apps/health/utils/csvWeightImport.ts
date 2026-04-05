/**
 * Parses simple CSV: column 1 = date, column 2 = weight (kg).
 * Supports optional header row (e.g. "date,weight").
 */

function splitCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  parts.push(cur.trim());
  return parts;
}

function looksLikeHeader(firstCell: string, secondCell: string): boolean {
  const a = firstCell.toLowerCase();
  const b = secondCell.toLowerCase();
  return (
    (a.includes("date") || a.includes("time")) &&
    (b.includes("weight") || b.includes("kg") || b.includes("mass"))
  );
}

/** Try ISO, then Date.parse, then dd/mm/yyyy and mm/dd/yyyy heuristics. */
export function parseFlexibleDate(s: string): Date | null {
  const t = s.trim();
  if (t === "") {
    return null;
  }
  const iso = /^\d{4}-\d{2}-\d{2}/.test(t);
  if (iso) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d0 = new Date(t);
  if (!Number.isNaN(d0.getTime())) {
    return d0;
  }
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(t);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) {
      y += 2000;
    }
    let day: number;
    let month: number;
    if (a > 12) {
      day = a;
      month = b - 1;
    } else if (b > 12) {
      month = a - 1;
      day = b;
    } else {
      day = a;
      month = b - 1;
    }
    const d = new Date(y, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function parseWeightKg(s: string): number | null {
  const n = parseFloat(s.trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

export type ParsedWeightRow = {
  measuredAtUtc: Date;
  weightInKilograms: number;
};

/**
 * Returns parsed rows and number of skipped lines (empty / invalid).
 */
export function parseWeightCsv(text: string): { rows: ParsedWeightRow[]; skipped: number } {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], skipped: 0 };
  }

  let start = 0;
  const first = splitCsvLine(lines[0]);
  if (first.length >= 2 && looksLikeHeader(first[0], first[1])) {
    start = 1;
  }

  const rows: ParsedWeightRow[] = [];
  let skipped = 0;

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < 2) {
      skipped++;
      continue;
    }
    const d = parseFlexibleDate(cells[0]);
    const w = parseWeightKg(cells[1]);
    if (d == null || w == null) {
      skipped++;
      continue;
    }
    rows.push({ measuredAtUtc: d, weightInKilograms: w });
  }

  return { rows, skipped };
}
