import type { EventInput } from "@fullcalendar/core/index.js";
import { CreateSleepSlots } from "../utils/eventsUtils";

type EventTheme = {
    color: string;
    text?: string;
};

const defaultTheme: EventTheme = {
    color: "#000000",
    text: "#eeeeee",
};

const eventThemes: Record<string, EventTheme> = {
    "sleep-start": {
        color: "#0000aa",
    },
    "sleep-end": {
        color: "#0000aa",
    },
    "workout": {
        color: "#ff5500",
    },
    "sleep-slot": {
        color: "#000033",
    },
    "party": {
        color: "#aa0000",
    },
    "chore": {
        color: "#005599",
    },
    "appointment": {
        color: "#006600",
    },
    "movie": {
        color: "#995500",
    }
};

function sortByTime(a: EventInput, b: EventInput): number {
    return new Date(a.start as string).getTime() - new Date(b.start as string).getTime();
}

function applyTheme(event: EventInput): EventInput {
    const theme = eventThemes[event.eventType as keyof typeof eventThemes] ?? defaultTheme;
    if (theme) {
        event.backgroundColor = theme.color;
        event.borderColor = theme.color;
        if (theme.text) {
            event.textColor = theme.text;
        } else {
            event.textColor = defaultTheme.text;
        }
    }
    return event;
}

export function getDaylogEvents(): EventInput[] {
    let events: EventInput[] = [
        {
            title: "Wake Up",
            start: "2026-04-07T09:00:00",
            eventType: "sleep-end"
        },
        {
            title: "Sleep",
            start: "2026-04-06T22:00:00",
            eventType: "sleep-start"
        },
        {
            title: "Workout (2.5km)",
            start: "2026-04-07T15:00:00",
            end: "2026-04-07T17:00:00",
            eventType: "workout"
        },
        {
            title: "Evening",
            start: "2026-04-07T20:00:00",
            end: "2026-04-08T02:00:00",
            eventType: "party"
        },
        {
            title: "Laundry",
            start: "2026-04-12T21:00:00",
            eventType: "chore"
        },
        {
            title: "Doctor",
            start: "2026-04-10T10:00:00",
            eventType: "appointment"
        },
        {
            title: "The Matrix",
            start: "2026-04-08T20:00:00",
            end: "2026-04-08T22:00:00",
            eventType: "movie"
        }
    ];

    events = CreateSleepSlots(events.sort(sortByTime));
    events = events.map(event => applyTheme(event));
    return events;
}