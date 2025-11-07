using Microsoft.AspNetCore.Identity;

namespace IdentityService.Data
{
    // Rozszerzasz standardowy IdentityUser o pola, które trzymasz w swojej tabeli 'users'
    public class ApplicationUser : IdentityUser
    {
        // Te pola zostaną dodane do tabeli AspNetUsers
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        
        // Klucz obcy do tabeli 'company' (opcjonalny przy rejestracji)
        public int? CompanyId { get; set; } 
    }
}