using NotificationService.Models;
using NotificationService.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using System.Text.Json;
using MailKit.Net.Smtp;
using MimeKit;
using NotificationService.Hubs;

namespace NotificationService.Services;

public interface INotificationSender
{
    Task<bool> SendNotificationAsync(Notification notification);
}

public class NotificationSender : INotificationSender
{
    private readonly ILogger<NotificationSender> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly EmailSettings _emailSettings;
    private readonly SmsInboxStore _smsInbox;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationSender(
        ILogger<NotificationSender> logger,
        IServiceScopeFactory scopeFactory,
        IOptions<EmailSettings> emailSettings,
        SmsInboxStore smsInbox,
        IHubContext<NotificationHub> hubContext)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _emailSettings = emailSettings.Value;
        _smsInbox = smsInbox;
        _hubContext = hubContext;
    }

    public async Task<bool> SendNotificationAsync(Notification notification)
    {
        string details;

        try
        {
            _logger.LogInformation("Wysyłanie powiadomienia {Id} do użytkownika {UserId} przez {Channel}", 
                notification.Id, notification.UserId, notification.Channel);

            // Symulacja wysyłania różnymi kanałami
            (bool success, string channelDetails) = notification.Channel switch
            {
                NotificationChannel.Email => await SendEmailAsync(notification),
                NotificationChannel.SMS => await SendSMSAsync(notification),
                NotificationChannel.InApp => await SendInAppNotificationAsync(notification),
                _ => (false, "Unsupported channel")
            };

            details = channelDetails;

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
                        Details = details,
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

    private async Task<(bool Success, string Details)> SendEmailAsync(Notification notification)
    {
        var recipient = TryResolveRecipientEmail(notification);
        if (string.IsNullOrWhiteSpace(recipient))
        {
            _logger.LogWarning("Brak recipient email dla notification {Id} (UserId={UserId})", notification.Id, notification.UserId);
            return (false, "Missing recipient email");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_emailSettings.FromName, _emailSettings.FromEmail));
            message.To.Add(MailboxAddress.Parse(recipient));
            message.Subject = notification.Title;
            message.Body = new TextPart("plain")
            {
                Text = notification.Message
            };

            using var client = new SmtpClient();

            var socketOptions = _emailSettings.UseSsl
                ? MailKit.Security.SecureSocketOptions.SslOnConnect
                : _emailSettings.UseStartTls
                    ? MailKit.Security.SecureSocketOptions.StartTls
                    : MailKit.Security.SecureSocketOptions.None;

            await client.ConnectAsync(_emailSettings.SmtpHost, _emailSettings.SmtpPort, socketOptions);

            if (!string.IsNullOrWhiteSpace(_emailSettings.SmtpUser))
            {
                await client.AuthenticateAsync(_emailSettings.SmtpUser, _emailSettings.SmtpPassword);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            return (true, $"Email sent to {recipient} via SMTP {_emailSettings.SmtpHost}:{_emailSettings.SmtpPort}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd SMTP przy wysyłce email notification {Id}", notification.Id);
            return (false, $"SMTP error: {ex.GetType().Name}: {ex.Message}");
        }
    }

    private async Task<(bool Success, string Details)> SendSMSAsync(Notification notification)
    {
        var recipient = TryResolveRecipientPhone(notification);
        if (string.IsNullOrWhiteSpace(recipient))
        {
            _logger.LogWarning("Brak recipient phone dla notification {Id} (UserId={UserId})", notification.Id, notification.UserId);
            return (false, "Missing recipient phone");
        }

        _smsInbox.Add(recipient, notification.Message, notification.Metadata);
        await Task.CompletedTask;

        return (true, $"SMS stored in dev inbox for {recipient}");
    }

    private async Task<(bool Success, string Details)> SendInAppNotificationAsync(Notification notification)
    {
        if (string.IsNullOrWhiteSpace(notification.UserId))
        {
            return (false, "Missing userId");
        }

        try
        {
            await _hubContext.Clients
                .Group($"user-{notification.UserId}")
                .SendAsync("ReceiveNotification", notification);

            return (true, "InApp sent via SignalR");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd SignalR przy wysyłce InApp notification {Id}", notification.Id);
            return (false, $"SignalR error: {ex.GetType().Name}: {ex.Message}");
        }
    }

    private string? TryResolveRecipientEmail(Notification notification)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(notification.Metadata))
            {
                using var doc = JsonDocument.Parse(notification.Metadata);
                if (doc.RootElement.TryGetProperty("recipientEmail", out var p))
                {
                    var v = p.GetString();
                    if (!string.IsNullOrWhiteSpace(v))
                    {
                        return v.Trim();
                    }
                }
            }
        }
        catch
        {
        }

        if (!string.IsNullOrWhiteSpace(notification.UserId) && notification.UserId.Contains('@'))
        {
            return notification.UserId.Trim();
        }

        return null;
    }

    private string? TryResolveRecipientPhone(Notification notification)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(notification.Metadata))
            {
                using var doc = JsonDocument.Parse(notification.Metadata);
                if (doc.RootElement.TryGetProperty("recipientPhone", out var p))
                {
                    var v = p.GetString();
                    if (!string.IsNullOrWhiteSpace(v))
                    {
                        return v.Trim();
                    }
                }
            }
        }
        catch
        {
        }

        if (!string.IsNullOrWhiteSpace(notification.UserId))
        {
            var v = notification.UserId.Trim();
            if (v.StartsWith("+"))
            {
                return v;
            }
        }

        return null;
    }
}
