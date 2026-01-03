using IdentityService.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace IdentityService.Services;

public interface IEmailSender
{
    Task<(bool Success, string Details)> SendAsync(string to, string subject, string body);
}

public class EmailSender : IEmailSender
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(IOptions<EmailSettings> settings, ILogger<EmailSender> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<(bool Success, string Details)> SendAsync(string to, string subject, string body)
    {
        if (string.IsNullOrWhiteSpace(to))
        {
            return (false, "Missing recipient");
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromEmail));
            message.To.Add(MailboxAddress.Parse(to.Trim()));
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            using var client = new SmtpClient();

            SecureSocketOptions socketOptions;
            if (_settings.UseSsl)
            {
                socketOptions = SecureSocketOptions.SslOnConnect;
            }
            else if (_settings.UseStartTls)
            {
                socketOptions = SecureSocketOptions.StartTls;
            }
            else
            {
                socketOptions = SecureSocketOptions.None;
            }

            await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, socketOptions);

            if (!string.IsNullOrWhiteSpace(_settings.SmtpUser))
            {
                await client.AuthenticateAsync(_settings.SmtpUser, _settings.SmtpPassword);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            return (true, $"Email sent to {to} via SMTP {_settings.SmtpHost}:{_settings.SmtpPort}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email sending failed");
            return (false, $"SMTP error: {ex.GetType().Name}: {ex.Message}");
        }
    }
}
