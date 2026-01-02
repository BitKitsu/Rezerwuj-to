using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using NotificationService.Models;
using NotificationService.Controllers;

namespace NotificationService.Services;

public class RabbitMQConsumer : BackgroundService
{
    private readonly ILogger<RabbitMQConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IModel? _channel;
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly JsonSerializerOptions MetadataSerializerOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };
    
    public RabbitMQConsumer(
        ILogger<RabbitMQConsumer> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(5000, stoppingToken); // Czekaj na uruchomienie RabbitMQ
        
        try
        {
            InitializeRabbitMQ();
            
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd w RabbitMQ Consumer");
        }
    }

    private void InitializeRabbitMQ()
    {
        try
        {
            var factory = new ConnectionFactory
            {
                HostName = Environment.GetEnvironmentVariable("RABBITMQ_HOST")
                    ?? Environment.GetEnvironmentVariable("RabbitMQ__Host")
                    ?? "localhost",
                Port = 5672,
                UserName = Environment.GetEnvironmentVariable("RABBITMQ_USER")
                    ?? Environment.GetEnvironmentVariable("RabbitMQ__Username")
                    ?? "guest",
                Password = Environment.GetEnvironmentVariable("RABBITMQ_PASS")
                    ?? Environment.GetEnvironmentVariable("RabbitMQ__Password")
                    ?? "guest"
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            // Deklaracja kolejki dla powiadomień
            _channel.QueueDeclare(
                queue: "notification_queue",
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            // Deklaracja exchange
            _channel.ExchangeDeclare(
                exchange: "reservation_events",
                type: ExchangeType.Topic,
                durable: true);

            // Bindowanie kolejki do exchange
            _channel.QueueBind(
                queue: "notification_queue",
                exchange: "reservation_events",
                routingKey: "appointment.*");

            var consumer = new EventingBasicConsumer(_channel);
            consumer.Received += async (model, ea) =>
            {
                try
                {
                    var body = ea.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);
                    var routingKey = ea.RoutingKey;
                    
                    _logger.LogInformation("Otrzymano wiadomość z RabbitMQ: {RoutingKey}", routingKey);
                    
                    await ProcessMessage(routingKey, message);
                    
                    _channel.BasicAck(ea.DeliveryTag, false);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Błąd przetwarzania wiadomości");
                    _channel.BasicNack(ea.DeliveryTag, false, true);
                }
            };

            _channel.BasicConsume(
                queue: "notification_queue",
                autoAck: false,
                consumer: consumer);

            _logger.LogInformation("RabbitMQ Consumer uruchomiony i nasłuchuje na kolejce notification_queue");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nie udało się połączyć z RabbitMQ. Serwis będzie działać bez RabbitMQ.");
        }
    }

    private async Task ProcessMessage(string routingKey, string message)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Data.NotificationDbContext>();
        var notificationSender = scope.ServiceProvider.GetRequiredService<INotificationSender>();

        switch (routingKey)
        {
            case "appointment.created":
                await HandleAppointmentCreated(message, context, notificationSender);
                break;
            case "appointment.cancelled":
                await HandleAppointmentCancelled(message, context, notificationSender);
                break;
            case "appointment.reminder":
                await HandleAppointmentReminder(message, context, notificationSender);
                break;
            default:
                _logger.LogWarning("Nieobsługiwany routing key: {RoutingKey}", routingKey);
                break;
        }
    }

    private async Task HandleAppointmentCreated(string message, Data.NotificationDbContext context, INotificationSender sender)
    {
        var appointmentData = JsonSerializer.Deserialize<AppointmentEventData>(message, SerializerOptions);
        if (appointmentData == null) return;

        var channels = new List<NotificationChannel>();
        if (!string.IsNullOrWhiteSpace(appointmentData.RecipientEmail)) channels.Add(NotificationChannel.Email);
        if (!string.IsNullOrWhiteSpace(appointmentData.RecipientPhone)) channels.Add(NotificationChannel.SMS);
        if (AppointmentMessageBuilder.IsRealUserId(appointmentData.UserId)) channels.Add(NotificationChannel.InApp);
        if (channels.Count == 0) channels.Add(NotificationChannel.InApp);

        var metadata = JsonSerializer.Serialize(new
        {
            routingKey = "appointment.created",
            recipientEmail = appointmentData.RecipientEmail,
            recipientPhone = appointmentData.RecipientPhone,
            companyName = appointmentData.CompanyName,
            serviceName = appointmentData.ServiceName,
            appointmentId = appointmentData.AppointmentId,
            branchName = appointmentData.BranchName,
            companyEmail = appointmentData.CompanyEmail,
            companyPhone = appointmentData.CompanyPhone,
            companyAddress = appointmentData.CompanyAddress,
            companyAddressShort = appointmentData.CompanyAddressShort
        }, MetadataSerializerOptions);

        var notifications = channels.Select(ch => new Notification
        {
            UserId = appointmentData.UserId,
            Title = ch == NotificationChannel.SMS ? "Rezerwacja" : "Potwierdzenie rezerwacji",
            Message = ch == NotificationChannel.Email
                ? AppointmentMessageBuilder.BuildEmailBodyCreated(appointmentData)
                : ch == NotificationChannel.SMS
                    ? AppointmentMessageBuilder.BuildSmsBodyCreated(appointmentData)
                    : AppointmentMessageBuilder.BuildInAppBodyCreated(appointmentData),
            Type = NotificationType.AppointmentConfirmation,
            Channel = ch,
            RelatedAppointmentId = appointmentData.AppointmentId,
            Metadata = metadata
        }).ToList();

        context.Notifications.AddRange(notifications);
        await context.SaveChangesAsync();

        foreach (var n in notifications)
        {
            await sender.SendNotificationAsync(n);
        }
        
        _logger.LogInformation("Utworzono powiadomienie o nowej rezerwacji dla użytkownika {UserId}", appointmentData.UserId);
    }

    private async Task HandleAppointmentCancelled(string message, Data.NotificationDbContext context, INotificationSender sender)
    {
        var appointmentData = JsonSerializer.Deserialize<AppointmentEventData>(message, SerializerOptions);
        if (appointmentData == null) return;

        var channels = new List<NotificationChannel>();
        if (!string.IsNullOrWhiteSpace(appointmentData.RecipientEmail)) channels.Add(NotificationChannel.Email);
        if (!string.IsNullOrWhiteSpace(appointmentData.RecipientPhone)) channels.Add(NotificationChannel.SMS);
        if (AppointmentMessageBuilder.IsRealUserId(appointmentData.UserId)) channels.Add(NotificationChannel.InApp);
        if (channels.Count == 0) channels.Add(NotificationChannel.InApp);

        var metadata = JsonSerializer.Serialize(new
        {
            routingKey = "appointment.cancelled",
            recipientEmail = appointmentData.RecipientEmail,
            recipientPhone = appointmentData.RecipientPhone,
            companyName = appointmentData.CompanyName,
            serviceName = appointmentData.ServiceName,
            appointmentId = appointmentData.AppointmentId,
            branchName = appointmentData.BranchName,
            companyEmail = appointmentData.CompanyEmail,
            companyPhone = appointmentData.CompanyPhone,
            companyAddress = appointmentData.CompanyAddress,
            companyAddressShort = appointmentData.CompanyAddressShort
        }, MetadataSerializerOptions);

        var notifications = channels.Select(ch => new Notification
        {
            UserId = appointmentData.UserId,
            Title = ch == NotificationChannel.SMS ? "Rezerwacja" : "Anulowanie rezerwacji",
            Message = ch == NotificationChannel.Email
                ? AppointmentMessageBuilder.BuildEmailBodyCancelled(appointmentData)
                : ch == NotificationChannel.SMS
                    ? AppointmentMessageBuilder.BuildSmsBodyCancelled(appointmentData)
                    : AppointmentMessageBuilder.BuildInAppBodyCancelled(appointmentData),
            Type = NotificationType.AppointmentCancellation,
            Channel = ch,
            RelatedAppointmentId = appointmentData.AppointmentId,
            Metadata = metadata
        }).ToList();

        context.Notifications.AddRange(notifications);
        await context.SaveChangesAsync();

        foreach (var n in notifications)
        {
            await sender.SendNotificationAsync(n);
        }
        
        _logger.LogInformation("Utworzono powiadomienie o anulowaniu dla użytkownika {UserId}", appointmentData.UserId);
    }

    private async Task HandleAppointmentReminder(string message, Data.NotificationDbContext context, INotificationSender sender)
    {
        var appointmentData = JsonSerializer.Deserialize<AppointmentEventData>(message, SerializerOptions);
        if (appointmentData == null) return;

        var channels = new List<NotificationChannel>();
        if (!string.IsNullOrWhiteSpace(appointmentData.RecipientEmail)) channels.Add(NotificationChannel.Email);
        if (!string.IsNullOrWhiteSpace(appointmentData.RecipientPhone)) channels.Add(NotificationChannel.SMS);
        if (AppointmentMessageBuilder.IsRealUserId(appointmentData.UserId)) channels.Add(NotificationChannel.InApp);
        if (channels.Count == 0) channels.Add(NotificationChannel.InApp);

        var metadata = JsonSerializer.Serialize(new
        {
            routingKey = "appointment.reminder",
            recipientEmail = appointmentData.RecipientEmail,
            recipientPhone = appointmentData.RecipientPhone,
            companyName = appointmentData.CompanyName,
            serviceName = appointmentData.ServiceName,
            appointmentId = appointmentData.AppointmentId,
            branchName = appointmentData.BranchName,
            companyEmail = appointmentData.CompanyEmail,
            companyPhone = appointmentData.CompanyPhone,
            companyAddress = appointmentData.CompanyAddress,
            companyAddressShort = appointmentData.CompanyAddressShort
        }, MetadataSerializerOptions);

        var notifications = channels.Select(ch => new Notification
        {
            UserId = appointmentData.UserId,
            Title = "Przypomnienie o wizycie",
            Message = ch == NotificationChannel.Email
                ? AppointmentMessageBuilder.BuildEmailBodyReminder(appointmentData)
                : ch == NotificationChannel.SMS
                    ? AppointmentMessageBuilder.BuildSmsBodyReminder(appointmentData)
                    : AppointmentMessageBuilder.BuildInAppBodyReminder(appointmentData),
            Type = NotificationType.AppointmentReminder,
            Channel = ch,
            RelatedAppointmentId = appointmentData.AppointmentId,
            Metadata = metadata
        }).ToList();

        context.Notifications.AddRange(notifications);
        await context.SaveChangesAsync();

        foreach (var n in notifications)
        {
            await sender.SendNotificationAsync(n);
        }
        
        _logger.LogInformation("Utworzono przypomnienie dla użytkownika {UserId}", appointmentData.UserId);
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        base.Dispose();
    }
}

public class AppointmentEventData
{
    public int AppointmentId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? RecipientEmail { get; set; }
    public string? RecipientPhone { get; set; }
    public string? BranchName { get; set; }
    public string? CompanyEmail { get; set; }
    public string? CompanyPhone { get; set; }
    public string? CompanyAddress { get; set; }
    public string? CompanyAddressShort { get; set; }
}

internal static class AppointmentMessageBuilder
{
    public static bool IsRealUserId(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return false;
        var v = userId.Trim();
        if (v.Contains('@')) return false;
        if (v.StartsWith('+')) return false;
        return true;
    }

    private static string LocationShort(AppointmentEventData d)
    {
        return string.IsNullOrWhiteSpace(d.CompanyAddressShort)
            ? (string.IsNullOrWhiteSpace(d.CompanyName) ? "" : d.CompanyName)
            : d.CompanyAddressShort;
    }

    private static string LocationFull(AppointmentEventData d)
    {
        return string.IsNullOrWhiteSpace(d.CompanyAddress)
            ? LocationShort(d)
            : d.CompanyAddress;
    }

    public static string BuildEmailBodyCreated(AppointmentEventData d)
    {
        var whenLine = d.AppointmentDate.ToString("dd.MM.yyyy HH:mm");
        var location = LocationFull(d);
        var contact = string.Join(" ", new[] { d.CompanyPhone, d.CompanyEmail }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim()));

        var lines = new List<string>
        {
            "Twoja rezerwacja została potwierdzona.",
            "",
            $"Usługa: {d.ServiceName}",
            $"Firma: {d.CompanyName}",
            string.IsNullOrWhiteSpace(d.BranchName) ? $"Lokalizacja: {location}" : $"Oddział: {d.BranchName} | Lokalizacja: {location}",
            $"Termin: {whenLine}",
            $"ID rezerwacji: {d.AppointmentId}"
        };

        if (!string.IsNullOrWhiteSpace(contact))
        {
            lines.Add($"Kontakt: {contact}");
        }

        return string.Join("\n", lines);
    }

    public static string BuildSmsBodyCreated(AppointmentEventData d)
    {
        return $"{d.ServiceName} | {LocationShort(d)} | {d.AppointmentDate:dd.MM HH:mm}";
    }

    public static string BuildInAppBodyCreated(AppointmentEventData d)
    {
        return $"Potwierdzono: {d.ServiceName} | {LocationShort(d)} | {d.AppointmentDate:dd.MM HH:mm}";
    }

    public static string BuildEmailBodyCancelled(AppointmentEventData d)
    {
        var whenLine = d.AppointmentDate.ToString("dd.MM.yyyy HH:mm");
        var location = LocationFull(d);
        var contact = string.Join(" ", new[] { d.CompanyPhone, d.CompanyEmail }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim()));

        var lines = new List<string>
        {
            "Twoja rezerwacja została anulowana.",
            "",
            $"Usługa: {d.ServiceName}",
            $"Firma: {d.CompanyName}",
            string.IsNullOrWhiteSpace(d.BranchName) ? $"Lokalizacja: {location}" : $"Oddział: {d.BranchName} | Lokalizacja: {location}",
            $"Termin: {whenLine}",
            $"ID rezerwacji: {d.AppointmentId}"
        };

        if (!string.IsNullOrWhiteSpace(contact))
        {
            lines.Add($"Kontakt: {contact}");
        }

        return string.Join("\n", lines);
    }

    public static string BuildSmsBodyCancelled(AppointmentEventData d)
    {
        return $"{d.ServiceName} | {LocationShort(d)} | {d.AppointmentDate:dd.MM HH:mm}";
    }

    public static string BuildInAppBodyCancelled(AppointmentEventData d)
    {
        return $"Anulowano: {d.ServiceName} | {LocationShort(d)} | {d.AppointmentDate:dd.MM HH:mm}";
    }

    public static string BuildEmailBodyReminder(AppointmentEventData d)
    {
        var whenLine = d.AppointmentDate.ToString("dd.MM.yyyy HH:mm");
        var location = LocationFull(d);
        var contact = string.Join(" ", new[] { d.CompanyPhone, d.CompanyEmail }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim()));

        var lines = new List<string>
        {
            "Przypomnienie o wizycie.",
            "",
            $"Usługa: {d.ServiceName}",
            $"Firma: {d.CompanyName}",
            string.IsNullOrWhiteSpace(d.BranchName) ? $"Lokalizacja: {location}" : $"Oddział: {d.BranchName} | Lokalizacja: {location}",
            $"Termin: {whenLine}",
            $"ID rezerwacji: {d.AppointmentId}"
        };

        if (!string.IsNullOrWhiteSpace(contact))
        {
            lines.Add($"Kontakt: {contact}");
        }

        return string.Join("\n", lines);
    }

    public static string BuildSmsBodyReminder(AppointmentEventData d)
    {
        return $"{d.ServiceName} | {LocationShort(d)} | {d.AppointmentDate:dd.MM HH:mm}";
    }

    public static string BuildInAppBodyReminder(AppointmentEventData d)
    {
        return $"Przypomnienie: {d.ServiceName} | {LocationShort(d)} | {d.AppointmentDate:dd.MM HH:mm}";
    }
}
