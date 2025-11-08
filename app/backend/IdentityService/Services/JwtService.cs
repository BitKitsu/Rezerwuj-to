using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using IdentityService.Data;
using IdentityService.Models;

namespace IdentityService.Services;

public interface IJwtService
{
    Task<TokenResponse> GenerateTokensAsync(ApplicationUser user);
    Task<TokenResponse?> RefreshTokenAsync(string refreshToken);
    Task RevokeTokenAsync(string refreshToken);
    Task RevokeAllUserTokensAsync(string userId);
}

public class JwtService : IJwtService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<JwtService> _logger;
    
    public JwtService(ApplicationDbContext context, IConfiguration configuration, ILogger<JwtService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }
    
    public async Task<TokenResponse> GenerateTokensAsync(ApplicationUser user)
    {
        var jwtToken = GenerateJwtToken(user);
        var refreshToken = await GenerateRefreshTokenAsync(user.Id, jwtToken.Id);
        
        return new TokenResponse
        {
            AccessToken = jwtToken.Token,
            RefreshToken = refreshToken.Token,
            ExpiresIn = 900, // 15 minut
            TokenType = "Bearer"
        };
    }
    
    public async Task<TokenResponse?> RefreshTokenAsync(string refreshToken)
    {
        var storedToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);
            
        if (storedToken == null)
        {
            _logger.LogWarning("Refresh token nie znaleziony");
            return null;
        }
        
        // Walidacja
        if (storedToken.IsUsed)
        {
            _logger.LogWarning("Refresh token już użyty");
            return null;
        }
        
        if (storedToken.IsRevoked)
        {
            _logger.LogWarning("Refresh token unieważniony");
            return null;
        }
        
        if (storedToken.ExpiresAt < DateTime.UtcNow)
        {
            _logger.LogWarning("Refresh token wygasł");
            return null;
        }
        
        // Oznacz jako użyty
        storedToken.IsUsed = true;
        _context.RefreshTokens.Update(storedToken);
        await _context.SaveChangesAsync();
        
        // Generuj nowe tokeny
        return await GenerateTokensAsync(storedToken.User);
    }
    
    public async Task RevokeTokenAsync(string refreshToken)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);
            
        if (token != null && !token.IsRevoked)
        {
            token.IsRevoked = true;
            _context.RefreshTokens.Update(token);
            await _context.SaveChangesAsync();
        }
    }
    
    public async Task RevokeAllUserTokensAsync(string userId)
    {
        var tokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked)
            .ToListAsync();
            
        foreach (var token in tokens)
        {
            token.IsRevoked = true;
        }
        
        _context.RefreshTokens.UpdateRange(tokens);
        await _context.SaveChangesAsync();
    }
    
    private (string Token, string Id) GenerateJwtToken(ApplicationUser user)
    {
        var jwtId = Guid.NewGuid().ToString();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("JWT Secret Key not configured")));
        
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new Claim(JwtRegisteredClaimNames.Jti, jwtId),
            new Claim(ClaimTypes.Name, user.UserName ?? ""),
            new Claim("FirstName", user.FirstName),
            new Claim("LastName", user.LastName)
        };
        
        if (user.CompanyId.HasValue)
        {
            claims.Add(new Claim("CompanyId", user.CompanyId.Value.ToString()));
        }
        
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );
        
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, jwtId);
    }
    
    private async Task<RefreshToken> GenerateRefreshTokenAsync(string userId, string jwtId)
    {
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = GenerateRandomToken(),
            JwtId = jwtId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        
        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();
        
        return refreshToken;
    }
    
    private string GenerateRandomToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }
}

public class TokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public string TokenType { get; set; } = "Bearer";
}
