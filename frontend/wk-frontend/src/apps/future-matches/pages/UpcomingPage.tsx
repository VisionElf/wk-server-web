import { useCallback, useEffect, useState } from "react";
import "../future-matches.css";
import {
  fetchFutureMatches,
  refreshFutureMatches,
  type FutureMatchItem,
  type FutureMatchesPayload,
} from "../api/client";

function formatWhen(m: FutureMatchItem): string {
  if (m.dateUnix != null && m.dateUnix > 0) {
    return new Date(m.dateUnix * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return m.dateStr ?? "—";
}

function TeamCell({ team }: { team: FutureMatchItem["team1"] }) {
  if (!team?.name) {
    return "—";
  }
  const inner = (
    <>
      {team.icon != null && team.icon !== "" && (
        <img
          src={team.icon}
          alt=""
          width={28}
          height={28}
          className="fm-team-icon"
          loading="lazy"
        />
      )}
      <span className="fm-team-name">
        {team.href != null && team.href !== "" ? (
          <a href={team.href} target="_blank" rel="noreferrer">
            {team.name}
          </a>
        ) : (
          team.name
        )}
      </span>
    </>
  );
  return <span className="fm-team-cell">{inner}</span>;
}

export default function UpcomingPage() {
  const [data, setData] = useState<FutureMatchesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await fetchFutureMatches();
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const payload = await refreshFutureMatches();
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="ui-loading">Loading schedule…</div>;
  }

  const last = data?.lastUpdatedUtc
    ? new Date(data.lastUpdatedUtc).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="app-page ui-page--constrained fm-page">
      <div className="ui-page-header">
        <div>
          <h1>Upcoming matches</h1>
          <p className="ui-lead">
            Filtered from Liquipedia for your followed teams. Data is cached on
            the server — use Refresh to recrawl.
          </p>
          {last != null && (
            <p className="ui-lead fm-last-up">
              Last crawl: <time dateTime={data!.lastUpdatedUtc!}>{last}</time>
            </p>
          )}
        </div>
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={() => void onRefresh()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error != null && <p className="ui-error">{error}</p>}

      {data?.refreshErrors != null && data.refreshErrors.length > 0 && (
        <ul className="ui-error-list">
          {data.refreshErrors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      {data != null && data.matches.length === 0 ? (
        <p className="ui-lead">
          No matches in cache. Click <strong>Refresh</strong> to crawl
          Liquipedia (this can take ~10–30s).
        </p>
      ) : (
        <div className="fm-table-wrap">
          <table className="ui-table fm-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>When</th>
                <th>Tournament</th>
              </tr>
            </thead>
            <tbody>
              {data?.matches.map((m, i) => (
                <tr key={`${m.game}-${m.dateUnix}-${i}`}>
                  <td>{m.gameLabel}</td>
                  <td>
                    <TeamCell team={m.team1} />
                  </td>
                  <td>
                    <TeamCell team={m.team2} />
                  </td>
                  <td>{formatWhen(m)}</td>
                  <td>
                    {m.tournament?.name != null && m.tournament.name !== "" ? (
                      m.tournament.href != null && m.tournament.href !== "" ? (
                        <a
                          href={m.tournament.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {m.tournament.name}
                        </a>
                      ) : (
                        m.tournament.name
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
