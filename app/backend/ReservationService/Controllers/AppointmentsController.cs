using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly ReservationDbContext _context;
    private readonly IScheduleService _scheduleService;
    private readonly IEventSourcingService _eventSourcing;
    private readonly ILogger<AppointmentsController> _logger;

    public AppointmentsController(
        ReservationDbContext context,
        IScheduleService scheduleService,
        IEventSourcingService eventSourcing,
        ILogger<AppointmentsController> logger)
    {
        _context = context;
        _scheduleService = scheduleService;
        _eventSourcing = eventSourcing;
        _logger = logger;
    }

    // GET: api/appointments
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<Appointment>>> GetAppointments()
    {
        return await _context.Appointments
            .Include(a => a.Company)
            .Include(a => a.Branch)
            .Include(a => a.Service)
            .OrderBy(a => a.DateStart)
            .ToListAsync();
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<Appointment>>> GetMyAppointments([FromQuery] int take = 200)
    {
        if (take <= 0) take = 200;
        if (take > 500) take = 500;

        var userId = GetUserId(User);
        var email = User.FindFirst("email")?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;
        email = email?.Trim();

        if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(email))
        {
            return Ok(new List<Appointment>());
        }

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Where(a => (!string.IsNullOrWhiteSpace(userId) && a.CustomerId == userId)
                || (!string.IsNullOrWhiteSpace(email) && a.CustomerId == email))
            .Include(a => a.Company)
            .Include(a => a.Branch)
            .Include(a => a.Service)
            .OrderByDescending(a => a.DateStart)
            .Take(take)
            .ToListAsync();

        return Ok(appointments);
    }

    // GET: api/appointments/company/1
    [HttpGet("company/{companyId}")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<ActionResult<IEnumerable<Appointment>>> GetCompanyAppointments(
        int companyId,
        [FromQuery] int take = 200)
    {
        if (!IsCompanyAuthorized(companyId))
        {
            return Forbid();
        }

        if (take <= 0) take = 200;
        if (take > 500) take = 500;

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Where(a => a.CompanyId == companyId)
            .Include(a => a.Branch)
            .Include(a => a.Service)
            .OrderByDescending(a => a.DateStart)
            .Take(take)
            .ToListAsync();

        return Ok(appointments);
    }

    // GET: api/appointments/5
    [HttpGet("{id}")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
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

        if (!IsCompanyAuthorized(appointment.CompanyId))
        {
            return Forbid();
        }

        return appointment;
    }

    // GET: api/appointments/available-slots?serviceId=1&date=2025-11-10
    [HttpGet("available-slots")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<ActionResult<List<AvailableSlot>>> GetAvailableSlots(
        [FromQuery] int serviceId, 
        [FromQuery] DateTime date)
    {
        var service = await _context.Services.FindAsync(serviceId);
        if (service == null)
        {
            return NotFound("Service not found");
        }

        if (!IsCompanyAuthorized(service.CompanyId))
        {
            return Forbid();
        }

        var slots = await _scheduleService.GetAvailableSlotsAsync(
            service.CompanyId,
            service.BranchId,
            service.Id,
            date);

        return Ok(slots);
    }

    [HttpGet("public/available-slots")]
    [AllowAnonymous]
    public async Task<ActionResult<List<AvailableSlot>>> GetPublicAvailableSlots(
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
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<ActionResult<Appointment>> CreateAppointment(AppointmentCreateDto dto)
    {
        // Walidacja
        var service = await _context.Services.FindAsync(dto.ServiceId);
        if (service == null)
        {
            return BadRequest("Invalid service ID");
        }

        if (!IsCompanyAuthorized(service.CompanyId))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(dto.CustomerId))
        {
            return BadRequest("CustomerId is required");
        }

        if (string.IsNullOrWhiteSpace(dto.StaffId))
        {
            return BadRequest("StaffId is required");
        }

        if (dto.DateStart == default)
        {
            return BadRequest("DateStart is required");
        }

        var computedEnd = dto.DateStart.AddMinutes(service.DurationMinutes);

        var daySlots = await _scheduleService.GetAvailableSlotsAsync(
            service.CompanyId,
            service.BranchId,
            service.Id,
            dto.DateStart);

        var isAllowed = daySlots.Any(s => s.StaffId == dto.StaffId && s.Start == dto.DateStart);
        if (!isAllowed)
        {
            return BadRequest("Selected start time is not available");
        }

        // Sprawdź czy termin jest wolny
        var newBlockedEnd = computedEnd.AddMinutes(service.BufferMinutesAfter);

        var existingAppointments = await _context.Appointments
            .AsNoTracking()
            .Include(a => a.Service)
            .Where(a => a.CompanyId == service.CompanyId
                && a.BranchId == service.BranchId
                && a.StaffId == dto.StaffId
                && a.Status != "cancelled")
            .ToListAsync();

        var conflictingAppointment = existingAppointments.Any(a =>
        {
            var buffer = a.Service?.BufferMinutesAfter ?? 0;
            var aBlockedEnd = a.DateEnd.AddMinutes(buffer);
            return dto.DateStart < aBlockedEnd && newBlockedEnd > a.DateStart;
        });

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
            DateEnd = computedEnd,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        await TryStoreEventAsync(new AppointmentCreatedEvent
        {
            AggregateId = GetAppointmentAggregateId(appointment.Id),
            AppointmentId = appointment.Id,
            CompanyId = appointment.CompanyId,
            BranchId = appointment.BranchId,
            ServiceId = appointment.ServiceId,
            CustomerId = appointment.CustomerId,
            StaffId = appointment.StaffId,
            DateStart = appointment.DateStart,
            DateEnd = appointment.DateEnd,
            UserId = GetUserId(User)
        });

        _logger.LogInformation("Utworzono rezerwację ID: {Id} dla klienta: {CustomerId}", 
            appointment.Id, appointment.CustomerId);

        return CreatedAtAction(nameof(GetAppointment), new { id = appointment.Id }, appointment);
    }

    [HttpPost("public")]
    [AllowAnonymous]
    public async Task<ActionResult<Appointment>> CreatePublicAppointment(PublicAppointmentCreateDto dto)
    {
        var service = await _context.Services.FindAsync(dto.ServiceId);
        if (service == null)
        {
            return BadRequest("Invalid service ID");
        }

        if (string.IsNullOrWhiteSpace(dto.StaffId))
        {
            return BadRequest("StaffId is required");
        }

        if (dto.DateStart == default)
        {
            return BadRequest("DateStart is required");
        }

        var email = (dto.CustomerEmail ?? string.Empty).Trim();
        var phone = SanitizePhoneNumber(dto.CustomerPhone ?? string.Empty);

        var hasEmail = !string.IsNullOrWhiteSpace(email);
        var hasPhone = !string.IsNullOrWhiteSpace(phone);

        if (!hasEmail && !hasPhone)
        {
            return BadRequest("CustomerEmail or CustomerPhone is required");
        }

        if (hasEmail && !IsValidEmail(email))
        {
            return BadRequest("Invalid CustomerEmail");
        }

        if (hasPhone && !IsValidPhone(phone))
        {
            return BadRequest("Invalid CustomerPhone");
        }

        var customerId = hasEmail ? email : phone;

        var computedEnd = dto.DateStart.AddMinutes(service.DurationMinutes);

        var daySlots = await _scheduleService.GetAvailableSlotsAsync(
            service.CompanyId,
            service.BranchId,
            service.Id,
            dto.DateStart);

        var isAllowed = daySlots.Any(s => s.StaffId == dto.StaffId && s.Start == dto.DateStart);
        if (!isAllowed)
        {
            return BadRequest("Selected start time is not available");
        }

        var newBlockedEnd = computedEnd.AddMinutes(service.BufferMinutesAfter);

        var existingAppointments = await _context.Appointments
            .AsNoTracking()
            .Include(a => a.Service)
            .Where(a => a.CompanyId == service.CompanyId
                && a.BranchId == service.BranchId
                && a.StaffId == dto.StaffId
                && a.Status != "cancelled")
            .ToListAsync();

        var conflictingAppointment = existingAppointments.Any(a =>
        {
            var buffer = a.Service?.BufferMinutesAfter ?? 0;
            var aBlockedEnd = a.DateEnd.AddMinutes(buffer);
            return dto.DateStart < aBlockedEnd && newBlockedEnd > a.DateStart;
        });

        if (conflictingAppointment)
        {
            return BadRequest("This time slot is already booked");
        }

        var appointment = new Appointment
        {
            CompanyId = service.CompanyId,
            BranchId = service.BranchId,
            ServiceId = dto.ServiceId,
            CustomerId = customerId,
            StaffId = dto.StaffId,
            DateStart = dto.DateStart,
            DateEnd = computedEnd,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        await TryStoreEventAsync(new AppointmentCreatedEvent
        {
            AggregateId = GetAppointmentAggregateId(appointment.Id),
            AppointmentId = appointment.Id,
            CompanyId = appointment.CompanyId,
            BranchId = appointment.BranchId,
            ServiceId = appointment.ServiceId,
            CustomerId = appointment.CustomerId,
            StaffId = appointment.StaffId,
            DateStart = appointment.DateStart,
            DateEnd = appointment.DateEnd,
            UserId = GetUserId(User)
        });

        return CreatedAtAction(nameof(GetAppointment), new { id = appointment.Id }, appointment);
    }

    // PUT: api/appointments/5/confirm
    [HttpPut("{id}/confirm")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<IActionResult> ConfirmAppointment(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(appointment.CompanyId))
        {
            return Forbid();
        }

        appointment.Status = "confirmed";
        await _context.SaveChangesAsync();

        await TryStoreEventAsync(new AppointmentConfirmedEvent
        {
            AggregateId = GetAppointmentAggregateId(appointment.Id),
            AppointmentId = appointment.Id,
            CompanyId = appointment.CompanyId,
            UserId = GetUserId(User)
        });

        _logger.LogInformation("Potwierdzono rezerwację ID: {Id}", id);
        return NoContent();
    }

    // PUT: api/appointments/5/cancel
    [HttpPut("{id}/cancel")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<IActionResult> CancelAppointment(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(appointment.CompanyId))
        {
            return Forbid();
        }

        appointment.Status = "cancelled";
        await _context.SaveChangesAsync();

        await TryStoreEventAsync(new AppointmentCancelledEvent
        {
            AggregateId = GetAppointmentAggregateId(appointment.Id),
            AppointmentId = appointment.Id,
            CompanyId = appointment.CompanyId,
            Reason = "cancelled",
            UserId = GetUserId(User)
        });

        _logger.LogInformation("Anulowano rezerwację ID: {Id}", id);
        return NoContent();
    }

    [HttpPut("{id}/cancel-my")]
    [Authorize]
    public async Task<IActionResult> CancelMyAppointment(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound();
        }

        var userId = GetUserId(User);
        var email = User.FindFirst("email")?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value;
        email = email?.Trim();

        var isOwner = (!string.IsNullOrWhiteSpace(userId) && appointment.CustomerId == userId)
            || (!string.IsNullOrWhiteSpace(email) && appointment.CustomerId == email);

        if (!isOwner)
        {
            return Forbid();
        }

        if (appointment.Status == "cancelled")
        {
            return NoContent();
        }

        appointment.Status = "cancelled";
        await _context.SaveChangesAsync();

        await TryStoreEventAsync(new AppointmentCancelledEvent
        {
            AggregateId = GetAppointmentAggregateId(appointment.Id),
            AppointmentId = appointment.Id,
            CompanyId = appointment.CompanyId,
            Reason = "cancelled",
            UserId = GetUserId(User)
        });

        _logger.LogInformation("Anulowano (self-service) rezerwację ID: {Id}", id);
        return NoContent();
    }

    // DELETE: api/appointments/5
    [HttpDelete("{id}")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<IActionResult> DeleteAppointment(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(appointment.CompanyId))
        {
            return Forbid();
        }

        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync();

        await TryStoreEventAsync(new AppointmentDeletedEvent
        {
            AggregateId = GetAppointmentAggregateId(appointment.Id),
            AppointmentId = appointment.Id,
            CompanyId = appointment.CompanyId,
            UserId = GetUserId(User)
        });

        return NoContent();
    }

    // GET: api/appointments/5/events
    [HttpGet("{id}/events")]
    [Authorize(Policy = "CompanyEmployeeOrHigherOrAdmin")]
    public async Task<ActionResult<List<AppointmentTimelineEventDto>>> GetAppointmentEvents(
        int id,
        [FromQuery] int take = 200)
    {
        if (take <= 0) take = 200;
        if (take > 500) take = 500;

        var appointment = await _context.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment == null)
        {
            return NotFound();
        }

        if (!IsCompanyAuthorized(appointment.CompanyId))
        {
            return Forbid();
        }

        var aggregateId = GetAppointmentAggregateId(id);

        var events = await _context.EventStores
            .AsNoTracking()
            .Where(es => es.AggregateId == aggregateId)
            .OrderBy(es => es.Version)
            .Take(take)
            .Select(es => new AppointmentTimelineEventDto
            {
                EventId = es.EventId,
                EventType = es.EventType,
                OccurredAt = es.OccurredAt,
                Version = es.Version,
                UserId = es.UserId,
                EventData = es.EventData
            })
            .ToListAsync();

        return Ok(events);
    }

    private static string GetAppointmentAggregateId(int appointmentId) => $"appointment-{appointmentId}";

    private bool IsCompanyAuthorized(int companyId)
    {
        if (User.IsInRole("Admin"))
        {
            return true;
        }

        var claimCompanyId = User.FindFirst("CompanyId")?.Value;
        return string.Equals(claimCompanyId, companyId.ToString(), StringComparison.Ordinal);
    }

    private static string? GetUserId(ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value
            ?? user.FindFirst("userId")?.Value;
    }

    private static string SanitizePhoneNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return Regex.Replace(value, "[^0-9+]", string.Empty);
    }

    private static bool IsValidEmail(string value)
    {
        return Regex.IsMatch(value.Trim(), "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", RegexOptions.CultureInvariant);
    }

    private static bool IsValidPhone(string value)
    {
        return Regex.IsMatch(value.Trim(), "^\\+\\d{1,3}(\\s?\\d{3}){3}$", RegexOptions.CultureInvariant);
    }

    private async Task TryStoreEventAsync(DomainEvent domainEvent)
    {
        try
        {
            await _eventSourcing.StoreEventAsync(domainEvent);
        }
        catch
        {
        }
    }
}

public class AppointmentTimelineEventDto
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public int Version { get; set; }
    public string? UserId { get; set; }
    public string EventData { get; set; } = string.Empty;
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

public class PublicAppointmentCreateDto
{
    public int ServiceId { get; set; }
    public string StaffId { get; set; } = string.Empty;
    public DateTime DateStart { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
}
