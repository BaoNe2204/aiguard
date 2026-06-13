using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IEndpointSecurityService
{
    string GenerateSecret();
    string HashSecret(string secret);
    Task<bool> ValidateEndpointKeyAsync(string hostname, string? endpointKey);
    Task<Device?> GetAuthenticatedDeviceAsync(string hostname, string? endpointKey);
}

public class EndpointSecurityService : IEndpointSecurityService
{
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;

    public EndpointSecurityService(AiguardDbContext db, IDataScopeContext scope)
    {
        _db = db;
        _scope = scope;
    }

    public string GenerateSecret() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));

    public string HashSecret(string secret)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexStringLower(bytes);
    }

    public async Task<bool> ValidateEndpointKeyAsync(string hostname, string? endpointKey)
    {
        if (string.IsNullOrWhiteSpace(hostname) || string.IsNullOrWhiteSpace(endpointKey))
            return false;

        var hash = HashSecret(endpointKey);
        var device = await _db.Devices.IgnoreQueryFilters().FirstOrDefaultAsync(d =>
            d.Hostname == hostname && d.EndpointKeyHash == hash && !d.EndpointKeyRevoked);
        if (device == null) return false;
        _scope.SetEndpointScope(device.TenantCode, device.DepartmentId);
        return true;
    }

    public async Task<Device?> GetAuthenticatedDeviceAsync(string hostname, string? endpointKey)
    {
        if (string.IsNullOrWhiteSpace(hostname) || string.IsNullOrWhiteSpace(endpointKey)) return null;
        var hash = HashSecret(endpointKey);
        var device = await _db.Devices.IgnoreQueryFilters().FirstOrDefaultAsync(d =>
            d.Hostname == hostname && d.EndpointKeyHash == hash && !d.EndpointKeyRevoked);
        if (device != null) _scope.SetEndpointScope(device.TenantCode, device.DepartmentId);
        return device;
    }
}
