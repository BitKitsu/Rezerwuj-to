using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly ReservationDbContext _context;
    private readonly IScheduleService _scheduleService;
    private readonly ILogger<AppointmentsController> _logger;

    public AppointmentsController(
        ReservationDbContext context,
        IScheduleService scheduleService,
        ILogger<AppointmentsController> logger)
    {
        _context = context;
        _scheduleService = scheduleService;
        _logger = logger;
    }

    // GET: api/appointments
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Appointment>>> GetAppointments()
    {
        return await _context.Appointments
            .Include(a => a.Company)
            .Include(a => a.Branch)
            .Include(a => a.Service)
            .OrderBy(a => a.DateStart)
            .ToListAsync();
    }

    // GET: api/appointments/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Appointment>> GetAppointment(int id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Company)
            .Include(a => a.Branch)
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return NotFound();
        }

        return appointment;
    }

    // GET: api/appointments/available-slots?serviceId=1&date=2025-11-10
    [HttpGet("available-slots")]
    public async Task<ActionResult<List<AvailableSlot>>> GetAvailableSlots(
        [FromQuery] int serviceId, 
        [FromQuery] DateTime date)
    {
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null)
        {
            return NotFound("Service not found");
        }

        var slots = await _scheduleService.GetAvailableSlotsAsync(
            service.CompanyId,
            service.BranchId,
            service.Id,
            date);

        return Ok(slots);
    }

    // POST: api/appointments
    [HttpPost]
    public async Task<ActionResult<Appointment>> CreateAppointment(AppointmentCreateDto dto)
    {
        // Walidacja
        var service = await _context.Services.FindAsync(dto.ServiceId);
        if (service == null)
        {
            return BadRequest("Invalid service ID");
        }

        // Sprawdź czy termin jest wolny
        var conflictingAppointment = await _context.Appointments
            .AnyAsync(a => a.CompanyId == service.CompanyId
                && a.BranchId == service.BranchId
                && a.ServiceId == dto.ServiceId
                && a.StaffId == dto.StaffId
                && a.Status != "cancelled"
                && ((dto.DateStart >= a.DateStart && dto.DateStart < a.DateEnd) ||
                    (dto.DateEnd > a.DateStart && dto.DateEnd <= a.DateEnd)));

        if (conflictingAppointment)
        {
            return BadRequest("This time slot is already booked");
        }

        var appointment = new Appointment
        {
            CompanyId = service.CompanyId,
            BranchId = service.BranchId,
            ServiceId = dto.ServiceId,
            CustomerId = dto.CustomerId,
            StaffId = dto.StaffId,
            DateStart = dto.DateStart,
            DateEnd = dto.DateEnd,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Utworzono rezerwację ID: {Id} dla klienta: {CustomerId}", 
            appointment.Id, appointment.CustomerId);

        return CreatedAtAction(nameof(GetAppointment), new { id = appointment.Id }, appointment);
    }

    // PUT: api/appointments/5/confirm
    [HttpPut("{id}/confirm")]
    public async Task<IActionResult> ConfirmAppointment(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound();
        }

        appointment.Status = "confirmed";
        await _context.SaveChangesAsync();

        _logger.LogInformation("Potwierdzono rezerwację ID: {Id}", id);
        return NoContent();
    }

    // PUT: api/appointments/5/cancel
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelAppointment(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound();
        }

        appointment.Status = "cancelled";
        await _context.SaveChangesAsync();

        _logger.LogInformation("Anulowano rezerwację ID: {Id}", id);
        return NoContent();
    }

    // DELETE: api/appointments/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAppointment(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound();
        }

        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// DTOs
public class AppointmentCreateDto
{
    public int ServiceId { get; set; }
    public string CustomerId { get; set; } = string.Empty;
    public string StaffId { get; set; } = string.Empty;
    public DateTime DateStart { get; set; }
    public DateTime DateEnd { get; set; }
}
