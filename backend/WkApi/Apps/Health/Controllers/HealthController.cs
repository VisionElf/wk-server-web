using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WkApi.Core.Data;
using WkApi.Apps.Health.Entities;

namespace WkApi.Apps.Health.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("weights")]
    public async Task<ActionResult<IReadOnlyList<WeightInfo>>> GetWeights([FromQuery] DateTime startAtUtc, [FromQuery] DateTime? endAtUtc, CancellationToken ct)
    {
        var weights = await _db.WeightInfos
            .Where(x => x.MeasuredAtUtc >= startAtUtc.ToUniversalTime() && (endAtUtc == null || x.MeasuredAtUtc <= endAtUtc.Value.ToUniversalTime()))
            .ToListAsync(ct);
        return Ok(weights);
    }

    /// <summary>Global min/max weight (all time), with the earliest date for each tied value.</summary>
    [HttpGet("weights/stats")]
    public async Task<ActionResult<WeightStatsDto?>> GetWeightStats(CancellationToken ct)
    {
        if (!await _db.WeightInfos.AnyAsync(ct)) {
            return Ok(null);
        }

        var minVal = await _db.WeightInfos.MinAsync(x => x.WeightInKilograms, ct);
        var maxVal = await _db.WeightInfos.MaxAsync(x => x.WeightInKilograms, ct);
        var minRow = await _db.WeightInfos
            .Where(x => x.WeightInKilograms == minVal)
            .OrderBy(x => x.MeasuredAtUtc)
            .FirstAsync(ct);
        var maxRow = await _db.WeightInfos
            .Where(x => x.WeightInKilograms == maxVal)
            .OrderBy(x => x.MeasuredAtUtc)
            .FirstAsync(ct);
        var latest = await _db.WeightInfos
            .OrderByDescending(x => x.MeasuredAtUtc)
            .FirstAsync(ct);

        return Ok(new WeightStatsDto(
            minRow.WeightInKilograms,
            minRow.MeasuredAtUtc,
            maxRow.WeightInKilograms,
            maxRow.MeasuredAtUtc,
            latest.WeightInKilograms,
            latest.MeasuredAtUtc));
    }

    public record WeightStatsDto(
        double MinWeightKg,
        DateTime MinMeasuredAtUtc,
        double MaxWeightKg,
        DateTime MaxMeasuredAtUtc,
        double LatestWeightKg,
        DateTime LatestMeasuredAtUtc);

    public record CreateWeightDto(DateTime MeasuredAtUtc, double WeightInKilograms);

    [HttpPost("weights")]
    public async Task<ActionResult<WeightInfo>> CreateWeight([FromBody] CreateWeightDto body, CancellationToken ct)
    {
        if (body.WeightInKilograms <= 0) {
            return BadRequest("WeightInKilograms must be greater than 0.");
        }

        var weight = new WeightInfo {
            Id = Guid.NewGuid(),
            MeasuredAtUtc = body.MeasuredAtUtc.ToUniversalTime(),
            WeightInKilograms = body.WeightInKilograms,
        };
        _db.WeightInfos.Add(weight);
        await _db.SaveChangesAsync(ct);

        return Created($"/api/health/weights/{weight.Id}", weight);
    }

    public record ImportWeightsResultDto(int Imported, int Skipped);

    /// <summary>Batch-create weights from CSV import. Invalid rows are skipped; valid rows are inserted in one transaction.</summary>
    [HttpPost("weights/import")]
    public async Task<ActionResult<ImportWeightsResultDto>> ImportWeights([FromBody] IReadOnlyList<CreateWeightDto>? items, CancellationToken ct)
    {
        if (items == null || items.Count == 0) {
            return BadRequest("At least one row is required.");
        }

        var skipped = 0;
        foreach (var body in items) {
            if (body.WeightInKilograms <= 0) {
                skipped++;
                continue;
            }

            _db.WeightInfos.Add(new WeightInfo {
                Id = Guid.NewGuid(),
                MeasuredAtUtc = body.MeasuredAtUtc.ToUniversalTime(),
                WeightInKilograms = body.WeightInKilograms,
            });
        }

        await _db.SaveChangesAsync(ct);
        var imported = items.Count - skipped;
        return Ok(new ImportWeightsResultDto(imported, skipped));
    }

    [HttpDelete("weights/{id:guid}")]
    public async Task<IActionResult> DeleteWeight(Guid id, CancellationToken ct)
    {
        var weight = await _db.WeightInfos.FindAsync([id], ct);
        if (weight == null) {
            return NotFound();
        }
        _db.WeightInfos.Remove(weight);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}