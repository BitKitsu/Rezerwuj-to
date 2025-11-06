using IdentityService.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace IdentityService.Data
{
    // Ta klasa pozwala narzędziu dotnet ef CLI zbudować DbContext
    public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            
            // UWAGA: Ten ciąg połączenia służy WYŁĄCZNIE do generowania plików migracji.
            // Nie jest używany w trakcie działania aplikacji.
            string designConnectionString = "Host=localhost;Port=5432;Database=DesignTimeDB;Username=dummy;Password=dummy";

            optionsBuilder.UseNpgsql(designConnectionString, 
                sqlOptions => sqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));

            return new ApplicationDbContext(optionsBuilder.Options);
        }
    }
}