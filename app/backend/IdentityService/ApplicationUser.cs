using Microsoft.AspNetCore.Identity;

namespace IdentityService.Data
{
    // Rozszerzasz standardowy IdentityUser o pola, które trzymasz w swojej tabeli 'users'
    public class ApplicationUser : IdentityUser
    {
        // Te pola zostaną dodane do tabeli AspNetUsers
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Phone { get; set; } // Note: Email and PasswordHash are already in IdentityUser
        
        // Klucz obcy do tabeli 'company' (jeśli chcesz go przechowywać w Identity Service)
        // Jeśli firma jest zarządzana w innym serwisie, to wystarczy tu ID (int lub GUID)
        public int CompanyId { get; set; } 
    }
}