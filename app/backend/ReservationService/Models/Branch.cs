using System.ComponentModel.DataAnnotations;

namespace ReservationService.Models;

public class Branch : IValidatableObject
{
    public int Id { get; set; }

    [Required]
    public int CompanyId { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string BranchName { get; set; } = string.Empty;

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

    public string? OpeningHour { get; set; }
    public string? ClosingHour { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Company Company { get; set; } = null!;

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
