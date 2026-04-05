/**
 * Body mass index using metric units (kg, m).
 * BMI = weightKg / heightM²
 */

/** WHO adult BMI category boundaries (kg/m²): underweight below 18.5, normal 18.5–24.9, overweight 25–29.9, obesity from 30. */
export const BMI_WHO_UNDERWEIGHT_VS_NORMAL = 18.5;
/** Upper end of WHO “normal” adult range (kg/m²); next category starts at {@link BMI_WHO_NORMAL_VS_OVERWEIGHT}. */
export const BMI_WHO_NORMAL_MAX = 24.9;
export const BMI_WHO_NORMAL_VS_OVERWEIGHT = 25;
export const BMI_WHO_OVERWEIGHT_VS_OBESITY = 30;

export function bmiFromMetricKg(weightKg: number, heightM: number): number {
  if (!(heightM > 0) || !(weightKg > 0)) {
    return Number.NaN;
  }
  return weightKg / (heightM * heightM);
}

/** Weight (kg) for a given BMI at height h (m): w = BMI × h² */
export function weightKgFromBmi(bmi: number, heightM: number): number {
  if (!(heightM > 0) || !(bmi > 0)) {
    return Number.NaN;
  }
  return bmi * heightM * heightM;
}

/** Stable display for weights and BMI (avoids float noise like 85.63000000001). */
export function formatMetric2(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
