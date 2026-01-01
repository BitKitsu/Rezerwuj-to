using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SchedulesController : ControllerBase
{
    private readonly ReservationDbContext _context;
    private readonly IScheduleService _scheduleService;
    private readonly ILogger<SchedulesController> _logger;
    
    public SchedulesController(
        ReservationDbContext context, 
        IScheduleService scheduleService,
        ILogger<SchedulesController> logger)
    {
        _context = context;
        _scheduleService = scheduleService;
        _logger = logger;
    }
    
    // GET: api/schedules/company/1
    [HttpGet("company/{companyId}")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<ActionResult<List<Schedule>>> GetCompanySchedules(
        int companyId,
        [FromQuery] int? branchId)
    {
        if (!IsCompanyAuthorized(companyId))
        {
            return Forbid();
        }

        var schedules = await _context.Schedules
            .Where(s => s.CompanyId == companyId && (!branchId.HasValue || s.BranchId == branchId.Value))
            .Include(s => s.Service)
            .Include(s => s.Branch)
            .OrderBy(s => s.DayOfWeek)
            .ThenBy(s => s.StartTime)
            .ToListAsync();
            
        return Ok(schedules);
    }
    
    // GET: api/schedules/available-slots?companyId=1&serviceId=1&date=2024-01-15
    [HttpGet("available-slots")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<ActionResult<List<AvailableSlot>>> GetAvailableSlots(
        [FromQuery] int companyId,
        [FromQuery] int branchId,
        [FromQuery] int serviceId,
        [FromQuery] DateTime date)
    {
        if (!IsCompanyAuthorized(companyId))
        {
            return Forbid();
        }

        var slots = await _scheduleService.GetAvailableSlotsAsync(companyId, branchId, serviceId, date);
        return Ok(slots);
    }
    
    // POST: api/schedules
    [HttpPost]
    [Authorize(Policy = "CompanyManagerOrOwnerOrAdmin")]
    public async Task<ActionResult<Schedule>> CreateSchedule([FromBody] CreateScheduleDto dto)
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

        if (!string.IsNullOrWhiteSpace(branch.OpeningHour) && !string.IsNullOrWhiteSpace(branch.ClosingHour)
            && TimeSpan.TryParse(branch.OpeningHour, out var open)
            && TimeSpan.TryParse(branch.ClosingHour, out var close))
        {
            var scheduleStart = TimeOnly.Parse(dto.StartTime).ToTimeSpan();
            var scheduleEnd = TimeOnly.Parse(dto.EndTime).ToTimeSpan();

            if (scheduleStart < open || scheduleEnd > close)
            {
                return BadRequest($"Schedule must be within branch opening hours: {branch.OpeningHour} - {branch.ClosingHour}");
            }
        }

        var serviceExistsInBranch = await _context.Services
            .AsNoTracking()
            .AnyAsync(s => s.Id == dto.ServiceId && s.CompanyId == dto.CompanyId && s.BranchId == dto.BranchId);

        if (!serviceExistsInBranch)
        {
            return BadRequest("Invalid service ID for specified company/branch");
        }

        var schedule = new Schedule
        {
            CompanyId = dto.CompanyId,
            BranchId = dto.BranchId,
            ServiceId = dto.ServiceId,
            StaffId = dto.StaffId,
            DayOfWeek = dto.DayOfWeek,
            StartTime = TimeOnly.Parse(dto.StartTime),
            EndTime = TimeOnly.Parse(dto.EndTime),
            IsActive = true
        };
        
        var created = await _scheduleService.CreateScheduleAsync(schedule);
        
        _logger.LogInformation(
            "Schedule created for company {CompanyId}, branch {BranchId}, service {ServiceId}",
            dto.CompanyId,
            dto.BranchId,
            dto.ServiceId);
                               
        return CreatedAtAction(nameof(GetCompanySchedules), 
                              new { companyId = created.CompanyId }, 
                              created);
    }
    
    // PUT: api/schedules/5
    [HttpPut("{id}")]
    [Authorize(Policy = "CompanyManagerOrOwnerOrAdmin")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] UpdateScheduleDto dto)
    {
        var schedule = await _context.Schedules.FindAsync(id);
        
        if (schedule == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(schedule.CompanyId))
        {
            return Forbid();
        }

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == schedule.BranchId);

        if (branch != null
            && !string.IsNullOrWhiteSpace(branch.OpeningHour)
            && !string.IsNullOrWhiteSpace(branch.ClosingHour)
            && TimeSpan.TryParse(branch.OpeningHour, out var open)
            && TimeSpan.TryParse(branch.ClosingHour, out var close))
        {
            var scheduleStart = TimeOnly.Parse(dto.StartTime).ToTimeSpan();
            var scheduleEnd = TimeOnly.Parse(dto.EndTime).ToTimeSpan();

            if (scheduleStart < open || scheduleEnd > close)
            {
                return BadRequest($"Schedule must be within branch opening hours: {branch.OpeningHour} - {branch.ClosingHour}");
            }
        }
        
        schedule.DayOfWeek = dto.DayOfWeek;
        schedule.StartTime = TimeOnly.Parse(dto.StartTime);
        schedule.EndTime = TimeOnly.Parse(dto.EndTime);
        schedule.IsActive = dto.IsActive;
        
        await _scheduleService.UpdateScheduleAsync(schedule);
        
        _logger.LogInformation("Schedule {Id} updated", id);
        
        return NoContent();
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
    
    // DELETE: api/schedules/5
    [HttpDelete("{id}")]
    [Authorize(Policy = "CompanyManagerOrOwnerOrAdmin")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        var schedule = await _context.Schedules.FindAsync(id);
        
        if (schedule == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(schedule.CompanyId))
        {
            return Forbid();
        }

        _context.Schedules.Remove(schedule);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Schedule {Id} deleted", id);
        
        return NoContent();
    }
    
    // POST: api/schedules/book-slot
    [HttpPost("book-slot")]
    [Authorize(Policy = "CompanyManagerOrOwnerOrAdmin")]
    public async Task<IActionResult> BookTimeSlot([FromBody] BookSlotDto dto)
    {
        if (dto == null)
        {
            return BadRequest();
        }

        var slot = await _context.TimeSlots
            .AsNoTracking()
            .FirstOrDefaultAsync(ts => ts.Id == dto.SlotId);

        if (slot == null)
        {
            return NotFound("Slot not found");
        }

        if (!IsCompanyAuthorized(slot.CompanyId))
        {
            return Forbid();
        }

        var appointment = await _context.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId);

        if (appointment == null)
        {
            return NotFound("Appointment not found");
        }

        if (appointment.CompanyId != slot.CompanyId)
        {
            return BadRequest("Appointment does not belong to slot company");
        }

        var success = await _scheduleService.BookTimeSlotAsync(dto.SlotId, dto.AppointmentId);
        
        if (!success)
        {
            return BadRequest("Slot is not available");
        }
        
        _logger.LogInformation("Slot {SlotId} booked for appointment {AppointmentId}", 
                               dto.SlotId, dto.AppointmentId);
        
        return Ok(new { message = "Slot booked successfully" });
    }
}

// DTOs
public class CreateScheduleDto
{
    public int CompanyId { get; set; }
    public int BranchId { get; set; }
    public int ServiceId { get; set; }
    public string? StaffId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty; // "09:00"
    public string EndTime { get; set; } = string.Empty;   // "17:00"
}

public class UpdateScheduleDto
{
    public DayOfWeek DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class BookSlotDto
{
    public int SlotId { get; set; }
    public int AppointmentId { get; set; }
}
