using Microsoft.EntityFrameworkCore;
using ReservationService.Data;
using ReservationService.Services;
using ReservationService.Models;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =================================================================
// KONFIGURACJA JWT (MUSI BYĆ ZGODNA Z IDENTITY SERVICE)
// =================================================================
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"]
                ?? throw new InvalidOperationException("Jwt:SecretKey not configured.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,

        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),

        // Konfiguracja, aby poprawnie odczytywać Claimy NameIdentifier z tokena Identity:
        NameClaimType = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    };
});
// =================================================================

// Add DbContext
var connectionString = builder.Configuration.GetConnectionString("ReservationConnection")
                       ?? throw new InvalidOperationException("Connection string 'ReservationConnection' not found.");

builder.Services.AddDbContext<ReservationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add custom services
builder.Services.AddScoped<IScheduleService, ScheduleService>();
builder.Services.AddScoped<IEventSourcingService, EventSourcingService>();

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

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
            dbContext.Database.EnsureCreated();
            logger.LogInformation("ReservationDB is ready!");

            // 🚨 PEŁNA SEKCJA SEEDINGU DANYCH TESTOWYCH 🚨
            if (!dbContext.Services.Any())
            {
                logger.LogInformation("Seeding test data...");

                var testCompany = new Company
                {
                    Id = 1,
                    CompanyName = "Przykładowy Fryzjer",
                    Description = "Najlepszy fryzjer w mieście",
                    Street = "ul. Testowa 123",
                    City = "Warszawa",
                    PostalCode = "00-001",
                    Country = "Polska",
                    Phone = "123456789",
                    Email = "fryzjer@example.com"
                };

                dbContext.Companies.Add(testCompany);

                var services = new[]
                {
                    new Service
                    {
                        ServiceName = "Strzyżenie męskie",
                        Description = "Klasyczne strzyżenie męskie",
                        DurationMinutes = 30,
                        Price = 50.00M,
                        CompanyId = 1
                    },
                    new Service
                    {
                        ServiceName = "Strzyżenie damskie",
                        Description = "Strzyżenie i modelowanie",
                        DurationMinutes = 60,
                        Price = 80.00M,
                        CompanyId = 1
                    },
                     new Service
                    {
                        ServiceName = "Koloryzacja",
                        Description = "Farbowanie włosów",
                        DurationMinutes = 120,
                        Price = 200.00M,
                        CompanyId = 1
                    }
                };

                dbContext.Services.AddRange(services);
                dbContext.SaveChanges();

                logger.LogInformation("Test data seeded successfully!");
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

// 🚨 WŁĄCZENIE UWIEŻYTELNIANIA I AUTORYZACJI
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Endpoint healthcheck
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "ReservationService" }))
   .WithName("HealthCheck");

app.Run();