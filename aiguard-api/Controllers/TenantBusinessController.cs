using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Saas;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/business")]
[Authorize(Roles = "TenantOwner,SecurityAdmin")]
public class TenantBusinessController : ControllerBase
{
    private readonly ISaasBusinessService _business;
    private readonly ILicenseEntitlementService _entitlements;
    private readonly IBusinessDocumentService _documents;
    public TenantBusinessController(
        ISaasBusinessService business,
        ILicenseEntitlementService entitlements,
        IBusinessDocumentService documents)
    {
        _business = business;
        _entitlements = entitlements;
        _documents = documents;
    }

    [HttpGet("tenant")]
    public async Task<IActionResult> Tenant() =>
        await _business.GetCurrentTenantAsync() is { } result
            ? Ok(ApiResponse<TenantResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Tenant profile has not been provisioned."));

    [HttpGet("entitlement")]
    public async Task<IActionResult> Entitlement() =>
        Ok(ApiResponse<EntitlementResponse>.Ok(await _entitlements.GetCurrentAsync()));

    [HttpGet("settings")]
    public async Task<IActionResult> Settings() =>
        Ok(ApiResponse<TenantSettingsResponse>.Ok(await _business.GetSettingsAsync(null)));

    [HttpPut("settings")]
    [Authorize(Roles = "TenantOwner")]
    public async Task<IActionResult> UpdateSettings([FromBody] TenantSettingsRequest request) =>
        Ok(ApiResponse<TenantSettingsResponse>.Ok(await _business.UpdateSettingsAsync(null, request)));

    [HttpGet("contacts")]
    public async Task<IActionResult> Contacts() =>
        Ok(ApiResponse<List<ContactResponse>>.Ok(await _business.GetContactsAsync(null)));

    [HttpPost("contacts")]
    [Authorize(Roles = "TenantOwner")]
    public async Task<IActionResult> CreateContact([FromBody] ContactRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<ContactResponse>.Ok(await _business.CreateContactAsync(null, request)));

    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> Plans() =>
        Ok(ApiResponse<List<ProductPlanResponse>>.Ok(await _business.GetPlansAsync(true)));

    [HttpGet("orders")]
    public async Task<IActionResult> Orders([FromQuery] PagedQuery query, [FromQuery] string? status) =>
        Ok(ApiResponse<PagedResult<OrderResponse>>.Ok(await _business.GetOrdersAsync(query, status, null)));

    [HttpPost("orders")]
    [Authorize(Roles = "TenantOwner")]
    public async Task<IActionResult> CreateOrder([FromBody] OrderRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<OrderResponse>.Ok(await _business.CreateOrderAsync(request)));

    [HttpPost("orders/{id:guid}/payments")]
    [Authorize(Roles = "TenantOwner")]
    public async Task<IActionResult> RecordPayment(Guid id, [FromBody] PaymentRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<PaymentResponse>.Ok(await _business.RecordPaymentAsync(id, request)));

    [HttpGet("payments")]
    public async Task<IActionResult> Payments([FromQuery] PagedQuery query, [FromQuery] string? status) =>
        Ok(ApiResponse<PagedResult<PaymentResponse>>.Ok(await _business.GetPaymentsAsync(query, status, null)));

    [HttpGet("subscriptions")]
    public async Task<IActionResult> Subscriptions() =>
        Ok(ApiResponse<List<SubscriptionResponse>>.Ok(await _business.GetSubscriptionsAsync(null)));

    [HttpGet("licenses")]
    public async Task<IActionResult> Licenses() =>
        Ok(ApiResponse<List<LicenseResponse>>.Ok(await _business.GetLicensesAsync(null)));

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices([FromQuery] PagedQuery query, [FromQuery] string? status) =>
        Ok(ApiResponse<PagedResult<InvoiceResponse>>.Ok(await _business.GetInvoicesAsync(query, status, null)));

    [HttpGet("invoices/{id:guid}/pdf")]
    public async Task<IActionResult> InvoicePdf(Guid id) =>
        await _documents.ExportInvoiceAsync(id) is { } result
            ? File(result.Content, result.ContentType, result.FileName)
            : NotFound(ApiResponse<object>.Fail("Invoice not found."));

    [HttpGet("quotations")]
    public async Task<IActionResult> Quotations([FromQuery] PagedQuery query, [FromQuery] string? status) =>
        Ok(ApiResponse<PagedResult<QuotationResponse>>.Ok(await _business.GetQuotationsAsync(query, status, null)));

    [HttpGet("quotations/{id:guid}/pdf")]
    public async Task<IActionResult> QuotationPdf(Guid id) =>
        await _documents.ExportQuotationAsync(id) is { } result
            ? File(result.Content, result.ContentType, result.FileName)
            : NotFound(ApiResponse<object>.Fail("Quotation not found."));

    [HttpGet("contracts")]
    public async Task<IActionResult> Contracts([FromQuery] string? status) =>
        Ok(ApiResponse<List<ContractResponse>>.Ok(await _business.GetContractsAsync(null, status)));

    [HttpGet("contracts/{id:guid}/pdf")]
    public async Task<IActionResult> ContractPdf(Guid id) =>
        await _documents.ExportContractAsync(id) is { } result
            ? File(result.Content, result.ContentType, result.FileName)
            : NotFound(ApiResponse<object>.Fail("Contract not found."));

    [HttpGet("onboarding")]
    public async Task<IActionResult> Onboarding() =>
        await _business.GetOnboardingAsync(null) is { } result
            ? Ok(ApiResponse<OnboardingResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Onboarding not found."));

    [HttpPut("onboarding")]
    [Authorize(Roles = "TenantOwner")]
    public async Task<IActionResult> UpdateOnboarding([FromBody] OnboardingUpdateRequest request) =>
        await _business.UpdateOnboardingAsync(null, request) is { } result
            ? Ok(ApiResponse<OnboardingResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Onboarding not found."));

    [HttpPost("onboarding/enrollment-token")]
    [Authorize(Roles = "TenantOwner")]
    public async Task<IActionResult> RegenerateEnrollmentToken() =>
        Ok(ApiResponse<EnrollmentTokenResponse>.Ok(
            await _business.RegenerateEnrollmentTokenAsync(null), "Enrollment token regenerated."));

    [HttpGet("tickets")]
    public async Task<IActionResult> Tickets([FromQuery] PagedQuery query, [FromQuery] string? status) =>
        Ok(ApiResponse<PagedResult<TicketResponse>>.Ok(await _business.GetTicketsAsync(query, status, null)));

    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] TicketRequest request)
    {
        request.TenantId = null;
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<TicketResponse>.Ok(await _business.CreateTicketAsync(request, email)));
    }

    [HttpPost("tickets/{id:guid}/messages")]
    public async Task<IActionResult> AddTicketMessage(Guid id, [FromBody] TicketMessageRequest request)
    {
        request.IsInternal = false;
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;
        return await _business.AddTicketMessageAsync(id, request, email, false) is { } result
            ? Ok(ApiResponse<TicketResponse>.Ok(result))
            : NotFound(ApiResponse<object>.Fail("Ticket not found."));
    }
}
