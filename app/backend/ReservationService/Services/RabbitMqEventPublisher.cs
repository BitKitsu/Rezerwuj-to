using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace ReservationService.Services;

public interface IRabbitMqEventPublisher
{
    void Publish(string routingKey, object payload);
}

public class RabbitMqEventPublisher : IRabbitMqEventPublisher, IDisposable
{
    private readonly ILogger<RabbitMqEventPublisher> _logger;
    private IConnection? _connection;
    private IModel? _channel;
    private readonly object _lock = new();

    public RabbitMqEventPublisher(ILogger<RabbitMqEventPublisher> logger)
    {
        _logger = logger;
        TryInitialize();
    }

    public void Publish(string routingKey, object payload)
    {
        try
        {
            EnsureChannel();
            if (_channel == null)
            {
                return;
            }

            var json = JsonSerializer.Serialize(payload);
            var body = Encoding.UTF8.GetBytes(json);

            var props = _channel.CreateBasicProperties();
            props.Persistent = true;
            props.ContentType = "application/json";
            props.MessageId = Guid.NewGuid().ToString();

            _channel.BasicPublish(
                exchange: "reservation_events",
                routingKey: routingKey,
                basicProperties: props,
                body: body);

            _logger.LogInformation("Published RabbitMQ event {RoutingKey}", routingKey);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish RabbitMQ event {RoutingKey}", routingKey);
        }
    }

    private void EnsureChannel()
    {
        lock (_lock)
        {
            if (_channel != null && _connection != null && _connection.IsOpen)
            {
                return;
            }

            DisposeConnection();
            TryInitialize();
        }
    }

    private void TryInitialize()
    {
        try
        {
            var host = Environment.GetEnvironmentVariable("RABBITMQ_HOST")
                ?? Environment.GetEnvironmentVariable("RabbitMQ__Host")
                ?? "localhost";
            var user = Environment.GetEnvironmentVariable("RABBITMQ_USER")
                ?? Environment.GetEnvironmentVariable("RabbitMQ__Username")
                ?? "guest";
            var pass = Environment.GetEnvironmentVariable("RABBITMQ_PASS")
                ?? Environment.GetEnvironmentVariable("RabbitMQ__Password")
                ?? "guest";

            var factory = new ConnectionFactory
            {
                HostName = host,
                Port = 5672,
                UserName = user,
                Password = pass,
                DispatchConsumersAsync = true
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            _channel.ExchangeDeclare(
                exchange: "reservation_events",
                type: ExchangeType.Topic,
                durable: true,
                autoDelete: false,
                arguments: null);

            _channel.QueueDeclare(
                queue: "notification_queue",
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            _channel.QueueBind(
                queue: "notification_queue",
                exchange: "reservation_events",
                routingKey: "appointment.*");

            _logger.LogInformation("RabbitMQ publisher connected to {Host}", host);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RabbitMQ is not available. Events will not be published.");
            DisposeConnection();
        }
    }

    private void DisposeConnection()
    {
        try { _channel?.Close(); } catch { }
        try { _channel?.Dispose(); } catch { }
        try { _connection?.Close(); } catch { }
        try { _connection?.Dispose(); } catch { }
        _channel = null;
        _connection = null;
    }

    public void Dispose()
    {
        DisposeConnection();
    }
}
