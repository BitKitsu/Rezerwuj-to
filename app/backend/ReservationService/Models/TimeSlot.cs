namespace ReservationService.Models;

public class TimeSlot
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public int ServiceId { get; set; }
    public string? StaffId { get; set; }
    
    public DateTime SlotStart { get; set; }
    public DateTime SlotEnd { get; set; }
    
    public bool IsAvailable { get; set; } = true;
    public bool IsBlocked { get; set; } = false; // Ręcznie zablokowany
    
    public int? AppointmentId { get; set; } // Jeśli zajęty
    
    // Relacje
    public Company Company { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public Appointment? Appointment { get; set; }
}

// DTO dla API
public class AvailableSlot
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public string? StaffId { get; set; }
    public string? StaffName { get; set; }
}
