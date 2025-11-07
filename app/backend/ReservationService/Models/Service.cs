namespace ReservationService.Models;

public class Service
{
    public int Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; } = 60;
    
    // Foreign keys
    public int CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    
    // Relacje
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
