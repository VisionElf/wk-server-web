import { formatMetric2 } from "@/core/utils/bmi";

export type WeightDisplayUnit = "kg" | "lb";

/** Exact conversion factor (international avoirdupois pound). */
export const KG_TO_LB = 2.2046226218;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb / KG_TO_LB;
}

export function weightFromKg(kg: number, unit: WeightDisplayUnit): number {
  return unit === "lb" ? kgToLb(kg) : kg;
}

export function formatWeightWithUnit(valueKg: number, unit: WeightDisplayUnit): string {
  return `${formatMetric2(weightFromKg(valueKg, unit))} ${unit}`;
}
