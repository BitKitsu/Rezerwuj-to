namespace NotificationService.Models;

public class EmailSettings
{
    public string SmtpHost { get; set; } = "localhost";
    public int SmtpPort { get; set; } = 1025;
    public string? SmtpUser { get; set; }
    public string? SmtpPassword { get; set; }
    public bool UseSsl { get; set; } = false;
    public bool UseStartTls { get; set; } = false;
    public string FromEmail { get; set; } = "noreply@localhost";
    public string FromName { get; set; } = "MikroSaaS";
}
