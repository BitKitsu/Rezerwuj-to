using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using IdentityService.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = "Admin")]
    public class AdminUsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<AdminUsersController> _logger;

        public AdminUsersController(UserManager<ApplicationUser> userManager, ILogger<AdminUsersController> logger)
        {
            _userManager = userManager;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var usersQuery = _userManager.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var normalizedQuery = query.Trim().ToLower();
                usersQuery = usersQuery.Where(u =>
                    (u.Email != null && u.Email.ToLower().Contains(normalizedQuery)) ||
                    (u.FirstName != null && u.FirstName.ToLower().Contains(normalizedQuery)) ||
                    (u.LastName != null && u.LastName.ToLower().Contains(normalizedQuery)));
            }

            var totalCount = await usersQuery.CountAsync();

            var users = await usersQuery
                .OrderBy(u => u.Email)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<object>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);

                items.Add(new
                {
                    id = user.Id,
                    email = user.Email ?? string.Empty,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    phone = user.Phone,
                    companyId = user.CompanyId,
                    roles = roles
                });
            }

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize
            });
        }

        [HttpPost("{id}/roles/admin")]
        public async Task<IActionResult> GrantAdminRole(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            if (await _userManager.IsInRoleAsync(user, "Admin"))
            {
                return Ok(new { message = "Użytkownik już ma rolę Admin." });
            }

            var result = await _userManager.AddToRoleAsync(user, "Admin");
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                _logger.LogWarning("Failed to add user {UserId} to Admin role: {Errors}", user.Id, string.Join(", ", errors));
                return BadRequest(new { errors });
            }

            return Ok(new { message = "Rola Admin została nadana użytkownikowi." });
        }

        [HttpDelete("{id}/roles/admin")]
        public async Task<IActionResult> RevokeAdminRole(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(currentUserId) && currentUserId == user.Id)
            {
                return BadRequest(new { message = "Nie możesz odebrać sobie roli Admin." });
            }

            if (!await _userManager.IsInRoleAsync(user, "Admin"))
            {
                return Ok(new { message = "Użytkownik nie ma roli Admin." });
            }

            var result = await _userManager.RemoveFromRoleAsync(user, "Admin");
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                _logger.LogWarning("Failed to remove user {UserId} from Admin role: {Errors}", user.Id, string.Join(", ", errors));
                return BadRequest(new { errors });
            }

            return Ok(new { message = "Rola Admin została odebrana użytkownikowi." });
        }
    }
}
