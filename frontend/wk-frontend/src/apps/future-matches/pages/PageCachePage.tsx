import { useCallback, useEffect, useState } from "react";
import {
  fetchFutureMatchesImageCache,
  fetchFutureMatchesPageCache,
  refetchFutureMatchesImageCache,
  refetchFutureMatchesPageCache,
  type FutureMatchesImageCacheEntry,
  type FutureMatchesPageCacheEntry,
} from "../api/client";

type CacheTab = "html" | "img";

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
  const [tab, setTab] = useState<CacheTab>("html");
  const [htmlRows, setHtmlRows] = useState<FutureMatchesPageCacheEntry[] | null>(
    null,
  );
  const [imgRows, setImgRows] = useState<FutureMatchesImageCacheEntry[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchingKey, setRefetchingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [html, img] = await Promise.all([
        fetchFutureMatchesPageCache(),
        fetchFutureMatchesImageCache(),
      ]);
      setHtmlRows(html);
      setImgRows(img);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefetchHtml = async (url: string) => {
    setRefetchingKey(`h:${url}`);
    setError(null);
    try {
      await refetchFutureMatchesPageCache(url);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refetch failed");
    } finally {
      setRefetchingKey(null);
    }
  };

  const onRefetchImg = async (sourceUrl: string) => {
    setRefetchingKey(`i:${sourceUrl}`);
    setError(null);
    try {
      await refetchFutureMatchesImageCache(sourceUrl);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refetch failed");
    } finally {
      setRefetchingKey(null);
    }
  };

  if (loading) {
    return <div className="ui-loading">Loading cache…</div>;
  }

  return (
    <div className="app-page ui-page--constrained fm-page">
      <div className="ui-page-header">
        <div className="ui-page-header__intro">
          <h1>Page cache</h1>
          <p className="ui-lead">
            Liquipedia HTML pages (TTL from settings) and cached images served
            under <code>/api/future-matches/media/…</code>. Use Refetch to pull a
            fresh copy immediately.
          </p>
        </div>
        <div className="ui-page-actions">
          <button
            type="button"
            className="ui-btn"
            onClick={() => void load()}
            title="Fetch the latest cache entry lists from the server."
          >
            Reload
          </button>
        </div>
      </div>

      <div className="fm-cache-tabs" role="tablist" aria-label="Cache type">
        <button
          type="button"
          role="tab"
          className="fm-cache-tabs__btn"
          aria-selected={tab === "html"}
          onClick={() => setTab("html")}
          title="List cached Liquipedia HTML pages."
        >
          HTML
        </button>
        <button
          type="button"
          role="tab"
          className="fm-cache-tabs__btn"
          aria-selected={tab === "img"}
          onClick={() => setTab("img")}
          title="List cached image files used for team visuals."
        >
          Images
        </button>
      </div>

      {error != null && <p className="ui-error">{error}</p>}

      {tab === "html" && (
        <>
          {htmlRows != null && htmlRows.length === 0 ? (
            <p className="ui-lead">
              No cached HTML yet. Run Upcoming → Refresh.
            </p>
          ) : (
            <div className="fm-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Fetched (UTC)</th>
                    <th>Expires after</th>
                    <th style={{ width: "7rem" }}> </th>
                  </tr>
                </thead>
                <tbody>
                  {htmlRows?.map((r) => (
                    <tr key={r.url}>
                      <td>
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.url}
                        </a>
                      </td>
                      <td>{formatUtc(r.fetchedAtUtc)}</td>
                      <td>{formatUtc(r.expiresAtUtc)}</td>
                      <td>
                        <button
                          type="button"
                          className="ui-btn ui-btn--small"
                          disabled={refetchingKey === `h:${r.url}`}
                          onClick={() => void onRefetchHtml(r.url)}
                          title="Download this page again from Liquipedia and replace the cached HTML."
                        >
                          {refetchingKey === `h:${r.url}`
                            ? "…"
                            : "Refetch"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "img" && (
        <>
          {imgRows != null && imgRows.length === 0 ? (
            <p className="ui-lead">
              No cached images yet. Run Upcoming → Refresh.
            </p>
          ) : (
            <div className="fm-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th style={{ width: "3.5rem" }}> </th>
                    <th>Source URL</th>
                    <th>File</th>
                    <th>Fetched (UTC)</th>
                    <th style={{ width: "7rem" }}> </th>
                  </tr>
                </thead>
                <tbody>
                  {imgRows?.map((r) => {
                    const canRefetch =
                      r.sourceUrl != null && r.sourceUrl.length > 0;
                    return (
                      <tr key={r.fileName}>
                        <td>
                          <img
                            className="fm-cache-thumb"
                            src={r.mediaPath}
                            alt=""
                            loading="lazy"
                          />
                        </td>
                        <td>
                          {canRefetch ? (
                            <a
                              href={r.sourceUrl!}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {r.sourceUrl}
                            </a>
                          ) : (
                            <span className="ui-lead" style={{ margin: 0 }}>
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <code>{r.fileName}</code>
                        </td>
                        <td>{formatUtc(r.fetchedAtUtc)}</td>
                        <td>
                          <button
                            type="button"
                            className="ui-btn ui-btn--small"
                            disabled={
                              !canRefetch ||
                              refetchingKey === `i:${r.sourceUrl ?? ""}`
                            }
                            title={
                              canRefetch
                                ? "Re-download this image from its source URL."
                                : "Source URL unknown for this file; run Upcoming → Refresh to store metadata."
                            }
                            onClick={() => {
                              if (r.sourceUrl != null) {
                                void onRefetchImg(r.sourceUrl);
                              }
                            }}
                          >
                            {canRefetch &&
                            refetchingKey === `i:${r.sourceUrl}`
                              ? "…"
                              : "Refetch"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
