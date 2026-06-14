using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Endpoints;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/endpoints/devices")]
[Authorize(Roles = "SecurityAdmin,TenantOwner")]
public class DevicesController : ControllerBase
{
    private readonly IDeviceService _deviceService;

    public DevicesController(IDeviceService deviceService) => _deviceService = deviceService;

    /// <summary>Get paginated list of protected devices</summary>
    [HttpGet]
    public async Task<IActionResult> GetDevices([FromQuery] PagedQuery query)
    {
        var result = await _deviceService.GetDevicesAsync(query);
        return Ok(ApiResponse<PagedResult<DeviceResponse>>.Ok(result));
    }

    /// <summary>Get device details by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDevice(Guid id)
    {
        var device = await _deviceService.GetDeviceByIdAsync(id);
        if (device == null) return NotFound(ApiResponse<object>.Fail("Device not found"));
        return Ok(ApiResponse<DeviceResponse>.Ok(device));
    }

    /// <summary>Trigger policy sync on a device</summary>
    [HttpPost("{id:guid}/sync-policy")]
    public async Task<IActionResult> SyncPolicy(Guid id)
    {
        var ok = await _deviceService.SyncPolicyAsync(id);
        if (!ok) return NotFound(ApiResponse<object>.Fail("Device not found"));
        return Ok(ApiResponse<object>.Ok(new { }, "Policy sync triggered"));
    }

    [HttpPost("{id:guid}/rotate-key")]
    public async Task<IActionResult> RotateKey(Guid id)
    {
        var result = await _deviceService.RotateEndpointKeyAsync(id);
        if (result == null) return NotFound(ApiResponse<object>.Fail("Device not found"));
        return Ok(ApiResponse<RotateEndpointKeyResponse>.Ok(result, "Endpoint key rotated; shown once"));
    }

    [HttpPost("{id:guid}/revoke-key")]
    public async Task<IActionResult> RevokeKey(Guid id)
    {
        if (!await _deviceService.RevokeEndpointKeyAsync(id))
            return NotFound(ApiResponse<object>.Fail("Device not found"));
        return Ok(ApiResponse<object>.Ok(new { }, "Endpoint key revoked"));
    }

    [HttpPost("{id:guid}/quarantine")]
    public async Task<IActionResult> Quarantine(Guid id, [FromBody] DeviceControlRequest request)
    {
        var result = await _deviceService.QuarantineAsync(id, request.Reason);
        return result == null ? NotFound(ApiResponse<object>.Fail("Device not found")) :
            Ok(ApiResponse<DeviceResponse>.Ok(result, "Device quarantined"));
    }

    [HttpPost("{id:guid}/release")]
    public async Task<IActionResult> Release(Guid id)
    {
        var result = await _deviceService.ReleaseQuarantineAsync(id);
        return result == null ? NotFound(ApiResponse<object>.Fail("Device not found")) :
            Ok(ApiResponse<DeviceResponse>.Ok(result, "Device released"));
    }

    [HttpPost("{id:guid}/remote-disable")]
    public async Task<IActionResult> RemoteDisable(Guid id, [FromBody] DeviceControlRequest request)
    {
        var result = await _deviceService.SetRemoteDisabledAsync(id, true, request.Reason);
        return result == null ? NotFound(ApiResponse<object>.Fail("Device not found")) :
            Ok(ApiResponse<DeviceResponse>.Ok(result, "Device protection remotely disabled"));
    }

    [HttpPost("{id:guid}/remote-enable")]
    public async Task<IActionResult> RemoteEnable(Guid id)
    {
        var result = await _deviceService.SetRemoteDisabledAsync(id, false, "Remote enable");
        return result == null ? NotFound(ApiResponse<object>.Fail("Device not found")) :
            Ok(ApiResponse<DeviceResponse>.Ok(result, "Device protection remotely enabled"));
    }

    /// <summary>Device heartbeat endpoint (called by Desktop Agent)</summary>
    [HttpPost("heartbeat")]
    [AllowAnonymous]
    public async Task<IActionResult> Heartbeat([FromBody] HeartbeatRequest request)
    {
        var endpointKey = Request.Headers["X-Endpoint-Key"].FirstOrDefault();
        var endpointSecurity = HttpContext.RequestServices.GetRequiredService<IEndpointSecurityService>();
        if (!await endpointSecurity.ValidateEndpointKeyAsync(request.Hostname, endpointKey))
            return Unauthorized(ApiResponse<object>.Fail("Invalid endpoint credentials"));

        var device = await _deviceService.HeartbeatAsync(request);
        return Ok(ApiResponse<DeviceResponse>.Ok(device));
    }
}
