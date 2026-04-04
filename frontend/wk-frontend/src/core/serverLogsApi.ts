import { apiHeaders } from "./apiHeaders";

const base = "/api/server-logs";

export type ServerLogsResponse = {
  lines: string[];
};

export async function fetchServerLogs(): Promise<ServerLogsResponse> {
  const res = await fetch(base, { headers: apiHeaders() });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<ServerLogsResponse>;
}
