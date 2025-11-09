using Microsoft.AspNetCore.SignalR;
using NotificationService.Models;

namespace NotificationService.Hubs;

public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;
    
    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }
    
    public override async Task OnConnectedAsync()
    {
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
            _logger.LogInformation("Użytkownik {UserId} połączył się z hubem", userId);
        }
        
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString();
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{userId}");
            _logger.LogInformation("Użytkownik {UserId} rozłączył się z hubem", userId);
        }
        
        await base.OnDisconnectedAsync(exception);
    }
    
    // Metoda do wysyłania powiadomienia do konkretnego użytkownika (real-time)
    public async Task SendNotificationToUser(string userId, Notification notification)
    {
        await Clients.Group($"user-{userId}").SendAsync("ReceiveNotification", notification);
        _logger.LogInformation("Wysłano powiadomienie real-time do użytkownika {UserId}", userId);
    }
    
    // Metoda do wysyłania powiadomienia do wszystkich użytkowników
    public async Task BroadcastNotification(Notification notification)
    {
        await Clients.All.SendAsync("ReceiveNotification", notification);
        _logger.LogInformation("Wysłano powiadomienie broadcast do wszystkich");
    }
}
