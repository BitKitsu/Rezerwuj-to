namespace ReservationService.Models;

public abstract class DomainEvent
{
    public Guid EventId { get; set; } = Guid.NewGuid();
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string AggregateId { get; set; } = string.Empty;
    public string EventType => GetType().Name;
    public string? UserId { get; set; }
    public string? EventData { get; set; } // JSON
}

// Przykładowe eventy dla Appointment
public class AppointmentCreatedEvent : DomainEvent
{
    public int AppointmentId { get; set; }
    public int CompanyId { get; set; }
    public int BranchId { get; set; }
    public int ServiceId { get; set; }
    public string CustomerId { get; set; } = string.Empty;
    public string StaffId { get; set; } = string.Empty;
    public DateTime DateStart { get; set; }
    public DateTime DateEnd { get; set; }
}

public class AppointmentCancelledEvent : DomainEvent
{
    public int AppointmentId { get; set; }
    public int CompanyId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class AppointmentConfirmedEvent : DomainEvent
{
    public int AppointmentId { get; set; }
    public int CompanyId { get; set; }
}

public class AppointmentRescheduledEvent : DomainEvent
{
    public int AppointmentId { get; set; }
    public int CompanyId { get; set; }
    public DateTime OldDateStart { get; set; }
    public DateTime OldDateEnd { get; set; }
    public DateTime NewDateStart { get; set; }
    public DateTime NewDateEnd { get; set; }
}

public class AppointmentDeletedEvent : DomainEvent
{
    public int AppointmentId { get; set; }
    public int CompanyId { get; set; }
}

public class CompanyAuditEvent : DomainEvent
{
    public int CompanyId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? EntityDisplayName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? UserEmail { get; set; }
    public string? UserAgent { get; set; }
}
