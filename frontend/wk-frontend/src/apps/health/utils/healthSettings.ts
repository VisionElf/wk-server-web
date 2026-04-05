const HEIGHT_CM_KEY = "wk.health.heightCm";
const WEIGHT_UNIT_KEY = "wk.health.weightUnit";

export type WeightUnitPreference = "kg" | "lb";

export function readWeightUnit(): WeightUnitPreference | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(WEIGHT_UNIT_KEY);
  if (raw === "kg" || raw === "lb") {
    return raw;
  }
  return null;
}

export function writeWeightUnit(unit: WeightUnitPreference): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(WEIGHT_UNIT_KEY, unit);
}

/** Height in centimetres (localStorage). Used for BMI. */
export function readHeightCm(): number | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(HEIGHT_CM_KEY);
  if (raw == null || raw === "") {
    return null;
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function writeHeightCm(cm: number | null): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (cm == null || !Number.isFinite(cm) || cm <= 0) {
    localStorage.removeItem(HEIGHT_CM_KEY);
  } else {
    localStorage.setItem(HEIGHT_CM_KEY, String(cm));
  }
}

export function heightMFromCm(cm: number): number {
  return cm / 100;
}
