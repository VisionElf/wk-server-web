using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WkApi.Data;
using WkApi.Data.Lti;

namespace WkApi.Apps.LastTime.Controllers;

[ApiController]
[Route("api/last-time")]
public class LastTimeController : ControllerBase
{
    private readonly AppDbContext _db;

    public LastTimeController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("items")]
    public async Task<ActionResult<IReadOnlyList<LtiItemDto>>> GetItems(CancellationToken ct)
    {
        var items = await _db.LtiItems
            .AsNoTracking()
            .Include(x => x.Events)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        var list = items.Select(LtiItemDto.FromEntity).ToList();
        return Ok(list);
    }

    [HttpPost("items")]
    public async Task<ActionResult<LtiItemDto>> CreateItem([FromBody] CreateLtiItemDto body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Name) || body.Name.Length > 200) {
            return BadRequest("Invalid name.");
        }

        var item = new LtiItem {
            Id = Guid.NewGuid(),
            Name = body.Name.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
        };
        _db.LtiItems.Add(item);
        await _db.SaveChangesAsync(ct);

        return Created($"/api/last-time/items/{item.Id}", LtiItemDto.FromEntity(item));
    }

    [HttpPost("items/{id:guid}/events")]
    public async Task<ActionResult<LtiItemDto>> AddEvent(Guid id, [FromBody] AddLtiEventDto? body, CancellationToken ct)
    {
        var occurredAt = body?.OccurredAt?.ToUniversalTime() ?? DateTime.UtcNow;

        var item = await _db.LtiItems.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item == null) {
            return NotFound();
        }

        var exists = item.Events.Any(e => e.OccurredAtUtc == occurredAt);
        if (!exists) {
            _db.LtiItemEvents.Add(new LtiItemEvent {
                Id = Guid.NewGuid(),
                ItemId = item.Id,
                OccurredAtUtc = occurredAt,
            });
            await _db.SaveChangesAsync(ct);
        }

        var fresh = await _db.LtiItems.AsNoTracking()
            .Include(x => x.Events)
            .FirstAsync(x => x.Id == id, ct);
        return Ok(LtiItemDto.FromEntity(fresh));
    }

    [HttpDelete("items/{id:guid}/history")]
    public async Task<ActionResult<LtiItemDto>> ClearHistory(Guid id, CancellationToken ct)
    {
        var item = await _db.LtiItems.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item == null) {
            return NotFound();
        }

        _db.LtiItemEvents.RemoveRange(item.Events);
        await _db.SaveChangesAsync(ct);

        var fresh = await _db.LtiItems.AsNoTracking()
            .Include(x => x.Events)
            .FirstAsync(x => x.Id == id, ct);
        return Ok(LtiItemDto.FromEntity(fresh));
    }

    [HttpDelete("items/{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, CancellationToken ct)
    {
        var item = await _db.LtiItems.FindAsync([id], ct);
        if (item == null) {
            return NotFound();
        }

        _db.LtiItems.Remove(item);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("history")]
    public async Task<ActionResult<IReadOnlyList<LtiHistoryEntryDto>>> GetHistory(
        [FromQuery] [Range(1, 500)] int limit = 100,
        CancellationToken ct = default)
    {
        var rows = await _db.LtiItemEvents
            .AsNoTracking()
            .Include(e => e.Item)
            .OrderByDescending(e => e.OccurredAtUtc)
            .Take(limit)
            .Select(e => new LtiHistoryEntryDto(
                e.Id,
                e.ItemId,
                e.Item.Name,
                e.OccurredAtUtc))
            .ToListAsync(ct);

        return Ok(rows);
    }

    public record CreateLtiItemDto([Required] [MaxLength(200)] string Name);

    public record AddLtiEventDto(DateTime? OccurredAt);

    public record LtiItemDto(
        Guid Id,
        string Name,
        DateTime? LastChangedAtUtc,
        int HistoryCount)
    {
        public static LtiItemDto FromEntity(LtiItem x)
        {
            var last = x.Events.Count == 0
                ? (DateTime?)null
                : x.Events.Max(e => e.OccurredAtUtc);
            return new LtiItemDto(x.Id, x.Name, last, x.Events.Count);
        }
    }

    public record LtiHistoryEntryDto(Guid Id, Guid ItemId, string ItemName, DateTime OccurredAtUtc);
}
