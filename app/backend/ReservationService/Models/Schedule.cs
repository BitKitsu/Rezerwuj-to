namespace ReservationService.Models;

public class Schedule
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public int BranchId { get; set; }
    public int ServiceId { get; set; }
    public string? StaffId { get; set; } // Opcjonalnie dla konkretnego pracownika
    
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    // Relacje
    public Company Company { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
