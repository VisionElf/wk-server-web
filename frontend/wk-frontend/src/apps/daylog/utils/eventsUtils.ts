import type { EventInput } from "@fullcalendar/core/index.js";

export function CreateSleepSlots(events: EventInput[]): EventInput[] {
    const sleepSlots: EventInput[] = [];
    let currentSlot: EventInput | undefined = undefined;
    for (let event of events) {
        if (event.eventType === "sleep-start") {
            currentSlot = {
                title: "Sleeping",
                start: event.start,
                eventType: "sleep-slot",
            };
        } else if (event.eventType === "sleep-end" && currentSlot !== undefined) {
            currentSlot.end = event.start;
            sleepSlots.push(currentSlot);
            currentSlot = undefined;
        } else {
            sleepSlots.push(event);
        }
    }
    return sleepSlots;
}