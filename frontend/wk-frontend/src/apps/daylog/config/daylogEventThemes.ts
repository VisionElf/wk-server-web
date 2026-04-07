import type { EventInput } from "@fullcalendar/core";

const defaultTheme = {
  backgroundColor: "#333333",
  textColor: "#eeeeee",
};

export function formatDaylogTitle(label: string, customText: string | null | undefined): string {
  const t = customText?.trim();
  return t ? `${label}: ${t}` : label;
}

export function applyDaylogTheme(event: EventInput): EventInput {
  const ext = event.extendedProps as {
    daylogEventType?: string;
    backgroundColor?: string;
    textColor?: string | null;
  } | undefined;
  const bg = ext?.backgroundColor ?? defaultTheme.backgroundColor;
  const fg = ext?.textColor ?? defaultTheme.textColor;
  event.backgroundColor = bg;
  event.borderColor = bg;
  event.textColor = fg ?? defaultTheme.textColor;
  return event;
}
