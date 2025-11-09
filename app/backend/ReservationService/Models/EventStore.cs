namespace ReservationService.Models;

public class EventStore
{
    public long Id { get; set; }
    public Guid EventId { get; set; }
    public string AggregateId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string EventData { get; set; } = string.Empty; // JSON
    public string? UserId { get; set; }
    public DateTime OccurredAt { get; set; }
    public DateTime StoredAt { get; set; } = DateTime.UtcNow;
    public int Version { get; set; } = 1;
}
