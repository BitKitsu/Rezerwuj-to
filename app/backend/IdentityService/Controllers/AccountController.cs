using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using IdentityService.Data;
using IdentityService.Models;
using IdentityService.Services;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace IdentityService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IJwtService _jwtService;
        private readonly IAuditService _auditService;
        private readonly ApplicationDbContext _context;

        private string GetClientIpAddress()
        {
            var xForwardedFor = HttpContext?.Request?.Headers["X-Forwarded-For"].ToString();
            if (!string.IsNullOrWhiteSpace(xForwardedFor))
            {
                return xForwardedFor.Split(',')[0].Trim();
            }

            return HttpContext?.Connection?.RemoteIpAddress?.ToString() ?? "Unknown";
        }

        public AccountController(
            UserManager<ApplicationUser> userManager, 
            SignInManager<ApplicationUser> signInManager,
            IJwtService jwtService,
            IAuditService auditService,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _auditService = auditService;
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Normalizacja i sprawdzenie unikalności numeru telefonu
            var normalizedPhone = SanitizePhoneNumber(model.Phone);
            if (!string.IsNullOrEmpty(normalizedPhone))
            {
                var existingUser = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == normalizedPhone);
                if (existingUser != null)
                {
                    var error = new { code = "DuplicatePhoneNumber", description = "Ten numer telefonu jest już przypisany do innego konta." };
                    return BadRequest(new { errors = new[] { error } });
                }
            }

            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                // Zapisujemy znormalizowany numer zarówno w Phone, jak i PhoneNumber (Identity)
                PhoneNumber = normalizedPhone,
                EmailConfirmed = true // Auto-confirm dla developmentu
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, "User");

                // Automatyczne logowanie po rejestracji
                await _signInManager.SignInAsync(user, isPersistent: false);
                
                return Ok(new 
                { 
                    message = "Rejestracja zakończona sukcesem",
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName
                });
            }

            // Zwróć błędy w czytelnej formie
            var errors = result.Errors.Select(e => new 
            { 
                code = e.Code, 
                description = TranslateError(e.Description) 
            });
            
            return BadRequest(new { errors = errors });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // Find user by username or email
            var user = await _userManager.FindByNameAsync(model.LoginIdentifier) 
                       ?? await _userManager.FindByEmailAsync(model.LoginIdentifier);

            if (user != null)
            {
                var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);
                if (result.Succeeded)
                {
                    // Generuj JWT tokeny
                    var tokens = await _jwtService.GenerateTokensAsync(user);
                    
                    // Zapisz w audit log
                    await _auditService.LogLoginAsync(user.Id, GetClientIpAddress(), 
                                                       HttpContext.Request.Headers["User-Agent"].ToString());
                    
                    return Ok(new 
                    { 
                        message = "Zalogowano pomyślnie",
                        accessToken = tokens.AccessToken,
                        refreshToken = tokens.RefreshToken,
                        expiresIn = tokens.ExpiresIn,
                        tokenType = tokens.TokenType,
                        userId = user.Id,
                        email = user.Email,
                        firstName = user.FirstName,
                        lastName = user.LastName,
                        roles = tokens.Roles,
                        companyId = user.CompanyId,
                        companyRole = tokens.CompanyRole
                    });
                }
            }

            return Unauthorized(new { message = "Nieprawidłowy login lub hasło" });
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "Nie można zidentyfikować użytkownika." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            var dto = new UserProfileDto
            {
                Username = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Phone = user.PhoneNumber ?? string.Empty
            };

            return Ok(dto);
        }

        private static IEnumerable<object> GetModelErrors(Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary modelState)
        {
            return modelState
                .Where(kvp => kvp.Value != null && kvp.Value.Errors.Count > 0)
                .SelectMany(kvp => kvp.Value!.Errors.Select(e => new
                {
                    code = "ValidationError",
                    description = string.IsNullOrWhiteSpace(kvp.Key) ? e.ErrorMessage : $"{kvp.Key}: {e.ErrorMessage}"
                }));
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { errors = GetModelErrors(ModelState) });
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "Nie można zidentyfikować użytkownika." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            if (string.IsNullOrWhiteSpace(model.FirstName) || string.IsNullOrWhiteSpace(model.LastName))
            {
                var error = new { code = "InvalidName", description = "Imię i nazwisko są wymagane." };
                return BadRequest(new { errors = new[] { error } });
            }

            var trimmedFirstName = model.FirstName.Trim();
            var trimmedLastName = model.LastName.Trim();

            // Update username only if it's provided and different
            var trimmedUsername = model.Username?.Trim();
            if (!string.IsNullOrWhiteSpace(trimmedUsername) && !string.Equals(user.UserName, trimmedUsername, StringComparison.OrdinalIgnoreCase))
            {
                // Check if the new username is already taken
                var existingUser = await _userManager.FindByNameAsync(trimmedUsername);
                if (existingUser != null && existingUser.Id != user.Id)
                {
                    var error = new { code = "DuplicateUserName", description = $"Nazwa użytkownika '{trimmedUsername}' jest już zajęta." };
                    return BadRequest(new { errors = new[] { error } });
                }
                user.UserName = trimmedUsername;
            }

            // Normalizacja i aktualizacja numeru telefonu
            if (model.Phone != null)
            {
                var normalizedPhone = SanitizePhoneNumber(model.Phone);
                if (user.PhoneNumber != normalizedPhone)
                {
                    if (!string.IsNullOrEmpty(normalizedPhone))
                    {
                        var existingUser = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == normalizedPhone);
                        if (existingUser != null && existingUser.Id != user.Id)
                        {
                            var error = new { code = "DuplicatePhoneNumber", description = "Ten numer telefonu jest już przypisany do innego konta." };
                            return BadRequest(new { errors = new[] { error } });
                        }
                    }

                    user.PhoneNumber = normalizedPhone;
                }
            }

            user.FirstName = trimmedFirstName;
            user.LastName = trimmedLastName;

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => new
                {
                    code = e.Code,
                    description = TranslateError(e.Description)
                });

                return BadRequest(new { errors });
            }

            var dto = new UserProfileDto
            {
                Username = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Phone = user.PhoneNumber ?? string.Empty
            };

            return Ok(dto);
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "Nie można zidentyfikować użytkownika." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);

            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => new
                {
                    code = e.Code,
                    description = TranslateError(e.Description)
                });

                return BadRequest(new { errors });
            }

            await _auditService.LogAsync(
                AuditActions.Update,
                "Password",
                user.Id,
                null,
                null);

            return Ok(new { message = "Hasło zostało pomyślnie zmienione." });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await _auditService.LogLogoutAsync(userId);
            }
            
            return Ok(new { message = "Wylogowano pomyślnie" });
        }

        [HttpDelete("delete")]
        [Authorize]
        public async Task<IActionResult> DeleteOwnAccount()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "Nie można zidentyfikować użytkownika." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            // Administrator nie może samodzielnie usunąć swojego konta
            if (await _userManager.IsInRoleAsync(user, "Admin"))
            {
                return BadRequest(new { message = "Konto administratora nie może zostać usunięte przez samego administratora. Skontaktuj się z innym administratorem." });
            }

            await _jwtService.RevokeAllUserTokensAsync(user.Id);

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => new
                {
                    code = e.Code,
                    description = TranslateError(e.Description)
                });

                return BadRequest(new { errors });
            }

            return Ok(new { message = "Konto zostało usunięte." });
        }

        [HttpPost("assign-company")]
        [Authorize]
        public async Task<IActionResult> AssignCompanyToUser([FromBody] AssignCompanyRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "Nie można zidentyfikować użytkownika." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            if (user.CompanyId.HasValue)
            {
                return BadRequest(new { message = "Użytkownik ma już przypisaną firmę." });
            }

            user.CompanyId = request.CompanyId;
            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return BadRequest(new { message = "Nie udało się przypisać firmy do użytkownika." });
            }

            if (!await _userManager.IsInRoleAsync(user, "CompanyOwner"))
            {
                var roleResult = await _userManager.AddToRoleAsync(user, "CompanyOwner");
                if (!roleResult.Succeeded)
                {
                    return BadRequest(new { message = "Nie udało się nadać roli firmowej." });
                }
            }

            if (await _userManager.IsInRoleAsync(user, "CompanyManager"))
            {
                await _userManager.RemoveFromRoleAsync(user, "CompanyManager");
            }

            var existingCompanyRole = await _context.UserCompanyRoles
                .FirstOrDefaultAsync(r => r.UserId == user.Id && r.CompanyId == request.CompanyId);

            if (existingCompanyRole == null)
            {
                _context.UserCompanyRoles.Add(new UserCompanyRole
                {
                    UserId = user.Id,
                    CompanyId = request.CompanyId,
                    Role = CompanyRoles.Owner,
                    IsActive = true
                });
            }
            else
            {
                existingCompanyRole.Role = CompanyRoles.Owner;
                existingCompanyRole.IsActive = true;
            }

            await _context.SaveChangesAsync();

            var tokens = await _jwtService.GenerateTokensAsync(user);

            return Ok(new
            {
                message = "Firma została pomyślnie przypisana do konta.",
                accessToken = tokens.AccessToken,
                refreshToken = tokens.RefreshToken,
                expiresIn = tokens.ExpiresIn,
                tokenType = tokens.TokenType,
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                roles = tokens.Roles,
                companyId = user.CompanyId,
                companyRole = tokens.CompanyRole
            });
        }

        [HttpPost("unassign-company")]
        [Authorize]
        public async Task<IActionResult> UnassignCompanyFromUser()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "Nie można zidentyfikować użytkownika." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Użytkownik nie został znaleziony." });
            }

            if (!user.CompanyId.HasValue)
            {
                return Ok(new { message = "Użytkownik nie ma przypisanej żadnej firmy." });
            }

            var companyId = user.CompanyId.Value;
            user.CompanyId = null;
            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return BadRequest(new { message = "Nie udało się odpiąć firmy od użytkownika." });
            }

            if (await _userManager.IsInRoleAsync(user, "CompanyOwner"))
            {
                await _userManager.RemoveFromRoleAsync(user, "CompanyOwner");
            }

            if (await _userManager.IsInRoleAsync(user, "CompanyManager"))
            {
                await _userManager.RemoveFromRoleAsync(user, "CompanyManager");
            }

            var activeCompanyRoles = await _context.UserCompanyRoles
                .Where(r => r.UserId == user.Id && r.CompanyId == companyId && r.IsActive)
                .ToListAsync();

            if (activeCompanyRoles.Count > 0)
            {
                foreach (var role in activeCompanyRoles)
                {
                    role.IsActive = false;
                }

                await _context.SaveChangesAsync();
            }

            var tokens = await _jwtService.GenerateTokensAsync(user);

            return Ok(new
            {
                message = "Firma została pomyślnie odpięta od konta.",
                accessToken = tokens.AccessToken,
                refreshToken = tokens.RefreshToken,
                expiresIn = tokens.ExpiresIn,
                tokenType = tokens.TokenType,
                userId = user.Id,
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                roles = tokens.Roles,
                companyId = user.CompanyId,
                companyRole = tokens.CompanyRole
            });
        }

        private string? SanitizePhoneNumber(string? phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return null;

            // Usuwa wszystko oprócz cyfr i znaku '+'
            var sanitized = new string(phoneNumber.Where(c => char.IsDigit(c) || c == '+').ToArray());

            // Zwraca null jeśli po czyszczeniu numer jest pusty
            return string.IsNullOrEmpty(sanitized) ? null : sanitized;
        }

        // Metoda do tłumaczenia błędów Identity
        private string TranslateError(string error)
        {
            // Handle duplicate username/email errors without exposing the value
            if (error.Contains("is already taken"))
            {
                if (error.StartsWith("User name") || error.StartsWith("Username")) // "User name" for older Identity versions
                {
                    return "Ta nazwa użytkownika jest już zajęta.";
                }
                if (error.StartsWith("Email"))
                {
                    return "Ten adres e-mail jest już zarejestrowany.";
                }
            }

            var translations = new Dictionary<string, string>
            {
                ["Passwords must have at least one digit ('0'-'9')."] = "Hasło musi zawierać przynajmniej jedną cyfrę (0-9)",
                ["Passwords must be at least 6 characters."] = "Hasło musi mieć minimum 6 znaków",
                ["Invalid email."] = "Nieprawidłowy adres email",
                ["Incorrect password."] = "Nieprawidłowe obecne hasło"
            };

            foreach (var translation in translations)
            {
                if (error.Contains(translation.Key))
                    return translation.Value;
            }

            return error; // Fallback to original error if no translation is found
        }
    }

    public class RegisterDto
    {
        [Required]
        [EmailAddress]
        [StringLength(100)]
        public required string Email { get; set; }

        [Required(ErrorMessage = "Nazwa użytkownika jest wymagana.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Nazwa użytkownika musi mieć od 3 do 50 znaków.")]
        [RegularExpression(@"^[a-zA-Z0-9_.-]+$", ErrorMessage = "Nazwa użytkownika może zawierać tylko litery, cyfry, kropki, myślniki i podkreślniki.")]
        public required string Username { get; set; }

        [Required]
        public required string Password { get; set; }

        [Required]
        public required string FirstName { get; set; }

        [Required]
        public required string LastName { get; set; }

        [Required(ErrorMessage = "Numer telefonu jest wymagany.")]
        [RegularExpression(@"^\+\d{1,3}(\s?\d{3}){3}$", ErrorMessage = "Telefon musi być w formacie +48 111 222 333.")]
        public required string Phone { get; set; }
    }

    public class LoginDto
    {
        [Required]
        public required string LoginIdentifier { get; set; }

        [Required]
        public required string Password { get; set; }
    }

    public class UserProfileDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }

    public class UpdateProfileDto
    {
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Nazwa użytkownika musi mieć od 3 do 50 znaków.")]
        [RegularExpression(@"^[a-zA-Z0-9_.-]+$", ErrorMessage = "Nazwa użytkownika może zawierać tylko litery, cyfry, kropki, myślniki i podkreślniki.")]
        public string? Username { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;

        [RegularExpression(@"^$|^\+\d{1,3}(\s?\d{3}){3}$", ErrorMessage = "Telefon musi być w formacie +48 666 777 999.")]
        public string? Phone { get; set; }
    }

    public class ChangePasswordDto
    {
        public required string CurrentPassword { get; set; }
        public required string NewPassword { get; set; }
    }

    public class AssignCompanyRequest
    {
        public int CompanyId { get; set; }
    }
}
