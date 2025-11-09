using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.Provider.Polly;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Konfiguracja dla różnych środowisk
var environment = builder.Environment.EnvironmentName;
builder.Configuration
    .SetBasePath(builder.Environment.ContentRootPath)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{environment}.json", optional: true)
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"ocelot.{environment}.json", optional: true)
    .AddEnvironmentVariables();

// Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

// CORS - pozwól na wszystkie originy dla developmentu
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "super-secret-key-for-jwt-token-generation-minimum-32-characters-long-1234567890";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer("Bearer", options =>
    {
        options.Authority = null; // Nie używamy Authority dla prostego JWT
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "MikroSaaS-IdentityService",
            ValidAudience = "MikroSaaS-Apps",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero // Brak tolerancji na różnice czasu
        };

        // Dodaj obsługę błędów autentykacji
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                {
                    context.Response.Headers.Append("Token-Expired", "true");
                }
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                var result = System.Text.Json.JsonSerializer.Serialize(new 
                { 
                    error = "Unauthorized",
                    message = "Token is missing or invalid"
                });
                return context.Response.WriteAsync(result);
            }
        };
    });

// Health checks
builder.Services.AddHealthChecks();

// Swagger for Ocelot
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSwaggerForOcelot(builder.Configuration);

// Ocelot z Polly (retry policies)
builder.Services.AddOcelot()
    .AddPolly();

var app = builder.Build();

// Log startup information
app.Logger.LogInformation("API Gateway starting up...");
app.Logger.LogInformation($"Environment: {app.Environment.EnvironmentName}");

// Middleware pipeline
app.UseRouting();

// CORS musi być przed Authentication
app.UseCors("AllowAll");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Map endpoints BEFORE Ocelot to ensure they are handled first
app.UseEndpoints(endpoints =>
{
    // Health check endpoint - musi być przed Ocelot
    endpoints.MapHealthChecks("/health");
    
    // Prosty endpoint główny
    endpoints.MapGet("/", () => Results.Json(new 
    {
        service = "API Gateway",
        version = "1.0",
        status = "running",
        endpoints = new[]
        {
            "/identity/* - Identity Service",
            "/reservation/* - Reservation Service", 
            "/notification/* - Notification Service",
            "/swagger - API Documentation",
            "/health - Health check"
        }
    }));
    
    // Info endpoint
    endpoints.MapGet("/info", () => Results.Json(new
    {
        service = "API Gateway (Ocelot)",
        version = "1.0.0",
        environment = app.Environment.EnvironmentName,
        timestamp = DateTime.UtcNow,
        routes = new[]
        {
            new { path = "/identity", service = "IdentityService", port = 5001 },
            new { path = "/reservation", service = "ReservationService", port = 5002 },
            new { path = "/notification", service = "NotificationService", port = 5003 }
        }
    }));
});

// Swagger UI dla API Gateway
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerForOcelotUI(options =>
    {
        options.PathToSwaggerGenerator = "/swagger/docs";
    });
}

// Ocelot middleware - musi być ostatni
try
{
    app.Logger.LogInformation("Configuring Ocelot middleware...");
    app.UseOcelot().Wait();
    app.Logger.LogInformation("Ocelot middleware configured successfully");
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Failed to configure Ocelot middleware");
    throw;
}

app.Logger.LogInformation("API Gateway started successfully on port 8080");
app.Run();
