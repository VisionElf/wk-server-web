import { apiHeaders } from "@/core/apiHeaders";

const base = "/api/last-time";

export type LtiItem = {
  id: string;
  name: string;
  lastChangedAtUtc: string | null;
  historyCount: number;
};

export type LtiHistoryEntry = {
  id: string;
  itemId: string;
  itemName: string;
  occurredAtUtc: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function fetchLtiItems(): Promise<LtiItem[]> {
  const res = await fetch(`${base}/items`, { headers: apiHeaders() });
  return parseJson<LtiItem[]>(res);
}

export async function createLtiItem(name: string): Promise<LtiItem> {
  const res = await fetch(`${base}/items`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name }),
  });
  return parseJson<LtiItem>(res);
}

export async function addLtiEvent(
  itemId: string,
  occurredAt?: string | null,
): Promise<LtiItem> {
  const res = await fetch(`${base}/items/${itemId}/events`, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(
      occurredAt != null ? { occurredAt } : {},
    ),
  });
  return parseJson<LtiItem>(res);
}

export async function clearLtiHistory(itemId: string): Promise<LtiItem> {
  const res = await fetch(`${base}/items/${itemId}/history`, {
    method: "DELETE",
    headers: apiHeaders(),
  });
  return parseJson<LtiItem>(res);
}

export async function deleteLtiItem(itemId: string): Promise<void> {
  const res = await fetch(`${base}/items/${itemId}`, {
    method: "DELETE",
    headers: apiHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export async function fetchLtiHistory(limit = 150): Promise<LtiHistoryEntry[]> {
  const res = await fetch(`${base}/history?limit=${limit}`, {
    headers: apiHeaders(),
  });
  return parseJson<LtiHistoryEntry[]>(res);
}
