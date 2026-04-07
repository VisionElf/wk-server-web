using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WkApi.Apps.Daylog.Entities;
using WkApi.Core.Data;

namespace WkApi.Apps.Daylog.Controllers;

[ApiController]
[Route("api/daylog/event-types")]
public class DaylogEventTypesController : ControllerBase
{
    private static readonly Regex CodePattern = new(@"^[a-z][a-z0-9_]{0,63}$", RegexOptions.Compiled);

    private readonly AppDbContext _db;

    public DaylogEventTypesController(AppDbContext db)
    {
        _db = db;
    }

    public record DaylogEventTypeDto(
        Guid Id,
        string Code,
        string Label,
        string BackgroundColor,
        string? TextColor,
        int SortOrder);

    public record CreateDaylogEventTypeDto(
        string Code,
        string Label,
        string BackgroundColor,
        string? TextColor,
        int? SortOrder);

    public record UpdateDaylogEventTypeDto(
        string Label,
        string BackgroundColor,
        string? TextColor,
        int SortOrder);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DaylogEventTypeDto>>> List(CancellationToken ct)
    {
        var rows = await _db.DaylogEventTypeDefinitions
            .AsNoTracking()
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Label)
            .ToListAsync(ct);
        return Ok(rows.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<DaylogEventTypeDto>> Create([FromBody] CreateDaylogEventTypeDto body, CancellationToken ct)
    {
        if (body.Code == null || !CodePattern.IsMatch(body.Code)) {
            return BadRequest("Code must start with a letter and contain only lowercase letters, digits, and underscores (max 64).");
        }

        if (string.IsNullOrWhiteSpace(body.Label)) {
            return BadRequest("Label is required.");
        }

        if (!DaylogColorValidation.IsValidHex6(body.BackgroundColor)) {
            return BadRequest("BackgroundColor must be a #RRGGBB hex color.");
        }

        if (!DaylogColorValidation.IsValidOptionalHex6(body.TextColor)) {
            return BadRequest("TextColor must be null or a #RRGGBB hex color.");
        }

        if (await _db.DaylogEventTypeDefinitions.AnyAsync(t => t.Code == body.Code, ct)) {
            return Conflict("An event type with this code already exists.");
        }

        var maxOrder = await _db.DaylogEventTypeDefinitions.MaxAsync(t => (int?)t.SortOrder, ct) ?? -1;
        var sort = body.SortOrder ?? maxOrder + 1;

        var entity = new DaylogEventTypeDefinition {
            Id = Guid.NewGuid(),
            Code = body.Code,
            Label = body.Label.Trim(),
            BackgroundColor = body.BackgroundColor,
            TextColor = string.IsNullOrWhiteSpace(body.TextColor) ? null : body.TextColor,
            SortOrder = sort,
        };
        _db.DaylogEventTypeDefinitions.Add(entity);
        await _db.SaveChangesAsync(ct);

        return Created($"/api/daylog/event-types/{entity.Id}", ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DaylogEventTypeDto>> Update(Guid id, [FromBody] UpdateDaylogEventTypeDto body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Label)) {
            return BadRequest("Label is required.");
        }

        if (!DaylogColorValidation.IsValidHex6(body.BackgroundColor)) {
            return BadRequest("BackgroundColor must be a #RRGGBB hex color.");
        }

        if (!DaylogColorValidation.IsValidOptionalHex6(body.TextColor)) {
            return BadRequest("TextColor must be null or a #RRGGBB hex color.");
        }

        var entity = await _db.DaylogEventTypeDefinitions.FindAsync([id], ct);
        if (entity == null) {
            return NotFound();
        }

        entity.Label = body.Label.Trim();
        entity.BackgroundColor = body.BackgroundColor;
        entity.TextColor = string.IsNullOrWhiteSpace(body.TextColor) ? null : body.TextColor;
        entity.SortOrder = body.SortOrder;

        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entity = await _db.DaylogEventTypeDefinitions.FindAsync([id], ct);
        if (entity == null) {
            return NotFound();
        }

        var inUse = await _db.DaylogEvents.AnyAsync(e => e.EventType == entity.Code, ct);
        if (inUse) {
            return Conflict("This type is used by existing events; delete or reassign those events first.");
        }

        _db.DaylogEventTypeDefinitions.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static DaylogEventTypeDto ToDto(DaylogEventTypeDefinition e) =>
        new(e.Id, e.Code, e.Label, e.BackgroundColor, e.TextColor, e.SortOrder);
}
