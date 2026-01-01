using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ReservationService.Data;

public class ReservationDbContextFactory : IDesignTimeDbContextFactory<ReservationDbContext>
{
    public ReservationDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ReservationDbContext>();

        var designConnectionString = "Host=localhost;Port=5432;Database=DesignTimeDB;Username=dummy;Password=dummy";

        optionsBuilder.UseNpgsql(
            designConnectionString,
            sqlOptions => sqlOptions.MigrationsAssembly(typeof(ReservationDbContext).Assembly.FullName));

        return new ReservationDbContext(optionsBuilder.Options);
    }
}
