import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import "../css/daylog-calendar.css";

import { DaylogCalendarConfig } from "../config/DaylogCalendarConfig";
import { getDaylogEvents } from "../config/DaylogEvents";

/**
 * Week view uses the timeGrid plugin.
 * @see https://fullcalendar.io/docs/timegrid-view
 */
export function DaylogCalendar({ showModal }: { showModal: (args: any) => void }) {
  const events = getDaylogEvents();
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
        dateClick={showModal}
        eventClick={showModal}
        select={showModal}
        selectable={true}
      />
    </div>
  );
}