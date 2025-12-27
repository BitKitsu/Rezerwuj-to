using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace ReservationService.Models;

public class Company : IValidatableObject
{
    public int Id { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(100)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\+\d{1,3}(\s?\d{3}){3}$", ErrorMessage = "Telefon musi być w formacie +48 111 222 333.")]
    public string Phone { get; set; } = string.Empty;
    
    // Adres
    [StringLength(100)]
    public string? StreetName { get; set; }

    [StringLength(20)]
    public string? StreetNumber { get; set; }

    [StringLength(20)]
    public string? ApartmentNumber { get; set; }

    [StringLength(50)]
    public string? City { get; set; }

    [StringLength(20)]
    [RegularExpression(@"^\d{2}-\d{3}$", ErrorMessage = "Kod pocztowy musi być w formacie 00-000.")]
    public string? PostalCode { get; set; }

    [StringLength(50)]
    public string? Country { get; set; } = "Polska";
    
    // Dodatkowe
    [StringLength(1000)]
    public string? Description { get; set; }

    [Url]
    public string? Website { get; set; }

    // Godziny otwarcia/zamknięcia przechowujemy jako tekst HH:mm
    public string? OpeningHour { get; set; }
    public string? ClosingHour { get; set; }

    public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
    
    // Relacje
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(OpeningHour) && !string.IsNullOrWhiteSpace(ClosingHour))
        {
            if (TimeSpan.TryParse(OpeningHour, out var open) && TimeSpan.TryParse(ClosingHour, out var close))
            {
                if (close <= open)
                {
                    yield return new ValidationResult(
                        "Godzina zamknięcia musi być późniejsza niż godzina otwarcia.",
                        new[] { nameof(ClosingHour) });
                }
            }
        }
    }
}
