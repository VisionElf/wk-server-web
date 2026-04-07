import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useCallback, useRef, useState } from "react";

import { fetchDaylogEvents, updateDaylogEvent } from "../api/daylogEvents";
import { DaylogCalendar, type EventTimesChangeArg } from "../components/DaylogCalendar";
import { DaylogModal, type DaylogModalDraft } from "../components/DaylogModal";
import type { DaylogEventKind } from "../types/daylogEventKinds";
import { buildDaylogCalendarEvents } from "../utils/buildDaylogCalendarEvents";

type CalendarInteractionArg = DateClickArg | DateSelectArg | EventClickArg;

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

  const refetchVisible = useCallback(() => {
    const r = visibleRangeRef.current;
    if (r) {
      void reload(r.start, r.end);
    }
  }, [reload]);

  function openModal(draft: DaylogModalDraft) {
    setModalDraft(draft);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handleInteraction(args: CalendarInteractionArg) {
    if ("event" in args && args.event) {
      const e = args.event;
      const ext = e.extendedProps as { daylogEventType?: string; customText?: string };
      openModal({
        mode: "edit",
        id: e.id,
        eventType: (ext.daylogEventType as DaylogEventKind) ?? "custom",
        start: e.start!,
        end: e.end ?? null,
        customText: ext.customText ?? "",
      });
      return;
    }
    if ("start" in args && "end" in args && args.start) {
      openModal({
        mode: "create",
        eventType: "custom",
        start: args.start,
        end: args.end ?? null,
        customText: "",
      });
      return;
    }
    if ("date" in args && args.date) {
      openModal({
        mode: "create",
        eventType: "custom",
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
        eventType: (ext.daylogEventType as DaylogEventKind) ?? "custom",
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
