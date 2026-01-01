namespace ReservationService.Models;

public class StaffBreak
{
    public int Id { get; set; }

    public int CompanyId { get; set; }
    public int BranchId { get; set; }
    public string StaffId { get; set; } = string.Empty;

    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
