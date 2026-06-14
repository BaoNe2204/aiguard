using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Governance;
using aiguard_api.Models;
using Microsoft.AspNetCore.DataProtection;

namespace aiguard_api.Services;

public interface IGovernanceService
{
    Task<PagedResult<UserAdminResponse>> GetUsersAsync(PagedQuery query);
    Task<UserAdminResponse> CreateUserAsync(UpsertUserRequest request);
    Task<UserAdminResponse?> UpdateUserAsync(Guid id, UpsertUserRequest request);
    Task<bool> DeleteUserAsync(Guid id);
    Task<List<DepartmentAdminResponse>> GetDepartmentsAsync();
    Task<DepartmentAdminResponse> CreateDepartmentAsync(UpsertDepartmentRequest request);
    Task<DepartmentAdminResponse?> UpdateDepartmentAsync(Guid id, UpsertDepartmentRequest request);
    Task<bool> DeleteDepartmentAsync(Guid id);

    Task<FalsePositiveResponse?> CreateFalsePositiveAsync(FalsePositiveCreateRequest request, string reporterEmail);
    Task<PagedResult<FalsePositiveResponse>> GetFalsePositivesAsync(PagedQuery query, string? status);
    Task<FalsePositiveResponse?> ReviewFalsePositiveAsync(Guid id, FalsePositiveReviewRequest request, Guid reviewerId);

    Task<PagedResult<IncidentResponse>> GetIncidentsAsync(PagedQuery query, string? status, string? severity);
    Task<IncidentResponse> CreateIncidentAsync(CreateIncidentRequest request);
    Task<IncidentResponse?> UpdateIncidentAsync(Guid id, UpdateIncidentRequest request);

    Task<List<NotificationResponse>> GetNotificationsAsync(Guid userId, string email, string role, bool unreadOnly);
    Task<bool> MarkNotificationReadAsync(Guid id, Guid userId, string email);
    Task<UserNotification> CreateNotificationAsync(
        string type, string title, string message, string? actionUrl = null,
        Guid? recipientUserId = null, string? recipientEmail = null, string? recipientRole = null,
        Guid? departmentId = null, object? metadata = null);

    Task<List<PolicyRuleResponse>> GetPolicyRulesAsync();
    Task<PolicyRuleResponse> CreatePolicyRuleAsync(PolicyRuleRequest request);
    Task<PolicyRuleResponse?> UpdatePolicyRuleAsync(Guid id, PolicyRuleRequest request);
    Task<PolicyRuleResponse?> PublishPolicyRuleAsync(Guid id, string? actorEmail);
    Task<object> SimulatePolicyAsync(PolicySimulationRequest request);

    Task<RetentionPolicy> GetRetentionPolicyAsync();
    Task<RetentionPolicy> UpdateRetentionPolicyAsync(RetentionPolicyRequest request, string? actorEmail);
    Task<List<IntegrationResponse>> GetIntegrationsAsync();
    Task<IntegrationResponse> CreateIntegrationAsync(IntegrationRequest request);
    Task<bool> DeleteIntegrationAsync(Guid id);
    Task<GovernanceHealthResponse> GetHealthAsync();
    Task<List<ExactDataMatchResponse>> GetExactDataMatchesAsync();
    Task<int> ImportExactDataMatchesAsync(ExactDataMatchImportRequest request);
    Task<bool> DeleteExactDataMatchAsync(Guid id);
}

public class GovernanceService : IGovernanceService
{
    private static readonly HashSet<string> Roles =
        ["Employee", "DepartmentManager", "SecurityAdmin", "TenantOwner", "PlatformAdmin"];
    private static readonly HashSet<string> Actions =
        ["Allow", "Mask", "PendingApproval", "Block"];
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;
    private readonly IEndpointSecurityService _security;
    private readonly ILicenseEntitlementService _entitlements;
    private readonly IDataProtector _integrationProtector;

    public GovernanceService(
        AiguardDbContext db,
        IDataScopeContext scope,
        IEndpointSecurityService security,
        IDataProtectionProvider dataProtection,
        ILicenseEntitlementService entitlements)
    {
        _db = db;
        _scope = scope;
        _security = security;
        _entitlements = entitlements;
        _integrationProtector = dataProtection.CreateProtector("AIGuard.IntegrationSecrets.v1");
    }

    public async Task<PagedResult<UserAdminResponse>> GetUsersAsync(PagedQuery query)
    {
        var q = _db.Users.Include(u => u.Department).AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(u => u.Email.ToLower().Contains(search) || u.FullName.ToLower().Contains(search));
        }
        q = q.OrderBy(u => u.FullName);
        var total = await q.CountAsync();
        var users = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return new PagedResult<UserAdminResponse>
        {
            Items = users.Select(MapUser).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<UserAdminResponse> CreateUserAsync(UpsertUserRequest request)
    {
        ValidateUser(request, creating: true);
        ValidateRoleAssignment(request.Role);
        if (request.IsActive) await _entitlements.EnsureCanAddUserAsync();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == normalizedEmail))
            throw new ArgumentException("Email already exists.");
        if (request.DepartmentId.HasValue && !await _db.Departments.AnyAsync(d => d.Id == request.DepartmentId))
            throw new ArgumentException("Department not found.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            Role = request.Role,
            DepartmentId = request.DepartmentId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password!),
            IsActive = request.IsActive,
            MfaRequired = request.MfaRequired,
            AuthProvider = request.AuthProvider,
            TenantCode = _scope.TenantCode
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Department).LoadAsync();
        return MapUser(user);
    }

    public async Task<UserAdminResponse?> UpdateUserAsync(Guid id, UpsertUserRequest request)
    {
        ValidateUser(request, creating: false);
        ValidateRoleAssignment(request.Role);
        var user = await _db.Users.Include(u => u.Department).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;
        if (!user.IsActive && request.IsActive) await _entitlements.EnsureCanAddUserAsync();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Id != id && u.Email == normalizedEmail))
            throw new ArgumentException("Email already exists.");
        if (request.DepartmentId.HasValue && !await _db.Departments.AnyAsync(d => d.Id == request.DepartmentId))
            throw new ArgumentException("Department not found.");

        user.FullName = request.FullName.Trim();
        user.Email = normalizedEmail;
        user.Role = request.Role;
        user.DepartmentId = request.DepartmentId;
        user.IsActive = request.IsActive;
        user.MfaRequired = request.MfaRequired;
        user.AuthProvider = request.AuthProvider;
        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Department).LoadAsync();
        return MapUser(user);
    }

    public async Task<bool> DeleteUserAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return false;
        user.IsActive = false;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.RefreshSessions
            .Where(s => s.UserId == id && s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(s => s.RevokedAt, DateTime.UtcNow)
                .SetProperty(s => s.RevokeReason, "Account disabled"));
        await _db.MfaLoginChallenges
            .Where(c => c.UserId == id && c.ConsumedAt == null)
            .ExecuteDeleteAsync();
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<DepartmentAdminResponse>> GetDepartmentsAsync()
    {
        return await _db.Departments
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentAdminResponse
            {
                Id = d.Id,
                Name = d.Name,
                Code = d.Code,
                UserCount = d.Users.Count,
                DeviceCount = _db.Devices.Count(device => device.DepartmentId == d.Id),
                CreatedAt = d.CreatedAt
            }).ToListAsync();
    }

    public async Task<DepartmentAdminResponse> CreateDepartmentAsync(UpsertDepartmentRequest request)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (await _db.Departments.AnyAsync(d => d.Code == code))
            throw new ArgumentException("Department code already exists.");
        var department = new Department
        {
            Name = request.Name.Trim(),
            Code = code,
            TenantCode = _scope.TenantCode
        };
        _db.Departments.Add(department);
        await _db.SaveChangesAsync();
        return MapDepartment(department);
    }

    public async Task<DepartmentAdminResponse?> UpdateDepartmentAsync(Guid id, UpsertDepartmentRequest request)
    {
        var department = await _db.Departments.FindAsync(id);
        if (department == null) return null;
        var code = request.Code.Trim().ToUpperInvariant();
        if (await _db.Departments.AnyAsync(d => d.Id != id && d.Code == code))
            throw new ArgumentException("Department code already exists.");
        department.Name = request.Name.Trim();
        department.Code = code;
        await _db.SaveChangesAsync();
        return MapDepartment(department);
    }

    public async Task<bool> DeleteDepartmentAsync(Guid id)
    {
        var department = await _db.Departments
            .Include(d => d.Users)
            .Include(d => d.Agents)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (department == null) return false;
        if (department.Users.Count > 0 || department.Agents.Count > 0)
            throw new InvalidOperationException("Department still has users or agents.");
        _db.Departments.Remove(department);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<FalsePositiveResponse?> CreateFalsePositiveAsync(FalsePositiveCreateRequest request, string reporterEmail)
    {
        var endpointEvent = await _db.EndpointEvents.FirstOrDefaultAsync(e =>
            e.Id == request.EndpointEventId && e.UserEmail == reporterEmail);
        if (endpointEvent == null) return null;
        var existing = await _db.FalsePositiveReports.FirstOrDefaultAsync(r =>
            r.EndpointEventId == request.EndpointEventId && r.ReportedByEmail == reporterEmail && r.Status == "Pending");
        if (existing != null) return MapFalsePositive(existing);

        var report = new FalsePositiveReport
        {
            EndpointEventId = endpointEvent.Id,
            ReportedByEmail = reporterEmail,
            DetectorName = request.DetectorName.Trim(),
            Reason = request.Reason.Trim(),
            TenantCode = endpointEvent.TenantCode,
            DepartmentId = endpointEvent.DepartmentId
        };
        _db.FalsePositiveReports.Add(report);
        await _db.SaveChangesAsync();
        return MapFalsePositive(report);
    }

    public async Task<PagedResult<FalsePositiveResponse>> GetFalsePositivesAsync(PagedQuery query, string? status)
    {
        var q = _db.FalsePositiveReports.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(r => r.ReportedByEmail.ToLower().Contains(s) ||
                r.DetectorName.ToLower().Contains(s) || r.Reason.ToLower().Contains(s));
        }
        q = q.OrderByDescending(r => r.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return new PagedResult<FalsePositiveResponse>
        {
            Items = items.Select(MapFalsePositive).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<FalsePositiveResponse?> ReviewFalsePositiveAsync(
        Guid id, FalsePositiveReviewRequest request, Guid reviewerId)
    {
        if (request.Action is not ("Approve" or "Reject"))
            throw new ArgumentException("Action must be Approve or Reject.");
        var report = await _db.FalsePositiveReports
            .Include(r => r.EndpointEvent)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (report == null || report.Status != "Pending") return null;
        report.Status = request.Action == "Approve" ? "Approved" : "Rejected";
        report.ReviewedByUserId = reviewerId;
        report.ReviewNote = request.Note;
        report.ReviewedAt = DateTime.UtcNow;
        report.CreateWhitelist = request.Action == "Approve" && request.CreateWhitelist;
        if (report.CreateWhitelist)
        {
            var days = Math.Clamp(request.WhitelistDurationDays ?? 30, 1, 365);
            report.WhitelistExpiresAt = DateTime.UtcNow.AddDays(days);
            _db.PolicyListEntries.Add(new PolicyListEntry
            {
                ListType = "Whitelist",
                EntryType = "ContentHash",
                Value = report.EndpointEvent.OriginalHash,
                DepartmentId = report.DepartmentId,
                ExpiresAt = report.WhitelistExpiresAt,
                Source = $"FalsePositive:{report.Id}",
                TenantCode = report.TenantCode
            });
        }
        await _db.SaveChangesAsync();
        return MapFalsePositive(report);
    }

    public async Task<PagedResult<IncidentResponse>> GetIncidentsAsync(
        PagedQuery query, string? status, string? severity)
    {
        var q = _db.IncidentCases.Include(i => i.AssignedToUser).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(i => i.Status == status);
        if (!string.IsNullOrWhiteSpace(severity)) q = q.Where(i => i.Severity == severity);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(i => i.IncidentNumber.ToLower().Contains(s) || i.Title.ToLower().Contains(s));
        }
        q = q.OrderByDescending(i => i.CreatedAt);
        var total = await q.CountAsync();
        var items = await q.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
        return new PagedResult<IncidentResponse>
        {
            Items = items.Select(MapIncident).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<IncidentResponse> CreateIncidentAsync(CreateIncidentRequest request)
    {
        var todayPrefix = $"INC-{DateTime.UtcNow:yyyyMMdd}-";
        var todayCount = await _db.IncidentCases.CountAsync(i => i.IncidentNumber.StartsWith(todayPrefix));
        Guid? departmentId = null;
        if (request.EndpointEventId.HasValue)
            departmentId = await _db.EndpointEvents.Where(e => e.Id == request.EndpointEventId)
                .Select(e => e.DepartmentId).FirstOrDefaultAsync();
        else if (request.AgentActionLogId.HasValue)
            departmentId = await _db.AgentActionLogs.Where(e => e.Id == request.AgentActionLogId)
                .Select(e => e.DepartmentId).FirstOrDefaultAsync();

        var incident = new IncidentCase
        {
            IncidentNumber = $"{todayPrefix}{todayCount + 1:0000}",
            Title = request.Title.Trim(),
            Severity = request.Severity,
            SourceType = request.SourceType,
            EndpointEventId = request.EndpointEventId,
            AgentActionLogId = request.AgentActionLogId,
            AssignedToUserId = request.AssignedToUserId,
            Summary = request.Summary,
            DepartmentId = departmentId,
            TenantCode = _scope.TenantCode
        };
        _db.IncidentCases.Add(incident);
        await _db.SaveChangesAsync();
        if (incident.AssignedToUserId.HasValue)
            await _db.Entry(incident).Reference(i => i.AssignedToUser).LoadAsync();
        return MapIncident(incident);
    }

    public async Task<IncidentResponse?> UpdateIncidentAsync(Guid id, UpdateIncidentRequest request)
    {
        var incident = await _db.IncidentCases.Include(i => i.AssignedToUser).FirstOrDefaultAsync(i => i.Id == id);
        if (incident == null) return null;
        if (!string.IsNullOrWhiteSpace(request.Status)) incident.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Severity)) incident.Severity = request.Severity;
        if (request.AssignedToUserId.HasValue) incident.AssignedToUserId = request.AssignedToUserId;
        if (request.Summary != null) incident.Summary = request.Summary;
        if (request.Resolution != null) incident.Resolution = request.Resolution;
        incident.UpdatedAt = DateTime.UtcNow;
        if (incident.Status is "Resolved" or "FalsePositive") incident.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        if (incident.AssignedToUserId.HasValue)
            await _db.Entry(incident).Reference(i => i.AssignedToUser).LoadAsync();
        return MapIncident(incident);
    }

    public async Task<List<NotificationResponse>> GetNotificationsAsync(
        Guid userId, string email, string role, bool unreadOnly)
    {
        var q = _db.UserNotifications.Where(n =>
            n.RecipientUserId == userId || n.RecipientEmail == email || n.RecipientRole == role ||
            (n.RecipientUserId == null && n.RecipientEmail == null && n.RecipientRole == null));
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        return await q.OrderByDescending(n => n.CreatedAt).Take(100)
            .Select(n => new NotificationResponse
            {
                Id = n.Id, Type = n.Type, Title = n.Title, Message = n.Message,
                ActionUrl = n.ActionUrl, IsRead = n.IsRead, CreatedAt = n.CreatedAt, ReadAt = n.ReadAt
            }).ToListAsync();
    }

    public async Task<bool> MarkNotificationReadAsync(Guid id, Guid userId, string email)
    {
        var notification = await _db.UserNotifications.FirstOrDefaultAsync(n =>
            n.Id == id && (n.RecipientUserId == userId || n.RecipientEmail == email ||
            (n.RecipientUserId == null && n.RecipientEmail == null)));
        if (notification == null) return false;
        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<UserNotification> CreateNotificationAsync(
        string type, string title, string message, string? actionUrl = null,
        Guid? recipientUserId = null, string? recipientEmail = null, string? recipientRole = null,
        Guid? departmentId = null, object? metadata = null)
    {
        var notification = new UserNotification
        {
            Type = type,
            Title = title,
            Message = message,
            ActionUrl = actionUrl,
            RecipientUserId = recipientUserId,
            RecipientEmail = recipientEmail,
            RecipientRole = recipientRole,
            DepartmentId = departmentId,
            MetadataJson = metadata == null ? null : JsonSerializer.Serialize(metadata),
            TenantCode = _scope.TenantCode
        };
        _db.UserNotifications.Add(notification);
        await _db.SaveChangesAsync();
        return notification;
    }

    public async Task<List<PolicyRuleResponse>> GetPolicyRulesAsync()
    {
        return (await _db.PolicyRules.Include(r => r.Department)
            .OrderBy(r => r.Priority).ThenByDescending(r => r.UpdatedAt).ToListAsync())
            .Select(MapPolicyRule).ToList();
    }

    public async Task<PolicyRuleResponse> CreatePolicyRuleAsync(PolicyRuleRequest request)
    {
        ValidatePolicyRule(request);
        var rule = new PolicyRule { TenantCode = _scope.TenantCode };
        ApplyRule(rule, request);
        _db.PolicyRules.Add(rule);
        await _db.SaveChangesAsync();
        if (rule.DepartmentId.HasValue) await _db.Entry(rule).Reference(r => r.Department).LoadAsync();
        return MapPolicyRule(rule);
    }

    public async Task<PolicyRuleResponse?> UpdatePolicyRuleAsync(Guid id, PolicyRuleRequest request)
    {
        ValidatePolicyRule(request);
        var rule = await _db.PolicyRules.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == id);
        if (rule == null) return null;
        ApplyRule(rule, request);
        rule.Status = "Draft";
        rule.Version = $"draft-{DateTime.UtcNow:yyyyMMddHHmmss}";
        rule.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapPolicyRule(rule);
    }

    public async Task<PolicyRuleResponse?> PublishPolicyRuleAsync(Guid id, string? actorEmail)
    {
        var rule = await _db.PolicyRules.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == id);
        if (rule == null) return null;
        rule.Status = "Published";
        rule.Version = $"rule-{DateTime.UtcNow:yyyyMMddHHmmss}";
        rule.PublishedAt = DateTime.UtcNow;
        rule.UpdatedAt = DateTime.UtcNow;
        _db.PolicyVersionSnapshots.Add(new PolicyVersionSnapshot
        {
            Version = rule.Version,
            Status = "Published",
            SnapshotJson = JsonSerializer.Serialize(rule),
            ChangeReason = $"Published rule {rule.Name}",
            CreatedByEmail = actorEmail,
            TenantCode = rule.TenantCode
        });
        await _db.SaveChangesAsync();
        return MapPolicyRule(rule);
    }

    public async Task<object> SimulatePolicyAsync(PolicySimulationRequest request)
    {
        var time = request.Time ?? TimeOnly.FromDateTime(DateTime.UtcNow);
        var rules = await _db.PolicyRules.Include(r => r.Department)
            .Where(r => r.IsEnabled && r.Status == "Published")
            .OrderBy(r => r.Priority).ToListAsync();
        var matched = rules.FirstOrDefault(r =>
            (r.DepartmentId == null || r.Department!.Code == request.DepartmentCode) &&
            (string.IsNullOrWhiteSpace(r.DataType) || string.Equals(r.DataType, request.DataType, StringComparison.OrdinalIgnoreCase)) &&
            (string.IsNullOrWhiteSpace(r.WebsitePattern) || WildcardMatch(request.Website, r.WebsitePattern)) &&
            (string.IsNullOrWhiteSpace(r.UserEmail) || string.Equals(r.UserEmail, request.UserEmail, StringComparison.OrdinalIgnoreCase)) &&
            (string.IsNullOrWhiteSpace(r.Hostname) || WildcardMatch(request.Hostname, r.Hostname)) &&
            IsWithinWindow(time, r.ActiveFrom, r.ActiveTo));
        return new
        {
            matched = matched != null,
            decision = matched?.Action ?? "UseRiskPolicy",
            ruleId = matched?.Id,
            ruleName = matched?.Name,
            version = matched?.Version
        };
    }

    public async Task<RetentionPolicy> GetRetentionPolicyAsync()
    {
        var existing = await _db.RetentionPolicies.FirstOrDefaultAsync();
        if (existing != null) return existing;
        existing = new RetentionPolicy { TenantCode = _scope.TenantCode };
        _db.RetentionPolicies.Add(existing);
        await _db.SaveChangesAsync();
        return existing;
    }

    public async Task<RetentionPolicy> UpdateRetentionPolicyAsync(RetentionPolicyRequest request, string? actorEmail)
    {
        var policy = await GetRetentionPolicyAsync();
        policy.EndpointEventDays = request.EndpointEventDays;
        policy.AuditLogDays = request.AuditLogDays;
        policy.NotificationDays = request.NotificationDays;
        policy.IncidentDays = request.IncidentDays;
        policy.StoreOriginalContent = request.StoreOriginalContent;
        policy.EncryptSensitivePreview = request.EncryptSensitivePreview;
        policy.UpdatedByEmail = actorEmail;
        policy.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return policy;
    }

    public async Task<List<IntegrationResponse>> GetIntegrationsAsync() =>
        await _db.IntegrationEndpoints.OrderBy(i => i.Name).Select(i => MapIntegration(i)).ToListAsync();

    public async Task<IntegrationResponse> CreateIntegrationAsync(IntegrationRequest request)
    {
        if (request.Type is not ("Webhook" or "Syslog" or "Splunk" or "Sentinel" or "Teams" or "Slack" or "Email"))
            throw new ArgumentException("Unsupported integration type.");
        var integration = new IntegrationEndpoint
        {
            Name = request.Name.Trim(),
            Type = request.Type,
            Endpoint = request.Endpoint.Trim(),
            ConfigurationJson = request.ConfigurationJson,
            SecretHash = string.IsNullOrWhiteSpace(request.Secret) ? null : _security.HashSecret(request.Secret),
            ProtectedSecret = string.IsNullOrWhiteSpace(request.Secret)
                ? null
                : _integrationProtector.Protect(request.Secret),
            IsEnabled = request.IsEnabled,
            TenantCode = _scope.TenantCode
        };
        _db.IntegrationEndpoints.Add(integration);
        await _db.SaveChangesAsync();
        return MapIntegration(integration);
    }

    public async Task<bool> DeleteIntegrationAsync(Guid id)
    {
        var integration = await _db.IntegrationEndpoints.FindAsync(id);
        if (integration == null) return false;
        _db.IntegrationEndpoints.Remove(integration);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<GovernanceHealthResponse> GetHealthAsync()
    {
        var now = DateTime.UtcNow;
        var onlineCutoff = now.AddMinutes(-5);
        var activePolicyVersion = await _db.SecurityPolicies.Where(p => p.IsActive)
            .OrderByDescending(p => p.UpdatedAt).Select(p => p.Version).FirstOrDefaultAsync();
        return new GovernanceHealthResponse
        {
            OnlineDevices = await _db.Devices.CountAsync(d => d.LastSeen >= onlineCutoff),
            OfflineDevices = await _db.Devices.CountAsync(d => d.LastSeen < onlineCutoff),
            QuarantinedDevices = await _db.Devices.CountAsync(d => d.IsQuarantined),
            ExtensionDisabledDevices = await _db.Devices.CountAsync(d => !d.ExtensionActive),
            StalePolicyDevices = activePolicyVersion == null ? 0 :
                await _db.Devices.CountAsync(d => d.PolicyVersion != activePolicyVersion),
            PendingApprovals = await _db.Approvals.CountAsync(a => a.Status == "Pending" && a.ExpiresAt > now),
            ExpiredApprovals = await _db.Approvals.CountAsync(a => a.Status == "Pending" && a.ExpiresAt <= now),
            OpenIncidents = await _db.IncidentCases.CountAsync(i => i.Status != "Resolved" && i.Status != "FalsePositive"),
            PendingFalsePositives = await _db.FalsePositiveReports.CountAsync(r => r.Status == "Pending"),
            FailedIntegrations = await _db.IntegrationEndpoints.CountAsync(i => i.IsEnabled && i.LastFailureAt != null &&
                (i.LastSuccessAt == null || i.LastFailureAt > i.LastSuccessAt)),
            ApiUptimeSeconds = Environment.TickCount64 / 1000d
        };
    }

    public async Task<List<ExactDataMatchResponse>> GetExactDataMatchesAsync() =>
        await _db.ExactDataMatchRecords.Include(r => r.Department)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ExactDataMatchResponse
            {
                Id = r.Id, DataType = r.DataType, Label = r.Label,
                DepartmentId = r.DepartmentId, DepartmentName = r.Department == null ? null : r.Department.Name,
                IsActive = r.IsActive, ExpiresAt = r.ExpiresAt, CreatedAt = r.CreatedAt
            }).ToListAsync();

    public async Task<int> ImportExactDataMatchesAsync(ExactDataMatchImportRequest request)
    {
        if (request.Values.Count is < 1 or > 10000)
            throw new ArgumentException("EDM import must contain between 1 and 10,000 values.");
        var hashes = request.Values
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => Convert.ToHexStringLower(SHA256.HashData(
                Encoding.UTF8.GetBytes(v.Trim().ToLowerInvariant()))))
            .Distinct()
            .ToList();
        var existing = await _db.ExactDataMatchRecords
            .Where(r => r.DataType == request.DataType && hashes.Contains(r.ValueHash))
            .Select(r => r.ValueHash).ToListAsync();
        var existingSet = existing.ToHashSet(StringComparer.Ordinal);
        var records = hashes.Where(hash => !existingSet.Contains(hash)).Select(hash => new ExactDataMatchRecord
        {
            DataType = request.DataType.Trim(),
            ValueHash = hash,
            Label = request.Label,
            DepartmentId = request.DepartmentId,
            ExpiresAt = request.ExpiresAt,
            TenantCode = _scope.TenantCode
        }).ToList();
        _db.ExactDataMatchRecords.AddRange(records);
        await _db.SaveChangesAsync();
        return records.Count;
    }

    public async Task<bool> DeleteExactDataMatchAsync(Guid id)
    {
        var record = await _db.ExactDataMatchRecords.FindAsync(id);
        if (record == null) return false;
        _db.ExactDataMatchRecords.Remove(record);
        await _db.SaveChangesAsync();
        return true;
    }

    private static void ValidateUser(UpsertUserRequest request, bool creating)
    {
        if (!Roles.Contains(request.Role)) throw new ArgumentException("Invalid role.");
        if (creating && string.IsNullOrWhiteSpace(request.Password) && request.AuthProvider == "Local")
            throw new ArgumentException("Password is required for local users.");
    }

    private void ValidateRoleAssignment(string role)
    {
        if (role == "PlatformAdmin" && !_scope.IsPlatformAdmin)
            throw new UnauthorizedAccessException();
    }

    private static void ValidatePolicyRule(PolicyRuleRequest request)
    {
        if (!Actions.Contains(request.Action)) throw new ArgumentException("Invalid policy action.");
        if (request.Priority < 0) throw new ArgumentException("Priority must be zero or greater.");
    }

    private static void ApplyRule(PolicyRule rule, PolicyRuleRequest request)
    {
        rule.Name = request.Name.Trim();
        rule.Priority = request.Priority;
        rule.DepartmentId = request.DepartmentId;
        rule.DataType = NullIfBlank(request.DataType);
        rule.WebsitePattern = NullIfBlank(request.WebsitePattern);
        rule.UserEmail = NullIfBlank(request.UserEmail);
        rule.Hostname = NullIfBlank(request.Hostname);
        rule.ActiveFrom = request.ActiveFrom;
        rule.ActiveTo = request.ActiveTo;
        rule.Action = request.Action;
        rule.IsEnabled = request.IsEnabled;
        rule.UpdatedAt = DateTime.UtcNow;
    }

    private static bool WildcardMatch(string? value, string pattern)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var chunks = pattern.Split('*', StringSplitOptions.RemoveEmptyEntries);
        var index = 0;
        foreach (var chunk in chunks)
        {
            index = value.IndexOf(chunk, index, StringComparison.OrdinalIgnoreCase);
            if (index < 0) return false;
            index += chunk.Length;
        }
        return true;
    }

    private static bool IsWithinWindow(TimeOnly time, TimeOnly? from, TimeOnly? to)
    {
        if (!from.HasValue || !to.HasValue) return true;
        return from <= to ? time >= from && time <= to : time >= from || time <= to;
    }

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static UserAdminResponse MapUser(User user) => new()
    {
        Id = user.Id, FullName = user.FullName, Email = user.Email, Role = user.Role,
        DepartmentId = user.DepartmentId, DepartmentName = user.Department?.Name,
        IsActive = user.IsActive, MfaRequired = user.MfaRequired, MfaEnabled = user.MfaEnabled,
        AuthProvider = user.AuthProvider,
        LastLoginAt = user.LastLoginAt, CreatedAt = user.CreatedAt
    };

    private static DepartmentAdminResponse MapDepartment(Department department) => new()
    {
        Id = department.Id, Name = department.Name, Code = department.Code,
        UserCount = department.Users.Count, CreatedAt = department.CreatedAt
    };

    private static FalsePositiveResponse MapFalsePositive(FalsePositiveReport report) => new()
    {
        Id = report.Id, EndpointEventId = report.EndpointEventId,
        ReportedByEmail = report.ReportedByEmail, DetectorName = report.DetectorName,
        Reason = report.Reason, Status = report.Status, ReviewNote = report.ReviewNote,
        CreateWhitelist = report.CreateWhitelist, WhitelistExpiresAt = report.WhitelistExpiresAt,
        CreatedAt = report.CreatedAt, ReviewedAt = report.ReviewedAt
    };

    private static IncidentResponse MapIncident(IncidentCase incident) => new()
    {
        Id = incident.Id, IncidentNumber = incident.IncidentNumber, Title = incident.Title,
        Severity = incident.Severity, Status = incident.Status, SourceType = incident.SourceType,
        EndpointEventId = incident.EndpointEventId, AgentActionLogId = incident.AgentActionLogId,
        AssignedToUserId = incident.AssignedToUserId, AssignedToName = incident.AssignedToUser?.FullName,
        Summary = incident.Summary, Resolution = incident.Resolution, CreatedAt = incident.CreatedAt,
        UpdatedAt = incident.UpdatedAt, ResolvedAt = incident.ResolvedAt
    };

    private static PolicyRuleResponse MapPolicyRule(PolicyRule rule) => new()
    {
        Id = rule.Id, Name = rule.Name, Priority = rule.Priority, DepartmentId = rule.DepartmentId,
        DepartmentName = rule.Department?.Name, DataType = rule.DataType, WebsitePattern = rule.WebsitePattern,
        UserEmail = rule.UserEmail, Hostname = rule.Hostname, ActiveFrom = rule.ActiveFrom,
        ActiveTo = rule.ActiveTo, Action = rule.Action, IsEnabled = rule.IsEnabled,
        Status = rule.Status, Version = rule.Version, UpdatedAt = rule.UpdatedAt, PublishedAt = rule.PublishedAt
    };

    private static IntegrationResponse MapIntegration(IntegrationEndpoint integration) => new()
    {
        Id = integration.Id, Name = integration.Name, Type = integration.Type,
        Endpoint = integration.Endpoint, IsEnabled = integration.IsEnabled,
        LastSuccessAt = integration.LastSuccessAt, LastFailureAt = integration.LastFailureAt,
        LastError = integration.LastError
    };
}
