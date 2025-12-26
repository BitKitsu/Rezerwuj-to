using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using IdentityService.Data;
using IdentityService.Services;

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
                EmailConfirmed = true // Auto-confirm dla developmentu
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
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
            var result = await _signInManager.PasswordSignInAsync(model.Email, model.Password, false, false);

            if (result.Succeeded)
            {
                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user != null)
                {
                    // Generuj JWT tokeny
                    var tokens = await _jwtService.GenerateTokensAsync(user);
                    
                    // Zapisz w audit log
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
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Phone = user.Phone ?? string.Empty
            };

            return Ok(dto);
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto model)
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

            user.FirstName = model.FirstName;
            user.LastName = model.LastName;
            user.Phone = model.Phone ?? string.Empty;

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
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Phone = user.Phone ?? string.Empty
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

        private string TranslateError(string error)
        {
            var translations = new Dictionary<string, string>
            {
                ["Passwords must have at least one digit ('0'-'9')."] = "Hasło musi zawierać przynajmniej jedną cyfrę (0-9)",
                ["Passwords must be at least 6 characters."] = "Hasło musi mieć minimum 6 znaków",
                ["User name is already taken."] = "Ten email jest już zarejestrowany",
                ["Email is already taken."] = "Ten email jest już zarejestrowany",
                ["Invalid email."] = "Nieprawidłowy adres email",
                ["Incorrect password."] = "Nieprawidłowe obecne hasło"
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

    public class UserProfileDto
    {
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }

    public class UpdateProfileDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Phone { get; set; }
    }

    public class ChangePasswordDto
    {
        public required string CurrentPassword { get; set; }
        public required string NewPassword { get; set; }
    }
}
