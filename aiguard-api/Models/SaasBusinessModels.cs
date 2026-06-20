using System.ComponentModel.DataAnnotations;

namespace aiguard_api.Models;

public class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(100)] public string Code { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string CompanyName { get; set; } = string.Empty;
    [MaxLength(255)] public string? LegalName { get; set; }
    [MaxLength(100)] public string? TaxCode { get; set; }
    [MaxLength(255)] public string? EmailDomain { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Trial";
    [MaxLength(255)] public string OwnerName { get; set; } = string.Empty;
    [MaxLength(255)] public string OwnerEmail { get; set; } = string.Empty;
    [MaxLength(50)] public string? OwnerPhone { get; set; }
    public Guid? OwnerUserId { get; set; }
    [MaxLength(100)] public string? Industry { get; set; }
    [MaxLength(100)] public string? CompanySize { get; set; }
    [MaxLength(2000)] public string? SalesNotes { get; set; }
    public DateTime? TrialStartsAt { get; set; }
    public DateTime? TrialEndsAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public TenantSettings? Settings { get; set; }
    public ICollection<CustomerContact> Contacts { get; set; } = new List<CustomerContact>();
    public ICollection<SalesOrder> Orders { get; set; } = new List<SalesOrder>();
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<TenantLicense> Licenses { get; set; } = new List<TenantLicense>();
}

public class TenantSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    [MaxLength(1000)] public string? LogoUrl { get; set; }
    [MaxLength(255)] public string? PrimaryDomain { get; set; }
    public int DefaultRetentionDays { get; set; } = 365;
    [MaxLength(100)] public string TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    [MaxLength(10)] public string Locale { get; set; } = "vi-VN";
    [MaxLength(50)] public string? BankCode { get; set; }
    [MaxLength(100)] public string? BankAccountNumber { get; set; }
    [MaxLength(255)] public string? BankAccountName { get; set; }
    [MaxLength(1000)] public string? PaymentWebhookUrl { get; set; }
    [MaxLength(1000)] public string? BillingAddress { get; set; }
    public string AgentBlockedCodeApps { get; set; } = "code,cursor,codex,claude,windsurf,trae,tabnine,github copilot";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
}

public class CustomerContact
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string FullName { get; set; } = string.Empty;
    [Required, MaxLength(255), EmailAddress] public string Email { get; set; } = string.Empty;
    [MaxLength(50)] public string? Phone { get; set; }
    [MaxLength(100)] public string? JobTitle { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsBillingContact { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
}

public class ProductPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string Code { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string Name { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Description { get; set; }
    public decimal MonthlyPrice { get; set; }
    public decimal YearlyPrice { get; set; }
    [Required, MaxLength(10)] public string Currency { get; set; } = "VND";
    public int IncludedUsers { get; set; }
    public int IncludedDevices { get; set; }
    public int MaxAgents { get; set; }
    [MaxLength(8000)] public string FeaturesJson { get; set; } = "[]";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class SalesOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string OrderNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    public Guid ProductPlanId { get; set; }
    [Required, MaxLength(20)] public string BillingCycle { get; set; } = "Monthly";
    public int UserQuantity { get; set; }
    public int DeviceQuantity { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    [Required, MaxLength(10)] public string Currency { get; set; } = "VND";
    [Required, MaxLength(50)] public string Status { get; set; } = "PendingPayment";
    [MaxLength(1000)] public string? ReceiptUrl { get; set; }
    [MaxLength(255)] public string? PaymentReference { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
    public Guid? QuotationId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public ProductPlan ProductPlan { get; set; } = null!;
    public ICollection<PaymentRecord> Payments { get; set; } = new List<PaymentRecord>();
}

public class PaymentRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string PaymentNumber { get; set; } = string.Empty;
    public Guid OrderId { get; set; }
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    [Required, MaxLength(10)] public string Currency { get; set; } = "VND";
    [Required, MaxLength(50)] public string Method { get; set; } = "BankTransfer";
    [Required, MaxLength(50)] public string Status { get; set; } = "PendingReconciliation";
    [MaxLength(255)] public string? TransactionReference { get; set; }
    [MaxLength(1000)] public string? ReceiptUrl { get; set; }
    [MaxLength(2000)] public string? ReconciliationNote { get; set; }
    [MaxLength(255)] public string? ReconciledBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime? ReconciledAt { get; set; }
    public SalesOrder Order { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}

public class Subscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    public Guid ProductPlanId { get; set; }
    public Guid? OrderId { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Trial";
    [Required, MaxLength(20)] public string BillingCycle { get; set; } = "Monthly";
    public int UserLimit { get; set; }
    public int DeviceLimit { get; set; }
    public int AgentLimit { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime CurrentPeriodStartsAt { get; set; }
    public DateTime CurrentPeriodEndsAt { get; set; }
    public DateTime? TrialEndsAt { get; set; }
    public bool AutoRenew { get; set; }
    public DateTime? CancelAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
    public ProductPlan ProductPlan { get; set; } = null!;
    public SalesOrder? Order { get; set; }
}

public class TenantLicense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    public Guid? SubscriptionId { get; set; }
    [Required, MaxLength(30)] public string KeyPrefix { get; set; } = string.Empty;
    [Required, MaxLength(128)] public string KeyHash { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "Active";
    public int UserLimit { get; set; }
    public int DeviceLimit { get; set; }
    public int AgentLimit { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? LastValidatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    [MaxLength(1000)] public string? RevokeReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
    public Subscription? Subscription { get; set; }
}

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string InvoiceNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    public Guid? OrderId { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    [Required, MaxLength(10)] public string Currency { get; set; } = "VND";
    [MaxLength(100)] public string? VatNumber { get; set; }
    [MaxLength(1000)] public string? BillingAddress { get; set; }
    [MaxLength(1000)] public string? PdfUrl { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public DateTime DueAt { get; set; } = DateTime.UtcNow.AddDays(7);
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
    public SalesOrder? Order { get; set; }
}

public class Quotation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string QuotationNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    public Guid ProductPlanId { get; set; }
    [Required, MaxLength(20)] public string BillingCycle { get; set; } = "Yearly";
    public int UserQuantity { get; set; }
    public int DeviceQuantity { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    [Required, MaxLength(10)] public string Currency { get; set; } = "VND";
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    [MaxLength(4000)] public string? Terms { get; set; }
    [MaxLength(1000)] public string? PdfUrl { get; set; }
    public DateTime ValidUntil { get; set; } = DateTime.UtcNow.AddDays(14);
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
    public ProductPlan ProductPlan { get; set; } = null!;
}

public class CommercialContract
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string ContractNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    public Guid? QuotationId { get; set; }
    [Required, MaxLength(255)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    [MaxLength(8000)] public string? Terms { get; set; }
    [MaxLength(1000)] public string? DocumentUrl { get; set; }
    [MaxLength(255)] public string? SignedByCustomer { get; set; }
    [MaxLength(255)] public string? SignedByAiguard { get; set; }
    public DateTime EffectiveAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddYears(1);
    public DateTime? SignedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Tenant Tenant { get; set; } = null!;
    public Quotation? Quotation { get; set; }
}

public class TenantOnboarding
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Status { get; set; } = "InProgress";
    public bool AdminCreated { get; set; }
    public bool EnrollmentTokenCreated { get; set; }
    public bool ExtensionInstalled { get; set; }
    public bool FirstUserAdded { get; set; }
    public bool PolicyEnabled { get; set; }
    public bool TestPromptCompleted { get; set; }
    public Guid? EnrollmentTokenId { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public Tenant Tenant { get; set; } = null!;
}

public class SupportTicket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(50)] public string TicketNumber { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string Subject { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string Category { get; set; } = "Technical";
    [Required, MaxLength(50)] public string Priority { get; set; } = "Normal";
    [Required, MaxLength(50)] public string Status { get; set; } = "Open";
    [Required, MaxLength(255)] public string RequesterEmail { get; set; } = string.Empty;
    [MaxLength(255)] public string? AssignedTo { get; set; }
    public DateTime SlaDueAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}

public class SupportTicketMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SupportTicketId { get; set; }
    public Guid TenantId { get; set; }
    [Required, MaxLength(100)] public string TenantCode { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string AuthorEmail { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string AuthorType { get; set; } = "Customer";
    [Required, MaxLength(8000)] public string Message { get; set; } = string.Empty;
    [MaxLength(1000)] public string? AttachmentUrl { get; set; }
    public bool IsInternal { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public SupportTicket SupportTicket { get; set; } = null!;
}
