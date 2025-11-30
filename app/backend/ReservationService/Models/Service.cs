using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using ReservationService.Models;
using System.Text.Json.Serialization;

public class Service
{
    public int Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public int CompanyId { get; set; }
    [JsonIgnore]
    [ValidateNever]
    public Company? Company { get; set; }
}