using Microsoft.AspNetCore.Mvc;

namespace WkApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HelloController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { message = "Hello from ASP.NET Core API" });
    }
}