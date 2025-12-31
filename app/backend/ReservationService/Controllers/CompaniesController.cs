using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;
using System.Linq;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CompaniesController : ControllerBase
{
    private readonly ReservationDbContext _context;
    private readonly ICompanyAuditService _audit;

    public CompaniesController(ReservationDbContext context, ICompanyAuditService audit)
    {
        _context = context;
        _audit = audit;
    }

    // GET: api/companies
    [HttpGet]
    public async Task<ActionResult<PagedResult<CompanyListItemDto>>> GetCompanies(
        [FromQuery] string? query,
        [FromQuery] string? city,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;
        if (pageSize > 100) pageSize = 100;

        var companiesQuery = _context.Companies.AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalizedQuery = query.Trim().ToLower();
            companiesQuery = companiesQuery.Where(c =>
                c.CompanyName.ToLower().Contains(normalizedQuery) ||
                (c.Description != null && c.Description.ToLower().Contains(normalizedQuery)));
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            var normalizedCity = city.Trim().ToLower();
            companiesQuery = companiesQuery.Where(c =>
                c.City != null && c.City.ToLower().Contains(normalizedCity));
        }

        var totalCount = await companiesQuery.CountAsync();

        var ratingByCompany = _context.BranchReviews
            .GroupBy(r => r.CompanyId)
            .Select(g => new
            {
                CompanyId = g.Key,
                AvgRating = g.Average(r => (double)r.Rating),
                ReviewCount = g.Count()
            });

        var itemsQuery = companiesQuery
            .Select(c => new
            {
                Company = c,
                AvgRating = ratingByCompany
                    .Where(x => x.CompanyId == c.Id)
                    .Select(x => (double?)x.AvgRating)
                    .FirstOrDefault() ?? 0,
                ReviewCount = ratingByCompany
                    .Where(x => x.CompanyId == c.Id)
                    .Select(x => (int?)x.ReviewCount)
                    .FirstOrDefault() ?? 0
            });

        itemsQuery = sort switch
        {
            "name_asc" => itemsQuery.OrderBy(x => x.Company.CompanyName),
            "rating" => itemsQuery.OrderByDescending(x => x.AvgRating).ThenBy(x => x.Company.Id),
            _ => itemsQuery.OrderBy(x => x.Company.Id)
        };

        var items = await itemsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new CompanyListItemDto(
                x.Company.Id,
                x.Company.CompanyName,
                x.Company.Description,
                x.Company.City,
                x.AvgRating,
                x.ReviewCount
            ))
            .ToListAsync();

        var result = new PagedResult<CompanyListItemDto>(items, totalCount, page, pageSize);
        return Ok(result);
    }

    // GET: api/companies/cities
    [HttpGet("cities")]
    public async Task<ActionResult<IEnumerable<string>>> GetCities([FromQuery] string? query)
    {
        var citiesQuery = _context.Companies
            .Where(c => c.City != null)
            .Select(c => c.City!)
            .Distinct();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalized = query.Trim().ToLower();
            citiesQuery = citiesQuery.Where(c => c.ToLower().Contains(normalized));
        }

        var cities = await citiesQuery
            .OrderBy(c => c)
            .Take(20)
            .ToListAsync();

        return Ok(cities);
    }

    // GET: api/companies/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Company>> GetCompany(int id)
    {
        var company = await _context.Companies
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
        {
            return NotFound();
        }

        return company;
    }

    // POST: api/companies
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Company>> CreateCompany(Company company)
    {
        company.Phone = SanitizePhoneNumber(company.Phone) ?? company.Phone;
        company.RegistrationDate = DateTime.UtcNow;
        _context.Companies.Add(company);
        await _context.SaveChangesAsync();

        try
        {
            var safeCompany = new
            {
                company.CompanyName,
                company.Email,
                company.Phone,
                company.StreetName,
                company.StreetNumber,
                company.ApartmentNumber,
                company.City,
                company.PostalCode,
                company.Country,
                company.Description,
                company.Website,
                company.OpeningHour,
                company.ClosingHour
            };

            await _audit.LogAsync(
                company.Id,
                nameof(Company),
                null,
                company.CompanyName,
                "Create",
                null,
                safeCompany,
                User,
                HttpContext.Request.Headers["User-Agent"].ToString());
        }
        catch
        {
        }

        return CreatedAtAction(nameof(GetCompany), new { id = company.Id }, company);
    }

    // PUT: api/companies/5
    [HttpPut("{id}")]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<IActionResult> UpdateCompany(int id, Company company)
    {
        if (id != company.Id)
        {
            return BadRequest();
        }

        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, id.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }
        }

        var existing = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (existing == null)
        {
            return NotFound();
        }

        company.Phone = SanitizePhoneNumber(company.Phone) ?? company.Phone;

        var tracked = await _context.Companies.FirstAsync(c => c.Id == id);
        tracked.CompanyName = company.CompanyName;
        tracked.Email = company.Email;
        tracked.Phone = company.Phone;
        tracked.StreetName = company.StreetName;
        tracked.StreetNumber = company.StreetNumber;
        tracked.ApartmentNumber = company.ApartmentNumber;
        tracked.City = company.City;
        tracked.PostalCode = company.PostalCode;
        tracked.Country = company.Country;
        tracked.Description = company.Description;
        tracked.Website = company.Website;
        tracked.OpeningHour = company.OpeningHour;
        tracked.ClosingHour = company.ClosingHour;

        try
        {
            await _context.SaveChangesAsync();

            try
            {
                var safeExisting = new
                {
                    existing.CompanyName,
                    existing.Email,
                    existing.Phone,
                    existing.StreetName,
                    existing.StreetNumber,
                    existing.ApartmentNumber,
                    existing.City,
                    existing.PostalCode,
                    existing.Country,
                    existing.Description,
                    existing.Website,
                    existing.OpeningHour,
                    existing.ClosingHour
                };

                var safeTracked = new
                {
                    tracked.CompanyName,
                    tracked.Email,
                    tracked.Phone,
                    tracked.StreetName,
                    tracked.StreetNumber,
                    tracked.ApartmentNumber,
                    tracked.City,
                    tracked.PostalCode,
                    tracked.Country,
                    tracked.Description,
                    tracked.Website,
                    tracked.OpeningHour,
                    tracked.ClosingHour
                };

                await _audit.LogAsync(
                    id,
                    nameof(Company),
                    null,
                    tracked.CompanyName,
                    "Update",
                    safeExisting,
                    safeTracked,
                    User,
                    HttpContext.Request.Headers["User-Agent"].ToString());
            }
            catch
            {
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!CompanyExists(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    // DELETE: api/companies/5
    [HttpDelete("{id}")]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, id.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }
        }

        var company = await _context.Companies.FindAsync(id);
        if (company == null)
        {
            return NotFound();
        }

        var oldValues = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        var timeSlots = await _context.TimeSlots
            .Where(ts => ts.CompanyId == id)
            .ToListAsync();
        if (timeSlots.Count > 0)
        {
            _context.TimeSlots.RemoveRange(timeSlots);
        }

        var schedules = await _context.Schedules
            .Where(s => s.CompanyId == id)
            .ToListAsync();
        if (schedules.Count > 0)
        {
            _context.Schedules.RemoveRange(schedules);
        }

        var appointments = await _context.Appointments
            .Where(a => a.CompanyId == id)
            .ToListAsync();
        if (appointments.Count > 0)
        {
            _context.Appointments.RemoveRange(appointments);
        }

        var services = await _context.Services
            .Where(s => s.CompanyId == id)
            .ToListAsync();
        if (services.Count > 0)
        {
            _context.Services.RemoveRange(services);
        }

        var branches = await _context.Branches
            .Where(b => b.CompanyId == id)
            .ToListAsync();
        if (branches.Count > 0)
        {
            _context.Branches.RemoveRange(branches);
        }

        _context.Companies.Remove(company);
        await _context.SaveChangesAsync();

        try
        {
            var safeOldValues = oldValues == null
                ? null
                : new
                {
                    oldValues.CompanyName,
                    oldValues.Email,
                    oldValues.Phone,
                    oldValues.StreetName,
                    oldValues.StreetNumber,
                    oldValues.ApartmentNumber,
                    oldValues.City,
                    oldValues.PostalCode,
                    oldValues.Country,
                    oldValues.Description,
                    oldValues.Website,
                    oldValues.OpeningHour,
                    oldValues.ClosingHour
                };

            await _audit.LogAsync(
                id,
                nameof(Company),
                null,
                oldValues?.CompanyName,
                "Delete",
                safeOldValues,
                null,
                User,
                HttpContext.Request.Headers["User-Agent"].ToString());
        }
        catch
        {
        }

        return NoContent();
    }

    private bool CompanyExists(int id)
    {
        return _context.Companies.Any(e => e.Id == id);
    }

    private static string? SanitizePhoneNumber(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return null;

        var sanitized = new string(phoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());

        return string.IsNullOrEmpty(sanitized) ? null : sanitized;
    }
}
