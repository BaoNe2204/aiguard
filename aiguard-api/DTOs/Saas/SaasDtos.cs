using System.ComponentModel.DataAnnotations;

namespace aiguard_api.DTOs.Saas;

public class TenantRequest
{
    [Required, MaxLength(100)] public string Code { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string CompanyName { get; set; } = string.Empty;
    public string? LegalName { get; set; }
    public string? TaxCode { get; set; }
    public string? EmailDomain { get; set; }
    [Required] public string OwnerName { get; set; } = string.Empty;
    [Required, EmailAddress] public string OwnerEmail { get; set; } = string.Empty;
    public string? OwnerPhone { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? SalesNotes { get; set; }
    public string Status { get; set; } = "Trial";
}

public class TenantResponse : TenantRequest
{
    public Guid Id { get; set; }
    public Guid? OwnerUserId { get; set; }
    public DateTime? TrialStartsAt { get; set; }
    public DateTime? TrialEndsAt { get; set; }
    public int ActiveUsers { get; set; }
    public int ActiveDevices { get; set; }
    public string? CurrentPlan { get; set; }
    public string? SubscriptionStatus { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTrialRequest : TenantRequest
{
    [Required, MinLength(8)] public string OwnerPassword { get; set; } = string.Empty;
    [Range(1, 90)] public int TrialDays { get; set; } = 14;
    public Guid? ProductPlanId { get; set; }
}

public class TrialProvisioningResponse
{
    public TenantResponse Tenant { get; set; } = new();
    public Guid OwnerUserId { get; set; }
    public Guid SubscriptionId { get; set; }
    public Guid LicenseId { get; set; }
    public string LicenseKey { get; set; } = string.Empty;
    public string EnrollmentToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class PublicTrialSignupRequest
{
    [MaxLength(100)] public string? PreferredTenantCode { get; set; }
    [Required, MaxLength(255)] public string CompanyName { get; set; } = string.Empty;
    public string? LegalName { get; set; }
    public string? TaxCode { get; set; }
    [Required, MaxLength(255)] public string EmailDomain { get; set; } = string.Empty;
    [Required] public string OwnerName { get; set; } = string.Empty;
    [Required, EmailAddress] public string OwnerEmail { get; set; } = string.Empty;
    [Required, MinLength(8)] public string OwnerPassword { get; set; } = string.Empty;
    public string? OwnerPhone { get; set; }
    public string? Industry { get; set; }
    public string? CompanySize { get; set; }
    public string? SalesNotes { get; set; }
    public Guid? ProductPlanId { get; set; }
    public string? ProductPlanCode { get; set; }
    [Range(1, 30)] public int TrialDays { get; set; } = 14;
}

public class PublicTrialSignupResponse
{
    public string TenantCode { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Status { get; set; } = "PendingEmailVerification";
    public DateTime TrialEndsAt { get; set; }
    public string? VerificationToken { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class VerifyTrialSignupRequest
{
    [Required] public string VerificationToken { get; set; } = string.Empty;
    [Required, MinLength(8)] public string NewPassword { get; set; } = string.Empty;
}

public class VerifyTrialSignupResponse
{
    public string TenantCode { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    public bool RequiresMfaSetup { get; set; } = true;
    public string NextStep { get; set; } = "Login with the new password and complete MFA setup.";
}

public class TenantSettingsRequest
{
    public string? LogoUrl { get; set; }
    public string? PrimaryDomain { get; set; }
    [Range(1, 3650)] public int DefaultRetentionDays { get; set; } = 365;
    public string TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    public string Locale { get; set; } = "vi-VN";
    public string? BankCode { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountName { get; set; }
    public string? PaymentWebhookUrl { get; set; }
    public string? BillingAddress { get; set; }
}

public class TenantSettingsResponse : TenantSettingsRequest
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ContactRequest
{
    [Required] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? JobTitle { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsBillingContact { get; set; }
}

public class ContactResponse : ContactRequest
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductPlanRequest
{
    [Required] public string Code { get; set; } = string.Empty;
    [Required] public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    [Range(0, double.MaxValue)] public decimal MonthlyPrice { get; set; }
    [Range(0, double.MaxValue)] public decimal YearlyPrice { get; set; }
    public string Currency { get; set; } = "VND";
    [Range(1, int.MaxValue)] public int IncludedUsers { get; set; } = 10;
    [Range(1, int.MaxValue)] public int IncludedDevices { get; set; } = 10;
    [Range(0, int.MaxValue)] public int MaxAgents { get; set; }
    public List<string> Features { get; set; } = new();
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class ProductPlanResponse : ProductPlanRequest
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class OrderRequest
{
    [Required] public Guid TenantId { get; set; }
    [Required] public Guid ProductPlanId { get; set; }
    [Required] public string BillingCycle { get; set; } = "Monthly";
    [Range(1, int.MaxValue)] public int UserQuantity { get; set; } = 10;
    [Range(1, int.MaxValue)] public int DeviceQuantity { get; set; } = 10;
    [Range(0, double.MaxValue)] public decimal DiscountAmount { get; set; }
    [Range(0, 100)] public decimal TaxPercent { get; set; }
    public string? Notes { get; set; }
    public Guid? QuotationId { get; set; }
}

public class OrderResponse
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public Guid ProductPlanId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = string.Empty;
    public int UserQuantity { get; set; }
    public int DeviceQuantity { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ReceiptUrl { get; set; }
    public string? PaymentReference { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class PaymentRequest
{
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string Method { get; set; } = "BankTransfer";
    public string? TransactionReference { get; set; }
    public string? ReceiptUrl { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class PaymentReconcileRequest
{
    public bool Approved { get; set; }
    public string? Note { get; set; }
}

public class PaymentResponse
{
    public Guid Id { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? ReconciliationNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReconciledAt { get; set; }
}

public class SubscriptionResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public Guid ProductPlanId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = string.Empty;
    public int UserLimit { get; set; }
    public int DeviceLimit { get; set; }
    public int AgentLimit { get; set; }
    public bool AutoRenew { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime CurrentPeriodEndsAt { get; set; }
}

public class SubscriptionChangeRequest
{
    [Required] public Guid ProductPlanId { get; set; }
    public string BillingCycle { get; set; } = "Monthly";
    [Range(1, int.MaxValue)] public int UserLimit { get; set; }
    [Range(1, int.MaxValue)] public int DeviceLimit { get; set; }
    [Range(0, int.MaxValue)] public int AgentLimit { get; set; }
    public bool AutoRenew { get; set; }
    [Range(1, 36)] public int PeriodMonths { get; set; } = 1;
}

public class LicenseCreateRequest
{
    [Required] public Guid TenantId { get; set; }
    public Guid? SubscriptionId { get; set; }
    [Range(1, int.MaxValue)] public int UserLimit { get; set; }
    [Range(1, int.MaxValue)] public int DeviceLimit { get; set; }
    [Range(0, int.MaxValue)] public int AgentLimit { get; set; }
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddYears(1);
}

public class LicenseResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public Guid? SubscriptionId { get; set; }
    public string KeyPrefix { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int UserLimit { get; set; }
    public int DeviceLimit { get; set; }
    public int AgentLimit { get; set; }
    public int UsedUsers { get; set; }
    public int UsedDevices { get; set; }
    public int UsedAgents { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? LastValidatedAt { get; set; }
}

public class LicenseCreatedResponse : LicenseResponse
{
    public string LicenseKey { get; set; } = string.Empty;
}

public class LicenseValidationRequest
{
    [Required] public string TenantCode { get; set; } = string.Empty;
    [Required] public string LicenseKey { get; set; } = string.Empty;
}

public class LicenseRenewRequest
{
    [Range(1, 60)] public int Months { get; set; } = 12;
    public int? UserLimit { get; set; }
    public int? DeviceLimit { get; set; }
    public int? AgentLimit { get; set; }
}

public class EntitlementResponse
{
    public bool IsEntitled { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PlanName { get; set; }
    public int UserLimit { get; set; }
    public int DeviceLimit { get; set; }
    public int AgentLimit { get; set; }
    public int UsedUsers { get; set; }
    public int UsedDevices { get; set; }
    public int UsedAgents { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class InvoiceRequest
{
    [Required] public Guid TenantId { get; set; }
    public Guid? OrderId { get; set; }
    [Range(0, double.MaxValue)] public decimal Subtotal { get; set; }
    [Range(0, double.MaxValue)] public decimal DiscountAmount { get; set; }
    [Range(0, double.MaxValue)] public decimal TaxAmount { get; set; }
    public string Currency { get; set; } = "VND";
    public string? VatNumber { get; set; }
    public string? BillingAddress { get; set; }
    public DateTime? DueAt { get; set; }
}

public class InvoiceResponse
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public Guid? OrderId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? VatNumber { get; set; }
    public string? BillingAddress { get; set; }
    public DateTime IssuedAt { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class QuotationRequest
{
    [Required] public Guid TenantId { get; set; }
    [Required] public Guid ProductPlanId { get; set; }
    public string BillingCycle { get; set; } = "Yearly";
    [Range(1, int.MaxValue)] public int UserQuantity { get; set; } = 10;
    [Range(1, int.MaxValue)] public int DeviceQuantity { get; set; } = 10;
    [Range(0, double.MaxValue)] public decimal DiscountAmount { get; set; }
    [Range(0, 100)] public decimal TaxPercent { get; set; }
    public string? Terms { get; set; }
    public DateTime? ValidUntil { get; set; }
}

public class QuotationResponse
{
    public Guid Id { get; set; }
    public string QuotationNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public Guid ProductPlanId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = string.Empty;
    public int UserQuantity { get; set; }
    public int DeviceQuantity { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Terms { get; set; }
    public DateTime ValidUntil { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ContractRequest
{
    [Required] public Guid TenantId { get; set; }
    public Guid? QuotationId { get; set; }
    [Required] public string Title { get; set; } = string.Empty;
    public string? Terms { get; set; }
    public string? DocumentUrl { get; set; }
    public DateTime EffectiveAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddYears(1);
}

public class ContractActionRequest
{
    [Required] public string Status { get; set; } = string.Empty;
    public string? SignedByCustomer { get; set; }
    public string? SignedByAiguard { get; set; }
}

public class ContractResponse
{
    public Guid Id { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public Guid? QuotationId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Terms { get; set; }
    public string? DocumentUrl { get; set; }
    public string? SignedByCustomer { get; set; }
    public string? SignedByAiguard { get; set; }
    public DateTime EffectiveAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? SignedAt { get; set; }
}

public class OnboardingUpdateRequest
{
    public bool? ExtensionInstalled { get; set; }
    public bool? FirstUserAdded { get; set; }
    public bool? PolicyEnabled { get; set; }
    public bool? TestPromptCompleted { get; set; }
    public string? Notes { get; set; }
}

public class EnrollmentTokenResponse
{
    public Guid TokenId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string EnrollmentToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string InstallCommand { get; set; } = string.Empty;
}

public class OnboardingResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool AdminCreated { get; set; }
    public bool EnrollmentTokenCreated { get; set; }
    public bool ExtensionInstalled { get; set; }
    public bool FirstUserAdded { get; set; }
    public bool PolicyEnabled { get; set; }
    public bool TestPromptCompleted { get; set; }
    public string? Notes { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class TicketRequest
{
    public Guid? TenantId { get; set; }
    [Required] public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = "Technical";
    public string Priority { get; set; } = "Normal";
    [Required] public string Message { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
}

public class TicketUpdateRequest
{
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? AssignedTo { get; set; }
}

public class TicketMessageRequest
{
    [Required] public string Message { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public bool IsInternal { get; set; }
}

public class TicketMessageResponse
{
    public Guid Id { get; set; }
    public string AuthorEmail { get; set; } = string.Empty;
    public string AuthorType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public bool IsInternal { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TicketResponse
{
    public Guid Id { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public DateTime SlaDueAt { get; set; }
    public bool IsSlaBreached { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public List<TicketMessageResponse> Messages { get; set; } = new();
}

public class BusinessDashboardResponse
{
    public int TotalTenants { get; set; }
    public int TrialTenants { get; set; }
    public int PaidTenants { get; set; }
    public int PendingOrders { get; set; }
    public int PendingPayments { get; set; }
    public int ActiveSubscriptions { get; set; }
    public int ExpiringLicenses { get; set; }
    public int OpenTickets { get; set; }
    public decimal RecognizedRevenue { get; set; }
    public string Currency { get; set; } = "VND";
}
