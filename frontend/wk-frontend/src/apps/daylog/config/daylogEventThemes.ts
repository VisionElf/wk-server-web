import type { EventInput } from "@fullcalendar/core";

import { DAYLOG_EVENT_LABELS, type DaylogEventKind } from "../types/daylogEventKinds";

type EventTheme = {
  color: string;
  text?: string;
};

const defaultTheme: EventTheme = {
  color: "#333333",
  text: "#eeeeee",
};

const themes: Partial<Record<DaylogEventKind, EventTheme>> = {
  sleep_start: { color: "#0000aa" },
  sleep_end: { color: "#0000aa" },
  workout: { color: "#ff5500" },
  social: { color: "#aa0000" },
  chore: { color: "#005599" },
  appointment: { color: "#006600" },
  custom: { color: "#995500" },
};

export function formatDaylogTitle(kind: string, customText: string | null | undefined): string {
  const label = DAYLOG_EVENT_LABELS[kind as DaylogEventKind] ?? kind;
  const t = customText?.trim();
  return t ? `${label}: ${t}` : label;
}

export function applyDaylogTheme(event: EventInput): EventInput {
  const ext = event.extendedProps as { daylogEventType?: string } | undefined;
  const kind = ext?.daylogEventType ?? "";
  const theme = themes[kind as keyof typeof themes] ?? defaultTheme;
  event.backgroundColor = theme.color;
  event.borderColor = theme.color;
  event.textColor = theme.text ?? defaultTheme.text;
  return event;
}
