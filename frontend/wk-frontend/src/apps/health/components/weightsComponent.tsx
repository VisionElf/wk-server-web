import { useCallback, useEffect, useRef, useState } from "react";
import { getWeights, getWeightStats, importWeights, postWeight, type WeightStats } from "../api/weights";
import { parseWeightCsv } from "../utils/csvWeightImport";
import { DisplayChart } from "@/core/components/chartComponents";

function startOfDay30DaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatXDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "short" });
}

function formatKg(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Y axis from global min/max (all time) with padding so the line uses the vertical range. */
function yDomainFromMinMaxKg(min: number, max: number): [number, number] {
  if (min === max) {
    return [min - 1, max + 1];
  }
  const span = max - min;
  const pad = Math.max(span * 0.05, 0.25);
  return [min - pad, max + pad];
}

export function DisplayWeightsChart() {
  const [graphData, setGraphData] = useState<{ x: number; y: number }[]>([]);
  const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
  const [createWeightModalOpen, setCreateWeightModalOpen] = useState(false);
  const [weightDate, setWeightDate] = useState("");
  const [weightInKg, setWeightInKg] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadWeights = useCallback(async () => {
    const [weights, stats] = await Promise.all([
      getWeights(startOfDay30DaysAgo(), null),
      getWeightStats(),
    ]);
    setWeightStats(stats);
    setGraphData(
      weights.map((w) => ({
        x: new Date(w.measuredAtUtc).getTime(),
        y: w.weightInKilograms,
      })),
    );
  }, []);

  useEffect(() => {
    void loadWeights();
  }, [loadWeights]);

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

  return (
    <div>
      <h2>Weights</h2>
      <div>
        <DisplayChart
          data={graphData}
          xLabel="Date"
          yLabel="Weight (kg)"
          formatX={formatXDate}
          yDomain={
            weightStats != null
              ? yDomainFromMinMaxKg(weightStats.minWeightKg, weightStats.maxWeightKg)
              : undefined
          }
        />
      </div>
      {weightStats != null && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "var(--text)" }}>
          Min weight: {formatKg(weightStats.minWeightKg)} kg (
          {formatXDate(new Date(weightStats.minMeasuredAtUtc).getTime())}) · Max weight:{" "}
          {formatKg(weightStats.maxWeightKg)} kg (
          {formatXDate(new Date(weightStats.maxMeasuredAtUtc).getTime())})
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
