import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "../future-matches.css";
import {
  fetchFutureMatches,
  fetchFutureMatchesCrawlProgress,
  refreshFutureMatches,
  type FutureMatchGameVisual,
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

type CountdownMode = "today" | "week" | "later";

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

function formatLiveToday(deltaMs: number): string {
  if (deltaMs <= 0) {
    return "Started";
  }
  const s = Math.floor(deltaMs / 1000);
  const h = Math.floor(s / 3600);
  const mi = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const hh = h.toString();
  const mm = mi.toString().padStart(2, "0");
  const ss = sec.toString().padStart(2, "0");
  return `${hh}h ${mm}m ${ss}s`;
}

function formatLiveWeek(deltaMs: number): string {
  if (deltaMs <= 0) {
    return "Started";
  }
  const d = Math.floor(deltaMs / MS_DAY);
  const h = Math.floor((deltaMs % MS_DAY) / MS_HOUR);
  return `${d}d ${h}h`;
}

function formatLiveLater(dateUnix: number, nowMs: number): string {
  const targetMs = dateUnix * 1000;
  if (targetMs <= nowMs) {
    return "Started";
  }
  const d = new Date(targetMs);
  const now = new Date(nowMs);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  if (d.getFullYear() !== now.getFullYear()) {
    opts.year = "numeric";
  }
  return d.toLocaleDateString(undefined, opts);
}

function WhenLiveLine({
  mode,
  dateUnix,
}: {
  mode: CountdownMode;
  dateUnix: number;
}) {
  const tickFast = useIntervalTick(1000);
  const tickSlow = useIntervalTick(60_000);
  void (mode === "later" ? tickSlow : tickFast);

  const nowMs = Date.now();
  const targetMs = dateUnix * 1000;
  const deltaMs = targetMs - nowMs;

  let text: string;
  if (mode === "today") {
    text = formatLiveToday(deltaMs);
  } else if (mode === "week") {
    text = formatLiveWeek(deltaMs);
  } else {
    text = formatLiveLater(dateUnix, nowMs);
  }

  const started = text === "Started";
  return (
    <span
      className={`fm-countdown-slot fm-countdown-slot--${mode}${
        started ? " fm-countdown-slot--started" : ""
      }`}
    >
      <span className={`fm-countdown${started ? " fm-countdown--started" : ""}`}>
        {text}
      </span>
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

function GameCell({
  m,
  visual,
}: {
  m: FutureMatchItem;
  visual?: FutureMatchGameVisual | undefined;
}) {
  return (
    <span className="fm-game-cell">
      {visual?.logo != null && visual.logo !== "" ? (
        <img
          src={visual.logo}
          alt=""
          width={32}
          height={32}
          className="fm-game-cell__icon"
          loading="lazy"
        />
      ) : null}
      <span className="fm-game-cell__name">{m.gameLabel}</span>
    </span>
  );
}

function WhenCell({
  m,
  countdownMode,
}: {
  m: FutureMatchItem;
  countdownMode: CountdownMode | "none";
}) {
  const unix = m.dateUnix;
  const showTimer =
    countdownMode !== "none" &&
    itemKind(m) === "match" &&
    unix != null &&
    unix > 0;

  return (
    <td className="fm-when-cell">
      <span className="fm-when-cell__static">{formatWhen(m)}</span>
      {showTimer ? (
        <WhenLiveLine mode={countdownMode} dateUnix={unix} />
      ) : countdownMode !== "none" ? (
        <span
          className={`fm-countdown-slot fm-countdown-slot--${countdownMode} fm-countdown-slot--empty`}
          aria-hidden="true"
        >
          <span className="fm-countdown fm-countdown--placeholder">&nbsp;</span>
        </span>
      ) : null}
    </td>
  );
}

function MatchTableSection({
  title,
  rows,
  countdownMode,
  visualByGame,
}: {
  title: string;
  rows: FutureMatchItem[];
  countdownMode: CountdownMode | "none";
  visualByGame: Map<string, FutureMatchGameVisual>;
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
              {rows.map((m, i) => {
                const visual = visualByGame.get(m.game.toLowerCase());
                const hasBanner =
                  visual?.banner != null && visual.banner !== "";
                const rowKey = `${itemKind(m)}-${m.game}-${m.dateUnix ?? "x"}-${m.tournament?.href ?? ""}-${m.team1?.name ?? ""}-${i}`;
                return (
                  <tr
                    key={rowKey}
                    className={`fm-row${hasBanner ? " fm-row--game-art" : ""}`}
                    data-fm-game={m.game}
                    style={
                      hasBanner
                        ? ({
                            ["--fm-row-bg-image" as string]: `url(${JSON.stringify(visual!.banner)})`,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <td>
                      <GameCell m={m} visual={visual} />
                    </td>
                    <td>
                      <TeamCell team={m.team1} />
                    </td>
                    <td>
                      {itemKind(m) === "tournament" ? (
                        "—"
                      ) : (
                        <TeamCell team={m.team2} />
                      )}
                    </td>
                    <WhenCell m={m} countdownMode={countdownMode} />
                    <td>
                      <TournamentCell m={m} />
                    </td>
                  </tr>
                );
              })}
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
  const [crawlModalOpen, setCrawlModalOpen] = useState(false);
  const [crawlStatusLine, setCrawlStatusLine] = useState("");
  const crawlPollRef = useRef<number | null>(null);
  const bucketTick = useIntervalTick(60_000);

  const stopCrawlPoll = useCallback(() => {
    if (crawlPollRef.current != null) {
      window.clearInterval(crawlPollRef.current);
      crawlPollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCrawlPoll(), [stopCrawlPoll]);

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

  const visualByGame = useMemo(() => {
    const m = new Map<string, FutureMatchGameVisual>();
    for (const v of data?.gameVisuals ?? []) {
      m.set(v.game.toLowerCase(), v);
    }
    return m;
  }, [data?.gameVisuals]);

  const closeCrawlModal = () => {
    stopCrawlPoll();
    setCrawlModalOpen(false);
  };

  const onRefresh = async () => {
    setError(null);
    setCrawlModalOpen(true);
    setCrawlStatusLine("Starting…");
    stopCrawlPoll();
    crawlPollRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const p = await fetchFutureMatchesCrawlProgress();
          const line =
            p.detail ??
            p.currentUrl ??
            (p.running ? "Working…" : "");
          if (line !== "") {
            setCrawlStatusLine(line);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 400);

    setRefreshing(true);
    try {
      const payload = await refreshFutureMatches();
      setData(payload);
      setCrawlStatusLine("Finished.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
      setCrawlStatusLine("Failed.");
    } finally {
      stopCrawlPoll();
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
      {crawlModalOpen ? (
        <div
          className="fm-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fm-crawl-modal-title"
        >
          <div className="fm-modal">
            <p className="fm-modal__title" id="fm-crawl-modal-title">
              Crawl in progress
            </p>
            <p className="fm-modal__url">
              Currently loading:{" "}
              {crawlStatusLine !== "" ? crawlStatusLine : "…"}
            </p>
            <button type="button" className="ui-btn" onClick={closeCrawlModal}>
              Close
            </button>
          </div>
        </div>
      ) : null}
      <div className="ui-page-header">
        <div>
          <h1>Upcoming matches</h1>
          <p className="ui-lead">
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
            countdownMode="today"
            visualByGame={visualByGame}
          />
          <MatchTableSection
            title="Next 7 days"
            rows={buckets.week}
            countdownMode="week"
            visualByGame={visualByGame}
          />
          <MatchTableSection
            title="Later"
            rows={buckets.later}
            countdownMode="later"
            visualByGame={visualByGame}
          />
        </>
      )}
    </div>
  );
}
