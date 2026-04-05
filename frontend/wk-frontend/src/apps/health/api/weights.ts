import { apiHeaders } from "@/core/apiHeaders";

const base = "/api/health/weights";

export type WeightInfo = {
  id: string;
  measuredAtUtc: Date;
  weightInKilograms: number;
};

export type CreateWeightInfo = {
  measuredAtUtc: Date;
  weightInKilograms: number;
}

export async function getWeights(startAtUtc: Date, endAtUtc: Date | null): Promise<WeightInfo[]> {
  const res = await fetch(`${base}?startAtUtc=${startAtUtc.toISOString()}&endAtUtc=${endAtUtc?.toISOString() ?? ""}`, { headers: apiHeaders() });
  return res.json() as Promise<WeightInfo[]>;
}

export type WeightStats = {
  minWeightKg: number;
  minMeasuredAtUtc: string;
  maxWeightKg: number;
  maxMeasuredAtUtc: string;
};

/** Min/max over all stored weights (for chart Y scale and summary). */
export async function getWeightStats(): Promise<WeightStats | null> {
  const res = await fetch(`${base}/stats`, { headers: apiHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<WeightStats | null>;
}

export async function postWeight(info: CreateWeightInfo): Promise<WeightInfo> {
  const res = await fetch(base, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      measuredAtUtc: info.measuredAtUtc.toISOString(),
      weightInKilograms: info.weightInKilograms,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<WeightInfo>;
}

export type ImportWeightsResult = {
  imported: number;
  skipped: number;
};

export async function importWeights(rows: CreateWeightInfo[]): Promise<ImportWeightsResult> {
  const res = await fetch(`${base}/import`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(
      rows.map((r) => ({
        measuredAtUtc: r.measuredAtUtc.toISOString(),
        weightInKilograms: r.weightInKilograms,
      })),
    ),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<ImportWeightsResult>;
}

export async function deleteWeight(id: string): Promise<void> {
  await fetch(`${base}/${id}`, { method: "DELETE", headers: apiHeaders() });
}