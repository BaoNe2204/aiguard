using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IShadowAiService
{
    Task<EndpointAiPolicyResponse> GetPolicyAsync(Device device);
    Task<ShadowAiDiscoveryResponse> DiscoverAsync(Device device, ShadowAiDiscoverRequest request);
    Task<PagedResult<ShadowAiDiscoveryResponse>> GetDiscoveriesAsync(PagedQuery query, bool? approved);
}

public class ShadowAiService : IShadowAiService
{
    private readonly AiguardDbContext _db;
    private readonly IAuditLogService _audit;

    public ShadowAiService(AiguardDbContext db, IAuditLogService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<EndpointAiPolicyResponse> GetPolicyAsync(Device device)
    {
        var websites = await _db.AiWebsites.Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new AiWebsiteResponse
            {
                Id = x.Id,
                Name = x.Name,
                DomainPattern = x.DomainPattern,
                IsActive = x.IsActive,
                Mode = x.Mode,
                LastUpdated = x.LastUpdated
            }).ToListAsync();

        var whitelistedProcessNames = await _db.PolicyListEntries
            .Where(e => e.TenantCode == device.TenantCode && e.ListType == "Whitelist" && e.EntryType == "ProcessName" && e.IsActive)
            .Select(e => e.Value.ToLower())
            .ToListAsync();

        var userPrefix = device.UserEmail + ":";
        var userWhitelistedProcessNames = await _db.PolicyListEntries
            .Where(e => e.TenantCode == device.TenantCode && e.ListType == "Whitelist" && e.EntryType == "UserProcessName" && e.Value.StartsWith(userPrefix) && e.IsActive)
            .Select(e => e.Value.Substring(userPrefix.Length).ToLower())
            .ToListAsync();

        whitelistedProcessNames.AddRange(userWhitelistedProcessNames);

        if (whitelistedProcessNames.Any())
        {
            foreach (var site in websites)
            {
                var key = $"{site.Name} {site.DomainPattern}".ToLowerInvariant();
                var isWhitelisted = whitelistedProcessNames.Any(wp => key.Contains(wp));
                if (isWhitelisted)
                {
                    site.Mode = "Allow";
                }
            }
        }

        return new EndpointAiPolicyResponse
        {
            Websites = websites,
            BlockUnknownAi = false
        };
    }

    public async Task<ShadowAiDiscoveryResponse> DiscoverAsync(Device device, ShadowAiDiscoverRequest request)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https"))
            throw new ArgumentException("A valid HTTP/HTTPS URL is required.");

        var domain = uri.IdnHost.ToLowerInvariant();
        var rules = await _db.AiWebsites.Where(x => x.IsActive).ToListAsync();
        var matched = rules.FirstOrDefault(rule => DomainMatches(domain, rule.DomainPattern));
        var decision = matched?.Mode ?? "Block";
        var now = DateTime.UtcNow;
        var item = await _db.ShadowAiDiscoveryEvents.FirstOrDefaultAsync(x =>
            x.DeviceId == device.Id && x.Domain == domain);

        var isNew = item == null;
        if (item == null)
        {
            item = new ShadowAiDiscoveryEvent
            {
                DeviceId = device.Id,
                Domain = domain,
                TenantCode = device.TenantCode,
                DepartmentId = device.DepartmentId
            };
            _db.ShadowAiDiscoveryEvents.Add(item);
        }
        else
        {
            item.VisitCount++;
            item.LastSeenAt = now;
        }

        item.Url = Limit(request.Url, 1000);
        item.PageTitle = Limit(request.PageTitle, 500);
        item.Browser = Limit(request.Browser, 100) ?? "Chromium";
        item.IsApproved = matched != null;
        item.Decision = decision;
        await _db.SaveChangesAsync();

        await _audit.CreateLogAsync(
            matched == null ? "ShadowAiDetected" : "AiWebsiteVisited",
            "Endpoint",
            null,
            device.UserEmail,
            device.DepartmentId,
            matched == null ? "High" : "Low",
            decision,
            new { device.Id, device.Hostname, domain, request.Url, approved = matched != null, decision });

        if (matched == null && isNew)
        {
            var incident = new IncidentCase
            {
                IncidentNumber = $"INC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
                Title = $"Shadow AI detected: {domain}",
                Severity = "High",
                SourceType = "ShadowAI",
                Summary = $"{device.UserEmail} on {device.Hostname} accessed an unapproved AI website.",
                TenantCode = device.TenantCode,
                DepartmentId = device.DepartmentId
            };
            _db.IncidentCases.Add(incident);
            _db.UserNotifications.Add(new UserNotification
            {
                Type = "ShadowAI",
                Title = "Unapproved AI website detected",
                Message = $"{device.UserEmail} accessed {domain} from {device.Hostname}.",
                ActionUrl = "/app/endpoints/ai-websites",
                RecipientRole = "SecurityAdmin",
                TenantCode = device.TenantCode,
                DepartmentId = device.DepartmentId
            });
            await _db.SaveChangesAsync();
        }
        return Map(item, device);
    }

    public async Task<PagedResult<ShadowAiDiscoveryResponse>> GetDiscoveriesAsync(PagedQuery query, bool? approved)
    {
        var q = _db.ShadowAiDiscoveryEvents.Include(x => x.Device).AsQueryable();
        if (approved.HasValue) q = q.Where(x => x.IsApproved == approved.Value);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(x => x.Domain.Contains(search) ||
                x.Device.Hostname.ToLower().Contains(search) ||
                x.Device.UserEmail.ToLower().Contains(search));
        }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.LastSeenAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();
        return new PagedResult<ShadowAiDiscoveryResponse>
        {
            Items = items.Select(x => Map(x, x.Device)).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    private static ShadowAiDiscoveryResponse Map(ShadowAiDiscoveryEvent item, Device device) => new()
    {
        Id = item.Id,
        Hostname = device.Hostname,
        UserEmail = device.UserEmail,
        DepartmentName = device.DepartmentName,
        Domain = item.Domain,
        Url = item.Url,
        PageTitle = item.PageTitle,
        IsApproved = item.IsApproved,
        Decision = item.Decision,
        ShouldBlock = item.Decision == "Block",
        VisitCount = item.VisitCount,
        FirstSeenAt = item.FirstSeenAt,
        LastSeenAt = item.LastSeenAt
    };

    private static bool DomainMatches(string domain, string pattern)
    {
        var value = pattern.Trim().ToLowerInvariant();
        if (Uri.TryCreate(value.Contains("://") ? value : $"https://{value.TrimStart('*', '.')}",
            UriKind.Absolute, out var uri))
            value = uri.IdnHost;
        value = value.Split('/')[0].TrimStart('*', '.').TrimEnd('*', '.');
        return domain == value || domain.EndsWith($".{value}", StringComparison.Ordinal);
    }

    private static string? Limit(string? value, int max) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim()[..Math.Min(value.Trim().Length, max)];
}
