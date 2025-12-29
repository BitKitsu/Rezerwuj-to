namespace ReservationService.Models;

public class Appointment
{
    public int Id { get; set; }
    public DateTime DateStart { get; set; }
    public DateTime DateEnd { get; set; }
    public string Status { get; set; } = "pending"; // pending, confirmed, cancelled
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Foreign keys
    public int CompanyId { get; set; }
    public int BranchId { get; set; }
    public int ServiceId { get; set; }
    public string CustomerId { get; set; } = string.Empty; // ID użytkownika z IdentityService
    public string StaffId { get; set; } = string.Empty;    // ID pracownika z IdentityService
    
    // Relacje
    public Company Company { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
