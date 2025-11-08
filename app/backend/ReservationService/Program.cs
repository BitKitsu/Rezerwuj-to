using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Services;

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
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

// Automatyczna migracja bazy danych
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ReservationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("Applying ReservationDB migrations...");
        dbContext.Database.EnsureCreated(); // Tworzy bazę i tabele jeśli nie istnieją
        logger.LogInformation("ReservationDB is ready!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating ReservationDB.");
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
