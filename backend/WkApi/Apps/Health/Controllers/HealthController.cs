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