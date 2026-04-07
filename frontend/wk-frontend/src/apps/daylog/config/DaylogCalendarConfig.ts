const hour12 = false;

const timeLabelFormat = {
    hour: "numeric" as const,
    minute: "2-digit" as const,
    hour12,
};

export const DaylogCalendarConfig = {
    minTime: "06:00:00",
    maxTime: "30:00:00",
    slotDuration: "01:00:00",
    slotLabelInterval: "01:00:00",
    firstDayOfWeek: 1,
    timeLabelFormat: timeLabelFormat,
};