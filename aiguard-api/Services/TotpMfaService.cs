using System.Security.Cryptography;
using System.Text;

namespace aiguard_api.Services;

public static class TotpMfaService
{
    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private const int SecretBytes = 20;
    private const int TimeStepSeconds = 30;
    private const int Digits = 6;

    public static string GenerateSecret()
    {
        Span<byte> bytes = stackalloc byte[SecretBytes];
        RandomNumberGenerator.Fill(bytes);
        return ToBase32(bytes);
    }

    public static string GenerateProvisioningUri(string issuer, string email, string secret)
    {
        var label = $"{issuer}:{email}";
        return "otpauth://totp/" + Uri.EscapeDataString(label)
            + "?secret=" + Uri.EscapeDataString(secret)
            + "&issuer=" + Uri.EscapeDataString(issuer)
            + "&algorithm=SHA1&digits=6&period=30";
    }

    public static bool VerifyCode(string secret, string code, DateTimeOffset? now = null, int allowedDriftSteps = 1)
    {
        var normalized = new string((code ?? string.Empty).Where(char.IsDigit).ToArray());
        if (normalized.Length != Digits) return false;

        var unixSeconds = (now ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds();
        var currentStep = unixSeconds / TimeStepSeconds;
        for (var offset = -allowedDriftSteps; offset <= allowedDriftSteps; offset++)
        {
            var expected = GenerateCode(secret, currentStep + offset);
            if (FixedTimeEquals(expected, normalized)) return true;
        }

        return false;
    }

    public static string GenerateCurrentCodeForTesting(string secret, DateTimeOffset? now = null)
    {
        var unixSeconds = (now ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds();
        return GenerateCode(secret, unixSeconds / TimeStepSeconds);
    }

    private static string GenerateCode(string secret, long timeStep)
    {
        var key = FromBase32(secret);
        Span<byte> counter = stackalloc byte[8];
        for (var i = 7; i >= 0; i--)
        {
            counter[i] = (byte)(timeStep & 0xff);
            timeStep >>= 8;
        }

        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(counter.ToArray());
        var offset = hash[^1] & 0x0f;
        var binary =
            ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff);
        var otp = binary % 1_000_000;
        return otp.ToString("D6");
    }

    private static string ToBase32(ReadOnlySpan<byte> bytes)
    {
        var output = new StringBuilder((int)Math.Ceiling(bytes.Length / 5d) * 8);
        var buffer = 0;
        var bitsLeft = 0;

        foreach (var b in bytes)
        {
            buffer = (buffer << 8) | b;
            bitsLeft += 8;
            while (bitsLeft >= 5)
            {
                output.Append(Base32Alphabet[(buffer >> (bitsLeft - 5)) & 0x1f]);
                bitsLeft -= 5;
            }
        }

        if (bitsLeft > 0)
            output.Append(Base32Alphabet[(buffer << (5 - bitsLeft)) & 0x1f]);

        return output.ToString();
    }

    private static byte[] FromBase32(string secret)
    {
        var clean = new string((secret ?? string.Empty)
            .Where(c => !char.IsWhiteSpace(c) && c != '=')
            .Select(char.ToUpperInvariant)
            .ToArray());
        if (clean.Length == 0) throw new ArgumentException("MFA secret is empty.");

        var bytes = new List<byte>();
        var buffer = 0;
        var bitsLeft = 0;
        foreach (var c in clean)
        {
            var value = Base32Alphabet.IndexOf(c);
            if (value < 0) throw new ArgumentException("MFA secret contains invalid Base32 characters.");
            buffer = (buffer << 5) | value;
            bitsLeft += 5;
            if (bitsLeft >= 8)
            {
                bytes.Add((byte)((buffer >> (bitsLeft - 8)) & 0xff));
                bitsLeft -= 8;
            }
        }
        return bytes.ToArray();
    }

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.ASCII.GetBytes(left);
        var rightBytes = Encoding.ASCII.GetBytes(right);
        return leftBytes.Length == rightBytes.Length && CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }
}
