using NotificationService.Services;

namespace NotificationService.Tests;

public class SmsInboxStoreTests
{
    [Fact]
    public void Add_WhenMoreThan500Messages_KeepsQueueBounded()
    {
        var store = new SmsInboxStore();

        for (var i = 0; i < 650; i++)
        {
            store.Add(to: $"+48000{i}", body: $"msg-{i}", metadata: null);
        }

        var snapshot = store.GetLatest(1000);
        Assert.NotNull(snapshot);
        Assert.True(snapshot.Count <= 500);
        Assert.True(snapshot.Count > 0);
    }

    [Fact]
    public void Clear_RemovesAllMessages()
    {
        var store = new SmsInboxStore();

        store.Add(to: "+48111111111", body: "hello", metadata: null);
        Assert.NotEmpty(store.GetLatest());

        store.Clear();
        Assert.Empty(store.GetLatest());
    }
}
