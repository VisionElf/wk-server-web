import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BMI_WHO_NORMAL_VS_OVERWEIGHT,
  BMI_WHO_OVERWEIGHT_VS_OBESITY,
  BMI_WHO_UNDERWEIGHT_VS_NORMAL,
  formatMetric2,
} from "@/core/utils/bmi";
import type { WeightDisplayUnit } from "@/core/utils/weightUnits";

export type WeightBmiPoint = {
  x: number;
  /** Weight in the display unit (kg or lb). */
  weightValue: number;
  bmi?: number;
};

type WeightBmiChartProps = {
  data: WeightBmiPoint[];
  formatX: (x: number) => string;
  weightDomain?: [number, number];
  bmiDomain?: [number, number];
  showBmi: boolean;
  weightUnit: WeightDisplayUnit;
  height?: number;
};

const BMI_REFERENCE_LINES: {
  y: number;
  label: string;
  stroke: string;
}[] = [
  {
    y: BMI_WHO_UNDERWEIGHT_VS_NORMAL,
    label: "18.5 (underweight)",
    stroke: "#0284c7",
  },
  {
    y: BMI_WHO_NORMAL_VS_OVERWEIGHT,
    label: "25 (normal weight)",
    stroke: "#ca8a04",
  },
  {
    y: BMI_WHO_OVERWEIGHT_VS_OBESITY,
    label: "30 (obesity)",
    stroke: "#dc2626",
  },
];

const refLabelStyle = { fill: "var(--text)", fontSize: 10 };

/** WHO dashed lines at 18.5 / 25 / 30; axis domain must include them or lines clip. */
const WHO_BMI_REF_MIN = BMI_WHO_UNDERWEIGHT_VS_NORMAL;
const WHO_BMI_REF_MAX = BMI_WHO_OVERWEIGHT_VS_OBESITY;

function padBmiRange(lo: number, hi: number): [number, number] {
  if (lo === hi) {
    return [lo - 1, hi + 1];
  }
  const span = hi - lo;
  const pad = Math.max(span * 0.05, 0.25);
  return [lo - pad, hi + pad];
}

/** Merge data BMI range with WHO reference band so 18.5–30 lines stay on-scale. */
function mergedBmiAxisDomain(
  points: WeightBmiPoint[],
  explicit?: [number, number],
): [number, number] | undefined {
  if (explicit != null) {
    return explicit;
  }
  const vals = points
    .map((p) => p.bmi)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length === 0) {
    return padBmiRange(WHO_BMI_REF_MIN, WHO_BMI_REF_MAX);
  }
  const dLo = Math.min(...vals);
  const dHi = Math.max(...vals);
  const [pLo, pHi] = padBmiRange(dLo, dHi);
  const lo = Math.min(pLo, WHO_BMI_REF_MIN);
  const hi = Math.max(pHi, WHO_BMI_REF_MAX);
  return [lo, hi];
}

export function WeightBmiChart({
  data,
  formatX,
  weightDomain,
  bmiDomain,
  showBmi,
  weightUnit,
  height = 400,
}: WeightBmiChartProps) {
  const chartData = [...data].sort((a, b) => a.x - b.x);

  const bmiAxisDomain = useMemo(() => {
    if (!showBmi) {
      return undefined;
    }
    const sorted = [...data].sort((a, b) => a.x - b.x);
    return mergedBmiAxisDomain(sorted, bmiDomain);
  }, [showBmi, data, bmiDomain]);

  if (chartData.length === 0) {
    return <div style={{ height }} />;
  }

  const weightSeriesName = weightUnit === "lb" ? "Weight (lb)" : "Weight (kg)";

  return (
    <div style={{ paddingTop: 10, paddingBottom: 0 }}>
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{
          top: 16,
          right: showBmi ? 108 : 28,
          left: 12,
          bottom: showBmi ? 52 : 32,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatX}
          tickMargin={10}
        />
        {/* Numeric yAxisIds match Recharts defaults so ReferenceLine shares the BMI scale (not implicit axis 0). */}
        <YAxis
          yAxisId={0}
          width={56}
          tickMargin={8}
          domain={weightDomain != null ? weightDomain : (["auto", "auto"] as const)}
          tickFormatter={(v) => `${formatMetric2(Number(v))} ${weightUnit}`}
          label={{
            value: "Weight",
            angle: -90,
            position: "outside",
            fill: "var(--text-h)",
            style: { fontSize: 12 },
            dx: -10,
          }}
        />
        {showBmi ? (
          <YAxis
            yAxisId={1}
            orientation="right"
            width={56}
            tickMargin={8}
            domain={bmiAxisDomain != null ? bmiAxisDomain : (["auto", "auto"] as const)}
            tickFormatter={(v) => formatMetric2(Number(v))}
            label={{
              value: "BMI",
              angle: 90,
              position: "outside",
              fill: "var(--text-h)",
              style: { fontSize: 12 },
              dx: 10,
            }}
          />
        ) : null}
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || payload == null || payload.length === 0) {
              return null;
            }
            return (
              <div
                className="recharts-default-tooltip"
                style={{
                  background: "var(--bg, #fff)",
                  border: "1px solid var(--border, #e5e7eb)",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  fontSize: "0.85rem",
                }}
              >
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                  {formatX(Number(label))}
                </p>
                <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                  {payload.map((p) => {
                    const v = Number(p.value);
                    const isWeight = p.dataKey === "weightValue";
                    const text = isWeight
                      ? `${formatMetric2(v)} ${weightUnit}`
                      : formatMetric2(v);
                    return (
                      <li key={String(p.dataKey)} style={{ color: p.color ?? "inherit" }}>
                        {p.name}: {text}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }}
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ paddingTop: 4, paddingBottom: 0 }}
        />
        <Line
          yAxisId={0}
          name={weightSeriesName}
          type="monotone"
          dataKey="weightValue"
          stroke="var(--color-primary, #6366f1)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          isAnimationActive={chartData.length < 200}
        />
        {showBmi ? (
          <Line
            yAxisId={1}
            name="BMI"
            type="monotone"
            dataKey="bmi"
            stroke="var(--chart-bmi, #0d9488)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3 }}
            connectNulls
            isAnimationActive={chartData.length < 200}
          />
        ) : null}
        {showBmi
          ? BMI_REFERENCE_LINES.map((row) => (
              <ReferenceLine
                key={row.y}
                yAxisId={1}
                y={row.y}
                stroke={row.stroke}
                strokeDasharray="5 5"
                strokeOpacity={0.85}
                ifOverflow="visible"
                label={{
                  value: row.label,
                  position: "right",
                  ...refLabelStyle,
                }}
              />
            ))
          : null}
      </ComposedChart>
    </ResponsiveContainer>
    {showBmi ? (
      <p
        style={{
          marginTop: "0.35rem",
          fontSize: "0.75rem",
          color: "var(--text)",
          lineHeight: 1.35,
        }}
      >
        WHO adult BMI bands: underweight below {BMI_WHO_UNDERWEIGHT_VS_NORMAL}; normal{" "}
        {BMI_WHO_UNDERWEIGHT_VS_NORMAL}–24.9; overweight 25–29.9; obesity from{" "}
        {BMI_WHO_OVERWEIGHT_VS_OBESITY}. Lines mark 18.5, 25, and 30.
      </p>
    ) : null}
    </div>
  );
}
