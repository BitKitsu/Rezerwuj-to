using IdentityService.Data;
using IdentityService.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Pobranie Connection Stringu (z appsettings.json LUB zmiennej środowiskowej Docker!)
var connectionString = builder.Configuration.GetConnectionString("IdentityConnection") 
                       ?? throw new InvalidOperationException("Connection string 'IdentityConnection' not found.");

// 1. Rejestracja DbContext z dostawcą Npgsql
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Dodanie ASP.NET Core Identity z ApplicationUser i rolami
builder.Services.AddIdentityApiEndpoints<ApplicationUser>() // Użyj API Endpoints dla nowoczesnego mikroserwisu
    .AddRoles<IdentityRole>()
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

// Dodatkowe usługi
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddHttpContextAccessor();

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "super-secret-key-for-jwt-token-generation-minimum-32-characters-long-1234567890";

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
        ValidIssuer = jwtSettings["Issuer"] ?? "MikroSaaS-IdentityService",
        ValidAudience = jwtSettings["Audience"] ?? "MikroSaaS-Apps",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

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

// Automatyczna migracja i tworzenie bazy + testowy użytkownik
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    // Retry logic dla migracji bazy danych
    var maxRetryCount = 5;
    var delayMilliseconds = 1000;
    
    for (int retry = 0; retry < maxRetryCount; retry++)
    {
        try
        {
            if (retry > 0)
            {
                logger.LogInformation($"Retry {retry}/{maxRetryCount} - waiting {delayMilliseconds}ms...");
                Thread.Sleep(delayMilliseconds);
                delayMilliseconds *= 2; // Exponential backoff
            }
            
            logger.LogInformation("Applying database migrations...");
            dbContext.Database.Migrate(); // Stosuje migracje
            logger.LogInformation("Database is up to date!");
            break; // Sukces
        }
        catch (Exception ex)
        {
            if (retry == maxRetryCount - 1)
            {
                logger.LogError(ex, "Failed to apply database migrations after {RetryCount} attempts", maxRetryCount);
                throw; // Ostatnia próba nieudana - rzucamy wyjątek
            }
            else
            {
                logger.LogWarning(ex, "Migration attempt {Retry} failed, will retry...", retry + 1);
            }
        }
    }
    
    // Seedowanie danych - również z retry logic
    for (int retry = 0; retry < maxRetryCount; retry++)
    {
        try
        {
            if (retry > 0)
            {
                logger.LogInformation($"Retry seeding {retry}/{maxRetryCount} - waiting 2000ms...");
                Thread.Sleep(2000);
            }
            
            // Sprawdzenie czy tabele istnieją przed seedowaniem
            var canConnect = dbContext.Database.CanConnect();
            
            if (!canConnect)
            {
                logger.LogWarning("Cannot connect to database yet, waiting...");
                Thread.Sleep(3000);
                continue;
            }
            
            // Dodatkowa weryfikacja czy tabele AspNetUsers istnieją
            try 
            {
                var tableCheck = dbContext.Database.ExecuteSqlRaw(
                    "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'AspNetUsers'");
            }
            catch
            {
                logger.LogWarning("AspNetUsers table not ready yet, waiting...");
                Thread.Sleep(3000);
                continue;
            }
            
            // Utworzenie podstawowych ról i testowego użytkownika
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            var roleNames = new[] { "Admin", "User", "CompanyOwner" };

            foreach (var roleName in roleNames)
            {
                if (!roleManager.RoleExistsAsync(roleName).GetAwaiter().GetResult())
                {
                    logger.LogInformation("Creating role {RoleName}...", roleName);
                    var roleResult = roleManager.CreateAsync(new IdentityRole(roleName)).GetAwaiter().GetResult();
                    if (!roleResult.Succeeded)
                    {
                        var roleErrors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                        logger.LogError("Failed to create role {RoleName}: {Errors}", roleName, roleErrors);
                    }
                }
            }

            var adminRoleName = "Admin";
            var userRoleName = "User";

            var testEmail = "test@example.com";
            var testUserName = "testadmin";
            
            logger.LogInformation("Checking for test user...");
            var testUser = userManager.FindByEmailAsync(testEmail).GetAwaiter().GetResult();
            
            if (testUser == null)
            {
                logger.LogInformation("Creating test user...");
                testUser = new ApplicationUser
                {
                    UserName = testUserName,
                    Email = testEmail,
                    EmailConfirmed = true,
                    FirstName = "Test",
                    LastName = "User",
                    // Domyślny numer telefonu testowego administratora
                    PhoneNumber = "+420111222333"
                };
                
                var result = userManager.CreateAsync(testUser, "Test123!").GetAwaiter().GetResult();
                
                if (result.Succeeded)
                {
                    Console.WriteLine($"Utworzono testowego użytkownika: {testEmail} / Test123!");
                    logger.LogInformation("Test user created successfully");

                    // Upewnij się, że testowy użytkownik ma rolę Admin
                    var isInAdminRole = userManager.IsInRoleAsync(testUser, adminRoleName).GetAwaiter().GetResult();
                    if (!isInAdminRole)
                    {
                        var addToRoleResult = userManager.AddToRoleAsync(testUser, adminRoleName).GetAwaiter().GetResult();
                        if (addToRoleResult.Succeeded)
                        {
                            logger.LogInformation("Test user added to Admin role");
                        }
                        else
                        {
                            var addRoleErrors = string.Join(", ", addToRoleResult.Errors.Select(e => e.Description));
                            logger.LogError("Failed to add test user to Admin role: {Errors}", addRoleErrors);
                        }
                    }

                    // Upewnij się, że testowy użytkownik ma również rolę User
                    var isInUserRole = userManager.IsInRoleAsync(testUser, userRoleName).GetAwaiter().GetResult();
                    if (!isInUserRole)
                    {
                        var addToUserRoleResult = userManager.AddToRoleAsync(testUser, userRoleName).GetAwaiter().GetResult();
                        if (addToUserRoleResult.Succeeded)
                        {
                            logger.LogInformation("Test user added to User role");
                        }
                        else
                        {
                            var addUserRoleErrors = string.Join(", ", addToUserRoleResult.Errors.Select(e => e.Description));
                            logger.LogError("Failed to add test user to User role: {Errors}", addUserRoleErrors);
                        }
                    }
                }
                else
                {
                    var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    logger.LogError("Failed to create test user: {Errors}", errors);
                    Console.WriteLine($"Błąd tworzenia użytkownika testowego: {errors}");
                }
            }
            else
            {
                Console.WriteLine($"Użytkownik testowy już istnieje: {testEmail}");
                logger.LogInformation("Test user already exists");

                // Upewnij się, że istniejący testowy użytkownik ma rolę Admin
                var isInAdminRole = userManager.IsInRoleAsync(testUser, adminRoleName).GetAwaiter().GetResult();
                if (!isInAdminRole)
                {
                    var addToRoleResult = userManager.AddToRoleAsync(testUser, adminRoleName).GetAwaiter().GetResult();
                    if (addToRoleResult.Succeeded)
                    {
                        logger.LogInformation("Existing test user added to Admin role");
                    }
                    else
                    {
                        var addRoleErrors = string.Join(", ", addToRoleResult.Errors.Select(e => e.Description));
                        logger.LogError("Failed to add existing test user to Admin role: {Errors}", addRoleErrors);
                    }
                }

                // Upewnij się, że istniejący testowy użytkownik ma również rolę User
                var isInUserRole = userManager.IsInRoleAsync(testUser, userRoleName).GetAwaiter().GetResult();
                if (!isInUserRole)
                {
                    var addToUserRoleResult = userManager.AddToRoleAsync(testUser, userRoleName).GetAwaiter().GetResult();
                    if (addToUserRoleResult.Succeeded)
                    {
                        logger.LogInformation("Existing test user added to User role");
                    }
                    else
                    {
                        var addUserRoleErrors = string.Join(", ", addToUserRoleResult.Errors.Select(e => e.Description));
                        logger.LogError("Failed to add existing test user to User role: {Errors}", addUserRoleErrors);
                    }
                }

                // Dla istniejących baz, w których testowy użytkownik miał kiedyś przypisane CompanyId
                // lub nie miał jeszcze ustawionego numeru telefonu, wykonaj jedną aktualizację.
                var shouldUpdateTestUser = false;

                if (string.IsNullOrWhiteSpace(testUser.UserName) || testUser.UserName.Contains('@'))
                {
                    var existingUserNameUser = userManager.FindByNameAsync(testUserName).GetAwaiter().GetResult();
                    if (existingUserNameUser == null || existingUserNameUser.Id == testUser.Id)
                    {
                        testUser.UserName = testUserName;
                        shouldUpdateTestUser = true;
                    }
                }

                if (testUser.CompanyId != null)
                {
                    testUser.CompanyId = null;
                    shouldUpdateTestUser = true;
                }

                const string testPhone = "+420111222333";

                if (string.IsNullOrEmpty(testUser.PhoneNumber))
                {
                    testUser.PhoneNumber = testPhone;
                    shouldUpdateTestUser = true;
                }

                if (shouldUpdateTestUser)
                {
                    var updateResult = userManager.UpdateAsync(testUser).GetAwaiter().GetResult();
                    if (updateResult.Succeeded)
                    {
                        logger.LogInformation("Updated existing test user (cleared CompanyId and/or set phone).");
                    }
                    else
                    {
                        var updateErrors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
                        logger.LogWarning("Failed to update existing test user: {Errors}", updateErrors);
                    }
                }
            }
            
            break; // Sukces - wychodzimy z pętli
        }
        catch (Exception ex)
        {
            if (retry == maxRetryCount - 1)
            {
                logger.LogError(ex, "Failed to seed test data after {RetryCount} attempts", maxRetryCount);
                // Nie rzucamy wyjątku - aplikacja może działać bez testowego użytkownika
            }
            else
            {
                logger.LogWarning(ex, "Seeding attempt {Retry} failed, will retry...", retry + 1);
            }
        }
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

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// 3. Włączenie Identity API Endpoints 
app.MapIdentityApi<ApplicationUser>();

app.MapControllers();

// Endpoint healthcheck
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "IdentityService" }))
   .WithName("HealthCheck");

app.Run();
