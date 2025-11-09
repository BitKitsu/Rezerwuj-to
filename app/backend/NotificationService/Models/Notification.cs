namespace NotificationService.Models;

public class Notification
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty; // ID użytkownika z IdentityService
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public NotificationChannel Channel { get; set; }
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public int? RelatedAppointmentId { get; set; } // Opcjonalne powiązanie z wizytą
    public string? Metadata { get; set; } // JSON z dodatkowymi danymi
}

public enum NotificationType
{
    AppointmentReminder,      // Przypomnienie o wizycie
    AppointmentConfirmation,  // Potwierdzenie rezerwacji
    AppointmentCancellation,  // Anulowanie wizyty
    AppointmentRescheduled,   // Przełożenie wizyty
    SystemNotification,       // Powiadomienie systemowe
    PromotionalOffer,         // Oferta promocyjna
    AccountUpdate             // Aktualizacja konta
}

public enum NotificationChannel
{
    Email,
    SMS,
    InApp
}

public enum NotificationStatus
{
    Pending,    // Oczekuje na wysłanie
    Sent,       // Wysłane
    Delivered,  // Dostarczone
    Read,       // Przeczytane
    Failed      // Błąd wysyłania
}
