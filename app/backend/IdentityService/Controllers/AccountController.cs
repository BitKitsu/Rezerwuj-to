using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using IdentityService.Data;

namespace IdentityService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public AccountController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
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
}
