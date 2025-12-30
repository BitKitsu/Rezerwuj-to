using Microsoft.EntityFrameworkCore;
using ReservationService.Models;

namespace ReservationService.Data;

public class ReservationDbContext : DbContext
{
    public ReservationDbContext(DbContextOptions<ReservationDbContext> options)
        : base(options) { }

    public DbSet<Company> Companies { get; set; }
    public DbSet<Branch> Branches { get; set; }
    public DbSet<Service> Services { get; set; }
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<BranchReview> BranchReviews { get; set; }
    public DbSet<Schedule> Schedules { get; set; }
    public DbSet<TimeSlot> TimeSlots { get; set; }
    public DbSet<EventStore> EventStores { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Branch>()
            .HasOne(b => b.Company)
            .WithMany()
            .HasForeignKey(b => b.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Branch>()
            .HasIndex(b => new { b.CompanyId, b.BranchName })
            .IsUnique();

        // Konfiguracja relacji Company -> Services
        modelBuilder.Entity<Service>()
            .HasOne(s => s.Company)
            .WithMany(c => c.Services)
            .HasForeignKey(s => s.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Service>()
            .HasOne(s => s.Branch)
            .WithMany()
            .HasForeignKey(s => s.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Konfiguracja relacji Company -> Appointments
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Company)
            .WithMany(c => c.Appointments)
            .HasForeignKey(a => a.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Branch)
            .WithMany()
            .HasForeignKey(a => a.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Konfiguracja relacji Service -> Appointments
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Service)
            .WithMany(s => s.Appointments)
            .HasForeignKey(a => a.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BranchReview>()
            .HasOne(r => r.Company)
            .WithMany()
            .HasForeignKey(r => r.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BranchReview>()
            .HasOne(r => r.Branch)
            .WithMany()
            .HasForeignKey(r => r.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BranchReview>()
            .HasOne(r => r.Appointment)
            .WithMany()
            .HasForeignKey(r => r.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BranchReview>()
            .HasIndex(r => r.AppointmentId)
            .IsUnique();

        modelBuilder.Entity<BranchReview>()
            .HasIndex(r => new { r.CompanyId, r.BranchId, r.CreatedAt });
            
        // Konfiguracja Schedule
        modelBuilder.Entity<Schedule>()
            .HasOne(s => s.Company)
            .WithMany()
            .HasForeignKey(s => s.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Schedule>()
            .HasOne(s => s.Branch)
            .WithMany()
            .HasForeignKey(s => s.BranchId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<Schedule>()
            .HasOne(s => s.Service)
            .WithMany()
            .HasForeignKey(s => s.ServiceId)
            .OnDelete(DeleteBehavior.Cascade);
            
        // Konfiguracja TimeSlot
        modelBuilder.Entity<TimeSlot>()
            .HasOne(ts => ts.Company)
            .WithMany()
            .HasForeignKey(ts => ts.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimeSlot>()
            .HasOne(ts => ts.Branch)
            .WithMany()
            .HasForeignKey(ts => ts.BranchId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<TimeSlot>()
            .HasOne(ts => ts.Service)
            .WithMany()
            .HasForeignKey(ts => ts.ServiceId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<TimeSlot>()
            .HasOne(ts => ts.Appointment)
            .WithMany()
            .HasForeignKey(ts => ts.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);
            
        // Indeksy
        modelBuilder.Entity<Schedule>()
            .HasIndex(s => new { s.CompanyId, s.BranchId, s.ServiceId, s.DayOfWeek })
            .IsUnique();
            
        modelBuilder.Entity<TimeSlot>()
            .HasIndex(ts => new { ts.CompanyId, ts.BranchId, ts.SlotStart, ts.SlotEnd });
            
        // Konfiguracja EventStore
        modelBuilder.Entity<EventStore>()
            .HasIndex(es => es.EventId)
            .IsUnique();
            
        modelBuilder.Entity<EventStore>()
            .HasIndex(es => es.AggregateId);
            
        modelBuilder.Entity<EventStore>()
            .HasIndex(es => es.OccurredAt);

        // Seed data dla testów / demo – przykładowe firmy i usługi
        modelBuilder.Entity<Company>().HasData(
            new Company
            {
                Id = 1,
                CompanyName = "Artistic Studio",
                Email = "kontakt@artisticstudio.pl",
                Phone = "+48123456789",
                StreetName = "ul. Główna 15",
                City = "Warszawa",
                PostalCode = "00-001",
                Country = "Polska",
                Description = "Nowoczesny salon fryzjerski z wieloletnim doświadczeniem",
                Website = "https://artisticstudio.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 2,
                CompanyName = "Barber Craft",
                Email = "kontakt@barbercraft.pl",
                Phone = "+48222333444",
                StreetName = "ul. Męska 10",
                City = "Warszawa",
                PostalCode = "00-120",
                Country = "Polska",
                Description = "Męski barber shop z tradycyjnym podejściem do stylizacji",
                Website = "https://barbercraft.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 3,
                CompanyName = "Beauty Glamour",
                Email = "kontakt@beautyglamour.pl",
                Phone = "+48333444555",
                StreetName = "ul. Piękna 5",
                City = "Kraków",
                PostalCode = "30-001",
                Country = "Polska",
                Description = "Profesjonalne studio urody i kosmetyki",
                Website = "https://beautyglamour.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 4,
                CompanyName = "Wellness Spa",
                Email = "info@wellnessspa.pl",
                Phone = "+48444555666",
                StreetName = "ul. Leśna 8",
                City = "Kraków",
                PostalCode = "30-045",
                Country = "Polska",
                Description = "Centrum SPA i masażu relaksacyjnego",
                Website = "https://wellnessspa.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 5,
                CompanyName = "Nails Studio",
                Email = "kontakt@nailsstudio.pl",
                Phone = "+48555666777",
                StreetName = "ul. Dłonie 2",
                City = "Wrocław",
                PostalCode = "50-001",
                Country = "Polska",
                Description = "Profesjonalny salon paznokci i stylizacji dłoni",
                Website = "https://nailsstudio.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 6,
                CompanyName = "Massage Center",
                Email = "kontakt@massagecenter.pl",
                Phone = "+48666777888",
                StreetName = "ul. Relaksu 21",
                City = "Poznań",
                PostalCode = "60-001",
                Country = "Polska",
                Description = "Masaże relaksacyjne i zabiegi lecznicze",
                Website = "https://massagecenter.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 7,
                CompanyName = "Coffee Barber",
                Email = "kontakt@coffeebarber.pl",
                Phone = "+48777888999",
                StreetName = "ul. Kawowa 7",
                City = "Wrocław",
                PostalCode = "50-120",
                Country = "Polska",
                Description = "Barber shop z kawiarnią w stylu industrialnym",
                Website = "https://coffeebarber.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 8,
                CompanyName = "Prestige Clinic",
                Email = "rejestracja@prestigeclinic.pl",
                Phone = "+48888999000",
                StreetName = "ul. Luksusowa 1",
                City = "Gdańsk",
                PostalCode = "80-001",
                Country = "Polska",
                Description = "Zaawansowane zabiegi kosmetologiczne i medycyny estetycznej",
                Website = "https://prestigeclinic.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 9,
                CompanyName = "City Hair Studio",
                Email = "kontakt@cityhairstudio.pl",
                Phone = "+48999000111",
                StreetName = "ul. Miejska 11",
                City = "Łódź",
                PostalCode = "90-001",
                Country = "Polska",
                Description = "Nowoczesny salon fryzjerski w centrum miasta",
                Website = "https://cityhairstudio.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 11,
                CompanyName = "Podkarpackie Barber Shop",
                Email = "kontakt@podkarpackiebarber.pl",
                Phone = "+48171234567",
                StreetName = "ul. Rzeszowska 14",
                City = "Rzeszów",
                PostalCode = "35-001",
                Country = "Polska",
                Description = "Tradycyjny barber shop z nowoczesnym podejściem",
                Website = "https://podkarpackiebarber.pl",
                RegistrationDate = DateTime.UtcNow
            },
            new Company
            {
                Id = 12,
                CompanyName = "Beauty Studio Rzeszów",
                Email = "info@beautystudiorzeszow.pl",
                Phone = "+48172345678",
                StreetName = "ul. Piłsudskiego 22",
                City = "Rzeszów",
                PostalCode = "35-010",
                Country = "Polska",
                Description = "Nowoczesne studio urody z pełną ofertą zabiegów",
                Website = "https://beautystudiorzeszow.pl",
                RegistrationDate = DateTime.UtcNow
            }
        );

        modelBuilder.Entity<Branch>().HasData(
            new Branch
            {
                Id = 1,
                CompanyId = 1,
                BranchName = "Oddział główny",
                StreetName = "ul. Główna 15",
                City = "Warszawa",
                PostalCode = "00-001",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 2,
                CompanyId = 2,
                BranchName = "Oddział główny",
                StreetName = "ul. Męska 10",
                City = "Warszawa",
                PostalCode = "00-120",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 3,
                CompanyId = 3,
                BranchName = "Oddział główny",
                StreetName = "ul. Piękna 5",
                City = "Kraków",
                PostalCode = "30-001",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 4,
                CompanyId = 4,
                BranchName = "Oddział główny",
                StreetName = "ul. Leśna 8",
                City = "Kraków",
                PostalCode = "30-045",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 5,
                CompanyId = 5,
                BranchName = "Oddział główny",
                StreetName = "ul. Dłonie 2",
                City = "Wrocław",
                PostalCode = "50-001",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 6,
                CompanyId = 6,
                BranchName = "Oddział główny",
                StreetName = "ul. Relaksu 21",
                City = "Poznań",
                PostalCode = "60-001",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 7,
                CompanyId = 7,
                BranchName = "Oddział główny",
                StreetName = "ul. Kawowa 7",
                City = "Wrocław",
                PostalCode = "50-120",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 8,
                CompanyId = 8,
                BranchName = "Oddział główny",
                StreetName = "ul. Luksusowa 1",
                City = "Gdańsk",
                PostalCode = "80-001",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 9,
                CompanyId = 9,
                BranchName = "Oddział główny",
                StreetName = "ul. Miejska 11",
                City = "Łódź",
                PostalCode = "90-001",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 11,
                CompanyId = 11,
                BranchName = "Oddział główny",
                StreetName = "ul. Rzeszowska 14",
                City = "Rzeszów",
                PostalCode = "35-001",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            },
            new Branch
            {
                Id = 12,
                CompanyId = 12,
                BranchName = "Oddział główny",
                StreetName = "ul. Piłsudskiego 22",
                City = "Rzeszów",
                PostalCode = "35-010",
                Country = "Polska",
                CreatedAt = DateTime.UtcNow
            }
        );

        modelBuilder.Entity<Service>().HasData(
            // Company 1 – Przykładowy Fryzjer
            new Service
            {
                Id = 1,
                CompanyId = 1,
                BranchId = 1,
                ServiceName = "Strzyżenie męskie",
                Description = "Klasyczne strzyżenie męskie",
                Price = 50,
                DurationMinutes = 30
            },
            new Service
            {
                Id = 2,
                CompanyId = 1,
                BranchId = 1,
                ServiceName = "Strzyżenie damskie",
                Description = "Strzyżenie i modelowanie",
                Price = 80,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 3,
                CompanyId = 1,
                BranchId = 1,
                ServiceName = "Modelowanie włosów",
                Description = "Stylizacja włosów na specjalne okazje",
                Price = 70,
                DurationMinutes = 45
            },
            new Service
            {
                Id = 4,
                CompanyId = 1,
                BranchId = 1,
                ServiceName = "Koloryzacja",
                Description = "Farbowanie włosów z konsultacją",
                Price = 200,
                DurationMinutes = 120
            },
            new Service
            {
                Id = 5,
                CompanyId = 1,
                BranchId = 1,
                ServiceName = "Regeneracja włosów",
                Description = "Zabieg odbudowujący strukturę włosa",
                Price = 150,
                DurationMinutes = 90
            },

            // Company 2 – Stylowy Barber
            new Service
            {
                Id = 6,
                CompanyId = 2,
                BranchId = 2,
                ServiceName = "Strzyżenie brody",
                Description = "Modelowanie i pielęgnacja brody",
                Price = 60,
                DurationMinutes = 30
            },
            new Service
            {
                Id = 7,
                CompanyId = 2,
                BranchId = 2,
                ServiceName = "Strzyżenie męskie premium",
                Description = "Strzyżenie z myciem i stylizacją",
                Price = 90,
                DurationMinutes = 45
            },
            new Service
            {
                Id = 8,
                CompanyId = 2,
                BranchId = 2,
                ServiceName = "Pakiet broda + włosy",
                Description = "Kompleksowa pielęgnacja brody i włosów",
                Price = 120,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 9,
                CompanyId = 2,
                BranchId = 2,
                ServiceName = "Golenie brzytwą",
                Description = "Tradycyjne golenie brzytwą",
                Price = 70,
                DurationMinutes = 40
            },
            new Service
            {
                Id = 10,
                CompanyId = 2,
                BranchId = 2,
                ServiceName = "Strzyżenie dla chłopców",
                Description = "Strzyżenie dziecięce",
                Price = 45,
                DurationMinutes = 30
            },

            // Company 3 – Studio Urody Glamour
            new Service
            {
                Id = 11,
                CompanyId = 3,
                BranchId = 3,
                ServiceName = "Manicure klasyczny",
                Description = "Manicure z malowaniem paznokci",
                Price = 80,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 12,
                CompanyId = 3,
                BranchId = 3,
                ServiceName = "Pedicure spa",
                Description = "Pedicure z masażem stóp",
                Price = 120,
                DurationMinutes = 75
            },
            new Service
            {
                Id = 13,
                CompanyId = 3,
                BranchId = 3,
                ServiceName = "Makijaż okolicznościowy",
                Description = "Makijaż na specjalne okazje",
                Price = 150,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 14,
                CompanyId = 3,
                BranchId = 3,
                ServiceName = "Zabieg na twarz",
                Description = "Indywidualnie dobrany zabieg pielęgnacyjny",
                Price = 200,
                DurationMinutes = 90
            },
            new Service
            {
                Id = 15,
                CompanyId = 3,
                BranchId = 3,
                ServiceName = "Henna brwi i rzęs",
                Description = "Podkreślenie oprawy oczu",
                Price = 60,
                DurationMinutes = 30
            },

            // Company 4 – Spa Relaks
            new Service
            {
                Id = 16,
                CompanyId = 4,
                BranchId = 4,
                ServiceName = "Masaż relaksacyjny",
                Description = "Całościowy masaż relaksacyjny",
                Price = 180,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 17,
                CompanyId = 4,
                BranchId = 4,
                ServiceName = "Masaż gorącymi kamieniami",
                Description = "Masaż z użyciem gorących kamieni",
                Price = 220,
                DurationMinutes = 75
            },
            new Service
            {
                Id = 18,
                CompanyId = 4,
                BranchId = 4,
                ServiceName = "Sauna + masaż",
                Description = "Pakiet sauna i masaż",
                Price = 250,
                DurationMinutes = 90
            },
            new Service
            {
                Id = 19,
                CompanyId = 4,
                BranchId = 4,
                ServiceName = "Rytuał spa dla dwojga",
                Description = "Pakiet spa dla dwóch osób",
                Price = 400,
                DurationMinutes = 120
            },
            new Service
            {
                Id = 20,
                CompanyId = 4,
                BranchId = 4,
                ServiceName = "Masaż pleców",
                Description = "Masaż pleców i karku",
                Price = 120,
                DurationMinutes = 45
            },

            // Company 5 – Perfect Nails
            new Service
            {
                Id = 21,
                CompanyId = 5,
                BranchId = 5,
                ServiceName = "Manicure hybrydowy",
                Description = "Manicure z lakierem hybrydowym",
                Price = 100,
                DurationMinutes = 75
            },
            new Service
            {
                Id = 22,
                CompanyId = 5,
                BranchId = 5,
                ServiceName = "Uzupełnianie żelu",
                Description = "Uzupełnianie paznokci żelowych",
                Price = 130,
                DurationMinutes = 90
            },
            new Service
            {
                Id = 23,
                CompanyId = 5,
                BranchId = 5,
                ServiceName = "Pedicure klasyczny",
                Description = "Podstawowa pielęgnacja stóp",
                Price = 90,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 24,
                CompanyId = 5,
                BranchId = 5,
                ServiceName = "Manicure japoński",
                Description = "Pielęgnacja paznokci japońską metodą",
                Price = 110,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 25,
                CompanyId = 5,
                BranchId = 5,
                ServiceName = "Zdobienie paznokci",
                Description = "Artystyczne zdobienia paznokci",
                Price = 60,
                DurationMinutes = 45
            },

            // Company 6 – Healthy Massage
            new Service
            {
                Id = 26,
                CompanyId = 6,
                BranchId = 6,
                ServiceName = "Masaż klasyczny",
                Description = "Masaż klasyczny całego ciała",
                Price = 160,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 27,
                CompanyId = 6,
                BranchId = 6,
                ServiceName = "Masaż sportowy",
                Description = "Intensywny masaż dla osób aktywnych",
                Price = 190,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 28,
                CompanyId = 6,
                BranchId = 6,
                ServiceName = "Masaż leczniczy kręgosłupa",
                Description = "Skoncentrowany masaż na odcinku lędźwiowym i szyjnym",
                Price = 210,
                DurationMinutes = 45
            },
            new Service
            {
                Id = 29,
                CompanyId = 6,
                BranchId = 6,
                ServiceName = "Drenaż limfatyczny",
                Description = "Zabieg wspierający układ limfatyczny",
                Price = 200,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 30,
                CompanyId = 6,
                BranchId = 6,
                ServiceName = "Masaż świecą",
                Description = "Relaksacyjny masaż z użyciem świecy",
                Price = 220,
                DurationMinutes = 75
            },

            // Company 7 – Barber & Coffee
            new Service
            {
                Id = 31,
                CompanyId = 7,
                BranchId = 7,
                ServiceName = "Strzyżenie z kawą",
                Description = "Strzyżenie męskie z dowolną kawą w cenie",
                Price = 85,
                DurationMinutes = 45
            },
            new Service
            {
                Id = 32,
                CompanyId = 7,
                BranchId = 7,
                ServiceName = "Stylizacja brody",
                Description = "Modelowanie brody z pielęgnacją",
                Price = 70,
                DurationMinutes = 35
            },
            new Service
            {
                Id = 33,
                CompanyId = 7,
                BranchId = 7,
                ServiceName = "Pakiet premium",
                Description = "Strzyżenie, broda oraz kawa speciality",
                Price = 140,
                DurationMinutes = 75
            },
            new Service
            {
                Id = 34,
                CompanyId = 7,
                BranchId = 7,
                ServiceName = "Strzyżenie ekspres",
                Description = "Szybkie strzyżenie dla zabieganych",
                Price = 60,
                DurationMinutes = 25
            },
            new Service
            {
                Id = 35,
                CompanyId = 7,
                BranchId = 7,
                ServiceName = "Pielęgnacja włosów",
                Description = "Mycie i odżywka do włosów",
                Price = 40,
                DurationMinutes = 20
            },

            // Company 8 – Klinika Urody Prestige
            new Service
            {
                Id = 36,
                CompanyId = 8,
                BranchId = 8,
                ServiceName = "Mezoterapia igłowa",
                Description = "Zabieg mezoterapii skóry twarzy",
                Price = 450,
                DurationMinutes = 90
            },
            new Service
            {
                Id = 37,
                CompanyId = 8,
                BranchId = 8,
                ServiceName = "Peeling chemiczny",
                Description = "Zabieg złuszczający dobrany do typu skóry",
                Price = 280,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 38,
                CompanyId = 8,
                BranchId = 8,
                ServiceName = "Zabieg anti-aging",
                Description = "Zaawansowany zabieg przeciwstarzeniowy",
                Price = 400,
                DurationMinutes = 75
            },
            new Service
            {
                Id = 39,
                CompanyId = 8,
                BranchId = 8,
                ServiceName = "Konsultacja kosmetologiczna",
                Description = "Analiza skóry i plan pielęgnacji",
                Price = 150,
                DurationMinutes = 45
            },
            new Service
            {
                Id = 40,
                CompanyId = 8,
                BranchId = 8,
                ServiceName = "Oczyszczanie wodorowe",
                Description = "Nowoczesne oczyszczanie skóry",
                Price = 320,
                DurationMinutes = 70
            },

            // Company 9 – Fryzjernia CityHair
            new Service
            {
                Id = 41,
                CompanyId = 9,
                BranchId = 9,
                ServiceName = "Strzyżenie miejskie",
                Description = "Nowoczesne cięcie dopasowane do stylu",
                Price = 75,
                DurationMinutes = 40
            },
            new Service
            {
                Id = 42,
                CompanyId = 9,
                BranchId = 9,
                ServiceName = "Balayage",
                Description = "Rozjaśnianie i koloryzacja techniką balayage",
                Price = 260,
                DurationMinutes = 150
            },
            new Service
            {
                Id = 43,
                CompanyId = 9,
                BranchId = 9,
                ServiceName = "Prostowanie keratynowe",
                Description = "Wygładzanie włosów keratyną",
                Price = 350,
                DurationMinutes = 180
            },
            new Service
            {
                Id = 44,
                CompanyId = 9,
                BranchId = 9,
                ServiceName = "Strzyżenie dziecięce",
                Description = "Strzyżenie dla dzieci",
                Price = 55,
                DurationMinutes = 30
            },
            new Service
            {
                Id = 45,
                CompanyId = 9,
                BranchId = 9,
                ServiceName = "Upięcie okolicznościowe",
                Description = "Fryzura na wesele lub imprezę",
                Price = 190,
                DurationMinutes = 90
            },

            // Company 11 – Podkarpackie Barber Shop
            new Service
            {
                Id = 51,
                CompanyId = 11,
                BranchId = 11,
                ServiceName = "Strzyżenie męskie klasyczne",
                Description = "Tradycyjne strzyżenie męskie z precyzją",
                Price = 55,
                DurationMinutes = 30
            },
            new Service
            {
                Id = 52,
                CompanyId = 11,
                BranchId = 11,
                ServiceName = "Strzyżenie brody",
                Description = "Modelowanie i stylizacja brody",
                Price = 65,
                DurationMinutes = 25
            },
            new Service
            {
                Id = 53,
                CompanyId = 11,
                BranchId = 11,
                ServiceName = "Golenie brzytwą tradycyjne",
                Description = "Klasyczne golenie z gorącym ręcznikiem",
                Price = 75,
                DurationMinutes = 40
            },
            new Service
            {
                Id = 54,
                CompanyId = 11,
                BranchId = 11,
                ServiceName = "Pakiet premium broda",
                Description = "Kompleksowa pielęgnacja brody",
                Price = 120,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 55,
                CompanyId = 11,
                BranchId = 11,
                ServiceName = "Strzyżenie młodzieżowe",
                Description = "Nowoczesne strzyżenie dla młodych mężczyzn",
                Price = 45,
                DurationMinutes = 25
            },

            // Company 12 – Beauty Studio Rzeszów
            new Service
            {
                Id = 56,
                CompanyId = 12,
                BranchId = 12,
                ServiceName = "Strzyżenie damskie",
                Description = "Profesjonalne strzyżenie z modelowaniem",
                Price = 85,
                DurationMinutes = 60
            },
            new Service
            {
                Id = 57,
                CompanyId = 12,
                BranchId = 12,
                ServiceName = "Koloryzacja włosów",
                Description = "Farbowanie z konsultacją kolorystyczną",
                Price = 220,
                DurationMinutes = 120
            },
            new Service
            {
                Id = 58,
                CompanyId = 12,
                BranchId = 12,
                ServiceName = "Masaż głowy",
                Description = "Relaksacyjny masaż skóry głowy",
                Price = 60,
                DurationMinutes = 30
            },
            new Service
            {
                Id = 59,
                CompanyId = 12,
                BranchId = 12,
                ServiceName = "Zabieg regenerujący",
                Description = "Intensywna regeneracja włosów",
                Price = 160,
                DurationMinutes = 90
            },
            new Service
            {
                Id = 60,
                CompanyId = 12,
                BranchId = 12,
                ServiceName = "Upięcie ślubne",
                Description = "Elegancka fryzura ślubna",
                Price = 280,
                DurationMinutes = 120
            }
        );
    }
}
