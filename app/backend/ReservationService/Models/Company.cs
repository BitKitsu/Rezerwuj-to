namespace ReservationService.Models;

public class Company
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    
    // Adres
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; } = "Polska";
    
    // Dodatkowe
    public string? Description { get; set; }
    public string? Website { get; set; }
    public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
    
    // Relacje
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
