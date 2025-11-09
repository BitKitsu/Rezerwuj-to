using System.ComponentModel.DataAnnotations;
using IdentityService.Data;

namespace IdentityService.Models;

public class AuditLog
{
    [Key]
    public long Id { get; set; }
    
    public string? UserId { get; set; }
    
    [Required]
    public string EntityName { get; set; } = string.Empty; // np. "Appointment", "Company"
    
    public string? EntityId { get; set; } // ID zmienianej encji
    
    [Required]
    public string Action { get; set; } = string.Empty; // Create, Update, Delete, Read
    
    public string? OldValues { get; set; } // JSON
    
    public string? NewValues { get; set; } // JSON
    
    public string? Changes { get; set; } // JSON z listą zmienionych pól
    
    public string IpAddress { get; set; } = string.Empty;
    
    public string? UserAgent { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Relacje
    public ApplicationUser? User { get; set; }
}

public static class AuditActions
{
    public const string Create = "Create";
    public const string Read = "Read";
    public const string Update = "Update";
    public const string Delete = "Delete";
    public const string Login = "Login";
    public const string Logout = "Logout";
}
