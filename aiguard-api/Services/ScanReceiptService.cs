using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Dashboard;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IScanReceiptService
{
    Task AttachReceiptAsync(DlpScanResponse result, Device device, string content);
    Task<ScanReceipt?> ConsumeAsync(Guid scanId, string receipt, Device device, string originalHash);
}

public class ScanReceiptService : IScanReceiptService
{
    private readonly AiguardDbContext _db;
    private readonly byte[] _key;

    public ScanReceiptService(AiguardDbContext db, IConfiguration config)
    {
        _db = db;
        var secret = config["ScanReceiptSettings:Secret"];
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
            throw new InvalidOperationException("ScanReceiptSettings:Secret must contain at least 32 characters.");
        _key = Encoding.UTF8.GetBytes(secret);
    }

    public async Task AttachReceiptAsync(DlpScanResponse result, Device device, string content)
    {
        var receipt = new ScanReceipt
        {
            DeviceId = device.Id,
            TenantCode = device.TenantCode,
            ContentHash = Hash(content),
            RiskScore = result.RiskScore,
            RiskLevel = result.RiskLevel,
            Decision = result.Decision,
            DataTypeMatched = string.Join(", ", result.Matches.Select(m => m.DataType)),
            MaskedContentPreview = Truncate(result.MaskedContent, 1000),
            PolicyVersion = result.PolicyVersion ?? device.PolicyVersion,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5)
        };
        receipt.Signature = Sign(receipt);
        _db.ScanReceipts.Add(receipt);
        await _db.SaveChangesAsync();
        result.ScanId = receipt.Id;
        result.Receipt = receipt.Signature;
        result.ContentHash = receipt.ContentHash;
    }

    public async Task<ScanReceipt?> ConsumeAsync(Guid scanId, string signature, Device device, string originalHash)
    {
        var receipt = await _db.ScanReceipts.FirstOrDefaultAsync(r =>
            r.Id == scanId && r.DeviceId == device.Id && r.TenantCode == device.TenantCode);
        if (receipt == null || receipt.ConsumedAt != null || receipt.ExpiresAt <= DateTime.UtcNow) return null;
        if (!CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(receipt.Signature),
            Encoding.UTF8.GetBytes(signature))) return null;
        if (!string.Equals(receipt.Signature, Sign(receipt), StringComparison.Ordinal)) return null;
        if (!string.Equals(receipt.ContentHash, originalHash, StringComparison.OrdinalIgnoreCase)) return null;
        receipt.ConsumedAt = DateTime.UtcNow;
        return receipt;
    }

    private string Sign(ScanReceipt r)
    {
        var payload = $"{r.Id:N}|{r.DeviceId:N}|{r.TenantCode}|{r.ContentHash}|{r.RiskScore}|{r.RiskLevel}|{r.Decision}|{r.PolicyVersion}|{r.ExpiresAt.Ticks}";
        return Convert.ToHexStringLower(HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload)));
    }

    public static string Hash(string value) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static string? Truncate(string? value, int max) =>
        value == null ? null : value[..Math.Min(value.Length, max)];
}
