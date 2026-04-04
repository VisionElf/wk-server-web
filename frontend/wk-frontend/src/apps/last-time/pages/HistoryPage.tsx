import { useCallback, useEffect, useState } from "react";
import { fetchLtiHistory, type LtiHistoryEntry } from "../api/client";
import "../last-time.css";

export default function HistoryPage() {
  const [rows, setRows] = useState<LtiHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await fetchLtiHistory(200);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="lti-loading">Loading history…</div>;
  }

  return (
    <div className="app-page lti-page">
      <div className="lti-page__header">
        <div>
          <h1>History</h1>
          <p className="lti-page__sub">
            Recent changes across all tracked items (newest first).
          </p>
        </div>
        <button type="button" className="lti-btn" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error != null && <p className="lti-error">{error}</p>}

      {rows.length === 0 ? (
        <p className="lti-page__sub">No events yet. Mark an item from Items.</p>
      ) : (
        <table className="lti-history">
          <thead>
            <tr>
              <th>When (local)</th>
              <th>Item</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {new Date(r.occurredAtUtc).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td>{r.itemName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
