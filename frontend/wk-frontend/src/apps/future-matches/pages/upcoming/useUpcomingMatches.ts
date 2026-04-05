import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFutureMatches,
  fetchFutureMatchesCrawlProgress,
  refreshFutureMatches,
  type FutureMatchGameVisual,
  type FutureMatchesPayload,
} from "@/apps/future-matches/api/client";
import { splitMatchesByBucket } from "./upcomingMatchBuckets";
import { useIntervalTick } from "./useIntervalTick";

export function useUpcomingMatches() {
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

  const closeCrawlModal = useCallback(() => {
    stopCrawlPoll();
    setCrawlModalOpen(false);
  }, [stopCrawlPoll]);

  const onRefresh = useCallback(async () => {
    setError(null);
    setCrawlModalOpen(true);
    setCrawlStatusLine("Starting…");
    stopCrawlPoll();
    crawlPollRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const p = await fetchFutureMatchesCrawlProgress();
          const line =
            p.detail ?? p.currentUrl ?? (p.running ? "Working…" : "");
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
  }, [stopCrawlPoll]);

  return {
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
  };
}
