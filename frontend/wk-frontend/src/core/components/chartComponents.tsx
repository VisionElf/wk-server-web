import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type Vector2 = {
  x: number;
  y: number;
};

type DisplayChartProps = {
  data: Vector2[];
  xLabel: string;
  yLabel: string;
  height?: number;
};

/**
 * Simple line chart: x on horizontal axis, y on vertical axis, points connected in order of increasing x.
 */
export function DisplayChart({
  data,
  xLabel,
  yLabel,
  height = 300,
}: DisplayChartProps) {
  const chartData = [...data]
    .map((d) => ({ x: d.x, y: d.y }))
    .sort((a, b) => a.x - b.x);

  if (chartData.length === 0) {
    return <div style={{ height }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 8, bottom: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["dataMin", "dataMax"]}
          label={{ value: xLabel, position: "insideBottom", offset: -12 }}
        />
        <YAxis
          domain={["auto", "auto"]}
          label={{ value: yLabel, angle: -90, position: "insideLeft" }}
        />
        <Tooltip labelFormatter={(x) => `${xLabel}: ${x}`} />
        <Line
          name={yLabel}
          type="monotone"
          dataKey="y"
          stroke="var(--color-primary, #6366f1)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          isAnimationActive={chartData.length < 200}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
