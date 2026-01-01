using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Services;

public interface IEventSourcingService
{
    Task StoreEventAsync(DomainEvent domainEvent);
    Task<List<EventStore>> GetEventsAsync(string aggregateId);
    Task<T?> RebuildAggregateAsync<T>(string aggregateId) where T : class, new();
}

public class EventSourcingService : IEventSourcingService
{
    private readonly ReservationDbContext _context;
    private readonly ILogger<EventSourcingService> _logger;
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };
    
    public EventSourcingService(ReservationDbContext context, ILogger<EventSourcingService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    public async Task StoreEventAsync(DomainEvent domainEvent)
    {
        var eventStore = new EventStore
        {
            EventId = domainEvent.EventId,
            AggregateId = domainEvent.AggregateId,
            EventType = domainEvent.EventType,
            EventData = JsonSerializer.Serialize(domainEvent, domainEvent.GetType(), SerializerOptions),
            UserId = domainEvent.UserId,
            OccurredAt = domainEvent.OccurredAt,
            StoredAt = DateTime.UtcNow,
            Version = await GetNextVersionAsync(domainEvent.AggregateId)
        };
        
        _context.EventStores.Add(eventStore);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Event {EventType} stored for aggregate {AggregateId}", 
                               domainEvent.EventType, domainEvent.AggregateId);
    }
    
    public async Task<List<EventStore>> GetEventsAsync(string aggregateId)
    {
        return await _context.EventStores
            .Where(es => es.AggregateId == aggregateId)
            .OrderBy(es => es.Version)
            .ToListAsync();
    }
    
    public async Task<T?> RebuildAggregateAsync<T>(string aggregateId) where T : class, new()
    {
        var events = await GetEventsAsync(aggregateId);
        
        if (!events.Any())
            return null;
            
        var aggregate = new T();
        
        foreach (var eventStore in events)
        {
            var eventType = Type.GetType($"ReservationService.Models.{eventStore.EventType}");
            if (eventType == null) continue;
            
            var domainEvent = JsonSerializer.Deserialize(eventStore.EventData, eventType, SerializerOptions);
            if (domainEvent == null) continue;
            
            ApplyEvent(aggregate, domainEvent);
        }
        
        return aggregate;
    }
    
    private async Task<int> GetNextVersionAsync(string aggregateId)
    {
        var lastEvent = await _context.EventStores
            .Where(es => es.AggregateId == aggregateId)
            .OrderByDescending(es => es.Version)
            .FirstOrDefaultAsync();
            
        return (lastEvent?.Version ?? 0) + 1;
    }
    
    private void ApplyEvent<T>(T aggregate, object domainEvent) where T : class
    {
        // Przykład aplikowania eventów dla Appointment
        if (aggregate is Appointment appointment)
        {
            switch (domainEvent)
            {
                case AppointmentCreatedEvent created:
                    appointment.Id = created.AppointmentId;
                    appointment.CompanyId = created.CompanyId;
                    appointment.BranchId = created.BranchId;
                    appointment.ServiceId = created.ServiceId;
                    appointment.CustomerId = created.CustomerId;
                    appointment.StaffId = created.StaffId;
                    appointment.DateStart = created.DateStart;
                    appointment.DateEnd = created.DateEnd;
                    appointment.Status = "pending";
                    break;
                    
                case AppointmentCancelledEvent cancelled:
                    appointment.Status = "cancelled";
                    break;

                case AppointmentConfirmedEvent:
                    appointment.Status = "confirmed";
                    break;
                    
                case AppointmentRescheduledEvent rescheduled:
                    appointment.DateStart = rescheduled.NewDateStart;
                    appointment.DateEnd = rescheduled.NewDateEnd;
                    break;

                case AppointmentDeletedEvent:
                    appointment.Status = "deleted";
                    break;
            }
        }
    }
}

// Przykład użycia w kontrolerze
public class AppointmentEventService
{
    private readonly IEventSourcingService _eventSourcing;
    
    public AppointmentEventService(IEventSourcingService eventSourcing)
    {
        _eventSourcing = eventSourcing;
    }
    
    public async Task CreateAppointmentAsync(Appointment appointment)
    {
        // Zapisz event
        var createdEvent = new AppointmentCreatedEvent
        {
            AggregateId = $"appointment-{appointment.Id}",
            AppointmentId = appointment.Id,
            CompanyId = appointment.CompanyId,
            ServiceId = appointment.ServiceId,
            CustomerId = appointment.CustomerId,
            DateStart = appointment.DateStart,
            DateEnd = appointment.DateEnd,
            UserId = appointment.CustomerId
        };
        
        await _eventSourcing.StoreEventAsync(createdEvent);
    }
    
    public async Task CancelAppointmentAsync(int appointmentId, string reason, string userId)
    {
        var cancelledEvent = new AppointmentCancelledEvent
        {
            AggregateId = $"appointment-{appointmentId}",
            AppointmentId = appointmentId,
            Reason = reason,
            UserId = userId
        };
        
        await _eventSourcing.StoreEventAsync(cancelledEvent);
    }
}
