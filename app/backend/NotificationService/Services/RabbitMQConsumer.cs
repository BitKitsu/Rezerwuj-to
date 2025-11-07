using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
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
                HostName = Environment.GetEnvironmentVariable("RABBITMQ_HOST") ?? "localhost",
                Port = 5672,
                UserName = Environment.GetEnvironmentVariable("RABBITMQ_USER") ?? "guest",
                Password = Environment.GetEnvironmentVariable("RABBITMQ_PASS") ?? "guest"
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
        var appointmentData = JsonSerializer.Deserialize<AppointmentEventData>(message);
        if (appointmentData == null) return;

        var notification = new Notification
        {
            UserId = appointmentData.UserId,
            Title = "Potwierdzenie rezerwacji",
            Message = $"Twoja rezerwacja na {appointmentData.ServiceName} w dniu {appointmentData.AppointmentDate:dd.MM.yyyy} o godz. {appointmentData.AppointmentDate:HH:mm} została potwierdzona.",
            Type = NotificationType.AppointmentConfirmation,
            Channel = NotificationChannel.Email,
            RelatedAppointmentId = appointmentData.AppointmentId
        };

        context.Notifications.Add(notification);
        await context.SaveChangesAsync();
        await sender.SendNotificationAsync(notification);
        
        _logger.LogInformation("Utworzono powiadomienie o nowej rezerwacji dla użytkownika {UserId}", appointmentData.UserId);
    }

    private async Task HandleAppointmentCancelled(string message, Data.NotificationDbContext context, INotificationSender sender)
    {
        var appointmentData = JsonSerializer.Deserialize<AppointmentEventData>(message);
        if (appointmentData == null) return;

        var notification = new Notification
        {
            UserId = appointmentData.UserId,
            Title = "Anulowanie rezerwacji",
            Message = $"Twoja rezerwacja na {appointmentData.ServiceName} w dniu {appointmentData.AppointmentDate:dd.MM.yyyy} została anulowana.",
            Type = NotificationType.AppointmentCancellation,
            Channel = NotificationChannel.Email,
            RelatedAppointmentId = appointmentData.AppointmentId
        };

        context.Notifications.Add(notification);
        await context.SaveChangesAsync();
        await sender.SendNotificationAsync(notification);
        
        _logger.LogInformation("Utworzono powiadomienie o anulowaniu dla użytkownika {UserId}", appointmentData.UserId);
    }

    private async Task HandleAppointmentReminder(string message, Data.NotificationDbContext context, INotificationSender sender)
    {
        var appointmentData = JsonSerializer.Deserialize<AppointmentEventData>(message);
        if (appointmentData == null) return;

        var notification = new Notification
        {
            UserId = appointmentData.UserId,
            Title = "Przypomnienie o wizycie",
            Message = $"Przypominamy o wizycie na {appointmentData.ServiceName} jutro o godz. {appointmentData.AppointmentDate:HH:mm}.",
            Type = NotificationType.AppointmentReminder,
            Channel = NotificationChannel.Email,
            RelatedAppointmentId = appointmentData.AppointmentId
        };

        context.Notifications.Add(notification);
        await context.SaveChangesAsync();
        await sender.SendNotificationAsync(notification);
        
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
}
