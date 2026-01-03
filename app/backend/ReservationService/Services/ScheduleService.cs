using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ReservationService.Data;
using ReservationService.Models;
using System.Net.Http.Json;

namespace ReservationService.Services;

public interface IScheduleService
{
    Task<List<TimeSlot>> GenerateTimeSlotsAsync(int companyId, int branchId, int serviceId, DateTime date);
    Task<List<AvailableSlot>> GetAvailableSlotsAsync(int companyId, int branchId, int serviceId, DateTime date);
    Task<bool> BookTimeSlotAsync(int slotId, int appointmentId);
    Task<Schedule> CreateScheduleAsync(Schedule schedule);
    Task UpdateScheduleAsync(Schedule schedule);
}

public class ScheduleService : IScheduleService
{
    private readonly ReservationDbContext _context;
    private readonly ILogger<ScheduleService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;

    private static readonly TimeZoneInfo AppTimeZone = ResolveAppTimeZone();
    
    public ScheduleService(
        ReservationDbContext context,
        ILogger<ScheduleService> logger,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache)
    {
        _context = context;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _cache = cache;
    }

    private static TimeZoneInfo ResolveAppTimeZone()
    {
        var tzId = Environment.GetEnvironmentVariable("APP_TIMEZONE")
            ?? Environment.GetEnvironmentVariable("APP_TIME_ZONE")
            ?? Environment.GetEnvironmentVariable("TZ")
            ?? "Europe/Warsaw";

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(tzId);
        }
        catch
        {
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");
        }
        catch
        {
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");
        }
        catch
        {
            return TimeZoneInfo.Local;
        }
    }

    private static DateTime NormalizeToLocalDate(DateTime date)
    {
        if (date.Kind == DateTimeKind.Utc)
        {
            return TimeZoneInfo.ConvertTimeFromUtc(date, AppTimeZone);
        }

        return date;
    }
    
    public async Task<List<TimeSlot>> GenerateTimeSlotsAsync(int companyId, int branchId, int serviceId, DateTime date)
    {
        // Pobierz harmonogram dla dnia tygodnia
        var localDate = NormalizeToLocalDate(date);
        var localDayStart = DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified);
        var dayOfWeek = localDayStart.DayOfWeek;
        var schedules = await _context.Schedules
            .Where(s => s.CompanyId == companyId
                     && s.BranchId == branchId
                     && s.ServiceId == serviceId
                     && s.DayOfWeek == dayOfWeek
                     && s.IsActive)
            .ToListAsync();
            
        if (!schedules.Any())
        {
            _logger.LogWarning("Brak harmonogramu dla {DayOfWeek}", dayOfWeek);
            return new List<TimeSlot>();
        }

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId && b.CompanyId == companyId);

        TimeSpan? branchOpen = null;
        TimeSpan? branchClose = null;
        if (branch != null
            && !string.IsNullOrWhiteSpace(branch.OpeningHour)
            && !string.IsNullOrWhiteSpace(branch.ClosingHour)
            && TimeSpan.TryParse(branch.OpeningHour, out var open)
            && TimeSpan.TryParse(branch.ClosingHour, out var close)
            && close > open)
        {
            branchOpen = open;
            branchClose = close;
        }
        
        var service = await _context.Services
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.CompanyId == companyId && s.BranchId == branchId);

        if (service == null)
        {
            _logger.LogWarning(
                "Service not found or does not belong to company {CompanyId} and branch {BranchId}. ServiceId={ServiceId}",
                companyId,
                branchId,
                serviceId);
            return new List<TimeSlot>();
        }
        
        var slots = new List<TimeSlot>();
        
        foreach (var schedule in schedules)
        {
            var scheduleStart = schedule.StartTime.ToTimeSpan();
            var scheduleEnd = schedule.EndTime.ToTimeSpan();

            if (branchOpen.HasValue && branchClose.HasValue)
            {
                if (scheduleStart < branchOpen.Value) scheduleStart = branchOpen.Value;
                if (scheduleEnd > branchClose.Value) scheduleEnd = branchClose.Value;
            }

            if (scheduleEnd <= scheduleStart)
            {
                continue;
            }

            var currentLocal = localDayStart.Add(scheduleStart);
            var endLocal = localDayStart.Add(scheduleEnd);

            var currentTime = TimeZoneInfo.ConvertTimeToUtc(currentLocal, AppTimeZone);
            var endTime = TimeZoneInfo.ConvertTimeToUtc(endLocal, AppTimeZone);
            
            while (currentTime.AddMinutes(service.DurationMinutes) <= endTime)
            {
                // Sprawdź czy slot nie istnieje już w bazie
                var existingSlot = await _context.TimeSlots
                    .FirstOrDefaultAsync(ts => ts.CompanyId == companyId
                                             && ts.BranchId == branchId
                                             && ts.ServiceId == serviceId
                                             && ts.StaffId == schedule.StaffId
                                             && ts.SlotStart == currentTime);
                                             
                if (existingSlot == null)
                {
                    var slot = new TimeSlot
                    {
                        CompanyId = companyId,
                        BranchId = branchId,
                        ServiceId = serviceId,
                        StaffId = schedule.StaffId,
                        SlotStart = currentTime,
                        SlotEnd = currentTime.AddMinutes(service.DurationMinutes),
                        IsAvailable = true
                    };
                    
                    _context.TimeSlots.Add(slot);
                    slots.Add(slot);
                }
                else
                {
                    slots.Add(existingSlot);
                }
                
                currentTime = currentTime.AddMinutes(service.DurationMinutes);
            }
        }
        
        await _context.SaveChangesAsync();
        return slots;
    }
    
    public async Task<List<AvailableSlot>> GetAvailableSlotsAsync(int companyId, int branchId, int serviceId, DateTime date)
    {
        var service = await _context.Services
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.CompanyId == companyId && s.BranchId == branchId);

        if (service == null)
        {
            return new List<AvailableSlot>();
        }

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId && b.CompanyId == companyId);

        var company = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == companyId);

        TimeSpan? openHours = null;
        TimeSpan? closeHours = null;

        var openRaw = !string.IsNullOrWhiteSpace(branch?.OpeningHour) ? branch!.OpeningHour : company?.OpeningHour;
        var closeRaw = !string.IsNullOrWhiteSpace(branch?.ClosingHour) ? branch!.ClosingHour : company?.ClosingHour;

        if (!string.IsNullOrWhiteSpace(openRaw)
            && !string.IsNullOrWhiteSpace(closeRaw)
            && TimeSpan.TryParse(openRaw, out var open)
            && TimeSpan.TryParse(closeRaw, out var close)
            && close > open)
        {
            openHours = open;
            closeHours = close;
        }

        var localDate = NormalizeToLocalDate(date);
        var localDayStart = DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified);
        var localDayEnd = localDayStart.AddDays(1);
        var dayStartUtc = TimeZoneInfo.ConvertTimeToUtc(localDayStart, AppTimeZone);
        var dayEndUtc = TimeZoneInfo.ConvertTimeToUtc(localDayEnd, AppTimeZone);
        var dayOfWeek = localDayStart.DayOfWeek;

        var schedules = await _context.Schedules
            .AsNoTracking()
            .Where(s => s.CompanyId == companyId
                && s.BranchId == branchId
                && s.ServiceId == serviceId
                && s.DayOfWeek == dayOfWeek
                && s.IsActive
                && s.StaffId != null)
            .ToListAsync();

        if (!schedules.Any())
        {
            return new List<AvailableSlot>();
        }

        var staffIds = schedules
            .Select(s => s.StaffId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id!.Trim())
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var staffNameById = await ResolveStaffNamesAsync(companyId, staffIds);

        var breaks = await _context.StaffBreaks
            .AsNoTracking()
            .Where(b => b.CompanyId == companyId
                && b.BranchId == branchId
                && b.IsActive
                && b.DayOfWeek == dayOfWeek)
            .ToListAsync();

        var appointments = await _context.Appointments
            .AsNoTracking()
            .Include(a => a.Service)
            .Where(a => a.CompanyId == companyId
                && a.BranchId == branchId
                && a.Status != "cancelled"
                && a.DateStart < dayEndUtc
                && a.DateEnd > dayStartUtc)
            .ToListAsync();

        var blockedByStaff = new Dictionary<string, List<TimeInterval>>(StringComparer.OrdinalIgnoreCase);
        foreach (var id in staffIds)
        {
            blockedByStaff[id!] = new List<TimeInterval>();
        }

        foreach (var b in breaks)
        {
            var staffId = (b.StaffId ?? string.Empty).Trim();
            if (!blockedByStaff.TryGetValue(staffId, out var list))
            {
                continue;
            }

            var startLocal = localDayStart.Add(b.StartTime.ToTimeSpan());
            var endLocal = localDayStart.Add(b.EndTime.ToTimeSpan());
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, AppTimeZone);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(endLocal, AppTimeZone);
            list.Add(new TimeInterval(startUtc, endUtc));
        }

        foreach (var a in appointments)
        {
            var staffId = (a.StaffId ?? string.Empty).Trim();
            if (!blockedByStaff.TryGetValue(staffId, out var list))
            {
                continue;
            }

            var buffer = a.Service?.BufferMinutesAfter ?? 0;
            var endWithBuffer = a.DateEnd.AddMinutes(buffer);
            list.Add(new TimeInterval(a.DateStart, endWithBuffer));
        }

        foreach (var kv in blockedByStaff)
        {
            kv.Value.Sort((x, y) => x.Start.CompareTo(y.Start));
        }

        var duration = TimeSpan.FromMinutes(service.DurationMinutes);
        var bufferAfter = TimeSpan.FromMinutes(service.BufferMinutesAfter);
        var blockedDuration = duration + bufferAfter;

        var step = blockedDuration;
        if (step <= TimeSpan.Zero)
        {
            step = duration;
        }

        var nowUtc = DateTime.UtcNow;

        var result = new List<AvailableSlot>();

        foreach (var schedule in schedules)
        {
            if (string.IsNullOrWhiteSpace(schedule.StaffId))
            {
                continue;
            }

            var scheduleStaffId = schedule.StaffId.Trim();

            var scheduleStart = schedule.StartTime.ToTimeSpan();
            var scheduleEnd = schedule.EndTime.ToTimeSpan();

            if (openHours.HasValue && closeHours.HasValue)
            {
                if (scheduleStart < openHours.Value) scheduleStart = openHours.Value;
                if (scheduleEnd > closeHours.Value) scheduleEnd = closeHours.Value;
            }

            if (scheduleEnd <= scheduleStart)
            {
                continue;
            }

            var scheduleStartLocal = localDayStart.Add(scheduleStart);
            var scheduleEndLocal = localDayStart.Add(scheduleEnd);
            var scheduleStartUtc = TimeZoneInfo.ConvertTimeToUtc(scheduleStartLocal, AppTimeZone);
            var scheduleEndUtc = TimeZoneInfo.ConvertTimeToUtc(scheduleEndLocal, AppTimeZone);

            var current = scheduleStartUtc;
            var blocks = blockedByStaff.TryGetValue(scheduleStaffId, out var v) ? v : new List<TimeInterval>();

            while (current.Add(blockedDuration) <= scheduleEndUtc)
            {
                var candidateEnd = current.Add(duration);
                var blockedEnd = current.Add(blockedDuration);
                var overlap = FindOverlap(current, blockedEnd, blocks);
                if (overlap == null)
                {
                    if (current < nowUtc)
                    {
                        current = current.Add(step);
                        continue;
                    }

                    if (!staffNameById.TryGetValue(schedule.StaffId, out var staffName)
                        || string.IsNullOrWhiteSpace(staffName))
                    {
                        current = current.Add(step);
                        continue;
                    }

                    result.Add(new AvailableSlot
                    {
                        Start = current,
                        End = candidateEnd,
                        StaffId = scheduleStaffId,
                        StaffName = staffName
                    });

                    current = current.Add(step);
                }
                else
                {
                    var next = overlap.Value.End;
                    current = next > current ? next : current.Add(TimeSpan.FromMinutes(1));
                }
            }
        }

        return result
            .OrderBy(x => x.Start)
            .ThenBy(x => x.StaffId)
            .ToList();
    }

    private async Task<Dictionary<string, string>> ResolveStaffNamesAsync(int companyId, List<string> staffIds)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);

        var ids = (staffIds ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (ids.Count == 0)
        {
            return result;
        }

        var toFetch = new List<string>();
        foreach (var id in ids)
        {
            var cacheKey = $"staffName:{companyId}:{id}";
            if (_cache.TryGetValue(cacheKey, out string? cachedName) && !string.IsNullOrWhiteSpace(cachedName))
            {
                result[id] = cachedName;
            }
            else
            {
                toFetch.Add(id);
            }
        }

        if (toFetch.Count == 0)
        {
            return result;
        }

        try
        {
            var baseUrl = Environment.GetEnvironmentVariable("IDENTITY_SERVICE_BASE_URL");
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                var runningInContainer = string.Equals(
                    Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"),
                    "true",
                    StringComparison.OrdinalIgnoreCase);

                baseUrl = runningInContainer ? "http://identity_api:8080" : "http://localhost:5001";
            }

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(baseUrl);

            var response = await client.PostAsJsonAsync(
                $"/api/public/company/{companyId}/users/resolve",
                new ResolveCompanyUsersRequest { UserIds = toFetch });

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Identity resolve endpoint returned {StatusCode} for companyId={CompanyId}",
                    (int)response.StatusCode,
                    companyId);
                return result;
            }

            var users = await response.Content.ReadFromJsonAsync<List<PublicUserDto>>()
                ?? new List<PublicUserDto>();

            foreach (var user in users)
            {
                var id = (user.Id ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(id)) continue;

                var name = string.Join(" ", new[] { user.FirstName, user.LastName }
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x!.Trim())).Trim();

                if (!string.IsNullOrWhiteSpace(name))
                {
                    result[id] = name;
                    var cacheKey = $"staffName:{companyId}:{id}";
                    _cache.Set(cacheKey, name, TimeSpan.FromHours(12));
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve staff names from IdentityService.");
        }

        return result;
    }

    private sealed class ResolveCompanyUsersRequest
    {
        public List<string> UserIds { get; set; } = new();
    }

    private sealed class PublicUserDto
    {
        public string? Id { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
    }

    private static TimeInterval? FindOverlap(DateTime start, DateTime end, List<TimeInterval> blocks)
    {
        foreach (var b in blocks)
        {
            if (start < b.End && end > b.Start)
            {
                return b;
            }
        }

        return null;
    }
    
    public async Task<bool> BookTimeSlotAsync(int slotId, int appointmentId)
    {
        var slot = await _context.TimeSlots.FindAsync(slotId);
        
        if (slot == null || !slot.IsAvailable || slot.AppointmentId != null)
        {
            return false;
        }
        
        slot.IsAvailable = false;
        slot.AppointmentId = appointmentId;
        
        _context.TimeSlots.Update(slot);
        await _context.SaveChangesAsync();
        
        return true;
    }
    
    public async Task<Schedule> CreateScheduleAsync(Schedule schedule)
    {
        _context.Schedules.Add(schedule);
        await _context.SaveChangesAsync();
        return schedule;
    }
    
    public async Task UpdateScheduleAsync(Schedule schedule)
    {
        _context.Schedules.Update(schedule);
        await _context.SaveChangesAsync();
    }
}
