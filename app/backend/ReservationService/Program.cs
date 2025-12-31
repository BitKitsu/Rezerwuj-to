using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ReservationService.Data;
using ReservationService.Services;
using System.Text;
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
builder.Services.AddScoped<ICompanyAuditService, CompanyAuditService>();

// Add services to the container.
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

// JWT Authentication
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSection["SecretKey"]
               ?? builder.Configuration["Jwt:SecretKey"]
               ?? "super-secret-key-for-jwt-token-generation-minimum-32-characters-long-1234567890";

var issuer = jwtSection["Issuer"]
             ?? builder.Configuration["Jwt:Issuer"]
             ?? "MikroSaaS-IdentityService";

var audience = jwtSection["Audience"]
               ?? builder.Configuration["Jwt:Audience"]
               ?? "MikroSaaS-Apps";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CompanyOwnerOrAdmin", policy =>
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("Admin") || ctx.User.HasClaim("CompanyRole", "Owner")));

    options.AddPolicy("CompanyManagerOrOwnerOrAdmin", policy =>
        policy.RequireAssertion(ctx =>
            ctx.User.IsInRole("Admin")
            || ctx.User.HasClaim("CompanyRole", "Owner")
            || ctx.User.HasClaim("CompanyRole", "Manager")));
});

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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Endpoint healthcheck
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "ReservationService" }))
   .WithName("HealthCheck");

app.Run();
