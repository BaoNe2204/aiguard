using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Saas;
using aiguard_api.DTOs.Governance;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface ISaasBusinessService
{
    Task<BusinessDashboardResponse> GetDashboardAsync();
    Task<PagedResult<TenantResponse>> GetTenantsAsync(PagedQuery query, string? status);
    Task<TenantResponse?> GetTenantAsync(Guid id);
    Task<TenantResponse?> GetCurrentTenantAsync();
    Task<TrialProvisioningResponse> CreateTrialAsync(CreateTrialRequest request);
    Task<PublicTrialSignupResponse> RegisterTrialSignupAsync(PublicTrialSignupRequest request);
    Task<VerifyTrialSignupResponse?> VerifyTrialSignupAsync(VerifyTrialSignupRequest request);
    Task<TenantResponse?> UpdateTenantAsync(Guid id, TenantRequest request);
    Task<TenantResponse?> UpdateTenantStatusAsync(Guid id, string status);
    Task<TenantSettingsResponse> GetSettingsAsync(Guid? tenantId);
    Task<TenantSettingsResponse> UpdateSettingsAsync(Guid? tenantId, TenantSettingsRequest request);
    Task<List<ContactResponse>> GetContactsAsync(Guid? tenantId);
    Task<ContactResponse> CreateContactAsync(Guid? tenantId, ContactRequest request);
    Task<ContactResponse?> UpdateContactAsync(Guid id, Guid? tenantId, ContactRequest request);
    Task<bool> DeleteContactAsync(Guid id);
    Task<List<ProductPlanResponse>> GetPlansAsync(bool activeOnly);
    Task<ProductPlanResponse> CreatePlanAsync(ProductPlanRequest request);
    Task<ProductPlanResponse?> UpdatePlanAsync(Guid id, ProductPlanRequest request);
    Task<bool> DeletePlanAsync(Guid id);
    Task<PagedResult<OrderResponse>> GetOrdersAsync(PagedQuery query, string? status, Guid? tenantId);
    Task<OrderResponse> CreateOrderAsync(OrderRequest request);
    Task<OrderResponse?> CancelOrderAsync(Guid id, string? reason);
    Task<PaymentResponse> RecordPaymentAsync(Guid orderId, PaymentRequest request);
    Task<CheckoutOrderResponse> CompleteCheckoutAsync(Guid orderId, CheckoutOrderRequest request, string actorEmail);
    Task<PagedResult<PaymentResponse>> GetPaymentsAsync(PagedQuery query, string? status, Guid? tenantId);
    Task<PaymentResponse?> ReconcilePaymentAsync(Guid id, PaymentReconcileRequest request, string actorEmail);
    Task<List<SubscriptionResponse>> GetSubscriptionsAsync(Guid? tenantId);
    Task<SubscriptionResponse?> ChangeSubscriptionAsync(Guid id, SubscriptionChangeRequest request);
    Task<LicenseCreatedResponse> ProvisionOrderAsync(Guid orderId);
    Task<List<LicenseResponse>> GetLicensesAsync(Guid? tenantId);
    Task<LicenseCreatedResponse> CreateLicenseAsync(LicenseCreateRequest request);
    Task<LicenseResponse?> UpdateLicenseStatusAsync(Guid id, string status, string? reason);
    Task<LicenseCreatedResponse?> RotateLicenseAsync(Guid id);
    Task<LicenseCreatedResponse?> RenewLicenseAsync(Guid id, LicenseRenewRequest request);
    Task<EntitlementResponse> ValidateLicenseAsync(LicenseValidationRequest request);
    Task<PagedResult<InvoiceResponse>> GetInvoicesAsync(PagedQuery query, string? status, Guid? tenantId);
    Task<InvoiceResponse> CreateInvoiceAsync(InvoiceRequest request);
    Task<InvoiceResponse?> UpdateInvoiceStatusAsync(Guid id, string status);
    Task<PagedResult<QuotationResponse>> GetQuotationsAsync(PagedQuery query, string? status, Guid? tenantId);
    Task<QuotationResponse> CreateQuotationAsync(QuotationRequest request);
    Task<QuotationResponse?> UpdateQuotationStatusAsync(Guid id, string status);
    Task<OrderResponse?> ConvertQuotationToOrderAsync(Guid id);
    Task<List<ContractResponse>> GetContractsAsync(Guid? tenantId, string? status);
    Task<ContractResponse> CreateContractAsync(ContractRequest request);
    Task<ContractResponse?> UpdateContractAsync(Guid id, ContractActionRequest request);
    Task<OnboardingResponse?> GetOnboardingAsync(Guid? tenantId);
    Task<OnboardingResponse> EnsureOnboardingAsync(Guid? tenantId);
    Task<OnboardingListResponse> GetAllOnboardingAsync();
    Task<OnboardingResponse?> UpdateOnboardingAsync(Guid? tenantId, OnboardingUpdateRequest request);
    Task<EnrollmentTokenResponse> RegenerateEnrollmentTokenAsync(Guid? tenantId);
    Task<PagedResult<TicketResponse>> GetTicketsAsync(PagedQuery query, string? status, Guid? tenantId);
    Task<TicketResponse> CreateTicketAsync(TicketRequest request, string requesterEmail);
    Task<TicketResponse?> UpdateTicketAsync(Guid id, TicketUpdateRequest request);
    Task<TicketResponse?> AddTicketMessageAsync(Guid id, TicketMessageRequest request, string authorEmail, bool isStaff);
    
    // CRM User Management
    Task<List<UserAdminResponse>> GetTenantUsersAsync(Guid tenantId);
    Task<UserAdminResponse?> UpdateTenantUserAsync(Guid tenantId, Guid userId, UpsertUserRequest request);
    Task<UserAdminResponse?> ChangeTenantUserPasswordAsync(Guid tenantId, Guid userId, string newPassword);
}

public class SaasBusinessService : ISaasBusinessService
{
    private static readonly HashSet<string> TenantStatuses = ["Trial", "Paid", "Suspended", "Expired", "Cancelled"];
    private static readonly HashSet<string> OrderStatuses = ["PendingPayment", "Reconciling", "Paid", "Cancelled", "Provisioned"];
    private static readonly HashSet<string> DocumentStatuses = ["Draft", "Issued", "Sent", "Accepted", "Rejected", "Paid", "Void", "Expired"];
    private static readonly HashSet<string> ContractStatuses = ["Draft", "Sent", "Signed", "Active", "Expired", "Terminated"];
    private static readonly HashSet<string> TicketStatuses = ["Open", "InProgress", "WaitingCustomer", "Resolved", "Closed"];
    private readonly AiguardDbContext _db;
    private readonly IDataScopeContext _scope;
    private readonly IEndpointSecurityService _security;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    public SaasBusinessService(
        AiguardDbContext db,
        IDataScopeContext scope,
        IEndpointSecurityService security,
        IEmailSender emailSender,
        IConfiguration configuration)
    {
        _db = db;
        _scope = scope;
        _security = security;
        _emailSender = emailSender;
        _configuration = configuration;
    }

    public async Task<BusinessDashboardResponse> GetDashboardAsync()
    {
        EnsurePlatformAdmin();
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return new BusinessDashboardResponse
        {
            TotalTenants = await _db.Tenants.CountAsync(),
            TrialTenants = await _db.Tenants.CountAsync(x => x.Status == "Trial"),
            PaidTenants = await _db.Tenants.CountAsync(x => x.Status == "Paid"),
            PendingOrders = await _db.SalesOrders.CountAsync(x => x.Status == "PendingPayment" || x.Status == "Reconciling"),
            PendingPayments = await _db.PaymentRecords.CountAsync(x => x.Status == "PendingReconciliation"),
            ActiveSubscriptions = await _db.Subscriptions.CountAsync(x => x.Status == "Active" || x.Status == "Trial"),
            ExpiringLicenses = await _db.TenantLicenses.CountAsync(x =>
                x.Status == "Active" && x.ExpiresAt <= DateTime.UtcNow.AddDays(30)),
            OpenTickets = await _db.SupportTickets.CountAsync(x => x.Status != "Resolved" && x.Status != "Closed"),
            RecognizedRevenue = await _db.PaymentRecords
                .Where(x => x.Status == "Confirmed" && x.ReconciledAt >= monthStart)
                .SumAsync(x => (decimal?)x.Amount) ?? 0
        };
    }

    public async Task<PagedResult<TenantResponse>> GetTenantsAsync(PagedQuery query, string? status)
    {
        EnsurePlatformAdmin();
        var q = _db.Tenants.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(x => x.CompanyName.ToLower().Contains(search) ||
                x.Code.ToLower().Contains(search) || x.OwnerEmail.ToLower().Contains(search));
        }
        var total = await q.CountAsync();
        var tenants = await q.OrderByDescending(x => x.CreatedAt)
            .Skip(Offset(query)).Take(PageSize(query)).ToListAsync();
        var items = new List<TenantResponse>();
        foreach (var tenant in tenants) items.Add(await MapTenantAsync(tenant));
        return Page(items, total, query);
    }

    public async Task<TenantResponse?> GetTenantAsync(Guid id)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.Id == id);
        return tenant == null ? null : await MapTenantAsync(tenant);
    }

    public async Task<TenantResponse?> GetCurrentTenantAsync()
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.Code == _scope.TenantCode);
        return tenant == null ? null : await MapTenantAsync(tenant);
    }

    public async Task<TrialProvisioningResponse> CreateTrialAsync(CreateTrialRequest request)
    {
        EnsurePlatformAdmin();
        var code = NormalizeCode(request.Code);
        if (await _db.Tenants.IgnoreQueryFilters().AnyAsync(x => x.Code == code))
            throw new ArgumentException("Tenant code already exists.");
        if (await _db.Users.IgnoreQueryFilters().AnyAsync(x => x.TenantCode == code && x.Email == request.OwnerEmail.ToLower()))
            throw new ArgumentException("Owner email already exists in this tenant.");

        var plan = request.ProductPlanId.HasValue
            ? await _db.ProductPlans.FindAsync(request.ProductPlanId.Value)
            : await _db.ProductPlans.FirstOrDefaultAsync(x => x.Code == "STARTER" && x.IsActive)
                ?? await _db.ProductPlans.FirstOrDefaultAsync(x => x.IsActive);
        if (plan == null) throw new ArgumentException("No active product plan is available.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;
        var expires = now.AddDays(request.TrialDays);
        var tenant = new Tenant
        {
            Code = code,
            CompanyName = request.CompanyName.Trim(),
            LegalName = request.LegalName?.Trim(),
            TaxCode = request.TaxCode?.Trim(),
            EmailDomain = request.EmailDomain?.Trim().ToLowerInvariant(),
            Status = "Trial",
            OwnerName = request.OwnerName.Trim(),
            OwnerEmail = request.OwnerEmail.Trim().ToLowerInvariant(),
            OwnerPhone = request.OwnerPhone?.Trim(),
            Industry = request.Industry?.Trim(),
            CompanySize = request.CompanySize?.Trim(),
            SalesNotes = request.SalesNotes?.Trim(),
            TrialStartsAt = now,
            TrialEndsAt = expires
        };
        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync();

        var owner = new User
        {
            FullName = tenant.OwnerName,
            Email = tenant.OwnerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.OwnerPassword),
            Role = "TenantOwner",
            MfaRequired = true,
            TenantCode = code
        };
        _db.Users.Add(owner);
        tenant.OwnerUserId = owner.Id;
        _db.TenantSettings.Add(new TenantSettings
        {
            TenantId = tenant.Id,
            TenantCode = code,
            PrimaryDomain = tenant.EmailDomain
        });

        var subscription = new Subscription
        {
            TenantId = tenant.Id,
            TenantCode = code,
            ProductPlanId = plan.Id,
            Status = "Trial",
            BillingCycle = "Trial",
            UserLimit = plan.IncludedUsers,
            DeviceLimit = plan.IncludedDevices,
            AgentLimit = plan.MaxAgents,
            StartsAt = now,
            CurrentPeriodStartsAt = now,
            CurrentPeriodEndsAt = expires,
            TrialEndsAt = expires
        };
        _db.Subscriptions.Add(subscription);

        var licenseKey = GenerateLicenseKey(code);
        var license = new TenantLicense
        {
            TenantId = tenant.Id,
            TenantCode = code,
            SubscriptionId = subscription.Id,
            KeyPrefix = LicensePrefix(licenseKey),
            KeyHash = Hash(licenseKey),
            UserLimit = subscription.UserLimit,
            DeviceLimit = subscription.DeviceLimit,
            AgentLimit = subscription.AgentLimit,
            StartsAt = now,
            ExpiresAt = expires
        };
        _db.TenantLicenses.Add(license);

        var enrollmentRaw = _security.GenerateSecret();
        var enrollment = new EnrollmentToken
        {
            TenantCode = code,
            TokenHash = _security.HashSecret(enrollmentRaw),
            ExpiresAt = now.AddHours(24)
        };
        _db.EnrollmentTokens.Add(enrollment);
        _db.TenantOnboardings.Add(new TenantOnboarding
        {
            TenantId = tenant.Id,
            TenantCode = code,
            AdminCreated = true,
            EnrollmentTokenCreated = true,
            EnrollmentTokenId = enrollment.Id
        });
        await _db.SaveChangesAsync();
        await SeedTenantDefaultDataAsync(code, _db);
        await transaction.CommitAsync();

        return new TrialProvisioningResponse
        {
            Tenant = await MapTenantAsync(tenant),
            OwnerUserId = owner.Id,
            SubscriptionId = subscription.Id,
            LicenseId = license.Id,
            LicenseKey = licenseKey,
            EnrollmentToken = enrollmentRaw,
            ExpiresAt = expires
        };
    }

    public async Task<PublicTrialSignupResponse> RegisterTrialSignupAsync(PublicTrialSignupRequest request)
    {
        var ownerEmail = request.OwnerEmail.Trim().ToLowerInvariant();
        var emailDomain = NormalizeDomain(request.EmailDomain);
        EnsureOwnerMatchesDomain(ownerEmail, emailDomain);

        var code = await GenerateUniqueTenantCodeAsync(
            string.IsNullOrWhiteSpace(request.PreferredTenantCode)
                ? TenantCodeFrom(request.CompanyName, emailDomain)
                : request.PreferredTenantCode);

        var plan = await ResolveSignupPlanAsync(request.ProductPlanId, request.ProductPlanCode);
        if (await _db.Users.IgnoreQueryFilters().AnyAsync(x =>
            x.TenantCode == code && x.Email == ownerEmail))
            throw new ArgumentException("Owner email already exists in this tenant.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;
        var expires = now.AddDays(Math.Clamp(request.TrialDays, 1, 30));
        var tenant = new Tenant
        {
            Code = code,
            CompanyName = request.CompanyName.Trim(),
            LegalName = request.LegalName?.Trim(),
            TaxCode = request.TaxCode?.Trim(),
            EmailDomain = emailDomain,
            Status = "Trial",
            OwnerName = request.OwnerName.Trim(),
            OwnerEmail = ownerEmail,
            OwnerPhone = request.OwnerPhone?.Trim(),
            Industry = request.Industry?.Trim(),
            CompanySize = request.CompanySize?.Trim(),
            SalesNotes = request.SalesNotes?.Trim(),
            TrialStartsAt = now,
            TrialEndsAt = expires
        };
        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync();

        var owner = new User
        {
            FullName = tenant.OwnerName,
            Email = tenant.OwnerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.OwnerPassword),
            Role = "TenantOwner",
            IsActive = true,
            MfaRequired = false,
            EmailVerifiedAt = now,
            PasswordChangedAt = now,
            TenantCode = code
        };
        _db.Users.Add(owner);
        tenant.OwnerUserId = owner.Id;
        _db.TenantSettings.Add(new TenantSettings
        {
            TenantId = tenant.Id,
            TenantCode = code,
            PrimaryDomain = tenant.EmailDomain
        });

        var subscription = new Subscription
        {
            TenantId = tenant.Id,
            TenantCode = code,
            ProductPlanId = plan.Id,
            Status = "Trial",
            BillingCycle = "Trial",
            UserLimit = plan.IncludedUsers,
            DeviceLimit = plan.IncludedDevices,
            AgentLimit = plan.MaxAgents,
            StartsAt = now,
            CurrentPeriodStartsAt = now,
            CurrentPeriodEndsAt = expires,
            TrialEndsAt = expires
        };
        _db.Subscriptions.Add(subscription);

        var licenseKey = GenerateLicenseKey(code);
        _db.TenantLicenses.Add(new TenantLicense
        {
            TenantId = tenant.Id,
            TenantCode = code,
            SubscriptionId = subscription.Id,
            KeyPrefix = LicensePrefix(licenseKey),
            KeyHash = Hash(licenseKey),
            UserLimit = subscription.UserLimit,
            DeviceLimit = subscription.DeviceLimit,
            AgentLimit = subscription.AgentLimit,
            StartsAt = now,
            ExpiresAt = expires
        });

        var enrollmentRaw = _security.GenerateSecret();
        var enrollment = new EnrollmentToken
        {
            TenantCode = code,
            TokenHash = _security.HashSecret(enrollmentRaw),
            ExpiresAt = now.AddHours(24)
        };
        _db.EnrollmentTokens.Add(enrollment);
        _db.TenantOnboardings.Add(new TenantOnboarding
        {
            TenantId = tenant.Id,
            TenantCode = code,
            AdminCreated = true,
            EnrollmentTokenCreated = true,
            EnrollmentTokenId = enrollment.Id
        });

        await _db.SaveChangesAsync();
        await SeedTenantDefaultDataAsync(code, _db);
        await transaction.CommitAsync();

        return new PublicTrialSignupResponse
        {
            TenantCode = code,
            CompanyName = tenant.CompanyName,
            OwnerEmail = tenant.OwnerEmail,
            Status = "TrialActive",
            TrialEndsAt = expires,
            VerificationToken = null,
            Message = "Tenant trial created. You can sign in immediately with the owner email and password."
        };
    }

    public async Task<VerifyTrialSignupResponse?> VerifyTrialSignupAsync(VerifyTrialSignupRequest request)
    {
        var tokenHash = Hash(request.VerificationToken);
        var token = await _db.TenantSignupVerificationTokens.IgnoreQueryFilters()
            .Include(x => x.User)
            .Include(x => x.Tenant)
            .FirstOrDefaultAsync(x =>
                x.TokenHash == tokenHash &&
                x.UsedAt == null &&
                x.ExpiresAt > DateTime.UtcNow);
        if (token == null) return null;

        var now = DateTime.UtcNow;
        token.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        token.User.IsActive = true;
        token.User.EmailVerifiedAt = now;
        token.User.PasswordChangedAt = now;
        token.User.MfaRequired = true;
        token.UsedAt = now;
        token.Tenant.Status = "Trial";
        token.Tenant.UpdatedAt = now;
        await _db.SaveChangesAsync();

        return new VerifyTrialSignupResponse
        {
            TenantCode = token.TenantCode,
            OwnerEmail = token.User.Email,
            EmailVerified = true,
            RequiresMfaSetup = true,
            NextStep = "Login with the new password and complete MFA setup."
        };
    }

    public async Task<TenantResponse?> UpdateTenantAsync(Guid id, TenantRequest request)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.Id == id);
        if (tenant == null) return null;
        if (!_scope.IsPlatformAdmin && tenant.Code != _scope.TenantCode) throw new UnauthorizedAccessException();
        var normalizedCode = NormalizeCode(request.Code);
        if (normalizedCode != tenant.Code)
            throw new ArgumentException("Tenant code cannot be changed after provisioning.");
        ValidateTenantStatus(request.Status);
        tenant.CompanyName = request.CompanyName.Trim();
        tenant.LegalName = request.LegalName?.Trim();
        tenant.TaxCode = request.TaxCode?.Trim();
        tenant.EmailDomain = request.EmailDomain?.Trim().ToLowerInvariant();
        tenant.OwnerName = request.OwnerName.Trim();
        tenant.OwnerEmail = request.OwnerEmail.Trim().ToLowerInvariant();
        tenant.OwnerPhone = request.OwnerPhone?.Trim();
        tenant.Industry = request.Industry?.Trim();
        tenant.CompanySize = request.CompanySize?.Trim();
        tenant.SalesNotes = request.SalesNotes?.Trim();
        tenant.Status = request.Status;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await MapTenantAsync(tenant);
    }

    public async Task<TenantResponse?> UpdateTenantStatusAsync(Guid id, string status)
    {
        EnsurePlatformAdmin();
        ValidateTenantStatus(status);
        var tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.Id == id);
        if (tenant == null) return null;
        tenant.Status = status;
        tenant.UpdatedAt = DateTime.UtcNow;
        if (status is "Suspended" or "Expired" or "Cancelled")
        {
            await _db.TenantLicenses.Where(x => x.TenantId == id && x.Status == "Active")
                .ExecuteUpdateAsync(x => x.SetProperty(l => l.Status, "Suspended"));
        }
        await _db.SaveChangesAsync();
        return await MapTenantAsync(tenant);
    }

    public async Task<TenantSettingsResponse> GetSettingsAsync(Guid? tenantId)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        var settings = await _db.TenantSettings.FirstOrDefaultAsync(x => x.TenantId == tenant.Id);
        if (settings == null)
        {
            settings = new TenantSettings { TenantId = tenant.Id, TenantCode = tenant.Code };
            _db.TenantSettings.Add(settings);
            await _db.SaveChangesAsync();
        }
        return MapSettings(settings);
    }

    public async Task<TenantSettingsResponse> UpdateSettingsAsync(Guid? tenantId, TenantSettingsRequest request)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        var settings = await _db.TenantSettings.FirstOrDefaultAsync(x => x.TenantId == tenant.Id);
        if (settings == null)
        {
            settings = new TenantSettings
            {
                Id = Guid.Empty,
                TenantId = tenant.Id,
                TenantCode = tenant.Code
            };
            _db.TenantSettings.Add(settings);
        }
        settings.LogoUrl = request.LogoUrl?.Trim();
        settings.PrimaryDomain = request.PrimaryDomain?.Trim().ToLowerInvariant();
        settings.DefaultRetentionDays = request.DefaultRetentionDays;
        settings.TimeZone = request.TimeZone.Trim();
        settings.Locale = request.Locale.Trim();
        settings.BankCode = request.BankCode?.Trim();
        settings.BankAccountNumber = request.BankAccountNumber?.Trim();
        settings.BankAccountName = request.BankAccountName?.Trim();
        settings.PaymentWebhookUrl = request.PaymentWebhookUrl?.Trim();
        settings.BillingAddress = request.BillingAddress?.Trim();
        settings.AgentBlockedCodeApps = request.AgentBlockedCodeApps;
        settings.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapSettings(settings);
    }

    public async Task<List<ContactResponse>> GetContactsAsync(Guid? tenantId)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        return await _db.CustomerContacts.Where(x => x.TenantId == tenant.Id)
            .OrderByDescending(x => x.IsPrimary).ThenBy(x => x.FullName)
            .Select(x => new ContactResponse
            {
                Id = x.Id, TenantId = x.TenantId, FullName = x.FullName, Email = x.Email,
                Phone = x.Phone, JobTitle = x.JobTitle, IsPrimary = x.IsPrimary,
                IsBillingContact = x.IsBillingContact, CreatedAt = x.CreatedAt
            }).ToListAsync();
    }

    public async Task<ContactResponse> CreateContactAsync(Guid? tenantId, ContactRequest request)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.CustomerContacts.AnyAsync(x => x.TenantId == tenant.Id && x.Email == email))
            throw new ArgumentException("Contact email already exists.");
        if (request.IsPrimary)
            await _db.CustomerContacts.Where(x => x.TenantId == tenant.Id && x.IsPrimary)
                .ExecuteUpdateAsync(x => x.SetProperty(c => c.IsPrimary, false));
        var contact = new CustomerContact
        {
            TenantId = tenant.Id, TenantCode = tenant.Code, FullName = request.FullName.Trim(),
            Email = email, Phone = request.Phone?.Trim(), JobTitle = request.JobTitle?.Trim(),
            IsPrimary = request.IsPrimary, IsBillingContact = request.IsBillingContact
        };
        _db.CustomerContacts.Add(contact);
        await _db.SaveChangesAsync();
        return new ContactResponse
        {
            Id = contact.Id, TenantId = contact.TenantId, FullName = contact.FullName,
            Email = contact.Email, Phone = contact.Phone, JobTitle = contact.JobTitle,
            IsPrimary = contact.IsPrimary, IsBillingContact = contact.IsBillingContact,
            CreatedAt = contact.CreatedAt
        };
    }

    public async Task<ContactResponse?> UpdateContactAsync(Guid id, Guid? tenantId, ContactRequest request)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        var contact = await _db.CustomerContacts.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == tenant.Id);
        if (contact == null) return null;
        var email = request.Email.Trim().ToLowerInvariant();
        if (email != contact.Email && await _db.CustomerContacts.AnyAsync(x => x.TenantId == tenant.Id && x.Email == email && x.Id != id))
            throw new ArgumentException("Contact email already exists.");
        if (request.IsPrimary)
            await _db.CustomerContacts.Where(x => x.TenantId == tenant.Id && x.IsPrimary && x.Id != id)
                .ExecuteUpdateAsync(x => x.SetProperty(c => c.IsPrimary, false));
        contact.FullName = request.FullName.Trim();
        contact.Email = email;
        contact.Phone = request.Phone?.Trim();
        contact.JobTitle = request.JobTitle?.Trim();
        contact.IsPrimary = request.IsPrimary;
        contact.IsBillingContact = request.IsBillingContact;
        await _db.SaveChangesAsync();
        return new ContactResponse
        {
            Id = contact.Id, TenantId = contact.TenantId, FullName = contact.FullName,
            Email = contact.Email, Phone = contact.Phone, JobTitle = contact.JobTitle,
            IsPrimary = contact.IsPrimary, IsBillingContact = contact.IsBillingContact,
            CreatedAt = contact.CreatedAt
        };
    }

    public async Task<bool> DeleteContactAsync(Guid id)
    {
        var contact = await _db.CustomerContacts.FirstOrDefaultAsync(x => x.Id == id);
        if (contact == null) return false;
        _db.CustomerContacts.Remove(contact);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ProductPlanResponse>> GetPlansAsync(bool activeOnly)
    {
        var q = _db.ProductPlans.AsNoTracking().AsQueryable();
        if (activeOnly) q = q.Where(x => x.IsActive);
        return (await q.OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).ToListAsync()).Select(MapPlan).ToList();
    }

    public async Task<ProductPlanResponse> CreatePlanAsync(ProductPlanRequest request)
    {
        EnsurePlatformAdmin();
        var code = NormalizeCode(request.Code);
        if (await _db.ProductPlans.AnyAsync(x => x.Code == code)) throw new ArgumentException("Plan code already exists.");
        var plan = new ProductPlan { Code = code };
        ApplyPlan(plan, request);
        _db.ProductPlans.Add(plan);
        await _db.SaveChangesAsync();
        return MapPlan(plan);
    }

    public async Task<ProductPlanResponse?> UpdatePlanAsync(Guid id, ProductPlanRequest request)
    {
        EnsurePlatformAdmin();
        var plan = await _db.ProductPlans.FindAsync(id);
        if (plan == null) return null;
        var code = NormalizeCode(request.Code);
        if (await _db.ProductPlans.AnyAsync(x => x.Id != id && x.Code == code))
            throw new ArgumentException("Plan code already exists.");
        plan.Code = code;
        ApplyPlan(plan, request);
        await _db.SaveChangesAsync();
        return MapPlan(plan);
     }

    public async Task<bool> DeletePlanAsync(Guid id)
    {
        EnsurePlatformAdmin();
        var plan = await _db.ProductPlans.FindAsync(id);
        if (plan == null) return false;
        _db.ProductPlans.Remove(plan);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<PagedResult<OrderResponse>> GetOrdersAsync(PagedQuery query, string? status, Guid? tenantId)
    {
        var q = _db.SalesOrders.Include(x => x.Tenant).Include(x => x.ProductPlan).AsNoTracking().AsQueryable();
        if (_scope.IsPlatformAdmin)
        {
            if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        }
        else
        {
            var tenant = await _db.Tenants.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Code == _scope.TenantCode)
                ?? throw new ArgumentException("Tenant profile has not been provisioned.");
            q = q.Where(x => x.TenantId == tenant.Id);
        }
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(x => x.OrderNumber.ToLower().Contains(search) || x.Tenant.CompanyName.ToLower().Contains(search));
        }
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.CreatedAt).Skip(Offset(query)).Take(PageSize(query)).ToListAsync();
        return Page(items.Select(MapOrder).ToList(), total, query);
    }

    public async Task<OrderResponse> CreateOrderAsync(OrderRequest request)
    {
        var tenant = await ResolveTenantAsync(request.TenantId);
        var plan = await _db.ProductPlans.FindAsync(request.ProductPlanId)
            ?? throw new ArgumentException("Product plan not found.");
        ValidateBillingCycle(request.BillingCycle);

        var baseUnitPrice = plan.MonthlyPrice * (request.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase) ? 12 : 1);
        var subtotal = baseUnitPrice * request.UserQuantity;
        var yearlyDiscount = request.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase)
            ? Math.Max(0, (plan.MonthlyPrice * 12 - plan.YearlyPrice) * request.UserQuantity)
            : 0;

        var discount = Math.Min(yearlyDiscount + request.DiscountAmount, subtotal);
        var taxable = subtotal - discount;
        var taxPercent = request.TaxPercent > 0 ? request.TaxPercent : 10m; // fixed 10% default
        var tax = Math.Round(taxable * taxPercent / 100m, 2);
        var order = new SalesOrder
        {
            OrderNumber = Number("ORD"), TenantId = tenant.Id, TenantCode = tenant.Code,
            ProductPlanId = plan.Id, BillingCycle = request.BillingCycle,
            UserQuantity = request.UserQuantity, DeviceQuantity = request.DeviceQuantity,
            Subtotal = subtotal, DiscountAmount = discount, TaxAmount = tax,
            TotalAmount = taxable + tax, Currency = plan.Currency,
            Notes = request.Notes?.Trim(), QuotationId = request.QuotationId
        };
        _db.SalesOrders.Add(order);
        await _db.SaveChangesAsync();
        order.Tenant = tenant;
        order.ProductPlan = plan;
        return MapOrder(order);
    }

    public async Task<OrderResponse?> CancelOrderAsync(Guid id, string? reason)
    {
        var order = await _db.SalesOrders.Include(x => x.Tenant).Include(x => x.ProductPlan).FirstOrDefaultAsync(x => x.Id == id);
        if (order == null) return null;
        if (order.Status is "Paid" or "Provisioned") throw new ArgumentException("Paid or provisioned orders cannot be cancelled.");
        order.Status = "Cancelled";
        order.CancelledAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;
        order.Notes = string.IsNullOrWhiteSpace(reason) ? order.Notes : $"{order.Notes}\nCancellation: {reason}".Trim();
        await _db.SaveChangesAsync();
        return MapOrder(order);
    }

    public async Task<PaymentResponse> RecordPaymentAsync(Guid orderId, PaymentRequest request)
    {
        var order = await _db.SalesOrders.Include(x => x.Tenant).FirstOrDefaultAsync(x => x.Id == orderId)
            ?? throw new KeyNotFoundException();
        if (order.Status is "Cancelled" or "Provisioned") throw new ArgumentException("Order cannot accept payment.");
        var payment = new PaymentRecord
        {
            PaymentNumber = Number("PAY"), OrderId = order.Id, TenantId = order.TenantId,
            TenantCode = order.TenantCode, Amount = request.Amount, Currency = request.Currency.Trim().ToUpperInvariant(),
            Method = request.Method.Trim(), TransactionReference = request.TransactionReference?.Trim(),
            ReceiptUrl = request.ReceiptUrl?.Trim(), PaidAt = request.PaidAt ?? DateTime.UtcNow
        };
        order.Status = "Reconciling";
        order.ReceiptUrl = payment.ReceiptUrl;
        order.PaymentReference = payment.TransactionReference;
        order.UpdatedAt = DateTime.UtcNow;
        _db.PaymentRecords.Add(payment);
        await _db.SaveChangesAsync();
        payment.Order = order;
        return MapPayment(payment);
    }

    public async Task<CheckoutOrderResponse> CompleteCheckoutAsync(Guid orderId, CheckoutOrderRequest request, string actorEmail)
    {
        var order = await _db.SalesOrders.Include(x => x.Tenant).Include(x => x.ProductPlan)
            .FirstOrDefaultAsync(x => x.Id == orderId) ?? throw new KeyNotFoundException();
        await ResolveTenantAsync(order.TenantId);

        if (order.Status == "Provisioned")
        {
            var existingPayment = await _db.PaymentRecords.AsNoTracking()
                .Where(x => x.OrderId == order.Id && x.Status == "Confirmed")
                .OrderByDescending(x => x.ReconciledAt)
                .FirstOrDefaultAsync();
            var existingLicense = await _db.TenantLicenses.AsNoTracking()
                .Where(x => x.TenantId == order.TenantId && x.Status == "Active")
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Provisioned order is missing an active license.");
            return new CheckoutOrderResponse
            {
                Order = MapOrder(order),
                Payment = existingPayment != null ? MapPayment(existingPayment) : new PaymentResponse
                {
                    OrderId = order.Id,
                    OrderNumber = order.OrderNumber,
                    TenantId = order.TenantId,
                    Amount = order.TotalAmount,
                    Currency = order.Currency,
                    Method = request.Method,
                    Status = "Confirmed"
                },
                License = await MapLicenseAsync(existingLicense)
            };
        }

        if (order.Status is "Cancelled")
            throw new ArgumentException("Cancelled orders cannot be checked out.");

        var now = DateTime.UtcNow;
        var months = request.PeriodMonths is >= 1 and <= 36
            ? request.PeriodMonths
            : order.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase) ? 12 : 1;

        var payment = new PaymentRecord
        {
            PaymentNumber = Number("PAY"),
            OrderId = order.Id,
            TenantId = order.TenantId,
            TenantCode = order.TenantCode,
            Amount = request.Amount,
            Currency = request.Currency.Trim().ToUpperInvariant(),
            Method = request.Method.Trim(),
            TransactionReference = request.TransactionReference?.Trim(),
            Status = "Confirmed",
            ReconciliationNote = "Instant checkout",
            ReconciledBy = actorEmail,
            ReconciledAt = now,
            PaidAt = now
        };
        order.Status = "Paid";
        order.PaidAt = now;
        order.PaymentReference = payment.TransactionReference;
        order.UpdatedAt = now;
        _db.PaymentRecords.Add(payment);
        await _db.SaveChangesAsync();

        var license = await ProvisionOrderCoreAsync(order, months);
        payment.Order = order;
        return new CheckoutOrderResponse
        {
            Order = MapOrder(order),
            Payment = MapPayment(payment),
            License = license
        };
    }

    public async Task<PagedResult<PaymentResponse>> GetPaymentsAsync(PagedQuery query, string? status, Guid? tenantId)
    {
        var q = _db.PaymentRecords.Include(x => x.Order).AsNoTracking().AsQueryable();
        if (_scope.IsPlatformAdmin)
        {
            if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        }
        else
        {
            var tenant = await _db.Tenants.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Code == _scope.TenantCode)
                ?? throw new ArgumentException("Tenant profile has not been provisioned.");
            q = q.Where(x => x.TenantId == tenant.Id);
        }
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.CreatedAt).Skip(Offset(query)).Take(PageSize(query)).ToListAsync();
        return Page(items.Select(MapPayment).ToList(), total, query);
    }

    public async Task<PaymentResponse?> ReconcilePaymentAsync(Guid id, PaymentReconcileRequest request, string actorEmail)
    {
        EnsurePlatformAdmin();
        var payment = await _db.PaymentRecords.Include(x => x.Order).FirstOrDefaultAsync(x => x.Id == id);
        if (payment == null) return null;
        if (payment.Status != "PendingReconciliation") throw new ArgumentException("Payment was already reconciled.");
        payment.Status = request.Approved ? "Confirmed" : "Rejected";
        payment.ReconciliationNote = request.Note?.Trim();
        payment.ReconciledBy = actorEmail;
        payment.ReconciledAt = DateTime.UtcNow;
        if (request.Approved)
        {
            var confirmed = await _db.PaymentRecords
                .Where(x => x.OrderId == payment.OrderId && x.Status == "Confirmed" && x.Id != payment.Id)
                .SumAsync(x => (decimal?)x.Amount) ?? 0;
            confirmed += payment.Amount;
            payment.Order.Status = confirmed >= payment.Order.TotalAmount ? "Paid" : "Reconciling";
            if (payment.Order.Status == "Paid") payment.Order.PaidAt = DateTime.UtcNow;
        }
        else if (!await _db.PaymentRecords.AnyAsync(x => x.OrderId == payment.OrderId &&
            x.Status == "PendingReconciliation" && x.Id != payment.Id))
        {
            payment.Order.Status = "PendingPayment";
        }
        payment.Order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapPayment(payment);
    }

    public async Task<List<SubscriptionResponse>> GetSubscriptionsAsync(Guid? tenantId)
    {
        var q = _db.Subscriptions.Include(x => x.ProductPlan).AsNoTracking().AsQueryable();
        if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        return (await q.OrderByDescending(x => x.CreatedAt).ToListAsync()).Select(MapSubscription).ToList();
    }

    public async Task<SubscriptionResponse?> ChangeSubscriptionAsync(Guid id, SubscriptionChangeRequest request)
    {
        var subscription = await _db.Subscriptions.Include(x => x.ProductPlan).FirstOrDefaultAsync(x => x.Id == id);
        if (subscription == null) return null;
        var plan = await _db.ProductPlans.FindAsync(request.ProductPlanId)
            ?? throw new ArgumentException("Product plan not found.");
        ValidateBillingCycle(request.BillingCycle);
        subscription.ProductPlanId = plan.Id;
        subscription.ProductPlan = plan;
        subscription.BillingCycle = request.BillingCycle;
        subscription.UserLimit = request.UserLimit;
        subscription.DeviceLimit = request.DeviceLimit;
        subscription.AgentLimit = request.AgentLimit;
        subscription.AutoRenew = request.AutoRenew;
        subscription.Status = "Active";
        subscription.CurrentPeriodStartsAt = DateTime.UtcNow;
        subscription.CurrentPeriodEndsAt = DateTime.UtcNow.AddMonths(request.PeriodMonths);
        subscription.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapSubscription(subscription);
    }

    public async Task<LicenseCreatedResponse> ProvisionOrderAsync(Guid orderId)
    {
        EnsurePlatformAdmin();
        var order = await _db.SalesOrders.Include(x => x.Tenant).Include(x => x.ProductPlan)
            .FirstOrDefaultAsync(x => x.Id == orderId) ?? throw new KeyNotFoundException();
        
        if (order.Status != "Paid" && order.Status != "Provisioned")
        {
            var now = DateTime.UtcNow;
            var payment = new PaymentRecord
            {
                PaymentNumber = Number("PAY"),
                OrderId = order.Id,
                TenantId = order.TenantId,
                TenantCode = order.TenantCode,
                Amount = order.TotalAmount,
                Currency = order.Currency,
                Method = "Manual",
                TransactionReference = "PlatformAdmin Provisioning",
                Status = "Confirmed",
                ReconciliationNote = "Provisioned by Platform Admin",
                ReconciledBy = "platform-admin",
                ReconciledAt = now,
                PaidAt = now
            };
            order.Status = "Paid";
            order.PaidAt = now;
            order.PaymentReference = payment.TransactionReference;
            order.UpdatedAt = now;
            _db.PaymentRecords.Add(payment);
            await _db.SaveChangesAsync();
        }

        var months = order.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase) ? 12 : 1;
        return await ProvisionOrderCoreAsync(order, months);
    }

    private async Task<LicenseCreatedResponse> ProvisionOrderCoreAsync(SalesOrder order, int periodMonths)
    {
        if (order.Status == "Provisioned")
        {
            var activeLicense = await _db.TenantLicenses.AsNoTracking()
                .Where(x => x.TenantId == order.TenantId && x.Status == "Active")
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Provisioned order is missing an active license.");
            return await MapLicenseAsync(activeLicense);
        }

        if (order.Status != "Paid") throw new ArgumentException("Only fully paid orders can be provisioned.");

        var months = periodMonths is >= 1 and <= 36
            ? periodMonths
            : order.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase) ? 12 : 1;
        var now = DateTime.UtcNow;
        var subscription = await _db.Subscriptions
            .Where(x => x.TenantId == order.TenantId && x.Status != "Cancelled")
            .OrderByDescending(x => x.Status == "Trial")
            .ThenByDescending(x => x.UpdatedAt)
            .FirstOrDefaultAsync();
        if (subscription == null)
        {
            subscription = new Subscription
            {
                TenantId = order.TenantId,
                TenantCode = order.TenantCode,
                StartsAt = now
            };
            _db.Subscriptions.Add(subscription);
        }
        subscription.ProductPlanId = order.ProductPlanId;
        subscription.OrderId = order.Id;
        subscription.Status = "Active";
        subscription.BillingCycle = order.BillingCycle;
        subscription.UserLimit = order.UserQuantity;
        subscription.DeviceLimit = order.DeviceQuantity;
        subscription.AgentLimit = order.ProductPlan.MaxAgents;
        subscription.CurrentPeriodStartsAt = now;
        subscription.CurrentPeriodEndsAt = now.AddMonths(months);
        subscription.AutoRenew = true;
        subscription.UpdatedAt = now;
        await _db.TenantLicenses.Where(x => x.TenantId == order.TenantId && x.Status == "Active")
            .ExecuteUpdateAsync(x => x.SetProperty(l => l.Status, "Replaced")
                .SetProperty(l => l.RevokedAt, now).SetProperty(l => l.RevokeReason, "Replaced by a paid order."));
        var result = AddLicense(order.Tenant, subscription, subscription.UserLimit,
            subscription.DeviceLimit, subscription.AgentLimit, now, subscription.CurrentPeriodEndsAt);
        order.Status = "Provisioned";
        order.UpdatedAt = now;
        order.Tenant.Status = "Paid";
        order.Tenant.UpdatedAt = now;
        var existingInvoice = await _db.Invoices.FirstOrDefaultAsync(x => x.OrderId == order.Id);
        if (existingInvoice == null)
        {
            _db.Invoices.Add(new Invoice
            {
                InvoiceNumber = Number("INV"), TenantId = order.TenantId, TenantCode = order.TenantCode,
                OrderId = order.Id, Status = "Paid", Subtotal = order.Subtotal,
                DiscountAmount = order.DiscountAmount, TaxAmount = order.TaxAmount,
                TotalAmount = order.TotalAmount, Currency = order.Currency,
                IssuedAt = now, DueAt = now, PaidAt = order.PaidAt ?? now
            });
        }
        await _db.SaveChangesAsync();
        return await MapLicenseAsync(result.License, result.RawKey);
    }

    public async Task<List<LicenseResponse>> GetLicensesAsync(Guid? tenantId)
    {
        var q = _db.TenantLicenses.AsNoTracking().AsQueryable();
        if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        var licenses = await q.OrderByDescending(x => x.CreatedAt).ToListAsync();
        var result = new List<LicenseResponse>();
        foreach (var license in licenses) result.Add(await MapLicenseAsync(license));
        return result;
    }

    public async Task<LicenseCreatedResponse> CreateLicenseAsync(LicenseCreateRequest request)
    {
        EnsurePlatformAdmin();
        if (request.ExpiresAt <= request.StartsAt) throw new ArgumentException("License expiry must be after its start.");
        var tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.Id == request.TenantId)
            ?? throw new ArgumentException("Tenant not found.");
        Subscription? subscription = null;
        if (request.SubscriptionId.HasValue)
            subscription = await _db.Subscriptions.FirstOrDefaultAsync(x =>
                x.Id == request.SubscriptionId && x.TenantId == tenant.Id)
                ?? throw new ArgumentException("Subscription not found for tenant.");
        var result = AddLicense(tenant, subscription, request.UserLimit, request.DeviceLimit,
            request.AgentLimit, request.StartsAt, request.ExpiresAt);
        await _db.SaveChangesAsync();
        return await MapLicenseAsync(result.License, result.RawKey);
    }

    public async Task<LicenseResponse?> UpdateLicenseStatusAsync(Guid id, string status, string? reason)
    {
        EnsurePlatformAdmin();
        if (status is not ("Active" or "Suspended" or "Revoked"))
            throw new ArgumentException("License status must be Active, Suspended, or Revoked.");
        var license = await _db.TenantLicenses.FirstOrDefaultAsync(x => x.Id == id);
        if (license == null) return null;
        license.Status = status;
        license.RevokeReason = reason?.Trim();
        license.RevokedAt = status == "Revoked" ? DateTime.UtcNow : null;
        await _db.SaveChangesAsync();
        return await MapLicenseAsync(license);
    }

    public async Task<LicenseCreatedResponse?> RotateLicenseAsync(Guid id)
    {
        EnsurePlatformAdmin();
        var old = await _db.TenantLicenses.Include(x => x.Tenant).FirstOrDefaultAsync(x => x.Id == id);
        if (old == null) return null;
        old.Status = "Replaced";
        old.RevokedAt = DateTime.UtcNow;
        old.RevokeReason = "License key rotated.";
        var result = AddLicense(old.Tenant, null, old.UserLimit, old.DeviceLimit, old.AgentLimit,
            DateTime.UtcNow, old.ExpiresAt);
        result.License.SubscriptionId = old.SubscriptionId;
        await _db.SaveChangesAsync();
        return await MapLicenseAsync(result.License, result.RawKey);
    }

    public async Task<LicenseCreatedResponse?> RenewLicenseAsync(Guid id, LicenseRenewRequest request)
    {
        EnsurePlatformAdmin();
        var old = await _db.TenantLicenses.Include(x => x.Tenant).FirstOrDefaultAsync(x => x.Id == id);
        if (old == null) return null;
        var now = DateTime.UtcNow;
        old.Status = "Replaced";
        old.RevokedAt = now;
        old.RevokeReason = "License renewed.";
        var expires = (old.ExpiresAt > now ? old.ExpiresAt : now).AddMonths(request.Months);
        var result = AddLicense(
            old.Tenant,
            null,
            request.UserLimit ?? old.UserLimit,
            request.DeviceLimit ?? old.DeviceLimit,
            request.AgentLimit ?? old.AgentLimit,
            now,
            expires);
        result.License.SubscriptionId = old.SubscriptionId;
        await _db.SaveChangesAsync();
        return await MapLicenseAsync(result.License, result.RawKey);
    }

    public async Task<EntitlementResponse> ValidateLicenseAsync(LicenseValidationRequest request)
    {
        var code = NormalizeCode(request.TenantCode);
        var hash = Hash(request.LicenseKey);
        var now = DateTime.UtcNow;
        var license = await _db.TenantLicenses.IgnoreQueryFilters().FirstOrDefaultAsync(x =>
            x.TenantCode == code && x.KeyHash == hash);
        if (license == null || license.Status != "Active" || license.StartsAt > now || license.ExpiresAt <= now)
            return new EntitlementResponse { Status = license?.Status ?? "Invalid" };
        license.LastValidatedAt = now;
        await _db.SaveChangesAsync();
        var entitlement = await BuildEntitlementAsync(license);
        entitlement.IsEntitled = true;
        return entitlement;
    }

    public async Task<PagedResult<InvoiceResponse>> GetInvoicesAsync(PagedQuery query, string? status, Guid? tenantId)
    {
        var q = _db.Invoices.Include(x => x.Tenant).AsNoTracking().AsQueryable();
        if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.IssuedAt).Skip(Offset(query)).Take(PageSize(query)).ToListAsync();
        return Page(items.Select(MapInvoice).ToList(), total, query);
    }

    public async Task<InvoiceResponse> CreateInvoiceAsync(InvoiceRequest request)
    {
        var tenant = await ResolveTenantAsync(request.TenantId);
        SalesOrder? order = null;
        if (request.OrderId.HasValue)
            order = await _db.SalesOrders.FirstOrDefaultAsync(x => x.Id == request.OrderId && x.TenantId == tenant.Id)
                ?? throw new ArgumentException("Order not found for tenant.");
        var subtotal = order?.Subtotal ?? request.Subtotal;
        var discount = order?.DiscountAmount ?? request.DiscountAmount;
        var tax = order?.TaxAmount ?? request.TaxAmount;
        var invoice = new Invoice
        {
            InvoiceNumber = Number("INV"), TenantId = tenant.Id, TenantCode = tenant.Code,
            OrderId = order?.Id, Status = "Issued", Subtotal = subtotal,
            DiscountAmount = discount, TaxAmount = tax, TotalAmount = subtotal - discount + tax,
            Currency = order?.Currency ?? request.Currency.Trim().ToUpperInvariant(),
            VatNumber = request.VatNumber?.Trim(), BillingAddress = request.BillingAddress?.Trim(),
            DueAt = request.DueAt ?? DateTime.UtcNow.AddDays(7)
        };
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();
        invoice.Tenant = tenant;
        return MapInvoice(invoice);
    }

    public async Task<InvoiceResponse?> UpdateInvoiceStatusAsync(Guid id, string status)
    {
        if (!DocumentStatuses.Contains(status)) throw new ArgumentException("Invalid invoice status.");
        var invoice = await _db.Invoices.Include(x => x.Tenant).FirstOrDefaultAsync(x => x.Id == id);
        if (invoice == null) return null;
        invoice.Status = status;
        invoice.PaidAt = status == "Paid" ? DateTime.UtcNow : invoice.PaidAt;
        await _db.SaveChangesAsync();
        return MapInvoice(invoice);
    }

    public async Task<PagedResult<QuotationResponse>> GetQuotationsAsync(PagedQuery query, string? status, Guid? tenantId)
    {
        var q = _db.Quotations.Include(x => x.Tenant).Include(x => x.ProductPlan).AsNoTracking().AsQueryable();
        if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.CreatedAt).Skip(Offset(query)).Take(PageSize(query)).ToListAsync();
        return Page(items.Select(MapQuotation).ToList(), total, query);
    }

    public async Task<QuotationResponse> CreateQuotationAsync(QuotationRequest request)
    {
        var tenant = await ResolveTenantAsync(request.TenantId);
        var plan = await _db.ProductPlans.FindAsync(request.ProductPlanId)
            ?? throw new ArgumentException("Product plan not found.");
        ValidateBillingCycle(request.BillingCycle);

        var baseUnitPrice = plan.MonthlyPrice * (request.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase) ? 12 : 1);
        var subtotal = baseUnitPrice * request.UserQuantity;
        var yearlyDiscount = request.BillingCycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase)
            ? Math.Max(0, (plan.MonthlyPrice * 12 - plan.YearlyPrice) * request.UserQuantity)
            : 0;

        var discount = Math.Min(yearlyDiscount + request.DiscountAmount, subtotal);
        var taxPercent = request.TaxPercent > 0 ? request.TaxPercent : 10m; // fixed 10% default
        var tax = Math.Round((subtotal - discount) * taxPercent / 100m, 2);
        var quotation = new Quotation
        {
            QuotationNumber = Number("QUO"), TenantId = tenant.Id, TenantCode = tenant.Code,
            ProductPlanId = plan.Id, BillingCycle = request.BillingCycle,
            UserQuantity = request.UserQuantity, DeviceQuantity = request.DeviceQuantity,
            Subtotal = subtotal, DiscountAmount = discount, TaxAmount = tax,
            TotalAmount = subtotal - discount + tax, Currency = plan.Currency,
            Terms = request.Terms?.Trim(), ValidUntil = request.ValidUntil ?? DateTime.UtcNow.AddDays(14)
        };
        _db.Quotations.Add(quotation);
        await _db.SaveChangesAsync();
        quotation.Tenant = tenant;
        quotation.ProductPlan = plan;
        return MapQuotation(quotation);
    }

    public async Task<QuotationResponse?> UpdateQuotationStatusAsync(Guid id, string status)
    {
        if (!DocumentStatuses.Contains(status)) throw new ArgumentException("Invalid quotation status.");
        var quotation = await _db.Quotations.Include(x => x.Tenant).Include(x => x.ProductPlan)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (quotation == null) return null;
        quotation.Status = status;
        quotation.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapQuotation(quotation);
    }

    public async Task<OrderResponse?> ConvertQuotationToOrderAsync(Guid id)
    {
        var quotation = await _db.Quotations.Include(x => x.Tenant).Include(x => x.ProductPlan)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (quotation == null) return null;
        if (quotation.Status is "Rejected" or "Expired") throw new ArgumentException("Quotation cannot be converted.");
        var existing = await _db.SalesOrders.Include(x => x.Tenant).Include(x => x.ProductPlan)
            .FirstOrDefaultAsync(x => x.QuotationId == id);
        if (existing != null) return MapOrder(existing);
        var order = new SalesOrder
        {
            OrderNumber = Number("ORD"), TenantId = quotation.TenantId, TenantCode = quotation.TenantCode,
            ProductPlanId = quotation.ProductPlanId, BillingCycle = quotation.BillingCycle,
            UserQuantity = quotation.UserQuantity, DeviceQuantity = quotation.DeviceQuantity,
            Subtotal = quotation.Subtotal, DiscountAmount = quotation.DiscountAmount,
            TaxAmount = quotation.TaxAmount, TotalAmount = quotation.TotalAmount,
            Currency = quotation.Currency, QuotationId = quotation.Id
        };
        quotation.Status = "Accepted";
        _db.SalesOrders.Add(order);
        await _db.SaveChangesAsync();
        order.Tenant = quotation.Tenant;
        order.ProductPlan = quotation.ProductPlan;
        return MapOrder(order);
    }

    public async Task<List<ContractResponse>> GetContractsAsync(Guid? tenantId, string? status)
    {
        var q = _db.CommercialContracts.Include(x => x.Tenant).AsNoTracking().AsQueryable();
        if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        return (await q.OrderByDescending(x => x.CreatedAt).ToListAsync()).Select(MapContract).ToList();
    }

    public async Task<ContractResponse> CreateContractAsync(ContractRequest request)
    {
        var tenant = await ResolveTenantAsync(request.TenantId);
        if (request.ExpiresAt <= request.EffectiveAt) throw new ArgumentException("Contract expiry must be after effective date.");
        if (request.QuotationId.HasValue && !await _db.Quotations.AnyAsync(x =>
            x.Id == request.QuotationId && x.TenantId == tenant.Id))
            throw new ArgumentException("Quotation not found for tenant.");
        var contract = new CommercialContract
        {
            ContractNumber = Number("CTR"), TenantId = tenant.Id, TenantCode = tenant.Code,
            QuotationId = request.QuotationId, Title = request.Title.Trim(),
            Terms = request.Terms?.Trim(), DocumentUrl = request.DocumentUrl?.Trim(),
            EffectiveAt = request.EffectiveAt, ExpiresAt = request.ExpiresAt
        };
        _db.CommercialContracts.Add(contract);
        await _db.SaveChangesAsync();
        contract.Tenant = tenant;
        return MapContract(contract);
    }

    public async Task<ContractResponse?> UpdateContractAsync(Guid id, ContractActionRequest request)
    {
        if (!ContractStatuses.Contains(request.Status)) throw new ArgumentException("Invalid contract status.");
        var contract = await _db.CommercialContracts.Include(x => x.Tenant).FirstOrDefaultAsync(x => x.Id == id);
        if (contract == null) return null;
        contract.Status = request.Status;
        contract.SignedByCustomer = request.SignedByCustomer?.Trim();
        contract.SignedByAiguard = request.SignedByAiguard?.Trim();
        contract.SignedAt = request.Status is "Signed" or "Active" ? DateTime.UtcNow : contract.SignedAt;
        contract.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapContract(contract);
    }

    public async Task<OnboardingResponse?> GetOnboardingAsync(Guid? tenantId)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        var onboarding = await _db.TenantOnboardings.FirstOrDefaultAsync(x => x.TenantId == tenant.Id);
        return onboarding == null ? null : MapOnboarding(onboarding);
    }

    public async Task<OnboardingResponse> EnsureOnboardingAsync(Guid? tenantId)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        var onboarding = await _db.TenantOnboardings.FirstOrDefaultAsync(x => x.TenantId == tenant.Id);
        if (onboarding != null) return MapOnboarding(onboarding);

        var enrollmentRaw = _security.GenerateSecret();
        var enrollment = new EnrollmentToken
        {
            TenantCode = tenant.Code,
            TokenHash = _security.HashSecret(enrollmentRaw),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };
        _db.EnrollmentTokens.Add(enrollment);

        onboarding = new TenantOnboarding
        {
            TenantId = tenant.Id,
            TenantCode = tenant.Code,
            AdminCreated = true,
            EnrollmentTokenCreated = true,
            EnrollmentTokenId = enrollment.Id
        };
        _db.TenantOnboardings.Add(onboarding);
        await _db.SaveChangesAsync();
        return MapOnboarding(onboarding);
    }

    public async Task<OnboardingListResponse> GetAllOnboardingAsync()
    {
        var items = await _db.TenantOnboardings
            .Include(x => x.Tenant)
            .OrderByDescending(x => x.StartedAt)
            .ToListAsync();
        return new OnboardingListResponse
        {
            Items = items.Select(MapOnboarding).ToList(),
            Total = items.Count
        };
    }

    public async Task<OnboardingResponse?> UpdateOnboardingAsync(Guid? tenantId, OnboardingUpdateRequest request)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        var onboarding = await _db.TenantOnboardings.FirstOrDefaultAsync(x => x.TenantId == tenant.Id);
        if (onboarding == null) return null;
        if (request.ExtensionInstalled.HasValue) onboarding.ExtensionInstalled = request.ExtensionInstalled.Value;
        if (request.FirstUserAdded.HasValue) onboarding.FirstUserAdded = request.FirstUserAdded.Value;
        if (request.PolicyEnabled.HasValue) onboarding.PolicyEnabled = request.PolicyEnabled.Value;
        if (request.TestPromptCompleted.HasValue) onboarding.TestPromptCompleted = request.TestPromptCompleted.Value;
        onboarding.Notes = request.Notes?.Trim() ?? onboarding.Notes;
        onboarding.UpdatedAt = DateTime.UtcNow;
        var completed = onboarding.AdminCreated && onboarding.EnrollmentTokenCreated &&
            onboarding.ExtensionInstalled && onboarding.FirstUserAdded &&
            onboarding.PolicyEnabled && onboarding.TestPromptCompleted;
        onboarding.Status = completed ? "Completed" : "InProgress";
        onboarding.CompletedAt = completed ? DateTime.UtcNow : null;
        await _db.SaveChangesAsync();
        return MapOnboarding(onboarding);
    }

    public async Task<EnrollmentTokenResponse> RegenerateEnrollmentTokenAsync(Guid? tenantId)
    {
        var tenant = await ResolveTenantAsync(tenantId);
        await _db.EnrollmentTokens.IgnoreQueryFilters()
            .Where(x => x.TenantCode == tenant.Code && !x.IsRevoked)
            .ExecuteUpdateAsync(x => x.SetProperty(t => t.IsRevoked, true));
        var rawToken = _security.GenerateSecret();
        var token = new EnrollmentToken
        {
            TenantCode = tenant.Code,
            TokenHash = _security.HashSecret(rawToken),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };
        _db.EnrollmentTokens.Add(token);
        var onboarding = await _db.TenantOnboardings.FirstOrDefaultAsync(x => x.TenantId == tenant.Id);
        if (onboarding != null)
        {
            onboarding.EnrollmentTokenCreated = true;
            onboarding.EnrollmentTokenId = token.Id;
            onboarding.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return new EnrollmentTokenResponse
        {
            TokenId = token.Id,
            TenantCode = tenant.Code,
            EnrollmentToken = rawToken,
            ExpiresAt = token.ExpiresAt,
            InstallCommand = $"AIGuardAgentSetup.exe /tenant {tenant.Code} /token \"{rawToken}\" /silent"
        };
    }

    public async Task<PagedResult<TicketResponse>> GetTicketsAsync(PagedQuery query, string? status, Guid? tenantId)
    {
        var q = _db.SupportTickets.Include(x => x.Tenant).Include(x => x.Messages).AsNoTracking().AsQueryable();
        if (tenantId.HasValue) q = q.Where(x => x.TenantId == tenantId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(x => x.TicketNumber.ToLower().Contains(search) || x.Subject.ToLower().Contains(search));
        }
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.CreatedAt).Skip(Offset(query)).Take(PageSize(query)).ToListAsync();
        return Page(items.Select(MapTicket).ToList(), total, query);
    }

    public async Task<TicketResponse> CreateTicketAsync(TicketRequest request, string requesterEmail)
    {
        var tenant = await ResolveTenantAsync(request.TenantId);
        var now = DateTime.UtcNow;
        var ticket = new SupportTicket
        {
            TicketNumber = Number("SUP"), TenantId = tenant.Id, TenantCode = tenant.Code,
            Subject = request.Subject.Trim(), Category = request.Category.Trim(),
            Priority = request.Priority.Trim(), RequesterEmail = requesterEmail.Trim().ToLowerInvariant(),
            SlaDueAt = now.AddHours(SlaHours(request.Priority))
        };
        ticket.Messages.Add(new SupportTicketMessage
        {
            TenantId = tenant.Id, TenantCode = tenant.Code, AuthorEmail = ticket.RequesterEmail,
            AuthorType = _scope.IsPlatformAdmin ? "Staff" : "Customer",
            Message = request.Message.Trim(), AttachmentUrl = request.AttachmentUrl?.Trim()
        });
        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync();
        ticket.Tenant = tenant;
        return MapTicket(ticket);
    }

    public async Task<TicketResponse?> UpdateTicketAsync(Guid id, TicketUpdateRequest request)
    {
        if (!_scope.IsPlatformAdmin) throw new UnauthorizedAccessException();
        var ticket = await _db.SupportTickets.Include(x => x.Tenant).Include(x => x.Messages)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (ticket == null) return null;
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!TicketStatuses.Contains(request.Status)) throw new ArgumentException("Invalid ticket status.");
            ticket.Status = request.Status;
            ticket.ResolvedAt = request.Status is "Resolved" or "Closed" ? DateTime.UtcNow : null;
        }
        if (!string.IsNullOrWhiteSpace(request.Priority)) ticket.Priority = request.Priority.Trim();
        if (request.AssignedTo != null) ticket.AssignedTo = request.AssignedTo.Trim();
        ticket.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapTicket(ticket);
    }

    public async Task<TicketResponse?> AddTicketMessageAsync(Guid id, TicketMessageRequest request, string authorEmail, bool isStaff)
    {
        var ticket = await _db.SupportTickets.Include(x => x.Tenant).Include(x => x.Messages)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (ticket == null) return null;
        if (request.IsInternal && !isStaff) throw new UnauthorizedAccessException();
        var newMessage = new SupportTicketMessage
        {
            SupportTicketId = ticket.Id,
            TenantId = ticket.TenantId,
            TenantCode = ticket.TenantCode,
            AuthorEmail = authorEmail,
            AuthorType = isStaff ? "Staff" : "Customer",
            Message = request.Message.Trim(),
            AttachmentUrl = request.AttachmentUrl?.Trim(),
            IsInternal = request.IsInternal
        };
        _db.SupportTicketMessages.Add(newMessage);
        ticket.Status = isStaff ? "WaitingCustomer" : "InProgress";
        ticket.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return MapTicket(ticket);
    }

    private async Task<Tenant> ResolveTenantAsync(Guid? tenantId)
    {
        if (_scope.IsPlatformAdmin)
        {
            if (!tenantId.HasValue) throw new ArgumentException("tenantId is required for platform operations.");
            return await _db.Tenants.FirstOrDefaultAsync(x => x.Id == tenantId)
                ?? throw new ArgumentException("Tenant not found.");
        }
        var tenant = await _db.Tenants.FirstOrDefaultAsync(x => x.Code == _scope.TenantCode)
            ?? throw new ArgumentException("Tenant profile has not been provisioned.");
        if (tenantId.HasValue && tenantId.Value != tenant.Id) throw new UnauthorizedAccessException();
        return tenant;
    }

    private async Task<TenantResponse> MapTenantAsync(Tenant tenant)
    {
        var subscription = await _db.Subscriptions.IgnoreQueryFilters().Include(x => x.ProductPlan)
            .Where(x => x.TenantId == tenant.Id).OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync();
        return new TenantResponse
        {
            Id = tenant.Id, Code = tenant.Code, CompanyName = tenant.CompanyName, LegalName = tenant.LegalName,
            TaxCode = tenant.TaxCode, EmailDomain = tenant.EmailDomain, Status = tenant.Status,
            OwnerName = tenant.OwnerName, OwnerEmail = tenant.OwnerEmail, OwnerPhone = tenant.OwnerPhone,
            OwnerUserId = tenant.OwnerUserId, Industry = tenant.Industry, CompanySize = tenant.CompanySize,
            SalesNotes = tenant.SalesNotes, TrialStartsAt = tenant.TrialStartsAt, TrialEndsAt = tenant.TrialEndsAt,
            ActiveUsers = await _db.Users.IgnoreQueryFilters().CountAsync(x => x.TenantCode == tenant.Code && x.IsActive),
            ActiveDevices = await _db.Devices.IgnoreQueryFilters().CountAsync(x =>
                x.TenantCode == tenant.Code && !x.EndpointKeyRevoked && !x.IsRemoteDisabled),
            CurrentPlan = subscription?.ProductPlan.Name, SubscriptionStatus = subscription?.Status,
            CreatedAt = tenant.CreatedAt, UpdatedAt = tenant.UpdatedAt
        };
    }

    private static TenantSettingsResponse MapSettings(TenantSettings x) => new()
    {
        Id = x.Id, TenantId = x.TenantId, LogoUrl = x.LogoUrl, PrimaryDomain = x.PrimaryDomain,
        DefaultRetentionDays = x.DefaultRetentionDays, TimeZone = x.TimeZone, Locale = x.Locale,
        BankCode = x.BankCode, BankAccountNumber = x.BankAccountNumber, BankAccountName = x.BankAccountName,
        PaymentWebhookUrl = x.PaymentWebhookUrl, BillingAddress = x.BillingAddress, 
        AgentBlockedCodeApps = x.AgentBlockedCodeApps, UpdatedAt = x.UpdatedAt
    };

    private static ProductPlanResponse MapPlan(ProductPlan x) => new()
    {
        Id = x.Id, Code = x.Code, Name = x.Name, Description = x.Description,
        MonthlyPrice = x.MonthlyPrice, YearlyPrice = x.YearlyPrice, Currency = x.Currency,
        IncludedUsers = x.IncludedUsers, IncludedDevices = x.IncludedDevices, MaxAgents = x.MaxAgents,
        Features = JsonSerializer.Deserialize<List<string>>(x.FeaturesJson) ?? new(),
        IsActive = x.IsActive, DisplayOrder = x.DisplayOrder, CreatedAt = x.CreatedAt, UpdatedAt = x.UpdatedAt
    };

    private static void ApplyPlan(ProductPlan plan, ProductPlanRequest request)
    {
        plan.Name = request.Name.Trim();
        plan.Description = request.Description?.Trim();
        plan.MonthlyPrice = request.MonthlyPrice;
        plan.YearlyPrice = request.YearlyPrice;
        plan.Currency = request.Currency.Trim().ToUpperInvariant();
        plan.IncludedUsers = request.IncludedUsers;
        plan.IncludedDevices = request.IncludedDevices;
        plan.MaxAgents = request.MaxAgents;
        plan.FeaturesJson = JsonSerializer.Serialize(request.Features.Distinct().ToList());
        plan.IsActive = request.IsActive;
        plan.DisplayOrder = request.DisplayOrder;
        plan.UpdatedAt = DateTime.UtcNow;
    }

    private static OrderResponse MapOrder(SalesOrder x) => new()
    {
        Id = x.Id, OrderNumber = x.OrderNumber, TenantId = x.TenantId, TenantCode = x.TenantCode,
        CompanyName = x.Tenant?.CompanyName ?? string.Empty, ProductPlanId = x.ProductPlanId,
        PlanName = x.ProductPlan?.Name ?? string.Empty, BillingCycle = x.BillingCycle,
        UserQuantity = x.UserQuantity, DeviceQuantity = x.DeviceQuantity, Subtotal = x.Subtotal,
        DiscountAmount = x.DiscountAmount, TaxAmount = x.TaxAmount, TotalAmount = x.TotalAmount,
        Currency = x.Currency, Status = x.Status, ReceiptUrl = x.ReceiptUrl,
        PaymentReference = x.PaymentReference, Notes = x.Notes, CreatedAt = x.CreatedAt, PaidAt = x.PaidAt
    };

    private static PaymentResponse MapPayment(PaymentRecord x) => new()
    {
        Id = x.Id, PaymentNumber = x.PaymentNumber, OrderId = x.OrderId,
        OrderNumber = x.Order?.OrderNumber ?? string.Empty, TenantId = x.TenantId, TenantCode = x.TenantCode,
        Amount = x.Amount, Currency = x.Currency, Method = x.Method, Status = x.Status,
        TransactionReference = x.TransactionReference, ReceiptUrl = x.ReceiptUrl,
        ReconciliationNote = x.ReconciliationNote, CreatedAt = x.CreatedAt, ReconciledAt = x.ReconciledAt
    };

    private static SubscriptionResponse MapSubscription(Subscription x) => new()
    {
        Id = x.Id, TenantId = x.TenantId, TenantCode = x.TenantCode, ProductPlanId = x.ProductPlanId,
        PlanName = x.ProductPlan?.Name ?? string.Empty, Status = x.Status, BillingCycle = x.BillingCycle,
        UserLimit = x.UserLimit, DeviceLimit = x.DeviceLimit, AgentLimit = x.AgentLimit,
        AutoRenew = x.AutoRenew, StartsAt = x.StartsAt, CurrentPeriodEndsAt = x.CurrentPeriodEndsAt
    };

    private async Task<LicenseCreatedResponse> MapLicenseAsync(TenantLicense x, string rawKey = "")
    {
        var response = new LicenseCreatedResponse
        {
            Id = x.Id, TenantId = x.TenantId, TenantCode = x.TenantCode, SubscriptionId = x.SubscriptionId,
            KeyPrefix = x.KeyPrefix, Status = x.Status, UserLimit = x.UserLimit, DeviceLimit = x.DeviceLimit,
            AgentLimit = x.AgentLimit, StartsAt = x.StartsAt, ExpiresAt = x.ExpiresAt,
            LastValidatedAt = x.LastValidatedAt, LicenseKey = rawKey,
            UsedUsers = await _db.Users.IgnoreQueryFilters().CountAsync(u => u.TenantCode == x.TenantCode && u.IsActive),
            UsedDevices = await _db.Devices.IgnoreQueryFilters().CountAsync(d =>
                d.TenantCode == x.TenantCode && !d.EndpointKeyRevoked && !d.IsRemoteDisabled),
            UsedAgents = await _db.Agents.IgnoreQueryFilters().CountAsync(a => a.TenantCode == x.TenantCode && a.IsEnabled)
        };
        return response;
    }

    private async Task<EntitlementResponse> BuildEntitlementAsync(TenantLicense x)
    {
        var subscription = x.SubscriptionId.HasValue
            ? await _db.Subscriptions.IgnoreQueryFilters().Include(s => s.ProductPlan)
                .FirstOrDefaultAsync(s => s.Id == x.SubscriptionId)
            : null;
        var mapped = await MapLicenseAsync(x);
        return new EntitlementResponse
        {
            Status = x.Status, PlanName = subscription?.ProductPlan.Name,
            UserLimit = x.UserLimit, DeviceLimit = x.DeviceLimit, AgentLimit = x.AgentLimit,
            UsedUsers = mapped.UsedUsers, UsedDevices = mapped.UsedDevices, UsedAgents = mapped.UsedAgents,
            ExpiresAt = x.ExpiresAt
        };
    }

    private static InvoiceResponse MapInvoice(Invoice x) => new()
    {
        Id = x.Id, InvoiceNumber = x.InvoiceNumber, TenantId = x.TenantId,
        CompanyName = x.Tenant?.CompanyName ?? string.Empty, OrderId = x.OrderId,
        Status = x.Status, Subtotal = x.Subtotal, DiscountAmount = x.DiscountAmount,
        TaxAmount = x.TaxAmount, TotalAmount = x.TotalAmount, Currency = x.Currency,
        VatNumber = x.VatNumber, BillingAddress = x.BillingAddress,
        IssuedAt = x.IssuedAt, DueAt = x.DueAt, PaidAt = x.PaidAt
    };

    private static QuotationResponse MapQuotation(Quotation x) => new()
    {
        Id = x.Id, QuotationNumber = x.QuotationNumber, TenantId = x.TenantId,
        CompanyName = x.Tenant?.CompanyName ?? string.Empty, ProductPlanId = x.ProductPlanId,
        PlanName = x.ProductPlan?.Name ?? string.Empty, BillingCycle = x.BillingCycle,
        UserQuantity = x.UserQuantity, DeviceQuantity = x.DeviceQuantity, Subtotal = x.Subtotal,
        DiscountAmount = x.DiscountAmount, TaxAmount = x.TaxAmount, TotalAmount = x.TotalAmount,
        Currency = x.Currency, Status = x.Status, Terms = x.Terms,
        ValidUntil = x.ValidUntil, CreatedAt = x.CreatedAt
    };

    private static ContractResponse MapContract(CommercialContract x) => new()
    {
        Id = x.Id, ContractNumber = x.ContractNumber, TenantId = x.TenantId,
        CompanyName = x.Tenant?.CompanyName ?? string.Empty, QuotationId = x.QuotationId,
        Title = x.Title, Status = x.Status, Terms = x.Terms, DocumentUrl = x.DocumentUrl,
        SignedByCustomer = x.SignedByCustomer, SignedByAiguard = x.SignedByAiguard,
        EffectiveAt = x.EffectiveAt, ExpiresAt = x.ExpiresAt, SignedAt = x.SignedAt
    };

    private static OnboardingResponse MapOnboarding(TenantOnboarding x) => new()
    {
        Id = x.Id, TenantId = x.TenantId, TenantCode = x.TenantCode, Status = x.Status,
        AdminCreated = x.AdminCreated, EnrollmentTokenCreated = x.EnrollmentTokenCreated,
        ExtensionInstalled = x.ExtensionInstalled, FirstUserAdded = x.FirstUserAdded,
        PolicyEnabled = x.PolicyEnabled, TestPromptCompleted = x.TestPromptCompleted,
        Notes = x.Notes, StartedAt = x.StartedAt, UpdatedAt = x.UpdatedAt, CompletedAt = x.CompletedAt
    };

    private TicketResponse MapTicket(SupportTicket x) => new()
    {
        Id = x.Id, TicketNumber = x.TicketNumber, TenantId = x.TenantId, TenantCode = x.TenantCode,
        CompanyName = x.Tenant?.CompanyName ?? string.Empty, Subject = x.Subject, Category = x.Category,
        Priority = x.Priority, Status = x.Status, RequesterEmail = x.RequesterEmail,
        AssignedTo = x.AssignedTo, SlaDueAt = x.SlaDueAt,
        IsSlaBreached = x.SlaDueAt < DateTime.UtcNow && x.Status is not ("Resolved" or "Closed"),
        CreatedAt = x.CreatedAt, UpdatedAt = x.UpdatedAt, ResolvedAt = x.ResolvedAt,
        Messages = x.Messages.Where(m => _scope.IsPlatformAdmin || !m.IsInternal).OrderBy(m => m.CreatedAt).Select(m => new TicketMessageResponse
        {
            Id = m.Id, AuthorEmail = m.AuthorEmail, AuthorType = m.AuthorType,
            Message = m.Message, AttachmentUrl = m.AttachmentUrl, IsInternal = m.IsInternal, CreatedAt = m.CreatedAt
        }).ToList()
    };

    private (TenantLicense License, string RawKey) AddLicense(
        Tenant tenant, Subscription? subscription, int users, int devices, int agents, DateTime starts, DateTime expires)
    {
        var raw = GenerateLicenseKey(tenant.Code);
        var license = new TenantLicense
        {
            TenantId = tenant.Id, TenantCode = tenant.Code, SubscriptionId = subscription?.Id,
            KeyPrefix = LicensePrefix(raw), KeyHash = Hash(raw), UserLimit = users,
            DeviceLimit = devices, AgentLimit = agents, StartsAt = starts, ExpiresAt = expires
        };
        _db.TenantLicenses.Add(license);
        return (license, raw);
    }

    private static string GenerateLicenseKey(string tenantCode)
    {
        var random = Convert.ToHexString(RandomNumberGenerator.GetBytes(18));
        return $"AIG-{NormalizeCode(tenantCode)}-{random[..12]}-{random[12..24]}-{random[24..]}";
    }

    private static string LicensePrefix(string key) => key[..Math.Min(24, key.Length)];
    private static string Hash(string value) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static string Number(string prefix) => $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{RandomNumberGenerator.GetInt32(100000, 999999)}";
    private static string NormalizeCode(string value) => value.Trim().ToUpperInvariant().Replace(' ', '-');
    private async Task<ProductPlan> ResolveSignupPlanAsync(Guid? planId, string? planCode)
    {
        if (planId.HasValue)
            return await _db.ProductPlans.FirstOrDefaultAsync(x => x.Id == planId.Value && x.IsActive)
                ?? throw new ArgumentException("Selected trial plan is not available.");
        if (!string.IsNullOrWhiteSpace(planCode))
            return await _db.ProductPlans.FirstOrDefaultAsync(x =>
                    x.Code == NormalizeCode(planCode) && x.IsActive)
                ?? throw new ArgumentException("Selected trial plan is not available.");
        return await _db.ProductPlans.FirstOrDefaultAsync(x => x.Code == "STARTER" && x.IsActive)
            ?? await _db.ProductPlans.FirstOrDefaultAsync(x => x.IsActive)
            ?? throw new ArgumentException("No active product plan is available.");
    }

    private async Task<string> GenerateUniqueTenantCodeAsync(string seed)
    {
        var baseCode = NormalizeCode(seed);
        if (string.IsNullOrWhiteSpace(baseCode)) baseCode = $"TENANT-{RandomNumberGenerator.GetInt32(1000, 9999)}";
        var code = baseCode;
        for (var attempt = 0; attempt < 20; attempt++)
        {
            if (!await _db.Tenants.IgnoreQueryFilters().AnyAsync(x => x.Code == code))
                return code;
            code = $"{baseCode}-{RandomNumberGenerator.GetInt32(1000, 9999)}";
        }
        throw new ArgumentException("Could not generate a unique tenant code.");
    }

    private static string TenantCodeFrom(string companyName, string domain)
    {
        var domainPart = domain.Split('.', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return !string.IsNullOrWhiteSpace(domainPart)
            ? domainPart
            : companyName;
    }

    private static string NormalizeDomain(string value) =>
        value.Trim().TrimStart('@').ToLowerInvariant();

    private string SignupVerificationUrl(string token)
    {
        var baseUrl = _configuration["PublicApp:BaseUrl"] ??
                      _configuration["Frontend:BaseUrl"] ??
                      "http://localhost:5173";
        return $"{baseUrl.TrimEnd('/')}/verify-signup?token={Uri.EscapeDataString(token)}";
    }

    private static void EnsureOwnerMatchesDomain(string ownerEmail, string emailDomain)
    {
        var at = ownerEmail.LastIndexOf('@');
        if (at < 0 || at == ownerEmail.Length - 1)
            throw new ArgumentException("Owner email is invalid.");
        // var ownerDomain = ownerEmail[(at + 1)..].ToLowerInvariant();
        // if (ownerDomain != emailDomain)
        //     throw new ArgumentException("Owner email must match the company email domain.");
    }
    private static decimal UnitPrice(ProductPlan plan, string cycle) =>
        cycle.Equals("Yearly", StringComparison.OrdinalIgnoreCase) ? plan.YearlyPrice : plan.MonthlyPrice;
    private static int Offset(PagedQuery q) => (Math.Max(1, q.Page) - 1) * PageSize(q);
    private static int PageSize(PagedQuery q) => Math.Clamp(q.PageSize, 1, 200);
    private static PagedResult<T> Page<T>(List<T> items, int total, PagedQuery q) => new()
    {
        Items = items, TotalCount = total, Page = Math.Max(1, q.Page), PageSize = PageSize(q)
    };
    private static int SlaHours(string priority) => priority.ToLowerInvariant() switch
    {
        "critical" => 2, "high" => 8, "low" => 72, _ => 24
    };
    private static void ValidateBillingCycle(string value)
    {
        if (value is not ("Monthly" or "Yearly")) throw new ArgumentException("Billing cycle must be Monthly or Yearly.");
    }
    private static void ValidateTenantStatus(string value)
    {
        if (!TenantStatuses.Contains(value)) throw new ArgumentException("Invalid tenant status.");
    }
    private void EnsurePlatformAdmin()
    {
        if (!_scope.IsPlatformAdmin) throw new UnauthorizedAccessException();
    }

    private async Task SeedTenantDefaultDataAsync(string code, AiguardDbContext db)
    {
        // ── Departments ──
        var deptEng = new Department { Name = "Engineering / Phát triển", Code = "ENG", TenantCode = code };
        var deptHr = new Department { Name = "Human Resources / Nhân sự", Code = "HR", TenantCode = code };
        var deptSales = new Department { Name = "Sales / Kinh doanh", Code = "SALES", TenantCode = code };
        var deptFin = new Department { Name = "Finance / Tài chính", Code = "FIN", TenantCode = code };
        var deptLegal = new Department { Name = "Legal / Pháp chế", Code = "LEGAL", TenantCode = code };

        db.Departments.AddRange(deptEng, deptHr, deptSales, deptFin, deptLegal);
        await db.SaveChangesAsync();

        // ── Security Policies ──
        db.SecurityPolicies.AddRange(
            new SecurityPolicy { Name = "Global Default Policy", DepartmentId = null, SensitivityThreshold = 70, Version = "p-global-1.0.0", TenantCode = code },
            new SecurityPolicy { Name = "Engineering Policy", DepartmentId = deptEng.Id, SensitivityThreshold = 70, Version = "p-eng-1.0.0", TenantCode = code },
            new SecurityPolicy { Name = "HR Policy", DepartmentId = deptHr.Id, SensitivityThreshold = 50, Version = "p-hr-1.0.0", TenantCode = code },
            new SecurityPolicy { Name = "Sales Policy", DepartmentId = deptSales.Id, SensitivityThreshold = 60, Version = "p-sales-1.0.0", TenantCode = code },
            new SecurityPolicy { Name = "Finance Policy", DepartmentId = deptFin.Id, SensitivityThreshold = 60, EnableFinancialDetection = true, Version = "p-fin-1.0.0", TenantCode = code },
            new SecurityPolicy { Name = "Legal Policy", DepartmentId = deptLegal.Id, SensitivityThreshold = 55, Version = "p-legal-1.0.0", TenantCode = code }
        );

        // ── Policy List Entries ──
        db.PolicyListEntries.AddRange(
            new PolicyListEntry { ListType = "Whitelist", EntryType = "Keyword", Value = "company-test-db", TenantCode = code },
            new PolicyListEntry { ListType = "Whitelist", EntryType = "Keyword", Value = "sandbox-api-token", TenantCode = code },
            new PolicyListEntry { ListType = "Blacklist", EntryType = "Keyword", Value = "prod-db-password", TenantCode = code },
            new PolicyListEntry { ListType = "Blacklist", EntryType = "Keyword", Value = "revenue-q4-leak", TenantCode = code }
        );

        // ── Retention Policy ──
        db.RetentionPolicies.Add(new RetentionPolicy
        {
            EndpointEventDays = 90,
            AuditLogDays = 365,
            NotificationDays = 30,
            IncidentDays = 730,
            StoreOriginalContent = false,
            EncryptSensitivePreview = true,
            TenantCode = code
        });

        // ── Policy Rules ──
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
                PublishedAt = DateTime.UtcNow,
                TenantCode = code
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
                PublishedAt = DateTime.UtcNow,
                TenantCode = code
            }
        );

        // ── AI Websites ──
        db.AiWebsites.AddRange(
            new AiWebsite { Name = "ChatGPT", DomainPattern = "*.openai.com", IsActive = true, Mode = "Block", TenantCode = code },
            new AiWebsite { Name = "Google Gemini", DomainPattern = "gemini.google.com", IsActive = true, Mode = "Mask", TenantCode = code },
            new AiWebsite { Name = "GitHub Copilot", DomainPattern = "*.github.com/copilot*", IsActive = true, Mode = "PendingApproval", TenantCode = code },
            new AiWebsite { Name = "Claude", DomainPattern = "claude.ai", IsActive = true, Mode = "Block", TenantCode = code },
            new AiWebsite { Name = "DeepSeek", DomainPattern = "*.deepseek.com", IsActive = true, Mode = "Block", TenantCode = code }
        );

        await db.SaveChangesAsync();
    }

    public async Task<List<UserAdminResponse>> GetTenantUsersAsync(Guid tenantId)
    {
        EnsurePlatformAdmin();
        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null) return new List<UserAdminResponse>();

        var users = await _db.Users.IgnoreQueryFilters()
            .Include(u => u.Department)
            .Where(u => u.TenantCode == tenant.Code)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        return users.Select(u => new UserAdminResponse
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            Role = u.Role,
            DepartmentId = u.DepartmentId,
            DepartmentName = u.Department?.Name,
            IsActive = u.IsActive,
            MfaRequired = u.MfaRequired,
            MfaEnabled = u.MfaEnabled,
            AuthProvider = u.AuthProvider,
            LastLoginAt = u.LastLoginAt,
            CreatedAt = u.CreatedAt
        }).ToList();
    }

    public async Task<UserAdminResponse?> UpdateTenantUserAsync(Guid tenantId, Guid userId, UpsertUserRequest request)
    {
        EnsurePlatformAdmin();
        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null) return null;

        var user = await _db.Users.IgnoreQueryFilters()
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId && u.TenantCode == tenant.Code);
        if (user == null) return null;

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _db.Users.IgnoreQueryFilters().AnyAsync(u => u.Id != userId && u.Email == normalizedEmail))
            throw new ArgumentException("Email already exists.");

        user.FullName = request.FullName.Trim();
        user.Email = normalizedEmail;
        user.Role = request.Role;
        user.IsActive = request.IsActive;
        
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await _db.SaveChangesAsync();
        return new UserAdminResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name,
            IsActive = user.IsActive,
            MfaRequired = user.MfaRequired,
            MfaEnabled = user.MfaEnabled,
            AuthProvider = user.AuthProvider,
            LastLoginAt = user.LastLoginAt,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserAdminResponse?> ChangeTenantUserPasswordAsync(Guid tenantId, Guid userId, string newPassword)
    {
        EnsurePlatformAdmin();
        var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null) return null;

        var user = await _db.Users.IgnoreQueryFilters()
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId && u.TenantCode == tenant.Code);
        if (user == null) return null;

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _db.SaveChangesAsync();
        
        return new UserAdminResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name,
            IsActive = user.IsActive,
            MfaRequired = user.MfaRequired,
            MfaEnabled = user.MfaEnabled,
            AuthProvider = user.AuthProvider,
            LastLoginAt = user.LastLoginAt,
            CreatedAt = user.CreatedAt
        };
    }
}
