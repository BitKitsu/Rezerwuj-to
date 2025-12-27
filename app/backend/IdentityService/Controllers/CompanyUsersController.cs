using IdentityService.Data;
using IdentityService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace IdentityService.Controllers
{
    [ApiController]
    [Route("api/company/users")]
    [Authorize(Roles = "CompanyOwner,Admin")]
    public class CompanyUsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;

        public CompanyUsersController(UserManager<ApplicationUser> userManager, ApplicationDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetCompanyUsers()
        {
            var owner = await GetCurrentUserWithCompany();
            if (owner == null || !owner.CompanyId.HasValue) return Forbid();

            var users = await _userManager.Users
                .Where(u => u.CompanyId == owner.CompanyId.Value)
                .ToListAsync();

            var userIds = users.Select(u => u.Id).ToList();
            var roles = await _context.UserCompanyRoles
                .Where(r => r.CompanyId == owner.CompanyId.Value && userIds.Contains(r.UserId) && r.IsActive)
                .ToDictionaryAsync(r => r.UserId, r => r.Role);

            var result = users.Select(u => new UserCompanyDto
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Role = roles.GetValueOrDefault(u.Id, "Brak")
            });

            return Ok(result);
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddUserToCompany([FromBody] AddUserToCompanyRequest request)
        {
            var owner = await GetCurrentUserWithCompany();
            if (owner == null || !owner.CompanyId.HasValue) return Forbid();

            var userToAdd = await _userManager.FindByEmailAsync(request.Email);
            if (userToAdd == null)
            {
                return NotFound(new { message = "Użytkownik o podanym adresie email nie istnieje." });
            }

            if (userToAdd.CompanyId.HasValue)
            {
                return BadRequest(new { message = "Ten użytkownik jest już przypisany do innej firmy." });
            }

            userToAdd.CompanyId = owner.CompanyId.Value;
            var updateResult = await _userManager.UpdateAsync(userToAdd);
            if (!updateResult.Succeeded)
            {
                return BadRequest(new { message = "Nie udało się przypisać użytkownika do firmy." });
            }

            _context.UserCompanyRoles.Add(new UserCompanyRole
            {
                UserId = userToAdd.Id,
                CompanyId = owner.CompanyId.Value,
                Role = IsValidCompanyRole(request.Role) ? request.Role : CompanyRoles.Employee,
                IsActive = true
            });

            await _context.SaveChangesAsync();

            return Ok(new { message = "Użytkownik został pomyślnie dodany do firmy." });
        }

        [HttpDelete("{userId}")]
        public async Task<IActionResult> RemoveUserFromCompany(string userId)
        {
            var owner = await GetCurrentUserWithCompany();
            if (owner == null || !owner.CompanyId.HasValue) return Forbid();

            if (owner.Id == userId)
            {
                return BadRequest(new { message = "Nie możesz usunąć samego siebie z firmy." });
            }

            var userToRemove = await _userManager.FindByIdAsync(userId);
            if (userToRemove == null || userToRemove.CompanyId != owner.CompanyId)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony w Twojej firmie." });
            }

            userToRemove.CompanyId = null;
            await _userManager.UpdateAsync(userToRemove);

            var rolesToDeactivate = await _context.UserCompanyRoles
                .Where(r => r.UserId == userId && r.CompanyId == owner.CompanyId.Value && r.IsActive)
                .ToListAsync();

            if (rolesToDeactivate.Count > 0)
            {
                foreach (var role in rolesToDeactivate)
                {
                    role.IsActive = false;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Użytkownik został usunięty z firmy." });
        }

        [HttpPut("{userId}/role")]
        public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateUserRoleRequest request)
        {
            if (!IsValidCompanyRole(request.Role))
            {
                return BadRequest(new { message = "Nieprawidłowa rola." });
            }

            var owner = await GetCurrentUserWithCompany();
            if (owner == null || !owner.CompanyId.HasValue) return Forbid();

            if (owner.Id == userId && request.Role != CompanyRoles.Owner)
            {
                return BadRequest(new { message = "Nie możesz zmienić swojej własnej roli właściciela." });
            }

            var roleToUpdate = await _context.UserCompanyRoles.FirstOrDefaultAsync(r => r.UserId == userId && r.CompanyId == owner.CompanyId.Value);
            if (roleToUpdate == null)
            {
                return NotFound(new { message = "Nie znaleziono roli dla tego użytkownika w Twojej firmie." });
            }

            roleToUpdate.Role = request.Role;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Rola użytkownika została zaktualizowana." });
        }

        private async Task<ApplicationUser?> GetCurrentUserWithCompany()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return null;
            return await _userManager.Users.FirstOrDefaultAsync(u => u.Id == userId);
        }

        private bool IsValidCompanyRole(string role)
        {
            return role == CompanyRoles.Manager || role == CompanyRoles.Employee;
        }

        [HttpPost("transfer-ownership")]
        public async Task<IActionResult> TransferOwnership([FromBody] TransferOwnershipRequest request)
        {
            var oldOwner = await GetCurrentUserWithCompany();
            if (oldOwner == null || !oldOwner.CompanyId.HasValue) return Forbid();

            var newOwner = await _userManager.FindByIdAsync(request.NewOwnerUserId);
            if (newOwner == null || newOwner.CompanyId != oldOwner.CompanyId)
            {
                return NotFound(new { message = "Wybrany użytkownik nie jest pracownikiem tej firmy." });
            }

            if (oldOwner.Id == newOwner.Id)
            {
                return BadRequest(new { message = "Nie można przekazać własności samemu sobie." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Swap company-specific roles
                var oldOwnerCompanyRole = await _context.UserCompanyRoles.FirstAsync(r => r.UserId == oldOwner.Id && r.CompanyId == oldOwner.CompanyId.Value && r.IsActive);
                var newOwnerCompanyRole = await _context.UserCompanyRoles.FirstAsync(r => r.UserId == newOwner.Id && r.CompanyId == oldOwner.CompanyId.Value && r.IsActive);

                oldOwnerCompanyRole.Role = CompanyRoles.Manager; // Downgrade old owner
                newOwnerCompanyRole.Role = CompanyRoles.Owner;   // Promote new owner

                // Swap global Identity roles
                await _userManager.RemoveFromRoleAsync(oldOwner, "CompanyOwner");
                await _userManager.AddToRoleAsync(newOwner, "CompanyOwner");

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Własność firmy została pomyślnie przekazana." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // Log exception ex
                return StatusCode(500, new { message = "Wystąpił wewnętrzny błąd serwera podczas przekazywania własności." });
            }
        }
    }

    public class UserCompanyDto
    {
        public string Id { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string Role { get; set; } = string.Empty;
    }

    public class AddUserToCompanyRequest
    {
        [Required]
        [EmailAddress]
        public required string Email { get; set; }
        public required string Role { get; set; }
    }

    public class UpdateUserRoleRequest
    {
        public required string Role { get; set; }
    }

    public class TransferOwnershipRequest
    {
        public required string NewOwnerUserId { get; set; }
    }
}
