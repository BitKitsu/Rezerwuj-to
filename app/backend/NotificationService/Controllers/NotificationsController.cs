using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotificationService.Data;
using NotificationService.Models;
using NotificationService.Services;

namespace NotificationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly NotificationDbContext _context;
    private readonly INotificationSender _notificationSender;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(
        NotificationDbContext context,
        INotificationSender notificationSender,
        ILogger<NotificationsController> logger)
    {
        _context = context;
        _notificationSender = notificationSender;
        _logger = logger;
    }

    // GET: api/notifications/user/{userId}
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Notification>>> GetUserNotifications(
        string userId, 
        [FromQuery] bool unreadOnly = false)
    {
        IQueryable<Notification> query = _context.Notifications
            .Where(n => n.UserId == userId);

        if (unreadOnly)
        {
            query = query.Where(n => n.ReadAt == null);
        }

        query = query.OrderByDescending(n => n.CreatedAt);

        return await query.ToListAsync();
    }

    // GET: api/notifications/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Notification>> GetNotification(int id)
    {
        var notification = await _context.Notifications.FindAsync(id);

        if (notification == null)
        {
            return NotFound();
        }

        return notification;
    }

    // POST: api/notifications
    [HttpPost]
    public async Task<ActionResult<Notification>> CreateNotification(CreateNotificationDto dto)
    {
        // Pobierz szablon jeśli określony
        NotificationTemplate? template = null;
        if (dto.TemplateId.HasValue)
        {
            template = await _context.NotificationTemplates.FindAsync(dto.TemplateId.Value);
            if (template == null)
            {
                return BadRequest("Template not found");
            }
        }

        var notification = new Notification
        {
            UserId = dto.UserId,
            Title = dto.Title ?? template?.Subject ?? "Powiadomienie",
            Message = dto.Message ?? template?.Body ?? "",
            Type = dto.Type,
            Channel = dto.Channel,
            Status = NotificationStatus.Pending,
            RelatedAppointmentId = dto.RelatedAppointmentId,
            Metadata = dto.Metadata
        };

        // Zastąp placeholdery w wiadomości
        if (dto.Placeholders != null)
        {
            foreach (var placeholder in dto.Placeholders)
            {
                notification.Title = notification.Title.Replace($"{{{{{placeholder.Key}}}}}", placeholder.Value);
                notification.Message = notification.Message.Replace($"{{{{{placeholder.Key}}}}}", placeholder.Value);
            }
        }

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Wyślij powiadomienie asynchronicznie
        _ = Task.Run(async () => await _notificationSender.SendNotificationAsync(notification));

        return CreatedAtAction(nameof(GetNotification), new { id = notification.Id }, notification);
    }

    // PUT: api/notifications/{id}/read
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var notification = await _context.Notifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }

        notification.ReadAt = DateTime.UtcNow;
        notification.Status = NotificationStatus.Read;
        
        await _context.SaveChangesAsync();
        
        return NoContent();
    }

    // POST: api/notifications/send-appointment-reminder
    [HttpPost("send-appointment-reminder")]
    public async Task<ActionResult<Notification>> SendAppointmentReminder([FromBody] AppointmentReminderDto dto)
    {
        _logger.LogInformation("Wysyłanie przypomnienia o wizycie dla użytkownika {UserId}", dto.UserId);

        var template = await _context.NotificationTemplates
            .FirstOrDefaultAsync(t => t.Type == NotificationType.AppointmentReminder && t.IsActive);

        if (template == null)
        {
            return BadRequest("No active reminder template found");
        }

        var createDto = new CreateNotificationDto
        {
            UserId = dto.UserId,
            Type = NotificationType.AppointmentReminder,
            Channel = NotificationChannel.Email,
            TemplateId = template.Id,
            RelatedAppointmentId = dto.AppointmentId,
            Placeholders = new Dictionary<string, string>
            {
                ["userName"] = dto.UserName,
                ["appointmentDate"] = dto.AppointmentDate.ToShortDateString(),
                ["appointmentTime"] = dto.AppointmentDate.ToShortTimeString(),
                ["serviceName"] = dto.ServiceName,
                ["companyAddress"] = dto.CompanyAddress
            }
        };

        return await CreateNotification(createDto);
    }

    // DELETE: api/notifications/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        var notification = await _context.Notifications.FindAsync(id);
        if (notification == null)
        {
            return NotFound();
        }

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// DTOs
public class CreateNotificationDto
{
    public required string UserId { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public NotificationType Type { get; set; }
    public NotificationChannel Channel { get; set; }
    public int? RelatedAppointmentId { get; set; }
    public string? Metadata { get; set; }
    public int? TemplateId { get; set; }
    public Dictionary<string, string>? Placeholders { get; set; }
}

public class AppointmentReminderDto
{
    public required string UserId { get; set; }
    public required string UserName { get; set; }
    public required int AppointmentId { get; set; }
    public required DateTime AppointmentDate { get; set; }
    public required string ServiceName { get; set; }
    public required string CompanyAddress { get; set; }
}
