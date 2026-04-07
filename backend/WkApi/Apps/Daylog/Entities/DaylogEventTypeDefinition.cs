namespace WkApi.Apps.Daylog.Entities;

/// <summary>User-configurable event type (code, label, colors). Referenced by <see cref="DaylogEvent.EventType"/>.</summary>
public class DaylogEventTypeDefinition
{
    public Guid Id { get; set; }

    /// <summary>Stable machine id (unique), stored on <see cref="DaylogEvent.EventType"/>.</summary>
    public string Code { get; set; } = "";

    public string Label { get; set; } = "";

    public string BackgroundColor { get; set; } = "#333333";

    public string? TextColor { get; set; }

    public int SortOrder { get; set; }

    public ICollection<DaylogEvent> Events { get; set; } = new List<DaylogEvent>();
}
