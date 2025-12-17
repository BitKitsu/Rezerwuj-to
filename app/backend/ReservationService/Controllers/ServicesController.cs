using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;
using System.Security.Claims; // Wymagane do odczytu claimów z tokena

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetServices()
    {
        _logger.LogInformation("Pobieranie listy usług");
        var services = await _context.Services
            .Include(s => s.Company)
            .Select(s => new
            {
                id = s.Id,
                serviceName = s.ServiceName,
                description = s.Description,
                durationMinutes = s.DurationMinutes,
                price = s.Price,
                companyId = s.CompanyId,
                companyName = s.Company != null ? s.Company.CompanyName : null
            })
            .ToListAsync();

        return Ok(services);
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

    [HttpPost]
    public async Task<ActionResult<Service>> CreateService(Service service)
    {
        var companyIdClaim = User.FindFirst("companyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim))
            return StatusCode(403, new { message = "Nie masz przypisanej firmy." });

        int loggedInCompanyId = int.Parse(companyIdClaim);
        service.CompanyId = loggedInCompanyId;
        service.Company = null; // <- ważne

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

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

        // 1. POBIERANIE ID FIRMY Z TOKENA
        var companyIdClaim = User.FindFirst("companyId")?.Value;

        if (string.IsNullOrEmpty(companyIdClaim) || !int.TryParse(companyIdClaim, out int loggedInCompanyId))
        {
            return StatusCode(403, new { message = "Brak uprawnień. Company ID nie jest dostępne w tokenie." });
        }

        // 2. WERYFIKACJA WŁASNOŚCI
        var existingService = await _context.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);

        if (existingService == null)
        {
            return NotFound();
        }

        // Upewnij się, że usługa należy do firmy zalogowanego użytkownika
        if (existingService.CompanyId != loggedInCompanyId)
        {
            _logger.LogWarning("Użytkownik (CompanyId: {LoggedIn}) próbuje edytować usługę (ID: {ServiceId}) innej firmy (CompanyId: {Target})", loggedInCompanyId, id, existingService.CompanyId);
            return StatusCode(403, new { message = "Nie masz uprawnień do edycji tej usługi." });
        }

        // Zachowanie CompanyId z bazy
        service.CompanyId = existingService.CompanyId;
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
        // 1. POBIERANIE ID FIRMY Z TOKENA
        var companyIdClaim = User.FindFirst("companyId")?.Value;

        if (string.IsNullOrEmpty(companyIdClaim) || !int.TryParse(companyIdClaim, out int loggedInCompanyId))
        {
            return StatusCode(403, new { message = "Brak uprawnień." });
        }

        var service = await _context.Services.FindAsync(id);
        if (service == null)
        {
            return NotFound();
        }

        // 2. WERYFIKACJA WŁASNOŚCI
        if (service.CompanyId != loggedInCompanyId)
        {
            _logger.LogWarning("Użytkownik (CompanyId: {LoggedIn}) próbuje usunąć usługę (ID: {ServiceId}) innej firmy (CompanyId: {Target})", loggedInCompanyId, id, service.CompanyId);
            return StatusCode(403, new { message = "Nie masz uprawnień do usunięcia tej usługi." });
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