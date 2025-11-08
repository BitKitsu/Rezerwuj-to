using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using IdentityService.Services;

namespace IdentityService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RefreshTokenController : ControllerBase
{
    private readonly IJwtService _jwtService;
    private readonly ILogger<RefreshTokenController> _logger;
    
    public RefreshTokenController(IJwtService jwtService, ILogger<RefreshTokenController> logger)
    {
        _jwtService = jwtService;
        _logger = logger;
    }
    
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrEmpty(request.RefreshToken))
        {
            return BadRequest("Refresh token is required");
        }
        
        var result = await _jwtService.RefreshTokenAsync(request.RefreshToken);
        
        if (result == null)
        {
            _logger.LogWarning("Invalid refresh token attempt");
            return Unauthorized("Invalid refresh token");
        }
        
        _logger.LogInformation("Token refreshed successfully");
        return Ok(result);
    }
    
    [HttpPost("revoke")]
    [Authorize]
    public async Task<IActionResult> RevokeToken([FromBody] RevokeTokenRequest request)
    {
        await _jwtService.RevokeTokenAsync(request.RefreshToken);
        _logger.LogInformation("Token revoked");
        return Ok(new { message = "Token revoked successfully" });
    }
    
    [HttpPost("revoke-all")]
    [Authorize]
    public async Task<IActionResult> RevokeAllTokens()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest("User not found");
        }
        
        await _jwtService.RevokeAllUserTokensAsync(userId);
        _logger.LogInformation("All tokens revoked for user {UserId}", userId);
        return Ok(new { message = "All tokens revoked successfully" });
    }
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class RevokeTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}
