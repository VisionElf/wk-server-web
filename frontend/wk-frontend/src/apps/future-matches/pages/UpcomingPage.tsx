import { MatchTableSection } from "./upcoming/UpcomingMatchTable";
import { useUpcomingMatches } from "./upcoming/useUpcomingMatches";

export default function UpcomingPage() {
  const {
    data,
    loading,
    refreshing,
    error,
    crawlModalOpen,
    crawlStatusLine,
    buckets,
    visualByGame,
    closeCrawlModal,
    onRefresh,
  } = useUpcomingMatches();

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
