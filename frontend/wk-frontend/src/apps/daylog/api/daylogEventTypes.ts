import { apiHeaders } from "@/core/apiHeaders";

const base = "/api/daylog/event-types";

export type DaylogEventTypeDto = {
  id: string;
  code: string;
  label: string;
  backgroundColor: string;
  textColor: string | null;
  sortOrder: number;
};

export type CreateDaylogEventTypeDto = {
  code: string;
  label: string;
  backgroundColor: string;
  textColor: string | null;
  sortOrder?: number | null;
};

export type UpdateDaylogEventTypeDto = {
  label: string;
  backgroundColor: string;
  textColor: string | null;
  sortOrder: number;
};

export async function fetchDaylogEventTypes(): Promise<DaylogEventTypeDto[]> {
  const res = await fetch(base, { headers: apiHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<DaylogEventTypeDto[]>;
}

export async function createDaylogEventType(body: CreateDaylogEventTypeDto): Promise<DaylogEventTypeDto> {
  const res = await fetch(base, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<DaylogEventTypeDto>;
}

export async function updateDaylogEventType(id: string, body: UpdateDaylogEventTypeDto): Promise<DaylogEventTypeDto> {
  const res = await fetch(`${base}/${id}`, {
    method: "PUT",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<DaylogEventTypeDto>;
}

export async function deleteDaylogEventType(id: string): Promise<void> {
  const res = await fetch(`${base}/${id}`, { method: "DELETE", headers: apiHeaders() });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}
