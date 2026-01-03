namespace NotificationService.Models;

public class NotificationTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.Email;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty; // Może zawierać placeholdery jak {{userName}}, {{appointmentDate}}
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

// Model dla historii wysłanych powiadomień
public class NotificationHistory
{
    public int Id { get; set; }
    public int NotificationId { get; set; }
    public string Event { get; set; } = string.Empty; // np. "sent", "delivered", "failed"
    public string? Details { get; set; } // Szczegóły zdarzenia
    public DateTime EventTime { get; set; } = DateTime.UtcNow;
    
    // Nawigacja
    public Notification Notification { get; set; } = null!;
}
