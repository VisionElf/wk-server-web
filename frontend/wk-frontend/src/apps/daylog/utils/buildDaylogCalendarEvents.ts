import type { EventInput } from "@fullcalendar/core";

import type { DaylogEventDto } from "../api/daylogEvents";
import { applyDaylogTheme, formatDaylogTitle } from "../config/daylogEventThemes";

function sortByTime(a: EventInput, b: EventInput): number {
  return new Date(a.start as string).getTime() - new Date(b.start as string).getTime();
}

export function buildDaylogCalendarEvents(dtos: DaylogEventDto[]): EventInput[] {
  let raw = dtos.map(dtoToEventInput);
  raw = configureSleepEvents(raw);
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

function configureSleepEvents(events: EventInput[]): EventInput[] {
  const results: EventInput[] = [];
  let currentSleepEvent: EventInput | undefined = undefined;
  for (const event of events) {
    if (event.extendedProps?.daylogEventType === "sleep_start") {
      currentSleepEvent = event;
      results.push(event);
    }
    else if (event.extendedProps?.daylogEventType === "sleep_end") {
      results.push(event);
      let newEvent = {
        start: currentSleepEvent?.start,
        end: event.start,
        display: "background",
        extendedProps: {
          backgroundColor: "#0000aa",
          textColor: "#eeeeee",
        }
      };
      results.push(newEvent);
      currentSleepEvent = undefined;
    }
    else {
      results.push(event);
    }
  }
  return results;
}