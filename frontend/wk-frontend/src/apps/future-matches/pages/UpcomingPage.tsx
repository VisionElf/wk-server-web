import { useCallback, useEffect, useMemo, useState } from "react";
import "../future-matches.css";
import {
  fetchFutureMatches,
  refreshFutureMatches,
  type FutureMatchItem,
  type FutureMatchesPayload,
} from "../api/client";

type Bucket = "today" | "week" | "later";

function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function itemKind(m: FutureMatchItem): "match" | "tournament" {
  return m.kind === "tournament" ? "tournament" : "match";
}

function bucketForItem(
  m: FutureMatchItem,
  today0: Date,
  tomorrow0: Date,
  weekEndExclusive: Date,
): Bucket {
  const ts = m.dateUnix;
  if (ts != null && ts > 0) {
    const t = new Date(ts * 1000);
    if (t >= today0 && t < tomorrow0) {
      return "today";
    }
    if (t >= tomorrow0 && t < weekEndExclusive) {
      return "week";
    }
  }
  return "later";
}

function splitMatchesByBucket(matches: FutureMatchItem[]): Record<Bucket, FutureMatchItem[]> {
  const now = new Date();
  const today0 = startOfDay(now);
  const tomorrow0 = addDays(today0, 1);
  const weekEndExclusive = addDays(today0, 8);

  const out: Record<Bucket, FutureMatchItem[]> = { today: [], week: [], later: [] };
  for (const m of matches) {
    out[bucketForItem(m, today0, tomorrow0, weekEndExclusive)].push(m);
  }
  for (const k of Object.keys(out) as Bucket[]) {
    out[k].sort(compareRows);
  }
  return out;
}

function compareRows(a: FutureMatchItem, b: FutureMatchItem): number {
  const ua = a.dateUnix ?? Number.MAX_SAFE_INTEGER;
  const ub = b.dateUnix ?? Number.MAX_SAFE_INTEGER;
  if (ua !== ub) {
    return ua - ub;
  }
  const na = (a.tournament?.name ?? a.team1?.name ?? "").toLowerCase();
  const nb = (b.tournament?.name ?? b.team1?.name ?? "").toLowerCase();
  return na.localeCompare(nb);
}

function formatWhen(m: FutureMatchItem): string {
  if (itemKind(m) === "tournament" && m.dateStr != null && m.dateStr !== "") {
    return m.dateStr;
  }
  if (m.dateUnix != null && m.dateUnix > 0) {
    return new Date(m.dateUnix * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  return m.dateStr ?? "—";
}

function useIntervalTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
}

function LiveCountdown({ dateUnix }: { dateUnix: number }) {
  const tick = useIntervalTick(1000);
  const targetMs = dateUnix * 1000;
  const delta = targetMs - Date.now();
  if (delta <= 0) {
    return <span className="fm-countdown fm-countdown--started">Started</span>;
  }
  const s = Math.floor(delta / 1000);
  const h = Math.floor(s / 3600);
  const mi = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  void tick;
  return (
    <span className="fm-countdown">
      {h > 0 ? `${h}h ` : ""}
      {mi}m {sec.toString().padStart(2, "0")}s
    </span>
  );
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

function TournamentCell({ m }: { m: FutureMatchItem }) {
  const t = m.tournament;
  if (t?.name != null && t.name !== "") {
    return t.href != null && t.href !== "" ? (
      <a href={t.href} target="_blank" rel="noreferrer">
        {t.name}
      </a>
    ) : (
      t.name
    );
  }
  return "—";
}

function WhenCell({
  m,
  showLiveCountdown,
}: {
  m: FutureMatchItem;
  showLiveCountdown: boolean;
}) {
  const unix = m.dateUnix;
  const showTimer =
    showLiveCountdown &&
    itemKind(m) === "match" &&
    unix != null &&
    unix > 0;

  return (
    <td>
      {formatWhen(m)}
      {showTimer ? <LiveCountdown dateUnix={unix} /> : null}
    </td>
  );
}

function MatchTableSection({
  title,
  rows,
  showLiveCountdown,
}: {
  title: string;
  rows: FutureMatchItem[];
  showLiveCountdown: boolean;
}) {
  return (
    <section className="fm-match-section" aria-labelledby={`fm-section-${title.replace(/\s/g, "-")}`}>
      <h2 className="fm-match-section-title" id={`fm-section-${title.replace(/\s/g, "-")}`}>
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="ui-lead fm-match-section-empty">No entries.</p>
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
              {rows.map((m, i) => (
                <tr
                  className="fm-row"
                  data-fm-game={m.game}
                  key={`${itemKind(m)}-${m.game}-${m.dateUnix ?? "x"}-${m.tournament?.href ?? ""}-${m.team1?.name ?? ""}-${i}`}
                >
                  <td>{m.gameLabel}</td>
                  <td>
                    <TeamCell team={m.team1} />
                  </td>
                  <td>
                    {itemKind(m) === "tournament" ? "—" : <TeamCell team={m.team2} />}
                  </td>
                  <WhenCell m={m} showLiveCountdown={showLiveCountdown} />
                  <td>
                    <TournamentCell m={m} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function UpcomingPage() {
  const [data, setData] = useState<FutureMatchesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bucketTick = useIntervalTick(60_000);

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

  const buckets = useMemo(() => {
    void bucketTick;
    return splitMatchesByBucket(data?.matches ?? []);
  }, [data?.matches, bucketTick]);

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

  const totalRows = data?.matches.length ?? 0;

  return (
    <div className="app-page ui-page--constrained fm-page">
      <div className="ui-page-header">
        <div>
          <h1>Upcoming matches</h1>
          <p className="ui-lead">
            Filtered from Liquipedia using your followed team page IDs (see{" "}
            <strong>Follow</strong>). Data is cached on the server — use Refresh
            to recrawl. Teams with no listed match may show upcoming tournaments
            from their wiki infobox.
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

      {data != null && totalRows === 0 ? (
        <p className="ui-lead">
          No matches in cache. Click <strong>Refresh</strong> to crawl
          Liquipedia (this can take ~10–30s).
        </p>
      ) : (
        <>
          <MatchTableSection
            title="Today"
            rows={buckets.today}
            showLiveCountdown
          />
          <MatchTableSection
            title="Next 7 days"
            rows={buckets.week}
            showLiveCountdown={false}
          />
          <MatchTableSection
            title="Later"
            rows={buckets.later}
            showLiveCountdown={false}
          />
        </>
      )}
    </div>
  );
}
