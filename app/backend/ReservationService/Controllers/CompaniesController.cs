using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CompaniesController : ControllerBase
{
    private readonly ReservationDbContext _context;

    public CompaniesController(ReservationDbContext context)
    {
        _context = context;
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
    public async Task<ActionResult<Company>> CreateCompany(Company company)
    {
        company.Phone = SanitizePhoneNumber(company.Phone) ?? company.Phone;
        company.RegistrationDate = DateTime.UtcNow;
        _context.Companies.Add(company);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCompany), new { id = company.Id }, company);
    }

    // PUT: api/companies/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCompany(int id, Company company)
    {
        if (id != company.Id)
        {
            return BadRequest();
        }

        company.Phone = SanitizePhoneNumber(company.Phone) ?? company.Phone;

        _context.Entry(company).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
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
    public async Task<IActionResult> DeleteCompany(int id)
    {
        var company = await _context.Companies.FindAsync(id);
        if (company == null)
        {
            return NotFound();
        }

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
