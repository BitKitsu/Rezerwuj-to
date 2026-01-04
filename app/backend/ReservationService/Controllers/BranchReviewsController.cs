using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

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

    [HttpGet("branch/{branchId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetBranchReviews(int branchId)
    {
        var reviews = await _context.BranchReviews
            .AsNoTracking()
            .Where(r => r.BranchId == branchId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.CompanyId,
                r.BranchId,
                r.Rating,
                r.Comment,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(reviews);
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
    [Authorize]
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

        var appointmentCustomerId = (appointment.CustomerId ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(appointmentCustomerId))
        {
            return BadRequest(new { message = "Ocena musi być powiązana z klientem z wizyty." });
        }

        var emailClaim = User.FindFirst(JwtRegisteredClaimNames.Email)?.Value
            ?? User.FindFirst(ClaimTypes.Email)?.Value;

        var phoneClaim = User.FindFirst("phone")?.Value
            ?? User.FindFirst(ClaimTypes.MobilePhone)?.Value;

        var matches = false;

        if (!string.IsNullOrWhiteSpace(emailClaim) && appointmentCustomerId.Contains('@'))
        {
            matches = string.Equals(
                NormalizeEmail(appointmentCustomerId),
                NormalizeEmail(emailClaim),
                StringComparison.Ordinal);
        }

        if (!matches && !string.IsNullOrWhiteSpace(phoneClaim) && !appointmentCustomerId.Contains('@'))
        {
            matches = string.Equals(
                SanitizePhoneNumber(appointmentCustomerId),
                SanitizePhoneNumber(phoneClaim),
                StringComparison.Ordinal);
        }

        if (!matches)
        {
            return Forbid();
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

    private static string NormalizeEmail(string email)
    {
        return (email ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static string SanitizePhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return string.Empty;
        }

        phone = phone.Trim();
        var keepPlus = phone.StartsWith('+');
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return keepPlus ? $"+{digits}" : digits;
    }
}

public class CreateBranchReviewDto
{
    public int AppointmentId { get; set; }
    public string CustomerId { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Comment { get; set; }
}
