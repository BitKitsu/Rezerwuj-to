using IdentityService.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Pobranie Connection Stringu (z appsettings.json LUB zmiennej środowiskowej Docker!)
var connectionString = builder.Configuration.GetConnectionString("IdentityConnection") 
                       ?? throw new InvalidOperationException("Connection string 'IdentityConnection' not found.");

// 1. Rejestracja DbContext z dostawcą Npgsql
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Dodanie ASP.NET Core Identity z ApplicationUser
builder.Services.AddIdentityApiEndpoints<ApplicationUser>() // Użyj API Endpoints dla nowoczesnego mikroserwisu
    .AddEntityFrameworkStores<ApplicationDbContext>();

// Konfiguracja wymagań dla hasła - bardziej liberalne i czytelne komunikaty
builder.Services.Configure<IdentityOptions>(options =>
{
    // Wymagania hasła
    options.Password.RequireDigit = true;           // Wymaga cyfry
    options.Password.RequiredLength = 6;            // Minimum 6 znaków
    options.Password.RequireNonAlphanumeric = false; // NIE wymaga znaków specjalnych
    options.Password.RequireUppercase = false;       // NIE wymaga wielkiej litery
    options.Password.RequireLowercase = false;       // NIE wymaga małej litery
    options.Password.RequiredUniqueChars = 1;       // Minimum 1 unikalny znak
    
    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
    
    // User settings
    options.User.RequireUniqueEmail = true;
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
});

// Dodatkowe usługi (np. uwierzytelnianie tokenem Bearer dla komunikacji między serwisami)
builder.Services.AddControllers();
builder.Services.AddAuthorization(); 
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

// Automatyczne tworzenie bazy przy starcie (dla developmentu)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    
    // Dla developmentu - usuń i utwórz od nowa
    dbContext.Database.EnsureDeleted();
    dbContext.Database.EnsureCreated();
    
    // Utworzenie testowego użytkownika (synchronicznie)
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var testEmail = "test@example.com";
    var testUser = userManager.FindByEmailAsync(testEmail).GetAwaiter().GetResult();
    
    if (testUser == null)
    {
        testUser = new ApplicationUser
        {
            UserName = testEmail,
            Email = testEmail,
            EmailConfirmed = true,
            FirstName = "Test",
            LastName = "User",
            Phone = "",
            CompanyId = 1
        };
        
        var result = userManager.CreateAsync(testUser, "Test123!").GetAwaiter().GetResult();
        
        if (result.Succeeded)
        {
            Console.WriteLine($"✅ Utworzono testowego użytkownika: {testEmail} / Test123!");
        }
        else
        {
            Console.WriteLine($"❌ Błąd tworzenia użytkownika testowego: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }
    else
    {
        Console.WriteLine($"ℹ️ Użytkownik testowy już istnieje: {testEmail}");
    }
}

// Konfiguracja HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

// 3. Włączenie Identity API Endpoints 
app.MapIdentityApi<ApplicationUser>();

app.UseAuthorization();

app.MapControllers();

// Endpoint healthcheck
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "IdentityService" }))
   .WithName("HealthCheck");

app.Run();