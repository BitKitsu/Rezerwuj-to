using System.ComponentModel.DataAnnotations;

namespace ReservationService.Models;

public class ServiceCreateUpdateDto
{
    [Required]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "Nazwa usługi musi mieć od 2 do 120 znaków.")]
    [RegularExpression(@"^(?!\s*$).+", ErrorMessage = "Nazwa usługi jest wymagana.")]
    public string ServiceName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    [Range(1, int.MaxValue)]
    public int DurationMinutes { get; set; } = 60;

    [Range(0, int.MaxValue)]
    public int BufferMinutesAfter { get; set; } = 0;

    [Required]
    public int CompanyId { get; set; }

    [Required]
    public int BranchId { get; set; }
}
