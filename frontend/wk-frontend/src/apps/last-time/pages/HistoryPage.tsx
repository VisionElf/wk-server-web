import { useCallback, useEffect, useState } from "react";
import { fetchLtiHistory, type LtiHistoryEntry } from "@/apps/last-time/api/client";

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
    return <div className="ui-loading">Loading history…</div>;
  }

  return (
    <div className="app-page ui-page--constrained">
      <div className="ui-page-header">
        <div className="ui-page-header__intro">
          <h1>History</h1>
          <p className="ui-lead">
            Recent changes across all tracked items (newest first).
          </p>
        </div>
        <div className="ui-page-actions">
          <button
            type="button"
            className="ui-btn"
            onClick={() => void load()}
            title="Reload the history list from the server."
          >
            Refresh
          </button>
        </div>
      </div>

      {error != null && <p className="ui-error">{error}</p>}

      {rows.length === 0 ? (
        <p className="ui-lead">No events yet. Mark an item from Items.</p>
      ) : (
        <table className="ui-table">
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
