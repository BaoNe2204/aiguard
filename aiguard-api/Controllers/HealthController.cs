using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AiguardDbContext _db;

    public HealthController(AiguardDbContext db) => _db = db;

    [HttpGet("live")]
    public IActionResult Live() =>
        Ok(ApiResponse<object>.Ok(new
        {
            status = "Healthy",
            service = "aiguard-api",
            timestamp = DateTime.UtcNow
        }));

    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        var databaseReady = await _db.Database.CanConnectAsync();
        if (!databaseReady)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                ApiResponse<object>.Fail("Database is unavailable"));

        return Ok(ApiResponse<object>.Ok(new
        {
            status = "Ready",
            database = "Connected",
            timestamp = DateTime.UtcNow
        }));
    }
}
