using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotificationService.Data;
using NotificationService.Models;

namespace NotificationService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class TemplatesController : ControllerBase
{
    private readonly NotificationDbContext _context;

    public TemplatesController(NotificationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationTemplate>>> GetTemplates([FromQuery] bool includeInactive = true)
    {
        IQueryable<NotificationTemplate> query = _context.NotificationTemplates.AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(t => t.IsActive);
        }

        return await query
            .OrderBy(t => t.Type)
            .ThenBy(t => t.Channel)
            .ThenBy(t => t.Name)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<NotificationTemplate>> GetTemplate(int id)
    {
        var template = await _context.NotificationTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (template == null)
        {
            return NotFound();
        }

        return template;
    }

    [HttpPost]
    public async Task<ActionResult<NotificationTemplate>> CreateTemplate(CreateOrUpdateTemplateDto dto)
    {
        var existing = await _context.NotificationTemplates
            .FirstOrDefaultAsync(t => t.Type == dto.Type && t.Channel == dto.Channel);

        if (existing != null)
        {
            existing.Name = dto.Name.Trim();
            existing.Subject = dto.Subject ?? string.Empty;
            existing.Body = dto.Body ?? string.Empty;
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        var template = new NotificationTemplate
        {
            Name = dto.Name.Trim(),
            Type = dto.Type,
            Channel = dto.Channel,
            Subject = dto.Subject ?? string.Empty,
            Body = dto.Body ?? string.Empty,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null
        };

        _context.NotificationTemplates.Add(template);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTemplate(int id, CreateOrUpdateTemplateDto dto)
    {
        var template = await _context.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == id);
        if (template == null)
        {
            return NotFound();
        }

        var conflict = await _context.NotificationTemplates
            .AsNoTracking()
            .AnyAsync(t => t.Id != id && t.Type == dto.Type && t.Channel == dto.Channel);

        if (conflict)
        {
            return Conflict(new { message = "Template for this Type and Channel already exists." });
        }

        template.Name = dto.Name.Trim();
        template.Type = dto.Type;
        template.Channel = dto.Channel;
        template.Subject = dto.Subject ?? string.Empty;
        template.Body = dto.Body ?? string.Empty;
        template.IsActive = dto.IsActive;
        template.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        var template = await _context.NotificationTemplates.FirstOrDefaultAsync(t => t.Id == id);
        if (template == null)
        {
            return NotFound();
        }

        _context.NotificationTemplates.Remove(template);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public class CreateOrUpdateTemplateDto
{
    public required string Name { get; set; }
    public NotificationType Type { get; set; }
    public NotificationChannel Channel { get; set; } = NotificationChannel.Email;
    public string? Subject { get; set; }
    public string? Body { get; set; }
    public bool IsActive { get; set; } = true;
}
