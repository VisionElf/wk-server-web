import { apiHeaders } from "@/core/apiHeaders";

import type { DaylogEventKind } from "../types/daylogEventKinds";

const base = "/api/daylog/events";

export type DaylogEventDto = {
  id: string;
  eventType: DaylogEventKind;
  startUtc: string;
  endUtc: string | null;
  customText: string | null;
};

export type DaylogEventWrite = {
  eventType: DaylogEventKind;
  startUtc: Date;
  endUtc: Date | null;
  customText: string | null;
};

export async function fetchDaylogEvents(startUtc: Date, endUtc: Date): Promise<DaylogEventDto[]> {
  const params = new URLSearchParams({
    startAtUtc: startUtc.toISOString(),
    endAtUtc: endUtc.toISOString(),
  });
  const res = await fetch(`${base}?${params}`, { headers: apiHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<DaylogEventDto[]>;
}

export async function createDaylogEvent(body: DaylogEventWrite): Promise<DaylogEventDto> {
  const res = await fetch(base, {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(serializeWrite(body)),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<DaylogEventDto>;
}

export async function updateDaylogEvent(id: string, body: DaylogEventWrite): Promise<DaylogEventDto> {
  const res = await fetch(`${base}/${id}`, {
    method: "PUT",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(serializeWrite(body)),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<DaylogEventDto>;
}

export async function deleteDaylogEvent(id: string): Promise<void> {
  const res = await fetch(`${base}/${id}`, { method: "DELETE", headers: apiHeaders() });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

function serializeWrite(body: DaylogEventWrite) {
  return {
    eventType: body.eventType,
    startUtc: body.startUtc.toISOString(),
    endUtc: body.endUtc?.toISOString() ?? null,
    customText: body.customText,
  };
}
