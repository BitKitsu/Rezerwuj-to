using System.ComponentModel.DataAnnotations;
using IdentityService.Data;

namespace IdentityService.Models;

public class UserCompanyRole
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public int CompanyId { get; set; }
    
    [Required]
    public string Role { get; set; } = "Employee"; // Owner, Manager, Employee
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? RevokedAt { get; set; }
    
    // Relacje
    public ApplicationUser User { get; set; } = null!;
}

public static class CompanyRoles
{
    public const string Owner = "Owner";
    public const string Manager = "Manager";
    public const string Employee = "Employee";
}
