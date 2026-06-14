using aiguard_api.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace aiguard_api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AiguardDbContext db, IConfiguration configuration)
    {
        await EnsurePlatformAdminAsync(db, configuration);

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
            Role = "TenantOwner",
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
        db.Users.AddRange(adminUser, securityAdmin, hrManager, employee1);
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
        await SeedSaasAsync(db, configuration);
    }

    private static async Task SeedSaasAsync(AiguardDbContext db, IConfiguration configuration)
    {
        var starter = await db.ProductPlans.FirstOrDefaultAsync(x => x.Code == "STARTER");
        if (starter == null)
        {
            starter = new ProductPlan
            {
                Code = "STARTER",
                Name = "Starter",
                Description = "DLP prompt, browser extension, basic policy and reports.",
                MonthlyPrice = 149000,
                YearlyPrice = 1490000,
                IncludedUsers = 25,
                IncludedDevices = 25,
                MaxAgents = 2,
                FeaturesJson = "[\"Prompt DLP\",\"Browser Extension\",\"Basic Reports\"]",
                DisplayOrder = 1
            };
            db.ProductPlans.Add(starter);
        }

        var business = await db.ProductPlans.FirstOrDefaultAsync(x => x.Code == "BUSINESS");
        if (business == null)
        {
            business = new ProductPlan
            {
                Code = "BUSINESS",
                Name = "Business",
                Description = "Advanced DLP, approvals, endpoint agent, SIEM and AI Agent controls.",
                MonthlyPrice = 299000,
                YearlyPrice = 2990000,
                IncludedUsers = 100,
                IncludedDevices = 120,
                MaxAgents = 10,
                FeaturesJson = "[\"Advanced DLP\",\"Approval Workflow\",\"Desktop Agent\",\"SIEM\",\"AI Agent Control\"]",
                DisplayOrder = 2
            };
            db.ProductPlans.Add(business);
        }

        var enterprise = await db.ProductPlans.FirstOrDefaultAsync(x => x.Code == "ENTERPRISE");
        if (enterprise == null)
        {
            enterprise = new ProductPlan
            {
                Code = "ENTERPRISE",
                Name = "Enterprise",
                Description = "Full platform with custom limits, blockchain anchoring and premium support.",
                MonthlyPrice = 0,
                YearlyPrice = 0,
                IncludedUsers = 10000,
                IncludedDevices = 10000,
                MaxAgents = 1000,
                FeaturesJson = "[\"Unlimited Policies\",\"Blockchain Audit\",\"SSO\",\"Premium SLA\",\"Custom Integrations\"]",
                DisplayOrder = 3
            };
            db.ProductPlans.Add(enterprise);
        }
        await db.SaveChangesAsync();

        var defaultTenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Code == "DEFAULT");
        if (defaultTenant == null)
        {
            var owner = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x =>
                x.TenantCode == "DEFAULT" && x.Email == "admin@aiguard.com");
            defaultTenant = new Tenant
            {
                Code = "DEFAULT",
                CompanyName = "AIGuard Demo Enterprise",
                LegalName = "AIGuard Demo Enterprise",
                EmailDomain = "company.com",
                Status = "Paid",
                OwnerName = owner?.FullName ?? "System Administrator",
                OwnerEmail = owner?.Email ?? "admin@aiguard.com",
                OwnerUserId = owner?.Id,
                Industry = "Technology",
                CompanySize = "Demo"
            };
            db.Tenants.Add(defaultTenant);
            db.TenantSettings.Add(new TenantSettings
            {
                TenantId = defaultTenant.Id,
                TenantCode = defaultTenant.Code,
                PrimaryDomain = "company.com",
                BankCode = "VCB",
                BankAccountNumber = "0000000000",
                BankAccountName = "AIGUARD DEMO"
            });
            db.CustomerContacts.Add(new CustomerContact
            {
                TenantId = defaultTenant.Id,
                TenantCode = defaultTenant.Code,
                FullName = defaultTenant.OwnerName,
                Email = defaultTenant.OwnerEmail,
                IsPrimary = true,
                IsBillingContact = true
            });
            await db.SaveChangesAsync();
        }

        var defaultSubscription = await db.Subscriptions.IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.TenantCode == "DEFAULT" && x.Status == "Active");
        if (defaultSubscription == null)
        {
            var now = DateTime.UtcNow;
            defaultSubscription = new Subscription
            {
                TenantId = defaultTenant.Id,
                TenantCode = defaultTenant.Code,
                ProductPlanId = enterprise.Id,
                Status = "Active",
                BillingCycle = "Yearly",
                UserLimit = enterprise.IncludedUsers,
                DeviceLimit = enterprise.IncludedDevices,
                AgentLimit = enterprise.MaxAgents,
                StartsAt = now,
                CurrentPeriodStartsAt = now,
                CurrentPeriodEndsAt = now.AddYears(10),
                AutoRenew = true
            };
            db.Subscriptions.Add(defaultSubscription);
            db.TenantLicenses.Add(new TenantLicense
            {
                TenantId = defaultTenant.Id,
                TenantCode = defaultTenant.Code,
                SubscriptionId = defaultSubscription.Id,
                KeyPrefix = "AIG-DEFAULT-DEMO",
                KeyHash = Hash("AIG-DEFAULT-DEMO-LICENSE-NOT-FOR-PRODUCTION"),
                UserLimit = defaultSubscription.UserLimit,
                DeviceLimit = defaultSubscription.DeviceLimit,
                AgentLimit = defaultSubscription.AgentLimit,
                StartsAt = now,
                ExpiresAt = now.AddYears(10)
            });
            db.TenantOnboardings.Add(new TenantOnboarding
            {
                TenantId = defaultTenant.Id,
                TenantCode = defaultTenant.Code,
                Status = "Completed",
                AdminCreated = true,
                EnrollmentTokenCreated = true,
                ExtensionInstalled = true,
                FirstUserAdded = true,
                PolicyEnabled = true,
                TestPromptCompleted = true,
                CompletedAt = now
            });
        }

        var platformEmail = configuration["BootstrapPlatformAdmin:Email"]?.Trim().ToLowerInvariant();
        var platformPassword = configuration["BootstrapPlatformAdmin:Password"];
        if (!string.IsNullOrWhiteSpace(platformEmail) &&
            !string.IsNullOrWhiteSpace(platformPassword) &&
            platformPassword.Length >= 12 &&
            !await db.Users.IgnoreQueryFilters().AnyAsync(x =>
                x.TenantCode == "PLATFORM" && x.Email == platformEmail))
        {
            db.Users.Add(new User
            {
                FullName = "AIGuard Platform Owner",
                Email = platformEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(platformPassword),
                Role = "PlatformAdmin",
                TenantCode = "PLATFORM",
                MfaRequired = false
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task EnsurePlatformAdminAsync(AiguardDbContext db, IConfiguration configuration)
    {
        var platformEmail = configuration["BootstrapPlatformAdmin:Email"]?.Trim().ToLowerInvariant();
        var platformPassword = configuration["BootstrapPlatformAdmin:Password"];
        if (string.IsNullOrWhiteSpace(platformEmail) ||
            string.IsNullOrWhiteSpace(platformPassword) ||
            platformPassword.Length < 12)
        {
            return;
        }

        var platformUser = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x =>
            x.TenantCode == "PLATFORM" && x.Email == platformEmail);
        if (platformUser == null)
        {
            db.Users.Add(new User
            {
                FullName = "AIGuard Platform Owner",
                Email = platformEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(platformPassword),
                Role = "PlatformAdmin",
                TenantCode = "PLATFORM",
                IsActive = true,
                MfaRequired = false
            });
        }
        else
        {
            platformUser.Role = "PlatformAdmin";
            platformUser.TenantCode = "PLATFORM";
            platformUser.IsActive = true;
            platformUser.MfaRequired = false;
            if (!BCrypt.Net.BCrypt.Verify(platformPassword, platformUser.PasswordHash))
            {
                platformUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(platformPassword);
            }
        }

        await db.SaveChangesAsync();
    }
}
