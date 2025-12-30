using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext
var connectionString = builder.Configuration.GetConnectionString("ReservationConnection") 
                       ?? throw new InvalidOperationException("Connection string 'ReservationConnection' not found.");

builder.Services.AddDbContext<ReservationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add custom services
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<IEventSourcingService, EventSourcingService>();

// Add services to the container.
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

// CORS dla frontendu
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Automatyczna migracja bazy danych z retry logic
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ReservationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    var maxRetryCount = 10;
    var delay = TimeSpan.FromSeconds(3);
    
    for (int retry = 0; retry < maxRetryCount; retry++)
    {
        try
        {
            logger.LogInformation($"Applying ReservationDB migrations... (attempt {retry + 1}/{maxRetryCount})");
            var migrations = dbContext.Database.GetMigrations().ToList();
            if (migrations.Count == 0)
            {
                logger.LogWarning("No EF Core migrations were found for ReservationDB. Falling back to EnsureCreated(). Generate an initial migration to use Database.Migrate().");
                dbContext.Database.EnsureCreated();
            }
            else
            {
                dbContext.Database.Migrate();
            }
            logger.LogInformation("ReservationDB is ready!");

            if (app.Environment.IsDevelopment())
            {
                ReservationDbSeeder.SeedDevBranchReviews(dbContext, logger);
            }
            
            break; // Sukces
        }
        catch (Exception ex)
        {
            if (retry == maxRetryCount - 1)
            {
                logger.LogError(ex, "Failed to migrate ReservationDB after all retries.");
                throw;
            }
            
            logger.LogWarning($"Failed to connect to database. Retrying in {delay.TotalSeconds} seconds... ({retry + 1}/{maxRetryCount})");
            Thread.Sleep(delay);
        }
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

// Endpoint healthcheck
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "ReservationService" }))
   .WithName("HealthCheck");

app.Run();
