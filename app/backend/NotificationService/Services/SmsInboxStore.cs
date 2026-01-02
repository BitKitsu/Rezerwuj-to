using System.Collections.Concurrent;

namespace NotificationService.Services;

public record SmsInboxMessage(
    Guid Id,
    string To,
    string Body,
    DateTime CreatedAtUtc,
    string? Metadata);

public class SmsInboxStore
{
    private readonly ConcurrentQueue<SmsInboxMessage> _messages = new();

    public void Add(string to, string body, string? metadata)
    {
        _messages.Enqueue(new SmsInboxMessage(
            Id: Guid.NewGuid(),
            To: to,
            Body: body,
            CreatedAtUtc: DateTime.UtcNow,
            Metadata: metadata));

        while (_messages.Count > 500 && _messages.TryDequeue(out _))
        {
        }
    }

    public IReadOnlyList<SmsInboxMessage> GetLatest(int take = 100)
    {
        if (take <= 0) take = 100;
        if (take > 500) take = 500;

        var snapshot = _messages.ToArray();
        return snapshot
            .OrderByDescending(m => m.CreatedAtUtc)
            .Take(take)
            .ToList();
    }

    public void Clear()
    {
        while (_messages.TryDequeue(out _))
        {
        }
    }
}
