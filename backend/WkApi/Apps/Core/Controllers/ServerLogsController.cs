using Microsoft.AspNetCore.Mvc;
using WkApi.Infrastructure.Logging;

namespace WkApi.Apps.Core.Controllers;

[ApiController]
[Route("api/server-logs")]
public class ServerLogsController : ControllerBase
{
    private readonly ServerLogBuffer _buffer;
    private readonly IWebHostEnvironment _env;

    public ServerLogsController(ServerLogBuffer buffer, IWebHostEnvironment env)
    {
        _buffer = buffer;
        _env = env;
    }

    [HttpGet]
    public ActionResult<ServerLogsResponse> Get()
    {
        if (!_env.IsDevelopment()) {
            return NotFound();
        }

        return Ok(new ServerLogsResponse(_buffer.Snapshot()));
    }
}

public record ServerLogsResponse(IReadOnlyList<string> Lines);
