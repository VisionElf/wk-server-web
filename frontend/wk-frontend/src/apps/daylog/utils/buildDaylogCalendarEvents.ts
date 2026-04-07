import type { EventInput } from "@fullcalendar/core";

import type { DaylogEventDto } from "../api/daylogEvents";
import { applyDaylogTheme, formatDaylogTitle } from "../config/daylogEventThemes";

function sortByTime(a: EventInput, b: EventInput): number {
  return new Date(a.start as string).getTime() - new Date(b.start as string).getTime();
}

export function buildDaylogCalendarEvents(dtos: DaylogEventDto[]): EventInput[] {
  const raw = dtos.map(dtoToEventInput);
  return raw.sort(sortByTime).map((e) => applyDaylogTheme(e));
}

function dtoToEventInput(dto: DaylogEventDto): EventInput {
  return {
    id: dto.id,
    title: formatDaylogTitle(dto.eventTypeLabel, dto.customText),
    start: dto.startUtc,
    end: dto.endUtc ?? undefined,
    extendedProps: {
      daylogEventType: dto.eventType,
      daylogEventLabel: dto.eventTypeLabel,
      customText: dto.customText ?? "",
      backgroundColor: dto.backgroundColor,
      textColor: dto.textColor,
    },
  };
}
