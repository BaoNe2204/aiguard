using Microsoft.EntityFrameworkCore;
using aiguard_api.Models;
using aiguard_api.Services;

namespace aiguard_api.Data;

public class AiguardDbContext : DbContext
{
    private readonly IDataScopeContext _scope;
    public AiguardDbContext(DbContextOptions<AiguardDbContext> options, IDataScopeContext scope) : base(options) => _scope = scope;

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<AiWebsite> AiWebsites => Set<AiWebsite>();
    public DbSet<EndpointEvent> EndpointEvents => Set<EndpointEvent>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<AgentActionLog> AgentActionLogs => Set<AgentActionLog>();
    public DbSet<SecurityPolicy> SecurityPolicies => Set<SecurityPolicy>();
    public DbSet<Approval> Approvals => Set<Approval>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<BlockchainBatch> BlockchainBatches => Set<BlockchainBatch>();
    public DbSet<AgentToolPermission> AgentToolPermissions => Set<AgentToolPermission>();
    public DbSet<PolicyListEntry> PolicyListEntries => Set<PolicyListEntry>();
    public DbSet<EnrollmentToken> EnrollmentTokens => Set<EnrollmentToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<MfaLoginChallenge> MfaLoginChallenges => Set<MfaLoginChallenge>();
    public DbSet<ScanReceipt> ScanReceipts => Set<ScanReceipt>();
    public DbSet<FalsePositiveReport> FalsePositiveReports => Set<FalsePositiveReport>();
    public DbSet<IncidentCase> IncidentCases => Set<IncidentCase>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<PolicyRule> PolicyRules => Set<PolicyRule>();
    public DbSet<PolicyVersionSnapshot> PolicyVersionSnapshots => Set<PolicyVersionSnapshot>();
    public DbSet<IntegrationEndpoint> IntegrationEndpoints => Set<IntegrationEndpoint>();
    public DbSet<IntegrationDelivery> IntegrationDeliveries => Set<IntegrationDelivery>();
    public DbSet<RetentionPolicy> RetentionPolicies => Set<RetentionPolicy>();
    public DbSet<ExactDataMatchRecord> ExactDataMatchRecords => Set<ExactDataMatchRecord>();
    public DbSet<ShadowAiDiscoveryEvent> ShadowAiDiscoveryEvents => Set<ShadowAiDiscoveryEvent>();
    public DbSet<EndpointTelemetryEvent> EndpointTelemetryEvents => Set<EndpointTelemetryEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Department>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.Id == _scope.DepartmentId));
        modelBuilder.Entity<User>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<Device>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<EndpointEvent>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<Agent>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<AgentActionLog>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<AgentToolPermission>().HasQueryFilter(x =>
            x.Agent.TenantCode == _scope.TenantCode &&
            (!_scope.RestrictToDepartment || x.Agent.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<PasswordResetToken>().HasQueryFilter(x =>
            x.User.TenantCode == _scope.TenantCode &&
            (!_scope.RestrictToDepartment || x.User.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<MfaLoginChallenge>().HasQueryFilter(x =>
            x.User.TenantCode == _scope.TenantCode &&
            (!_scope.RestrictToDepartment || x.User.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<ScanReceipt>().HasQueryFilter(x =>
            x.Device.TenantCode == _scope.TenantCode &&
            (!_scope.RestrictToDepartment || x.Device.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<AiWebsite>().HasQueryFilter(x => x.TenantCode == _scope.TenantCode);
        modelBuilder.Entity<Approval>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<AuditLog>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<BlockchainBatch>().HasQueryFilter(x => x.TenantCode == _scope.TenantCode);
        modelBuilder.Entity<PolicyListEntry>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId || x.DepartmentId == null));
        modelBuilder.Entity<SecurityPolicy>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId || x.DepartmentId == null));
        modelBuilder.Entity<FalsePositiveReport>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<IncidentCase>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<UserNotification>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<PolicyRule>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId || x.DepartmentId == null));
        modelBuilder.Entity<PolicyVersionSnapshot>().HasQueryFilter(x => x.TenantCode == _scope.TenantCode);
        modelBuilder.Entity<IntegrationEndpoint>().HasQueryFilter(x => x.TenantCode == _scope.TenantCode);
        modelBuilder.Entity<IntegrationDelivery>().HasQueryFilter(x => x.TenantCode == _scope.TenantCode);
        modelBuilder.Entity<RetentionPolicy>().HasQueryFilter(x => x.TenantCode == _scope.TenantCode);
        modelBuilder.Entity<ExactDataMatchRecord>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId || x.DepartmentId == null));
        modelBuilder.Entity<ShadowAiDiscoveryEvent>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));
        modelBuilder.Entity<EndpointTelemetryEvent>().HasQueryFilter(x =>
            x.TenantCode == _scope.TenantCode && (!_scope.RestrictToDepartment || x.DepartmentId == _scope.DepartmentId));

        // ── Department ──
        modelBuilder.Entity<Department>(e =>
        {
            e.HasIndex(d => new { d.TenantCode, d.Code }).IsUnique();
        });

        // ── User ──
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => new { u.TenantCode, u.Email }).IsUnique();
            e.HasOne(u => u.Department)
                .WithMany(d => d.Users)
                .HasForeignKey(u => u.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Device ──
        modelBuilder.Entity<Device>(e =>
        {
            e.HasIndex(d => new { d.TenantCode, d.Hostname }).IsUnique();
            e.HasIndex(d => d.EndpointKeyHash);
        });

        modelBuilder.Entity<ScanReceipt>(e =>
        {
            e.HasIndex(r => r.ExpiresAt);
            e.HasOne(r => r.Device).WithMany().HasForeignKey(r => r.DeviceId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── AiWebsite ──
        modelBuilder.Entity<AiWebsite>();

        // ── EndpointEvent ──
        modelBuilder.Entity<EndpointEvent>(e =>
        {
            e.HasIndex(ev => ev.CreatedAt);
            e.HasIndex(ev => ev.UserEmail);
        });

        // ── Agent ──
        modelBuilder.Entity<Agent>(e =>
        {
            e.HasIndex(a => new { a.TenantCode, a.Code }).IsUnique();
            e.HasOne(a => a.Department)
                .WithMany(d => d.Agents)
                .HasForeignKey(a => a.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── AgentActionLog ──
        modelBuilder.Entity<AgentActionLog>(e =>
        {
            e.HasOne(l => l.Agent)
                .WithMany(a => a.ActionLogs)
                .HasForeignKey(l => l.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(l => l.CreatedAt);
        });

        modelBuilder.Entity<AgentToolPermission>(e =>
        {
            e.HasIndex(p => new { p.AgentId, p.ToolName }).IsUnique();
            e.HasOne(p => p.Agent)
                .WithMany(a => a.ToolPermissions)
                .HasForeignKey(p => p.AgentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PolicyListEntry>(e =>
        {
            e.HasIndex(p => new { p.ListType, p.EntryType, p.Value, p.DepartmentId }).IsUnique();
            e.HasOne(p => p.Department)
                .WithMany()
                .HasForeignKey(p => p.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EnrollmentToken>(e =>
        {
            e.HasIndex(t => t.TokenHash).IsUnique();
            e.HasIndex(t => t.ExpiresAt);
        });

        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.HasIndex(t => t.TokenHash).IsUnique();
            e.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SecurityPolicy ──
        modelBuilder.Entity<MfaLoginChallenge>(e =>
        {
            e.HasIndex(t => t.ChallengeTokenHash).IsUnique();
            e.HasIndex(t => t.ExpiresAt);
            e.HasOne(t => t.User)
                .WithMany(u => u.MfaLoginChallenges)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SecurityPolicy>(e =>
        {
            e.HasOne(p => p.Department)
                .WithMany(d => d.SecurityPolicies)
                .HasForeignKey(p => p.DepartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Approval ──
        modelBuilder.Entity<Approval>(e =>
        {
            e.HasOne(a => a.EndpointEvent)
                .WithMany(ev => ev.Approvals)
                .HasForeignKey(a => a.EndpointEventId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.AgentActionLog)
                .WithMany(al => al.Approvals)
                .HasForeignKey(a => a.AgentActionLogId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(a => a.AssignedApprover)
                .WithMany(u => u.AssignedApprovals)
                .HasForeignKey(a => a.AssignedApproverId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasIndex(a => a.Status);
        });

        // ── AuditLog ──
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasOne(a => a.Department)
                .WithMany(d => d.AuditLogs)
                .HasForeignKey(a => a.DepartmentId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(a => a.BlockchainBatch)
                .WithMany(b => b.AuditLogs)
                .HasForeignKey(a => a.BlockchainBatchId)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasIndex(a => a.CreatedAt);
        });

        // ── BlockchainBatch ──
        modelBuilder.Entity<BlockchainBatch>(e =>
        {
            e.HasIndex(b => b.Status);
        });

        modelBuilder.Entity<FalsePositiveReport>(e =>
        {
            e.HasIndex(r => new { r.Status, r.CreatedAt });
            e.HasOne(r => r.EndpointEvent).WithMany().HasForeignKey(r => r.EndpointEventId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.ReviewedByUser).WithMany().HasForeignKey(r => r.ReviewedByUserId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<IncidentCase>(e =>
        {
            e.HasIndex(i => new { i.TenantCode, i.IncidentNumber }).IsUnique();
            e.HasIndex(i => new { i.Status, i.Severity, i.CreatedAt });
            e.HasOne(i => i.EndpointEvent).WithMany().HasForeignKey(i => i.EndpointEventId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(i => i.AgentActionLog).WithMany().HasForeignKey(i => i.AgentActionLogId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(i => i.AssignedToUser).WithMany().HasForeignKey(i => i.AssignedToUserId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<UserNotification>(e =>
        {
            e.HasIndex(n => new { n.IsRead, n.CreatedAt });
            e.HasOne(n => n.RecipientUser).WithMany().HasForeignKey(n => n.RecipientUserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PolicyRule>(e =>
        {
            e.HasIndex(r => new { r.Status, r.Priority });
            e.HasOne(r => r.Department).WithMany().HasForeignKey(r => r.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PolicyVersionSnapshot>(e =>
        {
            e.HasIndex(v => new { v.TenantCode, v.Version }).IsUnique();
        });

        modelBuilder.Entity<IntegrationEndpoint>(e =>
        {
            e.HasIndex(i => new { i.TenantCode, i.Name }).IsUnique();
        });

        modelBuilder.Entity<IntegrationDelivery>(e =>
        {
            e.HasIndex(d => new { d.IntegrationEndpointId, d.AuditLogId }).IsUnique();
            e.HasIndex(d => new { d.Status, d.NextAttemptAt });
            e.HasOne(d => d.IntegrationEndpoint).WithMany(i => i.Deliveries)
                .HasForeignKey(d => d.IntegrationEndpointId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(d => d.AuditLog).WithMany()
                .HasForeignKey(d => d.AuditLogId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RetentionPolicy>(e =>
        {
            e.HasIndex(r => r.TenantCode).IsUnique();
        });

        modelBuilder.Entity<ExactDataMatchRecord>(e =>
        {
            e.HasIndex(r => new { r.TenantCode, r.DataType, r.ValueHash }).IsUnique();
            e.HasOne(r => r.Department).WithMany().HasForeignKey(r => r.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ShadowAiDiscoveryEvent>(e =>
        {
            e.HasIndex(x => new { x.TenantCode, x.DeviceId, x.Domain }).IsUnique();
            e.HasIndex(x => x.LastSeenAt);
            e.HasOne(x => x.Device).WithMany().HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<EndpointTelemetryEvent>(e =>
        {
            e.HasIndex(x => new { x.Category, x.ReceivedAt });
            e.HasIndex(x => x.DeviceId);
            e.HasOne(x => x.Device).WithMany().HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
