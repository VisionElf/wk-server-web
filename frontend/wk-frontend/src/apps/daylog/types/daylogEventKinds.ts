/** Matches backend <see cref="WkApi.Apps.Daylog.DaylogEventTypes" /> */

export const DAYLOG_EVENT_TYPES = [
  "sleep_start",
  "sleep_end",
  "workout",
  "appointment",
  "chore",
  "social",
  "custom",
] as const;

export type DaylogEventKind = (typeof DAYLOG_EVENT_TYPES)[number];

export const DAYLOG_EVENT_LABELS: Record<DaylogEventKind, string> = {
  sleep_start: "Sleep",
  sleep_end: "Awaken",
  workout: "Workout",
  appointment: "Appointment",
  chore: "Chore",
  social: "Social",
  custom: "Custom",
};
