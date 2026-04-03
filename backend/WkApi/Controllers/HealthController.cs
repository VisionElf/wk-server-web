using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WkApi.Data;

namespace WkApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Checks that the API can open a connection to PostgreSQL (database may exist empty).
    /// </summary>
    [HttpGet("db")]
    public async Task<IActionResult> Database([FromServices] AppDbContext db, CancellationToken cancellationToken)
    {
        try
        {
            var canConnect = await db.Database.CanConnectAsync(cancellationToken);
            if (!canConnect)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { connected = false, message = "Cannot connect to the database server." });
            }

            var connection = db.Database.GetDbConnection();
            return Ok(new
            {
                connected = true,
                database = connection.Database,
                dataSource = connection.DataSource
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { connected = false, message = ex.Message });
        }
    }
}
