using Microsoft.AspNetCore.Mvc;
using WkApi.Infrastructure.Logging;

namespace WkApi.Controllers;

[ApiController]
[Route("api/server-logs")]
public class ServerLogsController : ControllerBase
{
    private readonly ServerLogBuffer _buffer;

    public ServerLogsController(ServerLogBuffer buffer)
    {
        _buffer = buffer;
    }

    [HttpGet]
    public ActionResult<ServerLogsResponse> Get()
    {
        return Ok(new ServerLogsResponse(_buffer.Snapshot()));
    }
}

public record ServerLogsResponse(IReadOnlyList<string> Lines);
