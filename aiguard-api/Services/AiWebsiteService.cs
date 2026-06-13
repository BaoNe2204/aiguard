using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IAiWebsiteService
{
    Task<List<AiWebsiteResponse>> GetAllAsync();
    Task<AiWebsiteResponse> CreateRuleAsync(CreateAiWebsiteRuleRequest request);
    Task<AiWebsiteResponse?> UpdateAsync(Guid id, UpdateAiWebsiteRequest request);
    Task<bool> DeleteAsync(Guid id);
}

public class AiWebsiteService : IAiWebsiteService
{
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;

    public AiWebsiteService(AiguardDbContext db, IDataScopeContext scope)
    {
        _db = db;
        _scope = scope;
    }

    public async Task<List<AiWebsiteResponse>> GetAllAsync()
    {
        return await _db.AiWebsites
            .OrderBy(w => w.Name)
            .Select(w => MapToResponse(w))
            .ToListAsync();
    }

    public async Task<AiWebsiteResponse> CreateRuleAsync(CreateAiWebsiteRuleRequest request)
    {
        var website = new AiWebsite
        {
            Name = request.Name,
            DomainPattern = request.DomainPattern,
            Mode = request.Mode,
            TenantCode = _scope.TenantCode
        };

        _db.AiWebsites.Add(website);
        await _db.SaveChangesAsync();
        return MapToResponse(website);
    }

    public async Task<AiWebsiteResponse?> UpdateAsync(Guid id, UpdateAiWebsiteRequest request)
    {
        var website = await _db.AiWebsites.FindAsync(id);
        if (website == null) return null;

        if (request.Name != null) website.Name = request.Name;
        if (request.DomainPattern != null) website.DomainPattern = request.DomainPattern;
        if (request.IsActive.HasValue) website.IsActive = request.IsActive.Value;
        if (request.Mode != null) website.Mode = request.Mode;
        website.LastUpdated = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToResponse(website);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var website = await _db.AiWebsites.FindAsync(id);
        if (website == null) return false;
        _db.AiWebsites.Remove(website);
        await _db.SaveChangesAsync();
        return true;
    }

    private static AiWebsiteResponse MapToResponse(AiWebsite w) => new()
    {
        Id = w.Id,
        Name = w.Name,
        DomainPattern = w.DomainPattern,
        IsActive = w.IsActive,
        Mode = w.Mode,
        LastUpdated = w.LastUpdated
    };
}
