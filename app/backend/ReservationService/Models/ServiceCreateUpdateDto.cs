using System.ComponentModel.DataAnnotations;

namespace ReservationService.Models;

public class ServiceCreateUpdateDto
{
    [Required]
    public string ServiceName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Price { get; set; }

    [Range(1, int.MaxValue)]
    public int DurationMinutes { get; set; } = 60;

    [Required]
    public int CompanyId { get; set; }
}
