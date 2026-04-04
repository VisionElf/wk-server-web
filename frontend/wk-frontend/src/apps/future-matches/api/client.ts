import { apiHeaders } from "../../../core/apiHeaders";

const base = "/api/future-matches";

export type FutureMatchTeam = {
  name: string;
  href?: string | null;
  icon?: string | null;
};

export type FutureMatchTournament = {
  name?: string | null;
  href?: string | null;
};

export type FutureMatchKind = "match" | "tournament";

export type FutureMatchItem = {
  kind?: FutureMatchKind | null;
  game: string;
  gameLabel: string;
  dateUnix?: number | null;
  dateStr?: string | null;
  team1?: FutureMatchTeam | null;
  team2?: FutureMatchTeam | null;
  tournament?: FutureMatchTournament | null;
};

export type FutureMatchGameVisual = {
  game: string;
  gameLabel: string;
  logo?: string | null;
  banner?: string | null;
};

export type FutureMatchesPayload = {
  lastUpdatedUtc?: string | null;
  matches: FutureMatchItem[];
  gameVisuals?: FutureMatchGameVisual[] | null;
  refreshErrors?: string[] | null;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function fetchFutureMatches(): Promise<FutureMatchesPayload> {
  const res = await fetch(base, { headers: apiHeaders() });
  return parseJson<FutureMatchesPayload>(res);
}

export async function refreshFutureMatches(): Promise<FutureMatchesPayload> {
  const res = await fetch(`${base}/refresh`, {
    method: "POST",
    headers: apiHeaders(),
  });
  return parseJson<FutureMatchesPayload>(res);
}

export type FutureMatchesPageCacheEntry = {
  url: string;
  fetchedAtUtc: string;
  expiresAtUtc: string;
};

export async function fetchFutureMatchesPageCache(): Promise<
  FutureMatchesPageCacheEntry[]
> {
  const res = await fetch(`${base}/page-cache`, { headers: apiHeaders() });
  return parseJson<FutureMatchesPageCacheEntry[]>(res);
}

export type FutureMatchesImageCacheEntry = {
  fileName: string;
  sourceUrl: string | null;
  fetchedAtUtc: string;
  mediaPath: string;
};

export async function fetchFutureMatchesImageCache(): Promise<
  FutureMatchesImageCacheEntry[]
> {
  const res = await fetch(`${base}/image-cache`, { headers: apiHeaders() });
  return parseJson<FutureMatchesImageCacheEntry[]>(res);
}

export async function refetchFutureMatchesPageCache(url: string): Promise<void> {
  const res = await fetch(`${base}/page-cache/refetch`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export async function refetchFutureMatchesImageCache(
  sourceUrl: string,
): Promise<FutureMatchesImageCacheEntry> {
  const res = await fetch(`${base}/image-cache/refetch`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ sourceUrl }),
  });
  return parseJson<FutureMatchesImageCacheEntry>(res);
}

export type FutureMatchesCrawlProgress = {
  running: boolean;
  currentUrl: string | null;
  detail: string | null;
};

export async function fetchFutureMatchesCrawlProgress(): Promise<FutureMatchesCrawlProgress> {
  const res = await fetch(`${base}/crawl-progress`, { headers: apiHeaders() });
  return parseJson<FutureMatchesCrawlProgress>(res);
}

export type FutureGameSettings = {
  id: string;
  followTeamIds: string[];
  customBannerUrl?: string | null;
};

export type FutureKnownGame = {
  id: string;
  label: string;
};

export type FutureSettingsResponse = {
  games: FutureGameSettings[];
  knownGames: FutureKnownGame[];
};

export async function fetchFutureSettings(): Promise<FutureSettingsResponse> {
  const res = await fetch(`${base}/settings`, { headers: apiHeaders() });
  return parseJson<FutureSettingsResponse>(res);
}

export async function saveFutureSettings(
  games: FutureGameSettings[],
): Promise<FutureSettingsResponse> {
  const res = await fetch(`${base}/settings`, {
    method: "PUT",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ games }),
  });
  if (!res.ok) {
    throw new Error(await parseSettingsError(res));
  }
  return res.json() as Promise<FutureSettingsResponse>;
}

async function parseSettingsError(res: Response): Promise<string> {
  let msg = res.statusText;
  try {
    const j = (await res.json()) as { message?: string };
    if (j.message != null && j.message !== "") {
      msg = j.message;
    }
  } catch {
    /* ignore */
  }
  return msg;
}

export async function uploadFutureGameBanner(
  gameId: string,
  file: File,
): Promise<FutureSettingsResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${base}/settings/games/${encodeURIComponent(gameId)}/banner`,
    { method: "POST", headers: apiHeaders(), body: fd },
  );
  if (!res.ok) {
    throw new Error(await parseSettingsError(res));
  }
  return res.json() as Promise<FutureSettingsResponse>;
}

export async function deleteFutureGameBanner(
  gameId: string,
): Promise<FutureSettingsResponse> {
  const res = await fetch(
    `${base}/settings/games/${encodeURIComponent(gameId)}/banner`,
    { method: "DELETE", headers: apiHeaders() },
  );
  if (!res.ok) {
    throw new Error(await parseSettingsError(res));
  }
  return res.json() as Promise<FutureSettingsResponse>;
}
