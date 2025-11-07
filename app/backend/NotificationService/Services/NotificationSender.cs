using NotificationService.Models;
using NotificationService.Data;
using Microsoft.EntityFrameworkCore;

namespace NotificationService.Services;

public interface INotificationSender
{
    Task<bool> SendNotificationAsync(Notification notification);
}

public class NotificationSender : INotificationSender
{
    private readonly ILogger<NotificationSender> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public NotificationSender(
        ILogger<NotificationSender> logger,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task<bool> SendNotificationAsync(Notification notification)
    {
        try
        {
            _logger.LogInformation("Wysyłanie powiadomienia {Id} do użytkownika {UserId} przez {Channel}", 
                notification.Id, notification.UserId, notification.Channel);

            // Symulacja wysyłania różnymi kanałami
            bool success = notification.Channel switch
            {
                NotificationChannel.Email => await SendEmailAsync(notification),
                NotificationChannel.SMS => await SendSMSAsync(notification),
                NotificationChannel.InApp => await SendInAppNotificationAsync(notification),
                _ => false
            };

            // Aktualizacja statusu w bazie
            using (var scope = _scopeFactory.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
                var dbNotification = await context.Notifications.FindAsync(notification.Id);
                
                if (dbNotification != null)
                {
                    dbNotification.Status = success ? NotificationStatus.Sent : NotificationStatus.Failed;
                    dbNotification.SentAt = success ? DateTime.UtcNow : null;
                    
                    // Dodaj wpis do historii
                    context.NotificationHistories.Add(new NotificationHistory
                    {
                        NotificationId = notification.Id,
                        Event = success ? "sent" : "failed",
                        Details = success ? $"Wysłano przez {notification.Channel}" : "Błąd wysyłania",
                        EventTime = DateTime.UtcNow
                    });
                    
                    await context.SaveChangesAsync();
                }
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd podczas wysyłania powiadomienia {Id}", notification.Id);
            return false;
        }
    }

    private async Task<bool> SendEmailAsync(Notification notification)
    {
        _logger.LogInformation("Wysyłanie email do {UserId}: {Title}", notification.UserId, notification.Title);
        
        // TODO: Integracja z rzeczywistym serwisem email (SendGrid, SMTP, etc.)
        // Na razie symulacja
        await Task.Delay(1000);
        
        // Losowa symulacja sukcesu (90% szans na sukces)
        return Random.Shared.Next(100) < 90;
    }

    private async Task<bool> SendSMSAsync(Notification notification)
    {
        _logger.LogInformation("Wysyłanie SMS do {UserId}: {Title}", notification.UserId, notification.Title);
        
        // TODO: Integracja z serwisem SMS (Twilio, etc.)
        await Task.Delay(500);
        
        return Random.Shared.Next(100) < 85;
    }

    private async Task<bool> SendInAppNotificationAsync(Notification notification)
    {
        _logger.LogInformation("Wysyłanie powiadomienia In-App do {UserId}: {Title}", notification.UserId, notification.Title);
        
        // TODO: Wysłanie przez SignalR do połączonego klienta
        await Task.Delay(100);
        
        // In-app zawsze się udaje jeśli użytkownik jest online
        return true;
    }
}
