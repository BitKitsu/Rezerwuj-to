using System.ComponentModel.DataAnnotations;

namespace ReservationService.Models;

public class BranchReview
{
    public int Id { get; set; }

    [Range(1, 5)]
    public int Rating { get; set; }

    [StringLength(2000)]
    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int CompanyId { get; set; }
    public int BranchId { get; set; }
    public int AppointmentId { get; set; }
    public string CustomerId { get; set; } = string.Empty;

    public Company Company { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Appointment Appointment { get; set; } = null!;
}
