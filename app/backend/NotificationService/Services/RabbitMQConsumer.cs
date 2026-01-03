using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Security.Cryptography;
using NotificationService.Models;
using NotificationService.Controllers;

namespace NotificationService.Services;

internal enum MessageProcessResult
{
    Success,
    AlreadyProcessed,
    PoisonMessage,
    Failed
}

public class RabbitMQConsumer : BackgroundService
{
    private readonly ILogger<RabbitMQConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IModel? _channel;
    private AsyncEventingBasicConsumer? _consumer;
    private string? _consumerTag;

    private const ushort PrefetchCount = 10;
    private const int MaxProcessingAttempts = 5;
    private static readonly TimeSpan BaseRetryDelay = TimeSpan.FromMilliseconds(250);

    private const string QueueName = "notification_queue";
    private const string DlqQueueName = "notification_queue.dlq";
    private const string ExchangeName = "reservation_events";
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
        await Task.Delay(5000, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_connection == null || !_connection.IsOpen || _channel == null || !_channel.IsOpen)
                {
                    InitializeRabbitMQ();
                }

                await Task.Delay(1000, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Błąd w RabbitMQ Consumer");
                await Task.Delay(5000, stoppingToken);
            }
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
                    ?? "guest",
                DispatchConsumersAsync = true,
                AutomaticRecoveryEnabled = true,
                TopologyRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10)
            };

            try
            {
                _consumerTag = null;
                _consumer = null;
                _channel?.Close();
                _connection?.Close();
            }
            catch
            {
            }

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            _connection.ConnectionShutdown += (_, args) =>
            {
                _logger.LogWarning("RabbitMQ connection shutdown: {ReplyText}", args.ReplyText);
            };

            // Deklaracja kolejki dla powiadomień
            _channel.QueueDeclare(
                queue: QueueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            _channel.QueueDeclare(
                queue: DlqQueueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            // Deklaracja exchange
            _channel.ExchangeDeclare(
                exchange: ExchangeName,
                type: ExchangeType.Topic,
                durable: true);

            // Bindowanie kolejki do exchange
            _channel.QueueBind(
                queue: QueueName,
                exchange: ExchangeName,
                routingKey: "appointment.*");

            _channel.BasicQos(0, PrefetchCount, false);

            _consumer = new AsyncEventingBasicConsumer(_channel);
            _consumer.Received += HandleReceivedAsync;

            _consumerTag = _channel.BasicConsume(
                queue: QueueName,
                autoAck: false,
                consumer: _consumer);

            _logger.LogInformation("RabbitMQ Consumer uruchomiony i nasłuchuje na kolejce {Queue}", QueueName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nie udało się połączyć z RabbitMQ. Serwis będzie działać bez RabbitMQ.");
        }
    }

    private async Task HandleReceivedAsync(object sender, BasicDeliverEventArgs ea)
    {
        if (_channel == null || !_channel.IsOpen)
        {
            return;
        }

        var bodyBytes = ea.Body.ToArray();
        var message = Encoding.UTF8.GetString(bodyBytes);
        var routingKey = ea.RoutingKey;
        var messageId = ea.BasicProperties?.MessageId;
        var bodyHash = ComputeSha256Hex(bodyBytes);
        var dedupeKey = ComputeDedupeKey(messageId, routingKey, bodyHash);

        _logger.LogInformation("Otrzymano wiadomość z RabbitMQ: {RoutingKey}", routingKey);

        try
        {
            var result = await ProcessWithRetryAsync(
                routingKey,
                message,
                dedupeKey,
                messageId,
                bodyHash);

            if (result == MessageProcessResult.AlreadyProcessed)
            {
                _channel.BasicAck(ea.DeliveryTag, false);
                return;
            }

            if (result == MessageProcessResult.Success)
            {
                _channel.BasicAck(ea.DeliveryTag, false);
                return;
            }

            await PublishToDlqAsync(routingKey, bodyBytes, messageId, bodyHash, dedupeKey, result.ToString());
            _channel.BasicAck(ea.DeliveryTag, false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd przetwarzania wiadomości");
            try
            {
                await PublishToDlqAsync(routingKey, bodyBytes, messageId, bodyHash, dedupeKey, "UnhandledException");
                _channel.BasicAck(ea.DeliveryTag, false);
            }
            catch
            {
                _channel.BasicNack(ea.DeliveryTag, false, true);
            }
        }
    }

    private async Task<MessageProcessResult> ProcessWithRetryAsync(
        string routingKey,
        string message,
        string dedupeKey,
        string? messageId,
        string bodyHash)
    {
        for (var attempt = 1; attempt <= MaxProcessingAttempts; attempt++)
        {
            try
            {
                var processed = await IsAlreadyProcessedAsync(dedupeKey);
                if (processed)
                {
                    return MessageProcessResult.AlreadyProcessed;
                }

                await ProcessMessage(routingKey, message, dedupeKey, messageId, bodyHash);
                return MessageProcessResult.Success;
            }
            catch (JsonException)
            {
                return MessageProcessResult.PoisonMessage;
            }
            catch (DbUpdateException)
            {
                if (await IsAlreadyProcessedAsync(dedupeKey))
                {
                    return MessageProcessResult.AlreadyProcessed;
                }

                if (attempt == MaxProcessingAttempts)
                {
                    return MessageProcessResult.Failed;
                }
            }
            catch (Exception)
            {
                if (attempt == MaxProcessingAttempts)
                {
                    return MessageProcessResult.Failed;
                }
            }

            var delay = TimeSpan.FromMilliseconds(BaseRetryDelay.TotalMilliseconds * Math.Pow(2, attempt - 1));
            await Task.Delay(delay);
        }

        return MessageProcessResult.Failed;
    }

    private async Task<bool> IsAlreadyProcessedAsync(string dedupeKey)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Data.NotificationDbContext>();
        return await context.ProcessedMessages.AsNoTracking().AnyAsync(x => x.DedupeKey == dedupeKey);
    }

    private async Task PublishToDlqAsync(
        string routingKey,
        byte[] body,
        string? messageId,
        string bodyHash,
        string dedupeKey,
        string reason)
    {
        if (_channel == null || !_channel.IsOpen)
        {
            return;
        }

        var props = _channel.CreateBasicProperties();
        props.Persistent = true;
        props.ContentType = "application/json";
        props.MessageId = messageId;
        props.Headers = new Dictionary<string, object>
        {
            ["x-original-routing-key"] = routingKey,
            ["x-dedupe-key"] = dedupeKey,
            ["x-body-hash"] = bodyHash,
            ["x-failure-reason"] = reason
        };

        _channel.BasicPublish(
            exchange: "",
            routingKey: DlqQueueName,
            basicProperties: props,
            body: body);
    }

    private static string ComputeDedupeKey(string? messageId, string routingKey, string bodyHash)
    {
        return !string.IsNullOrWhiteSpace(messageId)
            ? messageId
            : $"{routingKey}:{bodyHash}";
    }

    private static string ComputeSha256Hex(byte[] bytes)
    {
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string ApplyTemplate(string value, AppointmentEventData d)
    {
        var result = value ?? string.Empty;

        var userFirstName = d.UserFirstName ?? string.Empty;
        var userLastName = d.UserLastName ?? string.Empty;
        var userFullName = string.Join(" ", new[] { userFirstName, userLastName }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim()));

        var userName = userFullName;
        if (string.IsNullOrWhiteSpace(userName))
        {
            var v = (d.UserId ?? string.Empty).Trim();
            if (v.Contains('@') || v.StartsWith('+'))
            {
                userName = v;
            }
        }

        var appointmentDate = d.AppointmentDate.ToString("dd.MM.yyyy");
        var appointmentTime = d.AppointmentDate.ToString("HH:mm");
        var appointmentDateTime = d.AppointmentDate.ToString("dd.MM.yyyy HH:mm");
        var appointmentShort = d.AppointmentDate.ToString("dd.MM HH:mm");
        var companyAddress = !string.IsNullOrWhiteSpace(d.CompanyAddress)
            ? d.CompanyAddress!
            : (!string.IsNullOrWhiteSpace(d.CompanyAddressShort) ? d.CompanyAddressShort! : string.Empty);

        var companyAddressShort = d.CompanyAddressShort ?? string.Empty;
        var companyEmail = d.CompanyEmail ?? string.Empty;
        var companyPhone = d.CompanyPhone ?? string.Empty;
        var contact = string.Join(" ", new[] { companyPhone, companyEmail }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim()));

        var tokens = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["userName"] = userName,
            ["userFirstName"] = userFirstName,
            ["userLastName"] = userLastName,
            ["userFullName"] = userFullName,
            ["appointmentDate"] = appointmentDate,
            ["appointmentTime"] = appointmentTime,
            ["appointmentDateTime"] = appointmentDateTime,
            ["appointmentShort"] = appointmentShort,
            ["serviceName"] = d.ServiceName ?? string.Empty,
            ["companyName"] = d.CompanyName ?? string.Empty,
            ["branchName"] = d.BranchName ?? string.Empty,
            ["companyAddress"] = companyAddress,
            ["companyAddressShort"] = companyAddressShort,
            ["companyEmail"] = companyEmail,
            ["companyPhone"] = companyPhone,
            ["contact"] = contact,
            ["appointmentId"] = d.AppointmentId.ToString()
        };

        foreach (var kv in tokens)
        {
            result = result.Replace($"{{{{{kv.Key}}}}}", kv.Value);
            result = result.Replace($"{{{kv.Key}}}", kv.Value);
        }

        return result;
    }

    private async Task ProcessMessage(string routingKey, string message, string dedupeKey, string? messageId, string bodyHash)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Data.NotificationDbContext>();
        var notificationSender = scope.ServiceProvider.GetRequiredService<INotificationSender>();

        context.ProcessedMessages.Add(new ProcessedMessage
        {
            DedupeKey = dedupeKey,
            MessageId = messageId,
            RoutingKey = routingKey,
            BodyHash = bodyHash,
            ProcessedAt = DateTime.UtcNow
        });

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

        var templates = await context.NotificationTemplates
            .AsNoTracking()
            .Where(t => t.Type == NotificationType.AppointmentConfirmation && t.IsActive)
            .ToListAsync();

        var templateByChannel = templates
            .GroupBy(t => t.Channel)
            .ToDictionary(g => g.Key, g => g.First());

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

        var notifications = channels.Select(ch =>
        {
            var fallbackTitle = ch == NotificationChannel.SMS ? "Rezerwacja" : "Potwierdzenie rezerwacji";
            var fallbackBody = ch == NotificationChannel.Email
                ? AppointmentMessageBuilder.BuildEmailBodyCreated(appointmentData)
                : ch == NotificationChannel.SMS
                    ? AppointmentMessageBuilder.BuildSmsBodyCreated(appointmentData)
                    : AppointmentMessageBuilder.BuildInAppBodyCreated(appointmentData);

            var title = fallbackTitle;
            var body = fallbackBody;

            if (templateByChannel.TryGetValue(ch, out var template) && template != null)
            {
                if (!string.IsNullOrWhiteSpace(template.Subject))
                {
                    title = ApplyTemplate(template.Subject, appointmentData);
                }

                if (!string.IsNullOrWhiteSpace(template.Body))
                {
                    body = ApplyTemplate(template.Body, appointmentData);
                }
            }

            return new Notification
            {
                UserId = appointmentData.UserId,
                Title = title,
                Message = body,
                Type = NotificationType.AppointmentConfirmation,
                Channel = ch,
                RelatedAppointmentId = appointmentData.AppointmentId,
                Metadata = metadata
            };
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

        var templates = await context.NotificationTemplates
            .AsNoTracking()
            .Where(t => t.Type == NotificationType.AppointmentCancellation && t.IsActive)
            .ToListAsync();

        var templateByChannel = templates
            .GroupBy(t => t.Channel)
            .ToDictionary(g => g.Key, g => g.First());

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

        var notifications = channels.Select(ch =>
        {
            var fallbackTitle = ch == NotificationChannel.SMS ? "Rezerwacja" : "Anulowanie rezerwacji";
            var fallbackBody = ch == NotificationChannel.Email
                ? AppointmentMessageBuilder.BuildEmailBodyCancelled(appointmentData)
                : ch == NotificationChannel.SMS
                    ? AppointmentMessageBuilder.BuildSmsBodyCancelled(appointmentData)
                    : AppointmentMessageBuilder.BuildInAppBodyCancelled(appointmentData);

            var title = fallbackTitle;
            var body = fallbackBody;

            if (templateByChannel.TryGetValue(ch, out var template) && template != null)
            {
                if (!string.IsNullOrWhiteSpace(template.Subject))
                {
                    title = ApplyTemplate(template.Subject, appointmentData);
                }

                if (!string.IsNullOrWhiteSpace(template.Body))
                {
                    body = ApplyTemplate(template.Body, appointmentData);
                }
            }

            return new Notification
            {
                UserId = appointmentData.UserId,
                Title = title,
                Message = body,
                Type = NotificationType.AppointmentCancellation,
                Channel = ch,
                RelatedAppointmentId = appointmentData.AppointmentId,
                Metadata = metadata
            };
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

        var templates = await context.NotificationTemplates
            .AsNoTracking()
            .Where(t => t.Type == NotificationType.AppointmentReminder && t.IsActive)
            .ToListAsync();

        var templateByChannel = templates
            .GroupBy(t => t.Channel)
            .ToDictionary(g => g.Key, g => g.First());

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

        var notifications = channels.Select(ch =>
        {
            var fallbackTitle = "Przypomnienie o wizycie";
            var fallbackBody = ch == NotificationChannel.Email
                ? AppointmentMessageBuilder.BuildEmailBodyReminder(appointmentData)
                : ch == NotificationChannel.SMS
                    ? AppointmentMessageBuilder.BuildSmsBodyReminder(appointmentData)
                    : AppointmentMessageBuilder.BuildInAppBodyReminder(appointmentData);

            var title = fallbackTitle;
            var body = fallbackBody;

            if (templateByChannel.TryGetValue(ch, out var template) && template != null)
            {
                if (!string.IsNullOrWhiteSpace(template.Subject))
                {
                    title = ApplyTemplate(template.Subject, appointmentData);
                }

                if (!string.IsNullOrWhiteSpace(template.Body))
                {
                    body = ApplyTemplate(template.Body, appointmentData);
                }
            }

            return new Notification
            {
                UserId = appointmentData.UserId,
                Title = title,
                Message = body,
                Type = NotificationType.AppointmentReminder,
                Channel = ch,
                RelatedAppointmentId = appointmentData.AppointmentId,
                Metadata = metadata
            };
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
        try
        {
            if (_consumer != null)
            {
                _consumer.Received -= HandleReceivedAsync;
            }
        }
        catch
        {
        }

        try { _channel?.Close(); } catch { }
        try { _channel?.Dispose(); } catch { }
        try { _connection?.Close(); } catch { }
        try { _connection?.Dispose(); } catch { }
        base.Dispose();
    }
}

public class AppointmentEventData
{
    public int AppointmentId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public string? UserFirstName { get; set; }
    public string? UserLastName { get; set; }
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
