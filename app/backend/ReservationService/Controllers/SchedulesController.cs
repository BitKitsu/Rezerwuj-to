using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
    public async Task<ActionResult<List<Schedule>>> GetCompanySchedules(int companyId)
    {
        var schedules = await _context.Schedules
            .Where(s => s.CompanyId == companyId)
            .Include(s => s.Service)
            .OrderBy(s => s.DayOfWeek)
            .ThenBy(s => s.StartTime)
            .ToListAsync();
            
        return Ok(schedules);
    }
    
    // GET: api/schedules/available-slots?companyId=1&serviceId=1&date=2024-01-15
    [HttpGet("available-slots")]
    public async Task<ActionResult<List<AvailableSlot>>> GetAvailableSlots(
        [FromQuery] int companyId,
        [FromQuery] int serviceId,
        [FromQuery] DateTime date)
    {
        var slots = await _scheduleService.GetAvailableSlotsAsync(companyId, serviceId, date);
        return Ok(slots);
    }
    
    // POST: api/schedules
    [HttpPost]
    public async Task<ActionResult<Schedule>> CreateSchedule([FromBody] CreateScheduleDto dto)
    {
        var schedule = new Schedule
        {
            CompanyId = dto.CompanyId,
            ServiceId = dto.ServiceId,
            StaffId = dto.StaffId,
            DayOfWeek = dto.DayOfWeek,
            StartTime = TimeOnly.Parse(dto.StartTime),
            EndTime = TimeOnly.Parse(dto.EndTime),
            IsActive = true
        };
        
        var created = await _scheduleService.CreateScheduleAsync(schedule);
        
        _logger.LogInformation("Schedule created for company {CompanyId}, service {ServiceId}", 
                               dto.CompanyId, dto.ServiceId);
                               
        return CreatedAtAction(nameof(GetCompanySchedules), 
                              new { companyId = created.CompanyId }, 
                              created);
    }
    
    // PUT: api/schedules/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] UpdateScheduleDto dto)
    {
        var schedule = await _context.Schedules.FindAsync(id);
        
        if (schedule == null)
        {
            return NotFound();
        }
        
        schedule.DayOfWeek = dto.DayOfWeek;
        schedule.StartTime = TimeOnly.Parse(dto.StartTime);
        schedule.EndTime = TimeOnly.Parse(dto.EndTime);
        schedule.IsActive = dto.IsActive;
        
        await _scheduleService.UpdateScheduleAsync(schedule);
        
        _logger.LogInformation("Schedule {Id} updated", id);
        
        return NoContent();
    }
    
    // DELETE: api/schedules/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        var schedule = await _context.Schedules.FindAsync(id);
        
        if (schedule == null)
        {
            return NotFound();
        }
        
        schedule.IsActive = false;
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Schedule {Id} deactivated", id);
        
        return NoContent();
    }
    
    // POST: api/schedules/book-slot
    [HttpPost("book-slot")]
    public async Task<IActionResult> BookTimeSlot([FromBody] BookSlotDto dto)
    {
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
