using System.Text.Json;
using Microsoft.AspNetCore.Http;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity; 
using IdentityService.Models;
using IdentityService.Data;

namespace IdentityService.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;
        private bool _savingAudit;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            IHttpContextAccessor? httpContextAccessor = null)
            : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }
        
        // DbSet dla Refresh Tokens
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        
        // DbSet dla Company Roles
        public DbSet<UserCompanyRole> UserCompanyRoles { get; set; }
        
        // DbSet dla Audit Logs
        public DbSet<AuditLog> AuditLogs { get; set; }

        public override int SaveChanges()
        {
            if (_savingAudit)
            {
                return base.SaveChanges();
            }

            var pendingAuditLogs = PrepareAuditLogs();
            var result = base.SaveChanges();

            SaveAuditLogs(pendingAuditLogs);
            return result;
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (_savingAudit)
            {
                return await base.SaveChangesAsync(cancellationToken);
            }

            var pendingAuditLogs = PrepareAuditLogs();
            var result = await base.SaveChangesAsync(cancellationToken);

            await SaveAuditLogsAsync(pendingAuditLogs, cancellationToken);
            return result;
        }
        
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            // Konfiguracja RefreshToken
            builder.Entity<RefreshToken>()
                .HasOne(rt => rt.User)
                .WithMany()
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Konfiguracja UserCompanyRole
            builder.Entity<UserCompanyRole>()
                .HasIndex(ucr => new { ucr.UserId, ucr.CompanyId })
                .IsUnique();
                
            // Indeksy dla wydajności
            builder.Entity<RefreshToken>()
                .HasIndex(rt => rt.Token)
                .IsUnique();
                
            builder.Entity<AuditLog>()
                .HasIndex(al => al.CreatedAt);

            builder.Entity<AuditLog>()
                .HasOne(al => al.User)
                .WithMany()
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            // Unikalny numer telefonu (tylko jeśli nie jest pusty)
            builder.Entity<ApplicationUser>()
                .HasIndex(u => u.PhoneNumber)
                .IsUnique()
                .HasFilter("\"PhoneNumber\" IS NOT NULL AND \"PhoneNumber\" != ''"); // Filtr dla PostgreSQL
        }

        private List<(AuditLog Log, Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry Entry, IReadOnlyList<string> KeyNames)> PrepareAuditLogs()
        {
            var httpContext = _httpContextAccessor?.HttpContext;
            var userId = httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var userAgent = httpContext?.Request.Headers["User-Agent"].ToString();
            var ipAddress = GetIpAddress(httpContext);

            var result = new List<(AuditLog, Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry, IReadOnlyList<string>)>();
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
                .Where(e => e.Entity is not AuditLog)
                .Where(e => e.Entity is ApplicationUser || e.Entity is UserCompanyRole || e.Entity is RefreshToken)
                .ToList();

            foreach (var entry in entries)
            {
                var keyProps = entry.Metadata.FindPrimaryKey()?.Properties;
                var keyNames = (IReadOnlyList<string>)(keyProps?.Select(p => p.Name).ToList() ?? new List<string>());

                var (oldValues, newValues, changes) = BuildAuditValues(entry);

                var auditLog = new AuditLog
                {
                    UserId = userId,
                    EntityName = entry.Metadata.ClrType.Name,
                    EntityId = entry.State == EntityState.Added ? null : TryGetEntityId(entry, keyNames),
                    Action = entry.State switch
                    {
                        EntityState.Added => AuditActions.Create,
                        EntityState.Modified => AuditActions.Update,
                        EntityState.Deleted => AuditActions.Delete,
                        _ => ""
                    },
                    OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
                    NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null,
                    Changes = changes != null ? JsonSerializer.Serialize(changes) : null,
                    IpAddress = ipAddress,
                    UserAgent = string.IsNullOrWhiteSpace(userAgent) ? null : userAgent,
                    CreatedAt = DateTime.UtcNow
                };

                result.Add((auditLog, entry, keyNames));
            }

            return result;
        }

        private void SaveAuditLogs(List<(AuditLog Log, Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry Entry, IReadOnlyList<string> KeyNames)> pending)
        {
            if (pending.Count == 0)
            {
                return;
            }

            try
            {
                _savingAudit = true;

                foreach (var item in pending)
                {
                    item.Log.EntityId ??= TryGetEntityId(item.Entry, item.KeyNames);
                }

                AuditLogs.AddRange(pending.Select(p => p.Log));
                base.SaveChanges();
            }
            catch
            {
            }
            finally
            {
                _savingAudit = false;
            }
        }

        private async Task SaveAuditLogsAsync(List<(AuditLog Log, Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry Entry, IReadOnlyList<string> KeyNames)> pending, CancellationToken cancellationToken)
        {
            if (pending.Count == 0)
            {
                return;
            }

            try
            {
                _savingAudit = true;

                foreach (var item in pending)
                {
                    item.Log.EntityId ??= TryGetEntityId(item.Entry, item.KeyNames);
                }

                AuditLogs.AddRange(pending.Select(p => p.Log));
                await base.SaveChangesAsync(cancellationToken);
            }
            catch
            {
            }
            finally
            {
                _savingAudit = false;
            }
        }

        private static string GetIpAddress(HttpContext? httpContext)
        {
            if (httpContext == null)
            {
                return "Unknown";
            }

            var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();

            if (httpContext.Request.Headers.ContainsKey("X-Forwarded-For"))
            {
                ipAddress = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            }

            return string.IsNullOrWhiteSpace(ipAddress) ? "Unknown" : ipAddress;
        }

        private static string? TryGetEntityId(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry, IReadOnlyList<string> keyNames)
        {
            if (keyNames.Count == 0)
            {
                return null;
            }

            var keyParts = new List<string>();
            foreach (var keyName in keyNames)
            {
                var property = entry.Property(keyName);
                var value = entry.State == EntityState.Deleted ? property.OriginalValue : property.CurrentValue;
                if (value == null)
                {
                    continue;
                }

                keyParts.Add(value.ToString() ?? string.Empty);
            }

            if (keyParts.Count == 0)
            {
                return null;
            }

            return string.Join(",", keyParts);
        }

        private static (Dictionary<string, object?>? OldValues, Dictionary<string, object?>? NewValues, List<object>? Changes) BuildAuditValues(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
        {
            Dictionary<string, object?>? oldValues = null;
            Dictionary<string, object?>? newValues = null;
            List<object>? changes = null;

            if (entry.State == EntityState.Added)
            {
                newValues = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                {
                    if (!ShouldAuditProperty(entry, prop.Metadata.Name))
                    {
                        continue;
                    }

                    newValues[prop.Metadata.Name] = prop.CurrentValue;
                }
            }
            else if (entry.State == EntityState.Deleted)
            {
                oldValues = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                {
                    if (!ShouldAuditProperty(entry, prop.Metadata.Name))
                    {
                        continue;
                    }

                    oldValues[prop.Metadata.Name] = prop.OriginalValue;
                }
            }
            else if (entry.State == EntityState.Modified)
            {
                oldValues = new Dictionary<string, object?>();
                newValues = new Dictionary<string, object?>();
                changes = new List<object>();

                foreach (var prop in entry.Properties)
                {
                    if (!ShouldAuditProperty(entry, prop.Metadata.Name))
                    {
                        continue;
                    }

                    oldValues[prop.Metadata.Name] = prop.OriginalValue;
                    newValues[prop.Metadata.Name] = prop.CurrentValue;

                    if (prop.IsModified)
                    {
                        changes.Add(new
                        {
                            Field = prop.Metadata.Name,
                            OldValue = prop.OriginalValue?.ToString(),
                            NewValue = prop.CurrentValue?.ToString()
                        });
                    }
                }

                if (changes.Count == 0)
                {
                    changes = null;
                }
            }

            return (oldValues, newValues, changes);
        }

        private static bool ShouldAuditProperty(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry, string propertyName)
        {
            if (entry.Entity is ApplicationUser)
            {
                if (propertyName is "PasswordHash" or "SecurityStamp" or "ConcurrencyStamp")
                {
                    return false;
                }
            }

            if (entry.Entity is RefreshToken)
            {
                if (propertyName is "Token")
                {
                    return false;
                }
            }

            return true;
        }
    }
}

