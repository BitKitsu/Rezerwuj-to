using Microsoft.EntityFrameworkCore;
using NotificationService.Models;

namespace NotificationService.Data;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Notification> Notifications { get; set; }
    public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
    public DbSet<NotificationHistory> NotificationHistories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Konfiguracja indeksów
        modelBuilder.Entity<Notification>()
            .HasIndex(n => n.UserId);
        
        modelBuilder.Entity<Notification>()
            .HasIndex(n => n.Status);
        
        modelBuilder.Entity<Notification>()
            .HasIndex(n => n.CreatedAt);

        // Relacje
        modelBuilder.Entity<NotificationHistory>()
            .HasOne(h => h.Notification)
            .WithMany()
            .HasForeignKey(h => h.NotificationId)
            .OnDelete(DeleteBehavior.Cascade);

        // Seed data - przykładowe szablony
        modelBuilder.Entity<NotificationTemplate>().HasData(
            new NotificationTemplate
            {
                Id = 1,
                Name = "Przypomnienie o wizycie",
                Type = NotificationType.AppointmentReminder,
                Subject = "Przypomnienie o nadchodzącej wizycie",
                Body = "Szanowny/a {{userName}}, przypominamy o wizycie w dniu {{appointmentDate}} o godzinie {{appointmentTime}}. Adres: {{companyAddress}}.",
                IsActive = true
            },
            new NotificationTemplate
            {
                Id = 2,
                Name = "Potwierdzenie rezerwacji",
                Type = NotificationType.AppointmentConfirmation,
                Subject = "Potwierdzenie rezerwacji",
                Body = "Szanowny/a {{userName}}, Twoja rezerwacja na {{serviceName}} w dniu {{appointmentDate}} o godzinie {{appointmentTime}} została potwierdzona.",
                IsActive = true
            },
            new NotificationTemplate
            {
                Id = 3,
                Name = "Anulowanie wizyty",
                Type = NotificationType.AppointmentCancellation,
                Subject = "Wizyta została anulowana",
                Body = "Szanowny/a {{userName}}, informujemy że Twoja wizyta w dniu {{appointmentDate}} została anulowana. Prosimy o kontakt w celu umówienia nowego terminu.",
                IsActive = true
            }
        );
    }
}
