using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Audit;
using aiguard_api.DTOs.Common;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/blockchain")]
[Authorize(Roles = "SecurityAdmin,TenantOwner,PlatformAdmin")]
public class BlockchainController : ControllerBase
{
    private readonly IBlockchainService _blockchainService;

    public BlockchainController(IBlockchainService blockchainService) => _blockchainService = blockchainService;

    /// <summary>Get blockchain anchor batches</summary>
    [HttpGet("batches")]
    public async Task<IActionResult> GetBatches([FromQuery] PagedQuery query)
    {
        var result = await _blockchainService.GetBatchesAsync(query);
        return Ok(ApiResponse<PagedResult<BlockchainBatchResponse>>.Ok(result));
    }

    /// <summary>Verify batch integrity by recomputing hash and comparing</summary>
    [HttpPost("verify/{batchId:guid}")]
    public async Task<IActionResult> VerifyBatch(Guid batchId)
    {
        var result = await _blockchainService.VerifyBatchAsync(batchId);
        return Ok(ApiResponse<VerifyBatchResponse>.Ok(result));
    }
}
