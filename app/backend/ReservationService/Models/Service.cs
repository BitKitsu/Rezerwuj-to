using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using ReservationService.Models;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class Service
{
    public int Id { get; set; }
    [Required]
    public string ServiceName { get; set; }
    public string Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    [JsonIgnore]
    [ValidateNever]
    public Company Company { get; set; } = null!;

    [Required]
    public int CompanyId { get; set; } 
    [JsonIgnore]
    [ValidateNever]
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

}