import { type CSSProperties } from "react";
import type {
  FutureMatchGameVisual,
  FutureMatchItem,
} from "@/apps/future-matches/api/client";
import { formatWhen, itemKind } from "./upcomingMatchBuckets";
import { useIntervalTick } from "./useIntervalTick";

export type CountdownMode = "finished" | "today" | "week" | "later";

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
  if (mode === "finished") {
    text = "Finished";
  } else if (mode === "today") {
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
      <span className="fm-when-cell__static"><b>{formatWhen(m)}</b></span>
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

export function MatchTableSection({
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
  if (rows.length === 0) {
    return null;
  }
  return (
    <section className="fm-match-section" aria-labelledby={`fm-section-${title.replace(/\s/g, "-")}`}>
      <h2 className="fm-match-section-title" id={`fm-section-${title.replace(/\s/g, "-")}`}>
        {title}
      </h2>
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
    </section>
  );
}
