using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using NotificationService.Models;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace NotificationService.Hubs;

 [Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;
    
    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }
    
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        var email = Context.User?.FindFirst("email")?.Value
            ?? Context.User?.FindFirstValue(ClaimTypes.Email);
        email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();

        var phone = Context.User?.FindFirst("phone")?.Value
            ?? Context.User?.FindFirstValue(ClaimTypes.MobilePhone);
        if (!string.IsNullOrWhiteSpace(phone))
        {
            phone = Regex.Replace(phone.Trim(), "[^0-9+]", "");
            if (string.IsNullOrWhiteSpace(phone)) phone = null;
        }
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
            if (!string.IsNullOrWhiteSpace(email))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{email}");
            }
            if (!string.IsNullOrWhiteSpace(phone))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{phone}");
            }
            _logger.LogInformation("Użytkownik {UserId} połączył się z hubem", userId);
        }
        else
        {
            _logger.LogWarning("Połączenie z hubem bez userId w JWT - rozłączam");
            Context.Abort();
            return;
        }
        
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        var email = Context.User?.FindFirst("email")?.Value
            ?? Context.User?.FindFirstValue(ClaimTypes.Email);
        email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();

        var phone = Context.User?.FindFirst("phone")?.Value
            ?? Context.User?.FindFirstValue(ClaimTypes.MobilePhone);
        if (!string.IsNullOrWhiteSpace(phone))
        {
            phone = Regex.Replace(phone.Trim(), "[^0-9+]", "");
            if (string.IsNullOrWhiteSpace(phone)) phone = null;
        }
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{userId}");
            if (!string.IsNullOrWhiteSpace(email))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{email}");
            }
            if (!string.IsNullOrWhiteSpace(phone))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{phone}");
            }
            _logger.LogInformation("Użytkownik {UserId} rozłączył się z hubem", userId);
        }
        
        await base.OnDisconnectedAsync(exception);
    }
    
    // Metoda do wysyłania powiadomienia do konkretnego użytkownika (real-time)
    [Authorize(Roles = "Admin")]
    public async Task SendNotificationToUser(string userId, Notification notification)
    {
        await Clients.Group($"user-{userId}").SendAsync("ReceiveNotification", notification);
        _logger.LogInformation("Wysłano powiadomienie real-time do użytkownika {UserId}", userId);
    }
    
    // Metoda do wysyłania powiadomienia do wszystkich użytkowników
    [Authorize(Roles = "Admin")]
    public async Task BroadcastNotification(Notification notification)
    {
        await Clients.All.SendAsync("ReceiveNotification", notification);
        _logger.LogInformation("Wysłano powiadomienie broadcast do wszystkich");
    }
}
