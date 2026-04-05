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

export async function postWeight(info: CreateWeightInfo): Promise<WeightInfo> {
  const res = await fetch(base, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(info),
  });
  return res.json() as Promise<WeightInfo>;
}

export async function deleteWeight(id: string): Promise<void> {
  await fetch(`${base}/${id}`, { method: "DELETE", headers: apiHeaders() });
}