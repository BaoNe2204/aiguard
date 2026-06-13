using aiguard_api.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace aiguard_api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AiguardDbContext db)
    {
        if (db.Departments.Any()) return; // Already seeded

        // ── Departments ──
        var deptEng = new Department { Name = "Engineering / Phát triển", Code = "ENG" };
        var deptHr = new Department { Name = "Human Resources / Nhân sự", Code = "HR" };
        var deptSales = new Department { Name = "Sales / Kinh doanh", Code = "SALES" };
        var deptFin = new Department { Name = "Finance / Tài chính", Code = "FIN" };
        var deptLegal = new Department { Name = "Legal / Pháp chế", Code = "LEGAL" };

        db.Departments.AddRange(deptEng, deptHr, deptSales, deptFin, deptLegal);
        await db.SaveChangesAsync();

        // ── Users ──
        var adminUser = new User
        {
            FullName = "System Administrator",
            Email = "admin@aiguard.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "SystemAdmin",
            DepartmentId = deptEng.Id
        };
        var securityAdmin = new User
        {
            FullName = "Security Admin",
            Email = "security.admin@company.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Security@123"),
            Role = "SecurityAdmin",
            DepartmentId = deptEng.Id
        };
        var hrManager = new User
        {
            FullName = "HR Manager",
            Email = "hr.manager@company.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("HrManager@123"),
            Role = "DepartmentManager",
            DepartmentId = deptHr.Id
        };
        var employee1 = new User
        {
            FullName = "Nguyễn Văn A",
            Email = "nguyenvana@company.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Employee@123"),
            Role = "Employee",
            DepartmentId = deptEng.Id
        };
        var auditor = new User
        {
            FullName = "Auditor User",
            Email = "auditor@company.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Auditor@123"),
            Role = "Auditor",
            DepartmentId = deptFin.Id
        };

        db.Users.AddRange(adminUser, securityAdmin, hrManager, employee1, auditor);
        await db.SaveChangesAsync();

        // ── Security Policies ──
        db.SecurityPolicies.AddRange(
            new SecurityPolicy { Name = "Global Default Policy", DepartmentId = null, SensitivityThreshold = 70, Version = "p-global-1.0.0" },
            new SecurityPolicy { Name = "Engineering Policy", DepartmentId = deptEng.Id, SensitivityThreshold = 70, Version = "p-eng-1.0.0" },
            new SecurityPolicy { Name = "HR Policy", DepartmentId = deptHr.Id, SensitivityThreshold = 50, Version = "p-hr-1.0.0" },
            new SecurityPolicy { Name = "Sales Policy", DepartmentId = deptSales.Id, SensitivityThreshold = 60, Version = "p-sales-1.0.0" },
            new SecurityPolicy { Name = "Finance Policy", DepartmentId = deptFin.Id, SensitivityThreshold = 60, EnableFinancialDetection = true, Version = "p-fin-1.0.0" },
            new SecurityPolicy { Name = "Legal Policy", DepartmentId = deptLegal.Id, SensitivityThreshold = 55, Version = "p-legal-1.0.0" }
        );

        db.PolicyListEntries.AddRange(
            new PolicyListEntry { ListType = "Whitelist", EntryType = "Keyword", Value = "company-test-db" },
            new PolicyListEntry { ListType = "Whitelist", EntryType = "Keyword", Value = "sandbox-api-token" },
            new PolicyListEntry { ListType = "Blacklist", EntryType = "Keyword", Value = "prod-db-password" },
            new PolicyListEntry { ListType = "Blacklist", EntryType = "Keyword", Value = "revenue-q4-leak" }
        );

        db.RetentionPolicies.Add(new RetentionPolicy
        {
            EndpointEventDays = 90,
            AuditLogDays = 365,
            NotificationDays = 30,
            IncidentDays = 730,
            StoreOriginalContent = false,
            EncryptSensitivePreview = true
        });

        db.PolicyRules.AddRange(
            new PolicyRule
            {
                Name = "Block HR identity data on public AI",
                Priority = 10,
                DepartmentId = deptHr.Id,
                DataType = "CCCD",
                WebsitePattern = "*",
                Action = "Block",
                Status = "Published",
                Version = "rule-seed-hr-1",
                PublishedAt = DateTime.UtcNow
            },
            new PolicyRule
            {
                Name = "Require approval for engineering source code",
                Priority = 20,
                DepartmentId = deptEng.Id,
                DataType = "Source Code",
                WebsitePattern = "*",
                Action = "PendingApproval",
                Status = "Published",
                Version = "rule-seed-eng-1",
                PublishedAt = DateTime.UtcNow
            });

        // ── AI Websites ──
        db.AiWebsites.AddRange(
            new AiWebsite { Name = "ChatGPT", DomainPattern = "*.openai.com", IsActive = true, Mode = "Block" },
            new AiWebsite { Name = "Google Gemini", DomainPattern = "gemini.google.com", IsActive = true, Mode = "Mask" },
            new AiWebsite { Name = "GitHub Copilot", DomainPattern = "*.github.com/copilot*", IsActive = true, Mode = "PendingApproval" },
            new AiWebsite { Name = "Claude", DomainPattern = "claude.ai", IsActive = true, Mode = "Block" },
            new AiWebsite { Name = "DeepSeek", DomainPattern = "*.deepseek.com", IsActive = true, Mode = "Block" }
        );

        // ── Agents ──
        db.Agents.AddRange(
            new Agent { Name = "HRRecruitmentAgent", Code = "HR-AGENT-01", Description = "AI Agent hỗ trợ tuyển dụng và quản lý CV ứng viên", DepartmentId = deptHr.Id },
            new Agent { Name = "SalesSupportAgent", Code = "SALE-AGENT-02", Description = "AI Agent phân tích dữ liệu khách hàng và hỗ trợ bán hàng", DepartmentId = deptSales.Id },
            new Agent { Name = "ITSupportAgent", Code = "IT-AGENT-03", Description = "AI Agent hỗ trợ kỹ thuật, phân tích log hệ thống", DepartmentId = deptEng.Id }
        );
        await db.SaveChangesAsync();

        var hrAgent = await db.Agents.FirstAsync(a => a.Code == "HR-AGENT-01");
        var salesAgent = await db.Agents.FirstAsync(a => a.Code == "SALE-AGENT-02");
        var itAgent = await db.Agents.FirstAsync(a => a.Code == "IT-AGENT-03");

        db.AgentToolPermissions.AddRange(
            new AgentToolPermission
            {
                AgentId = hrAgent.Id, ToolName = "ReadEmployeeData", Category = "HR Data",
                CanRead = true, RequiresApproval = true, MaxRecordsPerCall = 10
            },
            new AgentToolPermission
            {
                AgentId = hrAgent.Id, ToolName = "SendExternalEmail", Category = "Communications",
                CanSendExternal = false, RequiresApproval = true, MaxRecordsPerCall = 1
            },
            new AgentToolPermission
            {
                AgentId = salesAgent.Id, ToolName = "QueryCustomerTable", Category = "Customer Data",
                CanRead = true, MaxRecordsPerCall = 200
            },
            new AgentToolPermission
            {
                AgentId = salesAgent.Id, ToolName = "ExportCustomerReport", Category = "Data Export",
                CanExport = true, RequiresApproval = true, MaxRecordsPerCall = 50
            },
            new AgentToolPermission
            {
                AgentId = itAgent.Id, ToolName = "QuerySystemLogs", Category = "System Operations",
                CanRead = true, MaxRecordsPerCall = 500
            },
            new AgentToolPermission
            {
                AgentId = itAgent.Id, ToolName = "RestartService", Category = "System Operations",
                CanWrite = true, RequiresApproval = true, MaxRecordsPerCall = 1
            }
        );

        // ── Devices (demo) ──
        db.Devices.AddRange(
            new Device
            {
                Hostname = "DESKTOP-ENG01",
                UserEmail = "nguyenvana@company.com",
                DepartmentName = "Engineering / Phát triển",
                AgentVersion = "1.0.0",
                ExtensionVersion = "1.0.0",
                ExtensionActive = true,
                PolicyVersion = "p-20260601",
                RiskStatus = "Safe"
            },
            new Device
            {
                Hostname = "LAPTOP-HR02",
                UserEmail = "hr.manager@company.com",
                DepartmentName = "Human Resources / Nhân sự",
                AgentVersion = "1.0.0",
                ExtensionVersion = "1.0.0",
                ExtensionActive = true,
                PolicyVersion = "p-20260601",
                RiskStatus = "Warning"
            },
            new Device
            {
                Hostname = "DESKTOP-SALES03",
                UserEmail = "sales-rep@company.com",
                DepartmentName = "Sales / Kinh doanh",
                AgentVersion = "0.9.5",
                ExtensionVersion = null,
                ExtensionActive = false,
                PolicyVersion = "p-20260515",
                RiskStatus = "Critical"
            }
        );

        // ── Demo Endpoint Events ──
        db.EndpointEvents.AddRange(
            new EndpointEvent
            {
                UserEmail = "nguyenvana@company.com",
                Hostname = "DESKTOP-ENG01",
                Browser = "Chrome 126",
                WebsiteAi = "ChatGPT",
                EventType = "SendBlocked",
                RiskScore = 92,
                RiskLevel = "Critical",
                Decision = "Block",
                DataTypeMatched = "API Key, Database URL",
                MaskedContentPreview = "sk-proj-[MASKED]... Server=[MASKED];Password=[MASKED]",
                OriginalHash = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
                PolicyVersion = "p-20260601"
            },
            new EndpointEvent
            {
                UserEmail = "hr.manager@company.com",
                Hostname = "LAPTOP-HR02",
                Browser = "Edge 126",
                WebsiteAi = "Gemini",
                EventType = "PromptMasked",
                RiskScore = 45,
                RiskLevel = "Medium",
                Decision = "Mask",
                DataTypeMatched = "Email, Phone",
                MaskedContentPreview = "Ứng viên [CUSTOMER_NAME], email [EMAIL], SĐT [PHONE]",
                OriginalHash = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
                PolicyVersion = "p-20260601"
            },
            new EndpointEvent
            {
                UserEmail = "nguyenvana@company.com",
                Hostname = "DESKTOP-ENG01",
                Browser = "Chrome 126",
                WebsiteAi = "Claude",
                EventType = "PromptPasteDetected",
                RiskScore = 72,
                RiskLevel = "High",
                Decision = "PendingApproval",
                DataTypeMatched = "Source Code",
                MaskedContentPreview = "public class [CLASS_NAME] { ... }",
                OriginalHash = "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
                PolicyVersion = "p-20260601"
            }
        );

        await db.SaveChangesAsync();
    }
}
