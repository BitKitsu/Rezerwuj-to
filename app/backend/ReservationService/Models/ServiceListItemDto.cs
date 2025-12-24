namespace ReservationService.Models;

public record ServiceListItemDto(
    int Id,
    string ServiceName,
    string? Description,
    int DurationMinutes,
    decimal Price,
    int CompanyId,
    string CompanyName,
    string? City
);
