using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity; 
using IdentityService.Models;
using IdentityService.Data;

namespace IdentityService.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        
        // DbSet dla Refresh Tokens
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        
        // DbSet dla Company Roles
        public DbSet<UserCompanyRole> UserCompanyRoles { get; set; }
        
        // DbSet dla Audit Logs
        public DbSet<AuditLog> AuditLogs { get; set; }
        
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            // Konfiguracja RefreshToken
            builder.Entity<RefreshToken>()
                .HasOne(rt => rt.User)
                .WithMany()
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Konfiguracja UserCompanyRole
            builder.Entity<UserCompanyRole>()
                .HasIndex(ucr => new { ucr.UserId, ucr.CompanyId })
                .IsUnique();
                
            // Indeksy dla wydajności
            builder.Entity<RefreshToken>()
                .HasIndex(rt => rt.Token)
                .IsUnique();
                
            builder.Entity<AuditLog>()
                .HasIndex(al => al.CreatedAt);
        }
    }
}

