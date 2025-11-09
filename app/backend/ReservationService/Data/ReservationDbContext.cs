using Microsoft.EntityFrameworkCore;
using ReservationService.Models;

namespace ReservationService.Data;

public class ReservationDbContext : DbContext
{
    public ReservationDbContext(DbContextOptions<ReservationDbContext> options)
        : base(options) { }

    public DbSet<Company> Companies { get; set; }
    public DbSet<Service> Services { get; set; }
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<Schedule> Schedules { get; set; }
    public DbSet<TimeSlot> TimeSlots { get; set; }
    public DbSet<EventStore> EventStores { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Konfiguracja relacji Company -> Services
        modelBuilder.Entity<Service>()
            .HasOne(s => s.Company)
            .WithMany(c => c.Services)
            .HasForeignKey(s => s.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Konfiguracja relacji Company -> Appointments
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Company)
            .WithMany(c => c.Appointments)
            .HasForeignKey(a => a.CompanyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Konfiguracja relacji Service -> Appointments
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Service)
            .WithMany(s => s.Appointments)
            .HasForeignKey(a => a.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);
            
        // Konfiguracja Schedule
        modelBuilder.Entity<Schedule>()
            .HasOne(s => s.Company)
            .WithMany()
            .HasForeignKey(s => s.CompanyId)
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
            .HasIndex(s => new { s.CompanyId, s.ServiceId, s.DayOfWeek })
            .IsUnique();
            
        modelBuilder.Entity<TimeSlot>()
            .HasIndex(ts => new { ts.CompanyId, ts.SlotStart, ts.SlotEnd });
            
        // Konfiguracja EventStore
        modelBuilder.Entity<EventStore>()
            .HasIndex(es => es.EventId)
            .IsUnique();
            
        modelBuilder.Entity<EventStore>()
            .HasIndex(es => es.AggregateId);
            
        modelBuilder.Entity<EventStore>()
            .HasIndex(es => es.OccurredAt);

        // Seed data dla testów
        modelBuilder.Entity<Company>().HasData(
            new Company { 
                Id = 1, 
                CompanyName = "Przykładowy Fryzjer", 
                Email = "fryzjer@example.com", 
                Phone = "123456789",
                Street = "ul. Główna 15",
                City = "Warszawa",
                PostalCode = "00-001",
                Country = "Polska",
                Description = "Profesjonalny salon fryzjerski",
                Website = "www.fryzjer.pl",
                RegistrationDate = DateTime.UtcNow
            }
        );

        modelBuilder.Entity<Service>().HasData(
            new Service { 
                Id = 1, 
                CompanyId = 1, 
                ServiceName = "Strzyżenie męskie", 
                Description = "Profesjonalne strzyżenie",
                Price = 50,
                DurationMinutes = 30
            },
            new Service { 
                Id = 2, 
                CompanyId = 1, 
                ServiceName = "Strzyżenie damskie", 
                Description = "Strzyżenie i modelowanie",
                Price = 80,
                DurationMinutes = 60
            }
        );
    }
}
