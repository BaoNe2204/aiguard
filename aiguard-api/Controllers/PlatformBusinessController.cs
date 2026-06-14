using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Saas;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/platform")]
[Authorize(Roles = "PlatformAdmin")]
public class PlatformBusinessController : ControllerBase
{
    private readonly ISaasBusinessService _business;
    private readonly IBusinessDocumentService _documents;
    public PlatformBusinessController(ISaasBusinessService business, IBusinessDocumentService documents)
    {
        _business = business;
        _documents = documents;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard() =>
        Ok(ApiResponse<BusinessDashboardResponse>.Ok(await _business.GetDashboardAsync()));

    [HttpGet("tenants")]
    public async Task<IActionResult> Tenants([FromQuery] PagedQuery query, [FromQuery] string? status) =>
        Ok(ApiResponse<PagedResult<TenantResponse>>.Ok(await _business.GetTenantsAsync(query, status)));

    [HttpGet("tenants/{id:guid}")]
    public async Task<IActionResult> Tenant(Guid id) =>
        await _business.GetTenantAsync(id) is { } result
            ? Ok(ApiResponse<TenantResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Tenant not found."));

    [HttpPost("tenants/trial")]
    public async Task<IActionResult> CreateTrial([FromBody] CreateTrialRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<TrialProvisioningResponse>.Ok(await _business.CreateTrialAsync(request), "Trial tenant provisioned."));

    [HttpPut("tenants/{id:guid}")]
    public async Task<IActionResult> UpdateTenant(Guid id, [FromBody] TenantRequest request) =>
        await _business.UpdateTenantAsync(id, request) is { } result
            ? Ok(ApiResponse<TenantResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Tenant not found."));

    [HttpPost("tenants/{id:guid}/status/{status}")]
    public async Task<IActionResult> TenantStatus(Guid id, string status) =>
        await _business.UpdateTenantStatusAsync(id, status) is { } result
            ? Ok(ApiResponse<TenantResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Tenant not found."));

    [HttpGet("tenants/{tenantId:guid}/settings")]
    public async Task<IActionResult> Settings(Guid tenantId) =>
        Ok(ApiResponse<TenantSettingsResponse>.Ok(await _business.GetSettingsAsync(tenantId)));

    [HttpPut("tenants/{tenantId:guid}/settings")]
    public async Task<IActionResult> UpdateSettings(Guid tenantId, [FromBody] TenantSettingsRequest request) =>
        Ok(ApiResponse<TenantSettingsResponse>.Ok(await _business.UpdateSettingsAsync(tenantId, request)));

    [HttpGet("tenants/{tenantId:guid}/contacts")]
    public async Task<IActionResult> Contacts(Guid tenantId) =>
        Ok(ApiResponse<List<ContactResponse>>.Ok(await _business.GetContactsAsync(tenantId)));

    [HttpPost("tenants/{tenantId:guid}/contacts")]
    public async Task<IActionResult> CreateContact(Guid tenantId, [FromBody] ContactRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<ContactResponse>.Ok(await _business.CreateContactAsync(tenantId, request)));

    [HttpDelete("contacts/{id:guid}")]
    public async Task<IActionResult> DeleteContact(Guid id) =>
        await _business.DeleteContactAsync(id)
            ? Ok(ApiResponse<object>.Ok(new { }))
            : NotFound(ApiResponse<object>.Fail("Contact not found."));

    [HttpGet("plans")]
    public async Task<IActionResult> Plans([FromQuery] bool activeOnly = false) =>
        Ok(ApiResponse<List<ProductPlanResponse>>.Ok(await _business.GetPlansAsync(activeOnly)));

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan([FromBody] ProductPlanRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<ProductPlanResponse>.Ok(await _business.CreatePlanAsync(request)));

    [HttpPut("plans/{id:guid}")]
    public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] ProductPlanRequest request) =>
        await _business.UpdatePlanAsync(id, request) is { } result
            ? Ok(ApiResponse<ProductPlanResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Plan not found."));

    [HttpGet("orders")]
    public async Task<IActionResult> Orders(
        [FromQuery] PagedQuery query, [FromQuery] string? status, [FromQuery] Guid? tenantId) =>
        Ok(ApiResponse<PagedResult<OrderResponse>>.Ok(await _business.GetOrdersAsync(query, status, tenantId)));

    [HttpPost("orders")]
    public async Task<IActionResult> CreateOrder([FromBody] OrderRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<OrderResponse>.Ok(await _business.CreateOrderAsync(request)));

    [HttpPost("orders/{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id, [FromBody] NoteRequest? request) =>
        await _business.CancelOrderAsync(id, request?.Note) is { } result
            ? Ok(ApiResponse<OrderResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Order not found."));

    [HttpPost("orders/{id:guid}/payments")]
    public async Task<IActionResult> RecordPayment(Guid id, [FromBody] PaymentRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<PaymentResponse>.Ok(await _business.RecordPaymentAsync(id, request)));

    [HttpPost("orders/{id:guid}/provision")]
    public async Task<IActionResult> Provision(Guid id) =>
        Ok(ApiResponse<LicenseCreatedResponse>.Ok(
            await _business.ProvisionOrderAsync(id), "Subscription and license provisioned."));

    [HttpGet("payments")]
    public async Task<IActionResult> Payments(
        [FromQuery] PagedQuery query, [FromQuery] string? status, [FromQuery] Guid? tenantId) =>
        Ok(ApiResponse<PagedResult<PaymentResponse>>.Ok(await _business.GetPaymentsAsync(query, status, tenantId)));

    [HttpPost("payments/{id:guid}/reconcile")]
    public async Task<IActionResult> Reconcile(Guid id, [FromBody] PaymentReconcileRequest request)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "platform";
        return await _business.ReconcilePaymentAsync(id, request, email) is { } result
            ? Ok(ApiResponse<PaymentResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Payment not found."));
    }

    [HttpGet("subscriptions")]
    public async Task<IActionResult> Subscriptions([FromQuery] Guid? tenantId) =>
        Ok(ApiResponse<List<SubscriptionResponse>>.Ok(await _business.GetSubscriptionsAsync(tenantId)));

    [HttpPut("subscriptions/{id:guid}")]
    public async Task<IActionResult> ChangeSubscription(Guid id, [FromBody] SubscriptionChangeRequest request) =>
        await _business.ChangeSubscriptionAsync(id, request) is { } result
            ? Ok(ApiResponse<SubscriptionResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Subscription not found."));

    [HttpGet("licenses")]
    public async Task<IActionResult> Licenses([FromQuery] Guid? tenantId) =>
        Ok(ApiResponse<List<LicenseResponse>>.Ok(await _business.GetLicensesAsync(tenantId)));

    [HttpPost("licenses")]
    public async Task<IActionResult> CreateLicense([FromBody] LicenseCreateRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<LicenseCreatedResponse>.Ok(await _business.CreateLicenseAsync(request)));

    [HttpPost("licenses/{id:guid}/status/{status}")]
    public async Task<IActionResult> LicenseStatus(Guid id, string status, [FromBody] NoteRequest? request) =>
        await _business.UpdateLicenseStatusAsync(id, status, request?.Note) is { } result
            ? Ok(ApiResponse<LicenseResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("License not found."));

    [HttpPost("licenses/{id:guid}/rotate")]
    public async Task<IActionResult> RotateLicense(Guid id) =>
        await _business.RotateLicenseAsync(id) is { } result
            ? Ok(ApiResponse<LicenseCreatedResponse>.Ok(result, "License rotated. Store the new key now."))
            : NotFound(ApiResponse<object>.Fail("License not found."));

    [HttpPost("licenses/{id:guid}/renew")]
    public async Task<IActionResult> RenewLicense(Guid id, [FromBody] LicenseRenewRequest request) =>
        await _business.RenewLicenseAsync(id, request) is { } result
            ? Ok(ApiResponse<LicenseCreatedResponse>.Ok(result, "License renewed. Store the new key now."))
            : NotFound(ApiResponse<object>.Fail("License not found."));

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices(
        [FromQuery] PagedQuery query, [FromQuery] string? status, [FromQuery] Guid? tenantId) =>
        Ok(ApiResponse<PagedResult<InvoiceResponse>>.Ok(await _business.GetInvoicesAsync(query, status, tenantId)));

    [HttpPost("invoices")]
    public async Task<IActionResult> CreateInvoice([FromBody] InvoiceRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<InvoiceResponse>.Ok(await _business.CreateInvoiceAsync(request)));

    [HttpPost("invoices/{id:guid}/status/{status}")]
    public async Task<IActionResult> InvoiceStatus(Guid id, string status) =>
        await _business.UpdateInvoiceStatusAsync(id, status) is { } result
            ? Ok(ApiResponse<InvoiceResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Invoice not found."));

    [HttpGet("invoices/{id:guid}/pdf")]
    public async Task<IActionResult> InvoicePdf(Guid id) =>
        await _documents.ExportInvoiceAsync(id) is { } result
            ? File(result.Content, result.ContentType, result.FileName)
            : NotFound(ApiResponse<object>.Fail("Invoice not found."));

    [HttpGet("quotations")]
    public async Task<IActionResult> Quotations(
        [FromQuery] PagedQuery query, [FromQuery] string? status, [FromQuery] Guid? tenantId) =>
        Ok(ApiResponse<PagedResult<QuotationResponse>>.Ok(await _business.GetQuotationsAsync(query, status, tenantId)));

    [HttpPost("quotations")]
    public async Task<IActionResult> CreateQuotation([FromBody] QuotationRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<QuotationResponse>.Ok(await _business.CreateQuotationAsync(request)));

    [HttpPost("quotations/{id:guid}/status/{status}")]
    public async Task<IActionResult> QuotationStatus(Guid id, string status) =>
        await _business.UpdateQuotationStatusAsync(id, status) is { } result
            ? Ok(ApiResponse<QuotationResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Quotation not found."));

    [HttpPost("quotations/{id:guid}/convert-to-order")]
    public async Task<IActionResult> ConvertQuotation(Guid id) =>
        await _business.ConvertQuotationToOrderAsync(id) is { } result
            ? Ok(ApiResponse<OrderResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Quotation not found."));

    [HttpGet("quotations/{id:guid}/pdf")]
    public async Task<IActionResult> QuotationPdf(Guid id) =>
        await _documents.ExportQuotationAsync(id) is { } result
            ? File(result.Content, result.ContentType, result.FileName)
            : NotFound(ApiResponse<object>.Fail("Quotation not found."));

    [HttpGet("contracts")]
    public async Task<IActionResult> Contracts([FromQuery] Guid? tenantId, [FromQuery] string? status) =>
        Ok(ApiResponse<List<ContractResponse>>.Ok(await _business.GetContractsAsync(tenantId, status)));

    [HttpPost("contracts")]
    public async Task<IActionResult> CreateContract([FromBody] ContractRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<ContractResponse>.Ok(await _business.CreateContractAsync(request)));

    [HttpPost("contracts/{id:guid}/action")]
    public async Task<IActionResult> ContractAction(Guid id, [FromBody] ContractActionRequest request) =>
        await _business.UpdateContractAsync(id, request) is { } result
            ? Ok(ApiResponse<ContractResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Contract not found."));

    [HttpGet("contracts/{id:guid}/pdf")]
    public async Task<IActionResult> ContractPdf(Guid id) =>
        await _documents.ExportContractAsync(id) is { } result
            ? File(result.Content, result.ContentType, result.FileName)
            : NotFound(ApiResponse<object>.Fail("Contract not found."));

    [HttpGet("onboarding/{tenantId:guid}")]
    public async Task<IActionResult> Onboarding(Guid tenantId) =>
        await _business.GetOnboardingAsync(tenantId) is { } result
            ? Ok(ApiResponse<OnboardingResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Onboarding not found."));

    [HttpPut("onboarding/{tenantId:guid}")]
    public async Task<IActionResult> UpdateOnboarding(Guid tenantId, [FromBody] OnboardingUpdateRequest request) =>
        await _business.UpdateOnboardingAsync(tenantId, request) is { } result
            ? Ok(ApiResponse<OnboardingResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Onboarding not found."));

    [HttpPost("onboarding/{tenantId:guid}/enrollment-token")]
    public async Task<IActionResult> RegenerateEnrollmentToken(Guid tenantId) =>
        Ok(ApiResponse<EnrollmentTokenResponse>.Ok(
            await _business.RegenerateEnrollmentTokenAsync(tenantId), "Enrollment token regenerated."));

    [HttpGet("tickets")]
    public async Task<IActionResult> Tickets(
        [FromQuery] PagedQuery query, [FromQuery] string? status, [FromQuery] Guid? tenantId) =>
        Ok(ApiResponse<PagedResult<TicketResponse>>.Ok(await _business.GetTicketsAsync(query, status, tenantId)));

    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] TicketRequest request)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "platform";
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<TicketResponse>.Ok(await _business.CreateTicketAsync(request, email)));
    }

    [HttpPut("tickets/{id:guid}")]
    public async Task<IActionResult> UpdateTicket(Guid id, [FromBody] TicketUpdateRequest request) =>
        await _business.UpdateTicketAsync(id, request) is { } result
            ? Ok(ApiResponse<TicketResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Ticket not found."));

    [HttpPost("tickets/{id:guid}/messages")]
    public async Task<IActionResult> AddTicketMessage(Guid id, [FromBody] TicketMessageRequest request)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "platform";
        return await _business.AddTicketMessageAsync(id, request, email, true) is { } result
            ? Ok(ApiResponse<TicketResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Ticket not found."));
    }
}

public class NoteRequest
{
    public string? Note { get; set; }
}
