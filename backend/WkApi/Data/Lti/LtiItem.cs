namespace WkApi.Data.Lti;

/// <summary>
/// Tracked item for the Last Time I Have app (schema lti).
/// </summary>
public class LtiItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<LtiItemEvent> Events { get; set; } = new List<LtiItemEvent>();
}
