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

export type FutureMatchItem = {
  game: string;
  gameLabel: string;
  dateUnix?: number | null;
  dateStr?: string | null;
  team1?: FutureMatchTeam | null;
  team2?: FutureMatchTeam | null;
  tournament?: FutureMatchTournament | null;
};

export type FutureMatchesPayload = {
  lastUpdatedUtc?: string | null;
  matches: FutureMatchItem[];
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
  const res = await fetch(base);
  return parseJson<FutureMatchesPayload>(res);
}

export async function refreshFutureMatches(): Promise<FutureMatchesPayload> {
  const res = await fetch(`${base}/refresh`, { method: "POST" });
  return parseJson<FutureMatchesPayload>(res);
}
