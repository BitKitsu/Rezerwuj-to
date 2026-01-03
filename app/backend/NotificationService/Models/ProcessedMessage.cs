namespace NotificationService.Models;

public class ProcessedMessage
{
    public int Id { get; set; }
    public string DedupeKey { get; set; } = string.Empty;
    public string? MessageId { get; set; }
    public string RoutingKey { get; set; } = string.Empty;
    public string BodyHash { get; set; } = string.Empty;
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}
