using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Services;

public interface ICompanyAuditService
{
    Task LogAsync(
        int companyId,
        string entityName,
        string? entityId,
        string action,
        object? oldValues,
        object? newValues,
        ClaimsPrincipal user,
        string? ipAddress,
        string? userAgent);

    Task<List<CompanyAuditEvent>> GetCompanyAuditAsync(int companyId, int take = 200);
}

public class CompanyAuditService : ICompanyAuditService
{
    private readonly ReservationDbContext _context;
    private readonly IEventSourcingService _eventSourcing;
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public CompanyAuditService(ReservationDbContext context, IEventSourcingService eventSourcing)
    {
        _context = context;
        _eventSourcing = eventSourcing;
    }

    public async Task LogAsync(
        int companyId,
        string entityName,
        string? entityId,
        string action,
        object? oldValues,
        object? newValues,
        ClaimsPrincipal user,
        string? ipAddress,
        string? userAgent)
    {
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var domainEvent = new CompanyAuditEvent
        {
            AggregateId = $"company-{companyId}",
            CompanyId = companyId,
            EntityName = entityName,
            EntityId = entityId,
            Action = action,
            OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null,
            UserId = userId,
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        await _eventSourcing.StoreEventAsync(domainEvent);
    }

    public async Task<List<CompanyAuditEvent>> GetCompanyAuditAsync(int companyId, int take = 200)
    {
        if (take <= 0) take = 200;
        if (take > 500) take = 500;

        var aggregateId = $"company-{companyId}";

        var rows = await _context.EventStores
            .AsNoTracking()
            .Where(es => es.AggregateId == aggregateId && es.EventType == nameof(CompanyAuditEvent))
            .OrderByDescending(es => es.OccurredAt)
            .Take(take)
            .ToListAsync();

        var result = new List<CompanyAuditEvent>(rows.Count);
        foreach (var row in rows)
        {
            try
            {
                var evt = JsonSerializer.Deserialize<CompanyAuditEvent>(row.EventData, SerializerOptions);
                if (evt != null)
                {
                    result.Add(evt);
                }
            }
            catch
            {
                // ignore deserialization errors
            }
        }

        return result;
    }
}
