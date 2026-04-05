import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getWeights,
  getWeightStats,
  importWeights,
  postWeight,
  type WeightInfo,
  type WeightStats,
} from "../api/weights";
import { parseWeightCsv } from "../utils/csvWeightImport";
import {
  heightMFromCm,
  readHeightCm,
  readWeightUnit,
  writeHeightCm,
  writeWeightUnit,
} from "../utils/healthSettings";
import { WeightBmiChart } from "./WeightBmiChart";
import { addDays, endOfDay, startOfDay } from "@/core/utils/datesUtils";
import {
  BMI_WHO_NORMAL_MAX,
  bmiFromMetricKg,
  formatMetric2,
  weightKgFromBmi,
} from "@/core/utils/bmi";
import {
  formatWeightWithUnit,
  type WeightDisplayUnit,
  weightFromKg,
} from "@/core/utils/weightUnits";

export type WeightRangePreset = "7d" | "2w" | "1m" | "3m" | "6m" | "all" | "custom";

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatXDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "short" });
}

function yDomainFromMinMax(min: number, max: number): [number, number] {
  if (min === max) {
    return [min - 1, max + 1];
  }
  const span = max - min;
  const pad = Math.max(span * 0.05, 0.25);
  return [min - pad, max + pad];
}

function computeRange(
  preset: WeightRangePreset,
  customStart: string,
  customEnd: string,
): { start: Date; end: Date | null } {
  const now = new Date();
  switch (preset) {
    case "7d":
      return { start: startOfDay(addDays(now, -7)), end: null };
    case "2w":
      return { start: startOfDay(addDays(now, -14)), end: null };
    case "1m":
      return { start: startOfDay(addDays(now, -30)), end: null };
    case "3m":
      return { start: startOfDay(addDays(now, -90)), end: null };
    case "6m":
      return { start: startOfDay(addDays(now, -180)), end: null };
    case "all":
      return { start: new Date(2000, 0, 1), end: null };
    case "custom": {
      let s = new Date(`${customStart}T00:00:00`);
      let e = customEnd ? endOfDay(new Date(`${customEnd}T12:00:00`)) : null;
      if (e != null && s.getTime() > e.getTime()) {
        const t = s;
        s = startOfDay(e);
        e = endOfDay(t);
      }
      return { start: s, end: e };
    }
    default:
      return { start: startOfDay(addDays(now, -30)), end: null };
  }
}

export function DisplayWeightsChart() {
  const [preset, setPreset] = useState<WeightRangePreset>("1m");
  const [customStart, setCustomStart] = useState(() =>
    toDateInputValue(startOfDay(addDays(new Date(), -30))),
  );
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(new Date()));

  const [graphRows, setGraphRows] = useState<WeightInfo[]>([]);
  const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(() => readHeightCm());
  const [weightUnit, setWeightUnit] = useState<WeightDisplayUnit>(
    () => readWeightUnit() ?? "kg",
  );

  const [createWeightModalOpen, setCreateWeightModalOpen] = useState(false);
  const [weightDate, setWeightDate] = useState("");
  const [weightInKg, setWeightInKg] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadWeights = useCallback(async () => {
    const { start, end } = computeRange(preset, customStart, customEnd);
    const [weights, stats] = await Promise.all([getWeights(start, end), getWeightStats()]);
    setWeightStats(stats);
    setGraphRows(weights);
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    void loadWeights();
  }, [loadWeights]);

  const heightM = heightCm != null && heightCm > 0 ? heightMFromCm(heightCm) : null;

  const chartPoints = useMemo(() => {
    return graphRows.map((w) => {
      const x = new Date(w.measuredAtUtc).getTime();
      const weightKg = w.weightInKilograms;
      const weightValue = weightFromKg(weightKg, weightUnit);
      const bmi =
        heightM != null && Number.isFinite(weightKg)
          ? bmiFromMetricKg(weightKg, heightM)
          : undefined;
      return { x, weightValue, bmi };
    });
  }, [graphRows, heightM, weightUnit]);

  const showBmi = heightM != null;

  const weightYDomain =
    weightStats != null
      ? yDomainFromMinMax(
          weightFromKg(weightStats.minWeightKg, weightUnit),
          weightFromKg(weightStats.maxWeightKg, weightUnit),
        )
      : undefined;

  const openCreateWeightModal = () => {
    setCreateWeightModalOpen(true);
  };

  const addWeight = async () => {
    await postWeight({
      measuredAtUtc: new Date(weightDate),
      weightInKilograms: Number(weightInKg),
    });
    void loadWeights();
    setCreateWeightModalOpen(false);
  };

  const onImportClick = () => {
    setImportMessage(null);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const { rows, skipped: csvSkipped } = parseWeightCsv(text);
      if (rows.length === 0) {
        setImportMessage(
          csvSkipped > 0
            ? `No valid rows (${csvSkipped} line(s) skipped).`
            : "No rows found in file.",
        );
        return;
      }
      const result = await importWeights(rows);
      const parts = [`Imported ${result.imported} row(s).`];
      if (result.skipped > 0) {
        parts.push(`${result.skipped} rejected by server.`);
      }
      if (csvSkipped > 0) {
        parts.push(`${csvSkipped} line(s) skipped while parsing.`);
      }
      setImportMessage(parts.join(" "));
      void loadWeights();
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const onHeightChange = (raw: string) => {
    const v = parseFloat(raw.replace(",", "."));
    if (raw.trim() === "" || !Number.isFinite(v) || v <= 0) {
      setHeightCm(null);
      writeHeightCm(null);
      return;
    }
    setHeightCm(v);
    writeHeightCm(v);
  };

  const currentBmi =
    showBmi && weightStats != null && heightM != null
      ? bmiFromMetricKg(weightStats.latestWeightKg, heightM)
      : null;

  const referenceWeightKgForNormalBmi =
    showBmi && heightM != null
      ? weightKgFromBmi(BMI_WHO_NORMAL_MAX, heightM)
      : null;

  return (
    <div>
      <h2>Weights</h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "0.35rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text)" }}>Range</span>
          <select
            className="ui-input"
            style={{ minWidth: "11rem" }}
            value={preset}
            onChange={(e) => setPreset(e.target.value as WeightRangePreset)}
          >
            <option value="7d">Last 7 days</option>
            <option value="2w">Last 2 weeks</option>
            <option value="1m">Last month</option>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="all">All time</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {preset === "custom" ? (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text)" }}>Start</span>
              <input
                className="ui-input"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text)" }}>End</span>
              <input
                className="ui-input"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text)" }}>Units</span>
          <select
            className="ui-input"
            style={{ minWidth: "8rem" }}
            value={weightUnit}
            onChange={(e) => {
              const u = e.target.value as WeightDisplayUnit;
              setWeightUnit(u);
              writeWeightUnit(u);
            }}
          >
            <option value="kg">Kilograms (kg)</option>
            <option value="lb">Pounds (lb)</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text)" }}>Height (cm) — BMI</span>
          <input
            className="ui-input"
            style={{ width: "6.5rem" }}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 175"
            value={heightCm != null ? String(heightCm) : ""}
            onChange={(e) => onHeightChange(e.target.value)}
          />
        </label>
      </div>

      {!showBmi ? (
        <p style={{ marginBottom: "0.35rem", fontSize: "0.9rem", color: "var(--text)" }}>
          Height is not specified. Enter height (cm) above for BMI, the chart reference lines, and reference
          weight.
        </p>
      ) : null}

      <div>
        <WeightBmiChart
          data={chartPoints}
          formatX={formatXDate}
          weightDomain={weightYDomain}
          showBmi={showBmi}
          weightUnit={weightUnit}
        />
      </div>

      {weightStats != null && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "var(--text)" }}>
          Min weight: {formatWeightWithUnit(weightStats.minWeightKg, weightUnit)} (
          {formatXDate(new Date(weightStats.minMeasuredAtUtc).getTime())}) · Max weight:{" "}
          {formatWeightWithUnit(weightStats.maxWeightKg, weightUnit)} (
          {formatXDate(new Date(weightStats.maxMeasuredAtUtc).getTime())})
        </p>
      )}

      {showBmi &&
        referenceWeightKgForNormalBmi != null &&
        Number.isFinite(referenceWeightKgForNormalBmi) && (
          <p style={{ marginTop: "0.35rem", fontSize: "0.9rem", color: "var(--text-h)" }}>
            Reference BMI (WHO normal upper): {formatMetric2(BMI_WHO_NORMAL_MAX)} · Reference weight:{" "}
            {formatWeightWithUnit(referenceWeightKgForNormalBmi, weightUnit)}
            {weightStats != null && currentBmi != null && Number.isFinite(currentBmi) ? (
              <>
                {" "}
                · Current BMI: {formatMetric2(currentBmi)} · Latest weight:{" "}
                {formatWeightWithUnit(weightStats.latestWeightKg, weightUnit)} on{" "}
                {formatXDate(new Date(weightStats.latestMeasuredAtUtc).getTime())}
              </>
            ) : null}
          </p>
        )}

      <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "var(--text)" }}>
        CSV: first column date (ISO or dd/mm/yyyy), second column weight in kg. Optional header row.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        <button type="button" className="ui-btn ui-btn--primary" onClick={openCreateWeightModal}>
          Create
        </button>
        <button type="button" className="ui-btn" onClick={onImportClick}>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          style={{ display: "none" }}
          aria-hidden
          onChange={onFileSelected}
        />
      </div>
      {importMessage != null && importMessage !== "" && (
        <p style={{ marginTop: "0.5rem", color: "var(--text)" }}>
          {importMessage}
        </p>
      )}
      {createWeightModalOpen && (
        <div className="ui-modal">
          <h2>Create weight</h2>
          <input
            className="ui-input"
            type="date"
            value={weightDate}
            onChange={(e) => setWeightDate(e.target.value)}
          />
          <input
            className="ui-input"
            type="text"
            inputMode="decimal"
            placeholder="kg"
            value={weightInKg}
            onChange={(e) => setWeightInKg(e.target.value)}
          />
          <button type="button" className="ui-btn ui-btn--primary" onClick={addWeight}>
            Create
          </button>
        </div>
      )}
    </div>
  );
}
