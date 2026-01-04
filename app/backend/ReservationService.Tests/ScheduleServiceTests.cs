using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using ReservationService.Data;
using ReservationService.Models;
using ReservationService.Services;

namespace ReservationService.Tests;

public class ScheduleServiceTests
{
    private sealed class DummyHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    [Fact]
    public async Task GenerateTimeSlotsAsync_WhenNoSchedules_ReturnsEmptyList()
    {
        var options = new DbContextOptionsBuilder<ReservationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new ReservationDbContext(options);

        var service = new ScheduleService(
            db,
            NullLogger<ScheduleService>.Instance,
            new DummyHttpClientFactory(),
            new MemoryCache(new MemoryCacheOptions()));

        var result = await service.GenerateTimeSlotsAsync(
            companyId: 99999,
            branchId: 99999,
            serviceId: 99999,
            date: new DateTime(2026, 1, 2));

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GenerateTimeSlotsAsync_WhenScheduleExists_CreatesSlots()
    {
        var options = new DbContextOptionsBuilder<ReservationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new ReservationDbContext(options);

        const int companyId = 10001;
        const int branchId = 10001;
        const int serviceId = 10001;

        db.Companies.Add(new Company { Id = companyId, CompanyName = "C1", Email = "c1@example.com", Phone = "+48111111222" });
        db.Branches.Add(new Branch
        {
            Id = branchId,
            CompanyId = companyId,
            BranchName = "B1",
            OpeningHour = "09:00",
            ClosingHour = "17:00"
        });
        db.Services.Add(new Service
        {
            Id = serviceId,
            CompanyId = companyId,
            BranchId = branchId,
            ServiceName = "S1",
            Description = "D",
            Price = 10,
            DurationMinutes = 30
        });

        var day = new DateTime(2026, 1, 2);
        db.Schedules.Add(new Schedule
        {
            Id = 1,
            CompanyId = companyId,
            BranchId = branchId,
            ServiceId = serviceId,
            StaffId = "staff-1",
            DayOfWeek = day.DayOfWeek,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(10, 0),
            IsActive = true
        });

        await db.SaveChangesAsync();

        var scheduleService = new ScheduleService(
            db,
            NullLogger<ScheduleService>.Instance,
            new DummyHttpClientFactory(),
            new MemoryCache(new MemoryCacheOptions()));

        var slots = await scheduleService.GenerateTimeSlotsAsync(companyId, branchId, serviceId, day);

        Assert.NotNull(slots);
        Assert.NotEmpty(slots);
        Assert.True(db.TimeSlots.Count() >= 1);

        foreach (var slot in slots)
        {
            Assert.Equal(companyId, slot.CompanyId);
            Assert.Equal(branchId, slot.BranchId);
            Assert.Equal(serviceId, slot.ServiceId);
        }
    }
}
