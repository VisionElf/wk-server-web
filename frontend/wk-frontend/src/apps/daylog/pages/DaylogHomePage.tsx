import { useState } from "react";
import type { DateInput, EventInput } from "@fullcalendar/core/index.js";

import { DaylogCalendar } from "../components/DaylogCalendar";
import { DaylogModal } from "../components/DaylogModal";


export default function SampleHomePage() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [event, setEvent] = useState<EventInput | null>(null);
  const [dateRange, setDateRange] = useState<{ start: DateInput, end: DateInput | null } | null>(null);

  const showModal = (args: any) => {
    if (args.event) {
      setEvent(args.event);
      setDateRange({ start: args.event.start, end: args.event.end });
    } else if (args.date){
      setEvent(null);
      setDateRange({ start: args.date, end: null })
    } else {
      setDateRange({ start: args.start, end: args.end })
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="app-page">
      <DaylogCalendar showModal={showModal} />
      <DaylogModal
        isOpen={isModalOpen}
        onClose={closeModal}
        event={event}
        dateRange={dateRange}
      />
    </div>
  );
}
