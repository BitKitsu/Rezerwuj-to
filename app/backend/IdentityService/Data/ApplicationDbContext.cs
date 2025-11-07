using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity; 
// Import nowego modelu
using IdentityService.Data; // Dodaj ten using, jeśli nie masz

namespace IdentityService.Data
{
    // Użyj ApplicationUser zamiast IdentityUser
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        // Możesz dodać tu inne DbSety, jeśli rozszerzasz model
    }
}

