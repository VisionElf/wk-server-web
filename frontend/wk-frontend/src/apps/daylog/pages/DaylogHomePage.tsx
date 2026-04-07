import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useCallback, useRef, useState } from "react";

import { fetchDaylogEvents, updateDaylogEvent } from "../api/daylogEvents";
import { fetchDaylogEventTypes } from "../api/daylogEventTypes";
import { DaylogCalendar, type EventTimesChangeArg } from "../components/DaylogCalendar";
import { DaylogModal, type DaylogModalDraft } from "../components/DaylogModal";
import { buildDaylogCalendarEvents } from "../utils/buildDaylogCalendarEvents";

type CalendarInteractionArg = DateClickArg | DateSelectArg | EventClickArg;

function defaultEventTypeCode(): string {
  return "custom";
}

export default function DaylogHomePage() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDraft, setModalDraft] = useState<DaylogModalDraft | null>(null);
  const visibleRangeRef = useRef<{ start: Date; end: Date } | null>(null);

  const reload = useCallback(async (start: Date, end: Date) => {
    const dtos = await fetchDaylogEvents(start, end);
    setEvents(buildDaylogCalendarEvents(dtos));
  }, []);

  const onDatesSet = useCallback(
    (range: { start: Date; end: Date }) => {
      visibleRangeRef.current = range;
      void reload(range.start, range.end);
    },
    [reload],
  );

  const refetchVisible = useCallback(async () => {
    const r = visibleRangeRef.current;
    if (r) {
      await reload(r.start, r.end);
    }
  }, [reload]);

  async function resolveDefaultTypeCode(): Promise<string> {
    try {
      const types = await fetchDaylogEventTypes();
      const first = types[0]?.code;
      return first ?? defaultEventTypeCode();
    } catch {
      return defaultEventTypeCode();
    }
  }

  function openModal(draft: DaylogModalDraft) {
    setModalDraft(draft);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  async function handleInteraction(args: CalendarInteractionArg) {
    if ("event" in args && args.event) {
      const e = args.event;
      const ext = e.extendedProps as { daylogEventType?: string; customText?: string };
      openModal({
        mode: "edit",
        id: e.id,
        eventType: ext.daylogEventType ?? defaultEventTypeCode(),
        start: e.start!,
        end: e.end ?? null,
        customText: ext.customText ?? "",
      });
      return;
    }
    if ("start" in args && "end" in args && args.start) {
      const code = await resolveDefaultTypeCode();
      openModal({
        mode: "create",
        eventType: code,
        start: args.start,
        end: args.end ?? null,
        customText: "",
      });
      return;
    }
    if ("date" in args && args.date) {
      const code = await resolveDefaultTypeCode();
      openModal({
        mode: "create",
        eventType: code,
        start: args.date,
        end: null,
        customText: "",
      });
    }
  }

  async function handleEventTimesChange(info: EventTimesChangeArg) {
    const id = info.event.id;
    if (!id) {
      info.revert();
      return;
    }
    const ext = info.event.extendedProps as { daylogEventType?: string; customText?: string };
    try {
      await updateDaylogEvent(id, {
        eventType: ext.daylogEventType ?? defaultEventTypeCode(),
        startUtc: info.event.start!,
        endUtc: info.event.end ?? null,
        customText: ext.customText ? ext.customText : null,
      });
      const view = info.view;
      await reload(view.activeStart, view.activeEnd);
    } catch {
      info.revert();
    }
  }

  return (
    <div className="app-page">
      <DaylogCalendar
        events={events}
        onDatesSet={onDatesSet}
        onInteraction={handleInteraction}
        onEventTimesChange={handleEventTimesChange}
      />
      <DaylogModal
        isOpen={isModalOpen}
        draft={modalDraft}
        onClose={closeModal}
        onSaved={refetchVisible}
      />
    </div>
  );
}
