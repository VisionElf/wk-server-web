import { useCallback, useEffect, useState } from "react";
import { fetchFutureMatchesPageCache } from "../api/client";
import "../future-matches.css";

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PageCachePage() {
  const [rows, setRows] = useState<Awaited<
    ReturnType<typeof fetchFutureMatchesPageCache>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchFutureMatchesPageCache();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="ui-loading">Loading page cache…</div>;
  }

  return (
    <div className="app-page ui-page--constrained fm-page">
      <div className="ui-page-header">
        <div>
          <h1>Liquipedia HTML cache</h1>
          <p className="ui-lead">
            Raw pages stored on the API server (24h TTL by default). Expiry uses
            the current <code>HtmlPageCacheTtlHours</code> setting.
          </p>
        </div>
        <button type="button" className="ui-btn" onClick={() => void load()}>
          Reload
        </button>
      </div>
      {error != null && <p className="ui-error">{error}</p>}
      {rows != null && rows.length === 0 ? (
        <p className="ui-lead">No cached pages yet. Run Upcoming → Refresh.</p>
      ) : (
        <div className="fm-table-wrap">
          <table className="ui-table fm-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Fetched (UTC stored)</th>
                <th>Expires after</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.url}>
                  <td>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.url}
                    </a>
                  </td>
                  <td>{formatUtc(r.fetchedAtUtc)}</td>
                  <td>{formatUtc(r.expiresAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
