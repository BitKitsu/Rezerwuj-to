using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ReservationService.Models;

namespace ReservationService.Data;

public static class ReservationDbSeeder
{
    public static void SeedDevBranchReviews(ReservationDbContext dbContext, ILogger logger)
    {
        var phonesChanged = NormalizeCompanyPhones(dbContext);

        var branches = dbContext.Branches
            .AsNoTracking()
            .Select(b => new { b.Id, b.CompanyId })
            .OrderBy(b => b.Id)
            .ToList();

        if (branches.Count == 0)
        {
            if (phonesChanged)
            {
                dbContext.SaveChanges();
            }
            return;
        }

        var ratingsByBranchId = new Dictionary<int, int>
        {
            { 1, 5 },
            { 2, 4 },
            { 3, 3 },
            { 4, 2 },
            { 5, 1 },
            { 6, 5 },
            { 7, 4 },
            { 8, 3 },
            { 9, 2 },
            { 11, 4 },
            { 12, 1 }
        };

        var reviewedBranchIds = dbContext.BranchReviews
            .AsNoTracking()
            .Select(r => r.BranchId)
            .Distinct()
            .ToHashSet();

        var now = DateTime.UtcNow;

        foreach (var branch in branches)
        {
            if (reviewedBranchIds.Contains(branch.Id))
            {
                continue;
            }

            var serviceForReview = dbContext.Services
                .AsNoTracking()
                .OrderBy(s => s.Id)
                .FirstOrDefault(s => s.BranchId == branch.Id);

            if (serviceForReview == null)
            {
                continue;
            }

            var rating = ratingsByBranchId.TryGetValue(branch.Id, out var mappedRating) ? mappedRating : 3;
            var start = now.AddDays(-((branch.Id % 7) + 1));
            var seedCustomerId = $"seed-customer-branch-{branch.Id}";

            var appointmentForReview = new Appointment
            {
                CompanyId = serviceForReview.CompanyId,
                BranchId = serviceForReview.BranchId,
                ServiceId = serviceForReview.Id,
                CustomerId = seedCustomerId,
                StaffId = "seed-staff",
                Status = "confirmed",
                DateStart = start,
                DateEnd = start.AddMinutes(serviceForReview.DurationMinutes),
                CreatedAt = start
            };

            dbContext.Appointments.Add(appointmentForReview);
            dbContext.BranchReviews.Add(new BranchReview
            {
                CompanyId = serviceForReview.CompanyId,
                BranchId = serviceForReview.BranchId,
                CustomerId = seedCustomerId,
                Rating = rating,
                Comment = $"Ocena: {rating}/5",
                CreatedAt = now,
                Appointment = appointmentForReview
            });
        }

        dbContext.SaveChanges();

        logger.LogInformation("Dev seed: ensured at least one BranchReview per Branch.");
    }

    private static bool NormalizeCompanyPhones(ReservationDbContext dbContext)
    {
        var companies = dbContext.Companies.ToList();
        var changed = false;

        foreach (var company in companies)
        {
            var formatted = FormatPhone(company.Phone);
            if (formatted != null && !string.Equals(company.Phone, formatted, StringComparison.Ordinal))
            {
                company.Phone = formatted;
                changed = true;
            }
        }

        return changed;
    }

    private static string? FormatPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var sanitized = new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return null;
        }

        if (sanitized.StartsWith("+", StringComparison.Ordinal))
        {
            var digitsOnly = new string(sanitized.Where(char.IsDigit).ToArray());
            return digitsOnly.Length == 0 ? null : $"+{digitsOnly}";
        }

        var digits = new string(sanitized.Where(char.IsDigit).ToArray());

        if (digits.Length == 13 && digits.StartsWith("0048", StringComparison.Ordinal))
        {
            return $"+48{digits.Substring(4)}";
        }

        if (digits.Length == 11 && digits.StartsWith("48", StringComparison.Ordinal))
        {
            return $"+{digits}";
        }

        if (digits.Length == 9)
        {
            return $"+48{digits}";
        }

        return null;
    }
}
