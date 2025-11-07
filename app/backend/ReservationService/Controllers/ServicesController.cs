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
    public async Task<ActionResult<IEnumerable<Service>>> GetServices()
    {
        _logger.LogInformation("Pobieranie listy usług");
        return await _context.Services
            .Include(s => s.Company)
            .ToListAsync();
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
