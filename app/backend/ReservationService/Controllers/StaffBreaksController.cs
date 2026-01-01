using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using System.Security.Claims;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StaffBreaksController : ControllerBase
{
    private readonly ReservationDbContext _context;

    public StaffBreaksController(ReservationDbContext context)
    {
        _context = context;
    }

    [HttpGet("company/{companyId}")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<ActionResult<List<StaffBreak>>> GetCompanyBreaks(
        int companyId,
        [FromQuery] int? branchId,
        [FromQuery] string? staffId,
        [FromQuery] DayOfWeek? dayOfWeek)
    {
        if (!IsCompanyAuthorized(companyId))
        {
            return Forbid();
        }

        var query = _context.StaffBreaks
            .AsNoTracking()
            .Where(b => b.CompanyId == companyId);

        if (branchId.HasValue)
        {
            query = query.Where(b => b.BranchId == branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(staffId))
        {
            query = query.Where(b => b.StaffId == staffId);
        }

        if (dayOfWeek.HasValue)
        {
            query = query.Where(b => b.DayOfWeek == dayOfWeek.Value);
        }

        var breaks = await query
            .OrderBy(b => b.BranchId)
            .ThenBy(b => b.StaffId)
            .ThenBy(b => b.DayOfWeek)
            .ThenBy(b => b.StartTime)
            .ToListAsync();

        return Ok(breaks);
    }

    [HttpPost]
    [Authorize(Policy = "CompanyManagerOrOwnerOrAdmin")]
    public async Task<ActionResult<StaffBreak>> CreateBreak([FromBody] CreateStaffBreakDto dto)
    {
        if (!IsCompanyAuthorized(dto.CompanyId))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(dto.StaffId))
        {
            return BadRequest("StaffId is required");
        }

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == dto.BranchId);

        if (branch == null)
        {
            return BadRequest("Invalid branch ID");
        }

        if (branch.CompanyId != dto.CompanyId)
        {
            return BadRequest("Branch does not belong to company");
        }

        var start = TimeOnly.Parse(dto.StartTime);
        var end = TimeOnly.Parse(dto.EndTime);
        if (end <= start)
        {
            return BadRequest("EndTime must be later than StartTime");
        }

        var validationError = await ValidateStaffBreak(dto.CompanyId, dto.BranchId, dto.StaffId, dto.DayOfWeek, start, end);
        if (!string.IsNullOrWhiteSpace(validationError))
        {
            return BadRequest(validationError);
        }

        var item = new StaffBreak
        {
            CompanyId = dto.CompanyId,
            BranchId = dto.BranchId,
            StaffId = dto.StaffId,
            DayOfWeek = dto.DayOfWeek,
            StartTime = start,
            EndTime = end,
            IsActive = true
        };

        _context.StaffBreaks.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCompanyBreaks), new { companyId = item.CompanyId }, item);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = "CompanyManagerOrOwnerOrAdmin")]
    public async Task<IActionResult> UpdateBreak(int id, [FromBody] UpdateStaffBreakDto dto)
    {
        var item = await _context.StaffBreaks.FindAsync(id);
        if (item == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(item.CompanyId))
        {
            return Forbid();
        }

        var start = TimeOnly.Parse(dto.StartTime);
        var end = TimeOnly.Parse(dto.EndTime);
        if (end <= start)
        {
            return BadRequest("EndTime must be later than StartTime");
        }

        if (dto.IsActive)
        {
            var validationError = await ValidateStaffBreak(item.CompanyId, item.BranchId, item.StaffId, dto.DayOfWeek, start, end);
            if (!string.IsNullOrWhiteSpace(validationError))
            {
                return BadRequest(validationError);
            }
        }

        item.DayOfWeek = dto.DayOfWeek;
        item.StartTime = start;
        item.EndTime = end;
        item.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "CompanyManagerOrOwnerOrAdmin")]
    public async Task<IActionResult> DeleteBreak(int id)
    {
        var item = await _context.StaffBreaks.FindAsync(id);
        if (item == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(item.CompanyId))
        {
            return Forbid();
        }

        _context.StaffBreaks.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> ValidateStaffBreak(
        int companyId,
        int branchId,
        string staffId,
        DayOfWeek dayOfWeek,
        TimeOnly start,
        TimeOnly end)
    {
        if (string.IsNullOrWhiteSpace(staffId))
        {
            return "Wybierz pracownika.";
        }

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId && b.CompanyId == companyId);

        if (branch == null)
        {
            return "Nieprawidłowy oddział.";
        }

        var company = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == companyId);

        TimeSpan? openHours = null;
        TimeSpan? closeHours = null;

        var openRaw = !string.IsNullOrWhiteSpace(branch.OpeningHour) ? branch.OpeningHour : company?.OpeningHour;
        var closeRaw = !string.IsNullOrWhiteSpace(branch.ClosingHour) ? branch.ClosingHour : company?.ClosingHour;

        if (!string.IsNullOrWhiteSpace(openRaw)
            && !string.IsNullOrWhiteSpace(closeRaw)
            && TimeSpan.TryParse(openRaw, out var open)
            && TimeSpan.TryParse(closeRaw, out var close)
            && close > open)
        {
            openHours = open;
            closeHours = close;
        }

        if (openHours.HasValue && closeHours.HasValue)
        {
            var startSpan = start.ToTimeSpan();
            var endSpan = end.ToTimeSpan();
            if (startSpan < openHours.Value || endSpan > closeHours.Value)
            {
                return $"Przerwa musi mieścić się w godzinach otwarcia: {openRaw} - {closeRaw}";
            }
        }

        var schedules = await _context.Schedules
            .AsNoTracking()
            .Where(s => s.CompanyId == companyId
                && s.BranchId == branchId
                && s.StaffId == staffId
                && s.DayOfWeek == dayOfWeek
                && s.IsActive)
            .ToListAsync();

        if (schedules.Count == 0)
        {
            return "Brak harmonogramu dla pracownika w tym dniu.";
        }

        var breakStart = start.ToTimeSpan();
        var breakEnd = end.ToTimeSpan();

        foreach (var s in schedules)
        {
            var scheduleStart = s.StartTime.ToTimeSpan();
            var scheduleEnd = s.EndTime.ToTimeSpan();
            if (openHours.HasValue && closeHours.HasValue)
            {
                if (scheduleStart < openHours.Value) scheduleStart = openHours.Value;
                if (scheduleEnd > closeHours.Value) scheduleEnd = closeHours.Value;
            }

            if (scheduleEnd <= scheduleStart)
            {
                continue;
            }

            if (breakStart >= scheduleStart && breakEnd <= scheduleEnd)
            {
                return null;
            }
        }

        return "Przerwa musi mieścić się w godzinach pracy pracownika.";
    }

    private bool IsCompanyAuthorized(int companyId)
    {
        if (User.IsInRole("Admin"))
        {
            return true;
        }

        var claimCompanyId = User.FindFirst("CompanyId")?.Value;
        return string.Equals(claimCompanyId, companyId.ToString(), StringComparison.Ordinal);
    }
}

public class CreateStaffBreakDto
{
    public int CompanyId { get; set; }
    public int BranchId { get; set; }
    public string StaffId { get; set; } = string.Empty;
    public DayOfWeek DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
}

public class UpdateStaffBreakDto
{
    public DayOfWeek DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
