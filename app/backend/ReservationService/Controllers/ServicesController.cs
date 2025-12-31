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
public class ServicesController : ControllerBase
{
    private readonly ReservationDbContext _context;
    private readonly ILogger<ServicesController> _logger;
    private readonly ICompanyAuditService _audit;

    public ServicesController(ReservationDbContext context, ILogger<ServicesController> logger, ICompanyAuditService audit)
    {
        _context = context;
        _logger = logger;
        _audit = audit;
    }

    // GET: api/services
    [HttpGet]
    public async Task<ActionResult<PagedResult<ServiceListItemDto>>> GetServices(
        [FromQuery] string? query,
        [FromQuery] string? city,
        [FromQuery] int? branchId,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        _logger.LogInformation("Pobieranie listy usług z filtrowaniem i paginacją");

        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;
        if (pageSize > 100) pageSize = 100;

        var servicesQuery = _context.Services
            .Include(s => s.Company)
            .Include(s => s.Branch)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var normalizedQuery = query.Trim().ToLower();
            servicesQuery = servicesQuery.Where(s =>
                s.ServiceName.ToLower().Contains(normalizedQuery) ||
                s.Description.ToLower().Contains(normalizedQuery) ||
                (s.Company != null && s.Company.CompanyName.ToLower().Contains(normalizedQuery)));
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            var normalizedCity = city.Trim().ToLower();
            servicesQuery = servicesQuery.Where(s =>
                (s.Branch != null && s.Branch.City != null &&
                 s.Branch.City.ToLower().Contains(normalizedCity)) ||
                (s.Branch == null && s.Company != null && s.Company.City != null &&
                 s.Company.City.ToLower().Contains(normalizedCity)));
        }

        if (branchId.HasValue)
        {
            servicesQuery = servicesQuery.Where(s => s.BranchId == branchId.Value);
        }

        var totalCount = await servicesQuery.CountAsync();

        var ratingByBranch = _context.BranchReviews
            .GroupBy(r => r.BranchId)
            .Select(g => new
            {
                BranchId = g.Key,
                AvgRating = g.Average(r => (double)r.Rating),
                ReviewCount = g.Count()
            });

        var itemsQuery = servicesQuery
            .Select(s => new
            {
                Service = s,
                AvgRating = ratingByBranch
                    .Where(x => x.BranchId == s.BranchId)
                    .Select(x => (double?)x.AvgRating)
                    .FirstOrDefault() ?? 0,
                ReviewCount = ratingByBranch
                    .Where(x => x.BranchId == s.BranchId)
                    .Select(x => (int?)x.ReviewCount)
                    .FirstOrDefault() ?? 0
            });

        itemsQuery = sort switch
        {
            "price_asc" => itemsQuery.OrderBy(x => x.Service.Price),
            "price_desc" => itemsQuery.OrderByDescending(x => x.Service.Price),
            "duration_asc" => itemsQuery.OrderBy(x => x.Service.DurationMinutes),
            "name_asc" => itemsQuery.OrderBy(x => x.Service.ServiceName),
            "rating" => itemsQuery.OrderByDescending(x => x.AvgRating).ThenBy(x => x.Service.Id),
            _ => itemsQuery.OrderBy(x => x.Service.Id)
        };

        var items = await itemsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ServiceListItemDto(
                x.Service.Id,
                x.Service.ServiceName,
                x.Service.Description,
                x.Service.DurationMinutes,
                x.Service.Price,
                x.Service.CompanyId,
                x.Service.BranchId,
                x.Service.Company != null ? x.Service.Company.CompanyName : string.Empty,
                x.Service.Branch != null ? x.Service.Branch.BranchName : string.Empty,
                x.Service.Branch != null ? x.Service.Branch.City : (x.Service.Company != null ? x.Service.Company.City : null),
                x.AvgRating,
                x.ReviewCount
            ))
            .ToListAsync();

        var result = new PagedResult<ServiceListItemDto>(items, totalCount, page, pageSize);
        return Ok(result);
    }

    // GET: api/services/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Service>> GetService(int id)
    {
        var service = await _context.Services
            .Include(s => s.Company)
            .Include(s => s.Branch)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (service == null)
        {
            _logger.LogWarning("Nie znaleziono usługi o ID: {Id}", id);
            return NotFound();
        }

        return service;
    }

    // GET: api/services/company/1
    [HttpGet("company/{companyId}")]
    public async Task<ActionResult<IEnumerable<Service>>> GetServicesByCompany(
        int companyId,
        [FromQuery] int? branchId)
    {
        return await _context.Services
            .Where(s => s.CompanyId == companyId && (!branchId.HasValue || s.BranchId == branchId.Value))
            .ToListAsync();
    }

    // POST: api/services
    [HttpPost]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<ActionResult<Service>> CreateService(ServiceCreateUpdateDto dto)
    {
        _logger.LogInformation("Tworzenie nowej usługi: {ServiceName}", dto.ServiceName);

        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, dto.CompanyId.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }
        }

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == dto.BranchId);

        if (branch == null)
        {
            return BadRequest(new { message = "Oddział o podanym ID nie istnieje." });
        }

        if (branch.CompanyId != dto.CompanyId)
        {
            return BadRequest(new { message = "Oddział nie należy do podanej firmy." });
        }

        var service = new Service
        {
            ServiceName = dto.ServiceName,
            Description = dto.Description ?? string.Empty,
            Price = dto.Price,
            DurationMinutes = dto.DurationMinutes,
            CompanyId = dto.CompanyId,
            BranchId = dto.BranchId
        };

        _context.Services.Add(service);
        await _context.SaveChangesAsync();

        try
        {
            var entityDisplayName = $"Usługa: {service.ServiceName}";
            var safeService = new
            {
                service.ServiceName,
                service.Description,
                service.Price,
                service.DurationMinutes,
                BranchName = branch.BranchName
            };

            await _audit.LogAsync(
                service.CompanyId,
                nameof(Service),
                null,
                entityDisplayName,
                "Create",
                null,
                safeService,
                User,
                HttpContext.Request.Headers["User-Agent"].ToString());
        }
        catch
        {
        }

        return CreatedAtAction(nameof(GetService), new { id = service.Id }, service);
    }

    // PUT: api/services/5
    [HttpPut("{id}")]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<IActionResult> UpdateService(int id, ServiceCreateUpdateDto dto)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            return NotFound();
        }

        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, service.CompanyId.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }

            if (dto.CompanyId != service.CompanyId)
            {
                return BadRequest(new { message = "Nie można zmienić firmy usługi." });
            }
        }

        var oldValues = new
        {
            BranchName = (string?)null,
            service.ServiceName,
            service.Description,
            service.Price,
            service.DurationMinutes
        };

        var oldBranch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == service.BranchId);

        var oldValuesWithBranch = new
        {
            BranchName = oldBranch?.BranchName,
            service.ServiceName,
            service.Description,
            service.Price,
            service.DurationMinutes
        };

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == dto.BranchId);

        if (branch == null)
        {
            return BadRequest(new { message = "Oddział o podanym ID nie istnieje." });
        }

        if (branch.CompanyId != dto.CompanyId)
        {
            return BadRequest(new { message = "Oddział nie należy do podanej firmy." });
        }

        service.ServiceName = dto.ServiceName;
        service.Description = dto.Description ?? string.Empty;
        service.Price = dto.Price;
        service.DurationMinutes = dto.DurationMinutes;
        service.CompanyId = dto.CompanyId;
        service.BranchId = dto.BranchId;

        var entityDisplayName = $"Usługa: {service.ServiceName}";

        try
        {
            await _context.SaveChangesAsync();

            try
            {
                await _audit.LogAsync(
                    service.CompanyId,
                    nameof(Service),
                    null,
                    entityDisplayName,
                    "Update",
                    oldValuesWithBranch,
                    new
                    {
                        service.ServiceName,
                        service.Description,
                        service.Price,
                        service.DurationMinutes,
                        BranchName = branch.BranchName
                    },
                    User,
                    HttpContext.Request.Headers["User-Agent"].ToString());
            }
            catch
            {
            }
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ServiceExists(id))
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

    // DELETE: api/services/5
    [HttpDelete("{id}")]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<IActionResult> DeleteService(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            return NotFound();
        }

        var entityDisplayName = $"Usługa: {service.ServiceName}";

        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, service.CompanyId.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }
        }

        var branch = await _context.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == service.BranchId);

        var oldValues = new
        {
            BranchName = branch?.BranchName,
            service.ServiceName,
            service.Description,
            service.Price,
            service.DurationMinutes
        };

        _context.Services.Remove(service);
        await _context.SaveChangesAsync();

        try
        {
            await _audit.LogAsync(
                service.CompanyId,
                nameof(Service),
                null,
                entityDisplayName,
                "Delete",
                oldValues,
                null,
                User,
                HttpContext.Request.Headers["User-Agent"].ToString());
        }
        catch
        {
        }

        _logger.LogInformation("Usunięto usługę o ID: {Id}", id);
        return NoContent();
    }

    private bool ServiceExists(int id)
    {
        return _context.Services.Any(e => e.Id == id);
    }
}
