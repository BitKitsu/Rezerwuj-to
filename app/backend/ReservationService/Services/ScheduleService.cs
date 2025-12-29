using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;

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
    
    public ScheduleService(ReservationDbContext context, ILogger<ScheduleService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    public async Task<List<TimeSlot>> GenerateTimeSlotsAsync(int companyId, int branchId, int serviceId, DateTime date)
    {
        // Pobierz harmonogram dla dnia tygodnia
        var dayOfWeek = date.DayOfWeek;
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
            var currentTime = date.Date.Add(schedule.StartTime.ToTimeSpan());
            var endTime = date.Date.Add(schedule.EndTime.ToTimeSpan());
            
            while (currentTime.AddMinutes(service.DurationMinutes) <= endTime)
            {
                // Sprawdź czy slot nie istnieje już w bazie
                var existingSlot = await _context.TimeSlots
                    .FirstOrDefaultAsync(ts => ts.CompanyId == companyId
                                             && ts.BranchId == branchId
                                             && ts.ServiceId == serviceId
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
        // Najpierw wygeneruj sloty jeśli nie istnieją
        await GenerateTimeSlotsAsync(companyId, branchId, serviceId, date);
        
        // Pobierz dostępne sloty
        var slots = await _context.TimeSlots
            .Where(ts => ts.CompanyId == companyId
                      && ts.BranchId == branchId
                      && ts.ServiceId == serviceId
                      && ts.SlotStart.Date == date.Date
                      && ts.IsAvailable 
                      && !ts.IsBlocked
                      && ts.AppointmentId == null)
            .OrderBy(ts => ts.SlotStart)
            .Select(ts => new AvailableSlot
            {
                Start = ts.SlotStart,
                End = ts.SlotEnd,
                StaffId = ts.StaffId,
                StaffName = ts.StaffId // TODO: pobrać nazwę z IdentityService
            })
            .ToListAsync();
            
        return slots;
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
