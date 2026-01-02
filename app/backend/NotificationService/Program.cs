using Microsoft.EntityFrameworkCore;
using NotificationService.Data;
using NotificationService.Hubs;
using NotificationService.Models;
using NotificationService.Services;

var builder = WebApplication.CreateBuilder(args);

// Pobranie connection string
var connectionString = builder.Configuration.GetConnectionString("NotificationConnection")
                      ?? Environment.GetEnvironmentVariable("ConnectionStrings__NotificationConnection")
                      ?? throw new InvalidOperationException("Connection string 'NotificationConnection' not found.");

// Konfiguracja DbContext z PostgreSQL
builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Rejestracja serwisów
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddSingleton<SmsInboxStore>();
builder.Services.AddScoped<INotificationSender, NotificationSender>();
builder.Services.AddHostedService<RabbitMQConsumer>();
builder.Services.AddHttpClient();

// Dodanie kontrolerów
builder.Services.AddControllers();

// Dodanie SignalR
builder.Services.AddSignalR();

// Dodanie CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Ważne dla SignalR
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Automatyczne tworzenie bazy przy starcie (dla developmentu)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("Applying NotificationDB migrations...");
        dbContext.Database.EnsureCreated(); // Tworzy bazę i tabele jeśli nie istnieją
        logger.LogInformation("NotificationDB is ready!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating NotificationDB.");
    }
}

// Konfiguracja pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

// MapHub dla SignalR
app.MapHub<NotificationHub>("/notificationHub");

// Podstawowy endpoint healthcheck
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "NotificationService" }))
   .WithName("HealthCheck");

Console.WriteLine("🔔 NotificationService uruchomiony na porcie 5003");

app.Run();
