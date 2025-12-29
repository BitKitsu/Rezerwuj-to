namespace ReservationService.Models;

public record ServiceListItemDto(
    int Id,
    string ServiceName,
    string? Description,
    int DurationMinutes,
    decimal Price,
    int CompanyId,
    int BranchId,
    string CompanyName,
    string BranchName,
    string? City
);
