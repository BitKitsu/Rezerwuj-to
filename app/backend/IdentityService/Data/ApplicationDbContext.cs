using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity; // Standardowa klasa użytkownika

namespace IdentityService.Data
{
    // Dziedzicz po IdentityDbContext, który zawiera wszystkie tabele Identity
    public class ApplicationDbContext : IdentityDbContext<IdentityUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        // Możesz dodać tu inne DbSety, jeśli rozszerzasz model
    }
}