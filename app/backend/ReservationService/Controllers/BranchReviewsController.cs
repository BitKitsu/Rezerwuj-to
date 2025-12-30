using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BranchReviewsController : ControllerBase
{
    private readonly ReservationDbContext _context;

    public BranchReviewsController(ReservationDbContext context)
    {
        _context = context;
    }

    [HttpGet("branch/{branchId}/summary")]
    public async Task<ActionResult<object>> GetBranchSummary(int branchId)
    {
        var query = _context.BranchReviews.Where(r => r.BranchId == branchId);
        var count = await query.CountAsync();
        var avg = count == 0 ? 0 : await query.AverageAsync(r => (double)r.Rating);

        return Ok(new { branchId, averageRating = avg, reviewCount = count });
    }

    [HttpGet("company/{companyId}/summary")]
    public async Task<ActionResult<object>> GetCompanySummary(int companyId)
    {
        var query = _context.BranchReviews.Where(r => r.CompanyId == companyId);
        var count = await query.CountAsync();
        var avg = count == 0 ? 0 : await query.AverageAsync(r => (double)r.Rating);

        return Ok(new { companyId, averageRating = avg, reviewCount = count });
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateReview(CreateBranchReviewDto dto)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
        {
            return BadRequest(new { message = "Ocena musi być w zakresie 1-5." });
        }

        var appointment = await _context.Appointments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == dto.AppointmentId);

        if (appointment == null)
        {
            return BadRequest(new { message = "Nie znaleziono wizyty do oceny." });
        }

        if (appointment.Status == "cancelled")
        {
            return BadRequest(new { message = "Nie można ocenić anulowanej wizyty." });
        }

        if (appointment.Status != "confirmed")
        {
            return BadRequest(new { message = "Można ocenić tylko potwierdzoną wizytę." });
        }

        if (DateTime.UtcNow <= appointment.DateEnd)
        {
            return BadRequest(new { message = "Możesz ocenić dopiero po zakończeniu wizyty." });
        }

        if (!string.Equals(dto.CustomerId, appointment.CustomerId, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Ocena musi być powiązana z klientem z wizyty." });
        }

        var alreadyReviewed = await _context.BranchReviews
            .AnyAsync(r => r.AppointmentId == dto.AppointmentId);

        if (alreadyReviewed)
        {
            return Conflict(new { message = "Ta wizyta została już oceniona." });
        }

        var review = new BranchReview
        {
            CompanyId = appointment.CompanyId,
            BranchId = appointment.BranchId,
            AppointmentId = appointment.Id,
            CustomerId = appointment.CustomerId,
            Rating = dto.Rating,
            Comment = dto.Comment,
            CreatedAt = DateTime.UtcNow
        };

        _context.BranchReviews.Add(review);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetReview), new { id = review.Id }, new
        {
            review.Id,
            review.CompanyId,
            review.BranchId,
            review.AppointmentId,
            review.CustomerId,
            review.Rating,
            review.Comment,
            review.CreatedAt
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetReview(int id)
    {
        var review = await _context.BranchReviews
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id);

        if (review == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            review.Id,
            review.CompanyId,
            review.BranchId,
            review.AppointmentId,
            review.CustomerId,
            review.Rating,
            review.Comment,
            review.CreatedAt
        });
    }
}

public class CreateBranchReviewDto
{
    public int AppointmentId { get; set; }
    public string CustomerId { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Comment { get; set; }
}
