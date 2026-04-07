namespace WkApi.Apps.Daylog;

/// <summary>Allowed daylog event type values (stored as strings in the database).</summary>
public static class DaylogEventTypes
{
    public const string SleepStart = "sleep_start";
    public const string SleepEnd = "sleep_end";
    public const string Workout = "workout";
    public const string Appointment = "appointment";
    public const string Chore = "chore";
    public const string Social = "social";
    public const string Custom = "custom";

    public static readonly IReadOnlyList<string> All =
    [
        SleepStart,
        SleepEnd,
        Workout,
        Appointment,
        Chore,
        Social,
        Custom,
    ];

    public static bool IsAllowed(string? value) =>
        value != null && All.Contains(value);
}
