using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly ReservationDbContext _context;
    private readonly ILogger<ServicesController> _logger;

    public ServicesController(ReservationDbContext context, ILogger<ServicesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // GET: api/services
    [HttpGet]
    public async Task<ActionResult<PagedResult<ServiceListItemDto>>> GetServices(
        [FromQuery] string? query,
        [FromQuery] string? city,
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
                s.Company != null && s.Company.City != null &&
                s.Company.City.ToLower().Contains(normalizedCity));
        }

        servicesQuery = sort switch
        {
            "price_asc" => servicesQuery.OrderBy(s => s.Price),
            "price_desc" => servicesQuery.OrderByDescending(s => s.Price),
            "duration_asc" => servicesQuery.OrderBy(s => s.DurationMinutes),
            "name_asc" => servicesQuery.OrderBy(s => s.ServiceName),
            _ => servicesQuery.OrderBy(s => s.Id)
        };

        var totalCount = await servicesQuery.CountAsync();

        var items = await servicesQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new ServiceListItemDto(
                s.Id,
                s.ServiceName,
                s.Description,
                s.DurationMinutes,
                s.Price,
                s.CompanyId,
                s.Company != null ? s.Company.CompanyName : string.Empty,
                s.Company != null ? s.Company.City : null
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
    public async Task<ActionResult<IEnumerable<Service>>> GetServicesByCompany(int companyId)
    {
        return await _context.Services
            .Where(s => s.CompanyId == companyId)
            .ToListAsync();
    }

    // POST: api/services
    [HttpPost]
    public async Task<ActionResult<Service>> CreateService(Service service)
    {
        _logger.LogInformation("Tworzenie nowej usługi: {ServiceName}", service.ServiceName);
        
        _context.Services.Add(service);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetService), new { id = service.Id }, service);
    }

    // PUT: api/services/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateService(int id, Service service)
    {
        if (id != service.Id)
        {
            return BadRequest();
        }

        _context.Entry(service).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
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
    public async Task<IActionResult> DeleteService(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            return NotFound();
        }

        _context.Services.Remove(service);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Usunięto usługę o ID: {Id}", id);
        return NoContent();
    }

    private bool ServiceExists(int id)
    {
        return _context.Services.Any(e => e.Id == id);
    }
}
