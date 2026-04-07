using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WkApi.Apps.Daylog;
using WkApi.Apps.Daylog.Entities;
using WkApi.Core.Data;

namespace WkApi.Apps.Daylog.Controllers;

[ApiController]
[Route("api/daylog")]
public class DaylogController : ControllerBase
{
    private readonly AppDbContext _db;

    public DaylogController(AppDbContext db)
    {
        _db = db;
    }

    public record DaylogEventDto(
        Guid Id,
        string EventType,
        DateTime StartUtc,
        DateTime? EndUtc,
        string? CustomText);

    public record CreateDaylogEventDto(string EventType, DateTime StartUtc, DateTime? EndUtc, string? CustomText);

    public record UpdateDaylogEventDto(string EventType, DateTime StartUtc, DateTime? EndUtc, string? CustomText);

    [HttpGet("events")]
    public async Task<ActionResult<IReadOnlyList<DaylogEventDto>>> GetEvents(
        [FromQuery] DateTime startAtUtc,
        [FromQuery] DateTime endAtUtc,
        CancellationToken ct)
    {
        var start = startAtUtc.ToUniversalTime();
        var end = endAtUtc.ToUniversalTime();
        if (end <= start) {
            return BadRequest("endAtUtc must be after startAtUtc.");
        }

        var rows = await _db.DaylogEvents
            .AsNoTracking()
            .Where(e => e.StartUtc < end && (e.EndUtc == null ? e.StartUtc >= start : e.EndUtc > start))
            .OrderBy(e => e.StartUtc)
            .ToListAsync(ct);

        return Ok(rows.Select(ToDto).ToList());
    }

    [HttpPost("events")]
    public async Task<ActionResult<DaylogEventDto>> Create([FromBody] CreateDaylogEventDto body, CancellationToken ct)
    {
        if (!DaylogEventTypes.IsAllowed(body.EventType)) {
            return BadRequest("Invalid event type.");
        }

        var validation = ValidateTimes(body.StartUtc, body.EndUtc);
        if (validation != null) {
            return BadRequest(validation);
        }

        var entity = new DaylogEvent {
            Id = Guid.NewGuid(),
            EventType = body.EventType,
            StartUtc = body.StartUtc.ToUniversalTime(),
            EndUtc = body.EndUtc?.ToUniversalTime(),
            CustomText = string.IsNullOrWhiteSpace(body.CustomText) ? null : body.CustomText.Trim(),
        };
        _db.DaylogEvents.Add(entity);
        await _db.SaveChangesAsync(ct);

        return Created($"/api/daylog/events/{entity.Id}", ToDto(entity));
    }

    [HttpPut("events/{id:guid}")]
    public async Task<ActionResult<DaylogEventDto>> Update(Guid id, [FromBody] UpdateDaylogEventDto body, CancellationToken ct)
    {
        if (!DaylogEventTypes.IsAllowed(body.EventType)) {
            return BadRequest("Invalid event type.");
        }

        var validation = ValidateTimes(body.StartUtc, body.EndUtc);
        if (validation != null) {
            return BadRequest(validation);
        }

        var entity = await _db.DaylogEvents.FindAsync([id], ct);
        if (entity == null) {
            return NotFound();
        }

        entity.EventType = body.EventType;
        entity.StartUtc = body.StartUtc.ToUniversalTime();
        entity.EndUtc = body.EndUtc?.ToUniversalTime();
        entity.CustomText = string.IsNullOrWhiteSpace(body.CustomText) ? null : body.CustomText.Trim();

        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(entity));
    }

    [HttpDelete("events/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await _db.DaylogEvents.FindAsync([id], ct);
        if (entity == null) {
            return NotFound();
        }

        _db.DaylogEvents.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static DaylogEventDto ToDto(DaylogEvent e) =>
        new(e.Id, e.EventType, e.StartUtc, e.EndUtc, e.CustomText);

    private static string? ValidateTimes(DateTime start, DateTime? end)
    {
        var startUtc = start.ToUniversalTime();
        if (end == null) {
            return null;
        }

        var endUtc = end.Value.ToUniversalTime();
        return endUtc < startUtc ? "End time must be on or after start time." : null;
    }
}
