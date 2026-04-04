namespace WkApi.Data.Lti;

public class LtiItemEvent
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public LtiItem Item { get; set; } = null!;
    /// <summary>When the item was marked as changed (UTC).</summary>
    public DateTime OccurredAtUtc { get; set; }
}
