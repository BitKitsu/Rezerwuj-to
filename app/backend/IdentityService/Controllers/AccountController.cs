using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using IdentityService.Data;
using IdentityService.Services;
using Microsoft.AspNetCore.Authorization; // Dodaj ten using dla [Authorize]

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

        public AccountController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtService jwtService,
            IAuditService auditService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
            _auditService = auditService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                Phone = model.Phone ?? string.Empty,
                EmailConfirmed = true
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await _signInManager.SignInAsync(user, isPersistent: false);

                return Ok(new
                {
                    message = "Rejestracja zakończona sukcesem",
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName
                });
            }

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
            var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, false, false);

            if (result.Succeeded)
            {
                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user != null)
                {
                    // Generuj JWT tokeny (teraz token zawiera CompanyId)
                    var tokens = await _jwtService.GenerateTokensAsync(user);

                    await _auditService.LogLoginAsync(user.Id, HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
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
                        lastName = user.LastName
                    });
                }
            }

            return Unauthorized(new { message = "Nieprawidłowy email lub hasło" });
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

        [HttpPut("{userId}/company")]
        [Authorize]
        public async Task<IActionResult> UpdateCompanyId(string userId, [FromBody] CompanyUpdateDto model)
        {
            // 1. Zabezpieczenie (bez zmian)
            var userIdFromToken = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userIdFromToken == null || userIdFromToken != userId)
            {
                return StatusCode(403, new { message = "Nie masz uprawnień do edycji tego konta." });
            }

            // 2. Znajdź użytkownika (UWAGA: Użyjemy FindByIdAsync - to wystarczy)
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Nie znaleziono użytkownika." });
            }

            // 3. Sprawdź, czy ID już jest takie samo
            if (user.CompanyId == model.CompanyId)
            {
                return Ok(new { message = "Company ID już jest aktualne." });
            }

            // 4. Aktualizuj companyId
            user.CompanyId = model.CompanyId;

            // 5. Zapisz zmiany
            var result = await _userManager.UpdateAsync(user);

            if (result.Succeeded)
            {
                return Ok(new { message = "Company ID zaktualizowane pomyślnie." });
            }

            // 6. ZWRACANIE SZCZEGÓŁOWYCH BŁĘDÓW W PRZYPADKU NIEPOWODZENIA ZAPISU
            var errors = result.Errors.Select(e => new
            {
                code = e.Code,
                description = TranslateError(e.Description)
            }).ToList();

            return BadRequest(new
            {
                message = "Nie udało się zaktualizować Company ID w bazie.",
                errors = errors
            });
        }

        private string TranslateError(string error)
        {
            var translations = new Dictionary<string, string>
            {
                ["Passwords must have at least one digit ('0'-'9')."] = "Hasło musi zawierać przynajmniej jedną cyfrę (0-9)",
                ["Passwords must be at least 6 characters."] = "Hasło musi mieć minimum 6 znaków",
                ["User name is already taken."] = "Ten email jest już zarejestrowany",
                ["Email is already taken."] = "Ten email jest już zarejestrowany",
                ["Invalid email."] = "Nieprawidłowy adres email"
            };

            foreach (var translation in translations)
            {
                if (error.Contains(translation.Key))
                    return translation.Value;
            }

            return error;
        }
    }

    public class RegisterDto
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public string? Phone { get; set; }
    }

    public class LoginDto
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
    }

    public class CompanyUpdateDto
    {
        public required int CompanyId { get; set; }
    }
}