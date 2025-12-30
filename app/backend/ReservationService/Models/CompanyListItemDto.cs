namespace ReservationService.Models;

public record CompanyListItemDto(
    int Id,
    string CompanyName,
    string? Description,
    string? City,
    double AverageRating,
    int ReviewCount
);
