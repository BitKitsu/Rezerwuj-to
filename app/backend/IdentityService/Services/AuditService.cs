using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using IdentityService.Data;
using IdentityService.Models;

namespace IdentityService.Services;

public interface IAuditService
{
    Task LogAsync(string action, string entityName, string? entityId = null, 
                  object? oldValues = null, object? newValues = null);
    Task LogLoginAsync(string userId, string ipAddress, string? userAgent);
    Task LogLogoutAsync(string userId);
    Task<List<AuditLog>> GetAuditLogsAsync(string? userId = null, int take = 100);
}

public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<AuditService> _logger;
    
    public AuditService(
        ApplicationDbContext context,
        IHttpContextAccessor httpContextAccessor,
        ILogger<AuditService> logger)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }
    
    public async Task LogAsync(string action, string entityName, string? entityId = null,
                               object? oldValues = null, object? newValues = null)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var userId = httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            var auditLog = new AuditLog
            {
                UserId = userId,
                EntityName = entityName,
                EntityId = entityId,
                Action = action,
                OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
                NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null,
                IpAddress = GetIpAddress(),
                UserAgent = httpContext?.Request.Headers["User-Agent"].ToString(),
                CreatedAt = DateTime.UtcNow
            };
            
            // Oblicz zmiany
            if (oldValues != null && newValues != null)
            {
                auditLog.Changes = CalculateChanges(oldValues, newValues);
            }
            
            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd podczas zapisywania audit log");
        }
    }
    
    public async Task LogLoginAsync(string userId, string ipAddress, string? userAgent)
    {
        var auditLog = new AuditLog
        {
            UserId = userId,
            EntityName = "User",
            EntityId = userId,
            Action = AuditActions.Login,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }
    
    public async Task LogLogoutAsync(string userId)
    {
        var auditLog = new AuditLog
        {
            UserId = userId,
            EntityName = "User",
            EntityId = userId,
            Action = AuditActions.Logout,
            IpAddress = GetIpAddress(),
            UserAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.UtcNow
        };
        
        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }
    
    public async Task<List<AuditLog>> GetAuditLogsAsync(string? userId = null, int take = 100)
    {
        var query = _context.AuditLogs.AsQueryable();
        
        if (!string.IsNullOrEmpty(userId))
        {
            query = query.Where(al => al.UserId == userId);
        }
        
        return await query
            .OrderByDescending(al => al.CreatedAt)
            .Take(take)
            .ToListAsync();
    }
    
    private string GetIpAddress()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        
        if (httpContext == null)
            return "Unknown";
            
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();
        
        if (httpContext.Request.Headers.ContainsKey("X-Forwarded-For"))
        {
            ipAddress = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        }
        
        return ipAddress ?? "Unknown";
    }
    
    private string CalculateChanges(object oldValues, object newValues)
    {
        var changes = new List<object>();
        
        var oldJson = JsonSerializer.Serialize(oldValues);
        var newJson = JsonSerializer.Serialize(newValues);
        
        using var oldDoc = JsonDocument.Parse(oldJson);
        using var newDoc = JsonDocument.Parse(newJson);
        
        foreach (var property in newDoc.RootElement.EnumerateObject())
        {
            if (oldDoc.RootElement.TryGetProperty(property.Name, out var oldValue))
            {
                if (property.Value.ToString() != oldValue.ToString())
                {
                    changes.Add(new
                    {
                        Field = property.Name,
                        OldValue = oldValue.ToString(),
                        NewValue = property.Value.ToString()
                    });
                }
            }
            else
            {
                changes.Add(new
                {
                    Field = property.Name,
                    OldValue = (string?)null,
                    NewValue = property.Value.ToString()
                });
            }
        }
        
        return JsonSerializer.Serialize(changes);
    }
}
