namespace WkApi.Apps.Daylog.Entities;

public class DaylogEvent
{
    public Guid Id { get; set; }

    /// <summary>FK to <see cref="DaylogEventTypeDefinition.Code"/>.</summary>
    public string EventType { get; set; } = "";

    public DaylogEventTypeDefinition? TypeDefinition { get; set; }

    public DateTime StartUtc { get; set; }

    public DateTime? EndUtc { get; set; }

    public string? CustomText { get; set; }
}
