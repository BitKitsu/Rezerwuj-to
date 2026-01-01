using IdentityService.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace IdentityService.Controllers;

[ApiController]
[Route("api/public/company/{companyId}/users")]
public class PublicCompanyUsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public PublicCompanyUsersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    [HttpPost("resolve")]
    [AllowAnonymous]
    public async Task<ActionResult<List<PublicUserDto>>> ResolveCompanyUsers(
        int companyId,
        [FromBody] ResolveCompanyUsersRequest request)
    {
        var userIds = (request.UserIds ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct()
            .ToList();

        if (userIds.Count == 0)
        {
            return Ok(new List<PublicUserDto>());
        }

        if (userIds.Count > 200)
        {
            return BadRequest(new { message = "Too many userIds (max 200)." });
        }

        var users = await _userManager.Users
            .AsNoTracking()
            .Where(u => u.CompanyId == companyId && userIds.Contains(u.Id))
            .Select(u => new PublicUserDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName
            })
            .ToListAsync();

        return Ok(users);
    }
}

public class ResolveCompanyUsersRequest
{
    [Required]
    public List<string> UserIds { get; set; } = new();
}

public class PublicUserDto
{
    public string Id { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}
