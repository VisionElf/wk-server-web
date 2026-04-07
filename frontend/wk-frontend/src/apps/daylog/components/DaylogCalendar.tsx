import type { DateSelectArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import "../css/daylog-calendar.css";

import { DaylogCalendarConfig } from "../config/DaylogCalendarConfig";

type CalendarInteractionArg = DateClickArg | DateSelectArg | EventClickArg;

/** After drag or resize; includes `revert()` to roll back the UI if the API call fails. */
export type EventTimesChangeArg = EventDropArg | EventResizeDoneArg;

export function DaylogCalendar({
  events,
  onDatesSet,
  onInteraction,
  onEventTimesChange,
}: {
  events: EventInput[];
  onDatesSet: (range: { start: Date; end: Date }) => void;
  onInteraction: (args: CalendarInteractionArg) => void;
  onEventTimesChange: (info: EventTimesChangeArg) => void | Promise<void>;
}) {
  return (
    <div className="daylog-calendar">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        firstDay={DaylogCalendarConfig.firstDayOfWeek}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek",
        }}
        height="auto"
        allDaySlot={false}
        slotMinTime={DaylogCalendarConfig.minTime}
        slotMaxTime={DaylogCalendarConfig.maxTime}
        slotDuration={DaylogCalendarConfig.slotDuration}
        slotLabelInterval={DaylogCalendarConfig.slotLabelInterval}
        slotLabelFormat={DaylogCalendarConfig.timeLabelFormat}
        eventTimeFormat={DaylogCalendarConfig.timeLabelFormat}
        events={events}
        datesSet={(info) => onDatesSet({ start: info.start, end: info.end })}
        dateClick={onInteraction}
        eventClick={onInteraction}
        select={onInteraction}
        selectable={true}
        editable={true}
        eventDurationEditable={true}
        eventStartEditable={true}
        eventDrop={onEventTimesChange}
        eventResize={onEventTimesChange}
      />
    </div>
  );
}
