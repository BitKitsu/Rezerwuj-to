using System.ComponentModel.DataAnnotations;
using IdentityService.Data;

namespace IdentityService.Models;

public class RefreshToken
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    public string JwtId { get; set; } = string.Empty; // ID JWT tokenu
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime ExpiresAt { get; set; }
    
    public bool IsRevoked { get; set; } = false;
    
    public bool IsUsed { get; set; } = false;
    
    // Relacja
    public ApplicationUser User { get; set; } = null!;
}
