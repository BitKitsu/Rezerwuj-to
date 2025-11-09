using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using IdentityService.Services;
using IdentityService.Models;

namespace IdentityService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Wymagaj autoryzacji
public class AuditController : ControllerBase
{
    private readonly IAuditService _auditService;
    private readonly ILogger<AuditController> _logger;
    
    public AuditController(IAuditService auditService, ILogger<AuditController> logger)
    {
        _auditService = auditService;
        _logger = logger;
    }
    
    // GET: api/audit
    [HttpGet]
    public async Task<ActionResult<List<AuditLog>>> GetAuditLogs([FromQuery] int take = 100)
    {
        var logs = await _auditService.GetAuditLogsAsync(null, take);
        return Ok(logs);
    }
    
    // GET: api/audit/user/abc-123
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<AuditLog>>> GetUserAuditLogs(string userId, [FromQuery] int take = 100)
    {
        var logs = await _auditService.GetAuditLogsAsync(userId, take);
        return Ok(logs);
    }
    
    // GET: api/audit/my
    [HttpGet("my")]
    public async Task<ActionResult<List<AuditLog>>> GetMyAuditLogs([FromQuery] int take = 100)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest("User not found");
        }
        
        var logs = await _auditService.GetAuditLogsAsync(userId, take);
        return Ok(logs);
    }
    
    // POST: api/audit/log
    [HttpPost("log")]
    public async Task<IActionResult> LogAction([FromBody] LogActionDto dto)
    {
        await _auditService.LogAsync(
            dto.Action,
            dto.EntityName,
            dto.EntityId,
            dto.OldValues,
            dto.NewValues
        );
        
        return Ok(new { message = "Action logged successfully" });
    }
}

public class LogActionDto
{
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public object? OldValues { get; set; }
    public object? NewValues { get; set; }
}
