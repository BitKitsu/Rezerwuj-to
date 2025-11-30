using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Models;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly ReservationDbContext _context;

    public CompaniesController(ReservationDbContext context)
    {
        _context = context;
    }

    // GET: api/companies
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
    {
        return await _context.Companies
            .Include(c => c.Services)
            .ToListAsync();
    }

    // GET: api/companies/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Company>> GetCompany(int id)
    {
        var company = await _context.Companies
            .Include(c => c.Services)
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

        _context.Companies.Remove(company);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool CompanyExists(int id)
    {
        return _context.Companies.Any(e => e.Id == id);
    }
}
