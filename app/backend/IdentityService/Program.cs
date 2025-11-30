using IdentityService.Data;
using IdentityService.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ========================================
// DATABASE
// ========================================
var connectionString = builder.Configuration.GetConnectionString("IdentityConnection")
    ?? throw new InvalidOperationException("Connection string 'IdentityConnection' not found.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// ========================================
// IDENTITY
// ========================================
builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.Password.RequiredUniqueChars = 1;

    options.User.RequireUniqueEmail = true;
});

// ========================================
// JWT
// ========================================
var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSection["SecretKey"]
    ?? throw new InvalidOperationException("JWT secret key missing!");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

// ========================================
// SERVICES
// ========================================
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddHttpContextAccessor();

// ========================================
// MVC / SWAGGER / CORS
// ========================================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000", "http://localhost:5173")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

// ========================================
// MIGRACJE + USER SEED
// ========================================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    logger.LogInformation("Applying migrations...");
    db.Database.Migrate();

    logger.LogInformation("Checking for test user...");

    var testEmail = "test@example.com";
    var testUser = await userManager.FindByEmailAsync(testEmail);

    if (testUser == null)
    {
        testUser = new ApplicationUser
        {
            Email = testEmail,
            UserName = testEmail,
            EmailConfirmed = true,
            FirstName = "Test",
            LastName = "User",
            CompanyId = 1
        };

        var result = await userManager.CreateAsync(testUser, "Test123!");
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                logger.LogError($"Seed user error: {error.Description}");
        }
        else
        {
            logger.LogInformation($"Created test user: {testEmail} / Test123!");
        }
    }
}

// ========================================
// PIPELINE
// ========================================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Identity endpoints
app.MapIdentityApi<ApplicationUser>();

// Controllers
app.MapControllers();

// Healthcheck
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "IdentityService" }));

app.Run();
