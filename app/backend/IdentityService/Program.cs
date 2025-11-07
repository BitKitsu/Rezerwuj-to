using IdentityService.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Pobranie Connection Stringu (z appsettings.json LUB zmiennej środowiskowej Docker!)
var connectionString = builder.Configuration.GetConnectionString("IdentityConnection") 
                       ?? throw new InvalidOperationException("Connection string 'IdentityConnection' not found.");

// 1. Rejestracja DbContext z dostawcą Npgsql
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Dodanie ASP.NET Core Identity
builder.Services.AddIdentityApiEndpoints<IdentityUser>() // Użyj API Endpoints dla nowoczesnego mikroserwisu
    .AddEntityFrameworkStores<ApplicationDbContext>();

// Dodatkowe usługi (np. uwierzytelnianie tokenem Bearer dla komunikacji między serwisami)
builder.Services.AddControllers();
builder.Services.AddAuthorization(); 
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Konfiguracja HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// 3. Włączenie Identity API Endpoints 
app.MapIdentityApi<IdentityUser>();

app.UseAuthorization();

app.MapControllers();

app.Run();