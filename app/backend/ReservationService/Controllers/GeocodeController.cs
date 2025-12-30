using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GeocodeController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;

    public GeocodeController(IHttpClientFactory httpClientFactory, IMemoryCache cache)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
    }

    [HttpGet]
    public async Task<ActionResult<object>> Geocode([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { message = "Parametr 'query' jest wymagany." });
        }

        var normalized = query.Trim();
        var cacheKey = $"geocode:{normalized.ToLowerInvariant()}";

        if (_cache.TryGetValue(cacheKey, out object? cached) && cached != null)
        {
            return Ok(cached);
        }

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("MikroSaaS-ReservationService/1.0");

        var url =
            $"https://nominatim.openstreetmap.org/search?format=json&limit=1&q={Uri.EscapeDataString(normalized)}";

        using var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            return StatusCode((int)response.StatusCode, new { message = "Geocoding failed." });
        }

        var content = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);

        if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
        {
            var notFound = new { query = normalized, found = false };
            _cache.Set(cacheKey, notFound, TimeSpan.FromHours(12));
            return Ok(notFound);
        }

        var first = doc.RootElement[0];
        var latString = first.TryGetProperty("lat", out var latEl) ? latEl.GetString() : null;
        var lonString = first.TryGetProperty("lon", out var lonEl) ? lonEl.GetString() : null;
        var displayName = first.TryGetProperty("display_name", out var dnEl) ? dnEl.GetString() : null;

        if (!double.TryParse(latString, NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)
            || !double.TryParse(lonString, NumberStyles.Float, CultureInfo.InvariantCulture, out var lon))
        {
            var notFound = new { query = normalized, found = false };
            _cache.Set(cacheKey, notFound, TimeSpan.FromHours(12));
            return Ok(notFound);
        }

        var result = new { query = normalized, found = true, lat, lon, displayName };
        _cache.Set(cacheKey, result, TimeSpan.FromDays(7));

        return Ok(result);
    }
}
