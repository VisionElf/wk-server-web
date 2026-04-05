namespace WkApi.Apps.Health.Entities;

/// <summary>
/// Weight information for the Health app.
/// </summary>
public class WeightInfo
{
    public Guid Id { get; set; }

    public DateTime MeasuredAtUtc { get; set; }
    public double WeightInKilograms { get; set; }
}
