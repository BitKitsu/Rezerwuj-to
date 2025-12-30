using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.Services;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/company-audit")]
public class CompanyAuditController : ControllerBase
{
    private readonly ICompanyAuditService _audit;

    public CompanyAuditController(ICompanyAuditService audit)
    {
        _audit = audit;
    }

    [HttpGet("company/{companyId}")]
    [Authorize(Policy = "CompanyOwnerOrAdmin")]
    public async Task<IActionResult> GetCompanyAudit(int companyId, [FromQuery] int take = 200)
    {
        if (!User.IsInRole("Admin"))
        {
            var claimCompanyId = User.FindFirst("CompanyId")?.Value;
            if (!string.Equals(claimCompanyId, companyId.ToString(), StringComparison.Ordinal))
            {
                return Forbid();
            }
        }

        var logs = await _audit.GetCompanyAuditAsync(companyId, take);
        return Ok(logs);
    }
}
