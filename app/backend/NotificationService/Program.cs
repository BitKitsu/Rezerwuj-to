using Microsoft.EntityFrameworkCore;
using NotificationService.Data;
using NotificationService.Hubs;
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
builder.Services.AddScoped<INotificationSender, NotificationSender>();
builder.Services.AddHostedService<RabbitMQConsumer>();

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
    
    try
    {
        // Dla developmentu - usuń i utwórz od nowa
        dbContext.Database.EnsureDeleted();
        dbContext.Database.EnsureCreated();
        
        Console.WriteLine("✅ Baza danych NotificationDB utworzona pomyślnie");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Błąd tworzenia bazy danych: {ex.Message}");
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
