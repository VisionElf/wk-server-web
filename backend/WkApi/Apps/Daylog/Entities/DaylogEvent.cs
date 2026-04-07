namespace WkApi.Apps.Daylog.Entities;

public class DaylogEvent
{
    public Guid Id { get; set; }

    public string EventType { get; set; } = "";

    public DateTime StartUtc { get; set; }

    public DateTime? EndUtc { get; set; }

    public string? CustomText { get; set; }
}
