using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;
using System.Linq;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BranchesController : ControllerBase
{
    private readonly ReservationDbContext _context;
    private readonly ICompanyAuditService _audit;

    private string? GetClientIpAddress()
    {
        if (HttpContext.Request.Headers.ContainsKey("X-Forwarded-For"))
        {
            return HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    public BranchesController(ReservationDbContext context, ICompanyAuditService audit)
    {
        _context = context;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Branch>>> GetBranches()
    {
        var branches = await _context.Branches
            .OrderBy(b => b.Id)
            .ToListAsync();

        return Ok(branches);
    }

    [HttpGet("company/{companyId}")]
    public async Task<ActionResult<IEnumerable<Branch>>> GetBranchesByCompany(int companyId)
    {
        var branches = await _context.Branches
            .Where(b => b.CompanyId == companyId)
            .OrderBy(b => b.Id)
            .ToListAsync();

        return Ok(branches);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Branch>> GetBranch(int id)
    {
        var branch = await _context.Branches.FindAsync(id);
        if (branch == null)
        {
            return NotFound();
        }

        return Ok(branch);
    }

    [HttpPost]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<ActionResult<Branch>> CreateBranch([FromBody] BranchCreateUpdateDto dto)
    {
        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, dto.CompanyId.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }
        }

        var companyExists = await _context.Companies.AnyAsync(c => c.Id == dto.CompanyId);
        if (!companyExists)
        {
            return BadRequest(new { message = "Firma o podanym ID nie istnieje." });
        }

        var duplicateExists = await _context.Branches
            .AnyAsync(b => b.CompanyId == dto.CompanyId && b.BranchName == dto.BranchName);
        if (duplicateExists)
        {
            return Conflict(new { message = "Oddział o tej nazwie już istnieje w tej firmie." });
        }

        var branch = new Branch
        {
            CompanyId = dto.CompanyId,
            BranchName = dto.BranchName,
            Phone = SanitizePhoneNumber(dto.Phone),
            StreetName = dto.StreetName,
            StreetNumber = dto.StreetNumber,
            ApartmentNumber = dto.ApartmentNumber,
            City = dto.City,
            PostalCode = dto.PostalCode,
            Country = dto.Country,
            OpeningHour = dto.OpeningHour,
            ClosingHour = dto.ClosingHour,
            CreatedAt = DateTime.UtcNow
        };

        _context.Branches.Add(branch);
        try
        {
            await _context.SaveChangesAsync();

            try
            {
                await _audit.LogAsync(
                    branch.CompanyId,
                    nameof(Branch),
                    branch.Id.ToString(),
                    "Create",
                    null,
                    branch,
                    User,
                    GetClientIpAddress(),
                    HttpContext.Request.Headers["User-Agent"].ToString());
            }
            catch
            {
            }
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return Conflict(new { message = "Oddział o tej nazwie już istnieje w tej firmie." });
        }

        return CreatedAtAction(nameof(GetBranch), new { id = branch.Id }, branch);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<IActionResult> UpdateBranch(int id, [FromBody] BranchCreateUpdateDto dto)
    {
        var branch = await _context.Branches.FindAsync(id);
        if (branch == null)
        {
            return NotFound();
        }

        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, branch.CompanyId.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }

            if (dto.CompanyId != branch.CompanyId)
            {
                return BadRequest(new { message = "Nie można zmienić firmy oddziału." });
            }
        }

        var oldValues = new
        {
            branch.Id,
            branch.CompanyId,
            branch.BranchName,
            branch.Phone,
            branch.StreetName,
            branch.StreetNumber,
            branch.ApartmentNumber,
            branch.City,
            branch.PostalCode,
            branch.Country,
            branch.OpeningHour,
            branch.ClosingHour
        };

        if (branch.CompanyId != dto.CompanyId)
        {
            var companyExists = await _context.Companies.AnyAsync(c => c.Id == dto.CompanyId);
            if (!companyExists)
            {
                return BadRequest(new { message = "Firma o podanym ID nie istnieje." });
            }
        }

        var duplicateExists = await _context.Branches
            .AnyAsync(b => b.CompanyId == dto.CompanyId && b.BranchName == dto.BranchName && b.Id != id);
        if (duplicateExists)
        {
            return Conflict(new { message = "Oddział o tej nazwie już istnieje w tej firmie." });
        }

        branch.CompanyId = dto.CompanyId;
        branch.BranchName = dto.BranchName;
        branch.Phone = SanitizePhoneNumber(dto.Phone);
        branch.StreetName = dto.StreetName;
        branch.StreetNumber = dto.StreetNumber;
        branch.ApartmentNumber = dto.ApartmentNumber;
        branch.City = dto.City;
        branch.PostalCode = dto.PostalCode;
        branch.Country = dto.Country;
        branch.OpeningHour = dto.OpeningHour;
        branch.ClosingHour = dto.ClosingHour;

        try
        {
            await _context.SaveChangesAsync();

            try
            {
                await _audit.LogAsync(
                    branch.CompanyId,
                    nameof(Branch),
                    branch.Id.ToString(),
                    "Update",
                    oldValues,
                    branch,
                    User,
                    GetClientIpAddress(),
                    HttpContext.Request.Headers["User-Agent"].ToString());
            }
            catch
            {
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!BranchExists(id))
            {
                return NotFound();
            }

            throw;
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return Conflict(new { message = "Oddział o tej nazwie już istnieje w tej firmie." });
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<IActionResult> DeleteBranch(int id)
    {
        var branch = await _context.Branches.FindAsync(id);
        if (branch == null)
        {
            return NotFound();
        }

        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, branch.CompanyId.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }
        }

        var oldValues = new
        {
            branch.Id,
            branch.CompanyId,
            branch.BranchName,
            branch.Phone,
            branch.StreetName,
            branch.StreetNumber,
            branch.ApartmentNumber,
            branch.City,
            branch.PostalCode,
            branch.Country,
            branch.OpeningHour,
            branch.ClosingHour
        };

        var timeSlots = await _context.TimeSlots
            .Where(ts => ts.BranchId == id)
            .ToListAsync();
        if (timeSlots.Count > 0)
        {
            _context.TimeSlots.RemoveRange(timeSlots);
        }

        var schedules = await _context.Schedules
            .Where(s => s.BranchId == id)
            .ToListAsync();
        if (schedules.Count > 0)
        {
            _context.Schedules.RemoveRange(schedules);
        }

        var appointments = await _context.Appointments
            .Where(a => a.BranchId == id)
            .ToListAsync();
        if (appointments.Count > 0)
        {
            _context.Appointments.RemoveRange(appointments);
        }

        var services = await _context.Services
            .Where(s => s.BranchId == id)
            .ToListAsync();
        if (services.Count > 0)
        {
            _context.Services.RemoveRange(services);
        }

        _context.Branches.Remove(branch);
        await _context.SaveChangesAsync();

        try
        {
            await _audit.LogAsync(
                oldValues.CompanyId,
                nameof(Branch),
                oldValues.Id.ToString(),
                "Delete",
                oldValues,
                null,
                User,
                GetClientIpAddress(),
                HttpContext.Request.Headers["User-Agent"].ToString());
        }
        catch
        {
        }

        return NoContent();
    }

    private bool BranchExists(int id)
    {
        return _context.Branches.Any(e => e.Id == id);
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException pgEx && pgEx.SqlState == PostgresErrorCodes.UniqueViolation;
    }

    private static string? SanitizePhoneNumber(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return null;

        var sanitized = new string(phoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());

        return string.IsNullOrEmpty(sanitized) ? null : sanitized;
    }
}
