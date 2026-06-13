using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.DTOs.Dashboard;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IDlpScannerService
{
    Task<DlpScanResponse> ScanContentAsync(DlpScanRequest request);
}

public class DlpScannerService : IDlpScannerService
{
    private readonly AiguardDbContext _db;

    private static readonly IReadOnlyList<DetectorRule> Detectors =
    [
        new("Private Key", @"-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----", 90, 90, p => p.EnablePrivateKeyDetection),
        new("Database URL", @"(?i)((Server|Data Source|Host)\s*=\s*[^;]+;.*?(Password|Pwd)\s*=|(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s]+)", 75, 85, p => p.EnableDbUrlDetection),
        new("API Key", @"(?x)(
            sk-(?:proj-)?[a-zA-Z0-9\-_]{16,} |
            AKIA[0-9A-Z]{16} |
            ASIA[0-9A-Z]{16} |
            AIza[0-9A-Za-z\-_]{35} |
            gh[pousr]_[A-Za-z0-9_]{20,} |
            github_pat_[A-Za-z0-9_]{30,} |
            xox[baprs]-[A-Za-z0-9-]{10,} |
            SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,} |
            sk_(?:live|test)_[A-Za-z0-9]{16,} |
            npm_[A-Za-z0-9]{20,}
        )", 70, 85, p => p.EnableApiKeyDetection),
        new("AWS Secret Key", @"(?i)(aws_secret_access_key|aws.?secret)\s*[=:]\s*[""']?[A-Za-z0-9/+=]{32,}", 80, 90, p => p.EnableApiKeyDetection),
        new("Azure Storage Key", @"(?i)(AccountKey|SharedAccessSignature)\s*=\s*[^;\s]{20,}", 80, 90, p => p.EnableApiKeyDetection),
        new("Password", @"(?i)(password|passwd|pwd|db_password|secret)\s*[=:]\s*[""']?[^\s;""']+", 70, 85, p => p.EnablePasswordDetection),
        new("JWT Token", @"eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}", 70, 85, p => p.EnableTokenDetection),
        new("CCCD", @"(?<!\d)\d{12}(?!\d)", 35, 60, p => p.EnableCccdDetection),
        new("Source Code", @"(?im)(class\s+\w+|function\s+\w+|def\s+\w+|public\s+(static\s+)?(?:void|class)|import\s+\w+|using\s+[\w.]+;|SELECT\s+.+\s+FROM|CREATE\s+TABLE)", 40, 60, p => p.EnableSourceCodeDetection),
        new("Customer Data", @"(?i)(khách hàng|customer|client|danh sách khách hàng|customer list)", 45, 60, _ => true),
        new("HR Data", @"(?i)(lương|salary|cv ứng viên|hợp đồng lao động|employment contract|đánh giá nhân viên)", 45, 60, p => p.EnableHrDetection),
        new("Financial Data", @"(?i)(doanh thu|revenue|lợi nhuận|profit|công nợ|receivable|báo cáo tài chính)", 55, 60, p => p.EnableFinancialDetection),
        new("Legal Contract", @"(?i)(NDA|non.?disclosure|bảo mật thông tin|điều khoản hợp đồng|confidential agreement)", 50, 60, _ => true),
        new("Email", @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", 10, 0, p => p.EnableEmailDetection),
        new("Phone", @"(?<!\d)(0\d{9,10}|\+84\d{9,10})(?!\d)", 15, 0, p => p.EnablePhoneDetection)
    ];

    private static readonly IReadOnlyDictionary<string, string> MaskLabels = new Dictionary<string, string>
    {
        ["API Key"] = "[API_KEY]",
        ["Password"] = "[PASSWORD]",
        ["JWT Token"] = "[TOKEN]",
        ["Database URL"] = "[DB_URL]",
        ["Private Key"] = "[PRIVATE_KEY]",
        ["CCCD"] = "[CCCD]",
        ["Source Code"] = "[SOURCE_CODE]",
        ["Customer Data"] = "[CUSTOMER_DATA]",
        ["HR Data"] = "[HR_DATA]",
        ["Financial Data"] = "[FINANCIAL_DATA]",
        ["Legal Contract"] = "[LEGAL_CONTRACT]",
        ["Email"] = "[EMAIL]",
        ["Phone"] = "[PHONE]"
        ,["AWS Secret Key"] = "[AWS_SECRET_KEY]"
        ,["Azure Storage Key"] = "[AZURE_STORAGE_KEY]"
    };

    public DlpScannerService(AiguardDbContext db) => _db = db;

    public async Task<DlpScanResponse> ScanContentAsync(DlpScanRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            return new DlpScanResponse { RiskScore = 0, RiskLevel = "Low", Decision = "Allow" };

        var policy = await ResolvePolicyAsync(request.DepartmentCode);
        var now = DateTime.UtcNow;
        var contentHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(request.Content)));
        var listEntries = await _db.PolicyListEntries
            .Where(e => e.IsActive && (e.ExpiresAt == null || e.ExpiresAt > now) &&
                (e.DepartmentId == null || e.DepartmentId == policy.DepartmentId))
            .ToListAsync();

        if (listEntries.Any(e => e.ListType == "Whitelist" &&
            ((e.EntryType == "ContentHash" && e.Value == contentHash) ||
             (e.EntryType != "ContentHash" && request.Content.Contains(e.Value, StringComparison.OrdinalIgnoreCase)))))
        {
            return new DlpScanResponse
            {
                RiskScore = 0,
                RiskLevel = "Low",
                Decision = "Allow",
                PolicyVersion = policy.Version
            };
        }

        var matches = new List<DetectionMatch>();
        var maskedContent = request.Content;
        var totalScore = 10;

        foreach (var detector in Detectors.Where(d => d.Enabled(policy)))
        {
            var regex = new Regex(detector.Pattern, RegexOptions.Compiled, TimeSpan.FromSeconds(1));
            var found = regex.Matches(request.Content);
            if (found.Count == 0) continue;

            var sample = MaskLabels.TryGetValue(detector.Name, out var safeSample)
                ? safeSample
                : "[DETECTED]";

            matches.Add(new DetectionMatch
            {
                DataType = detector.Name,
                Weight = detector.Weight,
                Count = found.Count,
                Sample = sample,
                Reason = $"Detected {found.Count} match(es) for {detector.Name}.",
                Locations = found.Cast<Match>().Take(20).Select(match => Locate(request.Content, match)).ToList()
            });

            totalScore += detector.Weight * Math.Min(found.Count, 3);
            totalScore = Math.Max(totalScore, detector.MinimumScore);
            if (MaskLabels.TryGetValue(detector.Name, out var label))
                maskedContent = regex.Replace(maskedContent, label);
        }

        foreach (var entry in listEntries.Where(e => e.ListType == "Blacklist"))
        {
            if (!request.Content.Contains(entry.Value, StringComparison.OrdinalIgnoreCase)) continue;
            totalScore += 50;
            matches.Add(new DetectionMatch
            {
                DataType = $"Blacklist:{entry.EntryType}",
                Weight = 50,
                Count = 1,
                Sample = "[BLACKLIST_MATCH]",
                Reason = $"Matched enterprise blacklist entry type {entry.EntryType}."
            });
        }

        var edmMatches = await FindExactDataMatchesAsync(request.Content, policy.DepartmentId);
        foreach (var edm in edmMatches)
        {
            totalScore = Math.Max(totalScore + 65, 85);
            matches.Add(new DetectionMatch
            {
                DataType = $"Exact Data Match:{edm.DataType}",
                Weight = 65,
                Count = 1,
                Sample = "[EXACT_DATA_MATCH]",
                Reason = $"Matched protected enterprise record {edm.Label ?? edm.DataType}."
            });
        }

        var riskScore = Math.Min(100, totalScore);
        var riskLevel = riskScore switch
        {
            >= 85 => "Critical",
            >= 60 => "High",
            >= 30 => "Medium",
            _ => "Low"
        };

        var decision = riskLevel switch
        {
            "Critical" => policy.CriticalAction,
            "High" => policy.HighAction,
            "Medium" => policy.MediumAction,
            _ => policy.LowAction
        };

        var matchedRule = await MatchPolicyRuleAsync(request, matches, now);
        if (matchedRule != null) decision = MoreRestrictive(decision, matchedRule.Action);

        return new DlpScanResponse
        {
            RiskScore = riskScore,
            RiskLevel = riskLevel,
            Decision = decision,
            Matches = matches,
            MaskedContent = maskedContent != request.Content ? maskedContent : null,
            PolicyVersion = matchedRule?.Version ?? policy.Version,
            PolicyReason = matchedRule != null
                ? $"Rule '{matchedRule.Name}' matched. Effective action is {decision}; rules cannot weaken the risk decision."
                : $"Risk level {riskLevel} uses action {decision} from policy {policy.Name}.",
            MatchedRuleId = matchedRule?.Id,
            MatchedRuleName = matchedRule?.Name
        };
    }

    private async Task<List<ExactDataMatchRecord>> FindExactDataMatchesAsync(string content, Guid? departmentId)
    {
        var candidates = Regex.Matches(content, @"[\p{L}\p{N}_\-./@]{4,}")
            .Cast<Match>()
            .Select(m => m.Value.Trim().ToLowerInvariant())
            .Distinct()
            .Take(2000)
            .Select(value => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value))))
            .ToList();
        if (candidates.Count == 0) return [];
        var now = DateTime.UtcNow;
        return await _db.ExactDataMatchRecords.Where(r =>
            r.IsActive && (r.ExpiresAt == null || r.ExpiresAt > now) &&
            (r.DepartmentId == null || r.DepartmentId == departmentId) &&
            candidates.Contains(r.ValueHash)).OrderBy(r => r.Id).Take(20).ToListAsync();
    }

    private async Task<PolicyRule?> MatchPolicyRuleAsync(
        DlpScanRequest request, List<DetectionMatch> matches, DateTime now)
    {
        var rules = await _db.PolicyRules.Include(r => r.Department)
            .Where(r => r.IsEnabled && r.Status == "Published")
            .OrderBy(r => r.Priority).ToListAsync();
        var dataTypes = matches.Select(m => m.DataType).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var time = TimeOnly.FromDateTime(now);
        return rules.FirstOrDefault(rule =>
            (rule.DepartmentId == null || rule.Department != null &&
                (rule.Department.Code == request.DepartmentCode || rule.Department.Name == request.DepartmentCode)) &&
            (string.IsNullOrWhiteSpace(rule.DataType) || dataTypes.Any(d =>
                d.Equals(rule.DataType, StringComparison.OrdinalIgnoreCase) ||
                d.EndsWith($":{rule.DataType}", StringComparison.OrdinalIgnoreCase))) &&
            (string.IsNullOrWhiteSpace(rule.WebsitePattern) || WildcardMatch(request.WebsiteAi, rule.WebsitePattern)) &&
            (string.IsNullOrWhiteSpace(rule.UserEmail) || string.Equals(rule.UserEmail, request.UserEmail, StringComparison.OrdinalIgnoreCase)) &&
            (string.IsNullOrWhiteSpace(rule.Hostname) || WildcardMatch(request.Hostname, rule.Hostname)) &&
            IsWithinWindow(time, rule.ActiveFrom, rule.ActiveTo));
    }

    private static DetectionLocation Locate(string content, Match match)
    {
        var before = content.AsSpan(0, match.Index);
        var line = 1;
        var lastLineStart = 0;
        for (var index = 0; index < before.Length; index++)
        {
            if (before[index] != '\n') continue;
            line++;
            lastLineStart = index + 1;
        }
        return new DetectionLocation
        {
            StartIndex = match.Index,
            EndIndex = match.Index + match.Length,
            Line = line,
            Column = match.Index - lastLineStart + 1
        };
    }

    private static bool WildcardMatch(string? value, string pattern)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var chunks = pattern.Split('*', StringSplitOptions.RemoveEmptyEntries);
        var index = 0;
        foreach (var chunk in chunks)
        {
            index = value.IndexOf(chunk, index, StringComparison.OrdinalIgnoreCase);
            if (index < 0) return false;
            index += chunk.Length;
        }
        return true;
    }

    private static bool IsWithinWindow(TimeOnly time, TimeOnly? from, TimeOnly? to)
    {
        if (!from.HasValue || !to.HasValue) return true;
        return from <= to ? time >= from && time <= to : time >= from || time <= to;
    }

    private static string MoreRestrictive(string current, string requested)
    {
        static int Rank(string action) => action switch
        {
            "Block" => 4,
            "PendingApproval" => 3,
            "Mask" => 2,
            _ => 1
        };
        return Rank(requested) > Rank(current) ? requested : current;
    }

    private async Task<SecurityPolicy> ResolvePolicyAsync(string? departmentCode)
    {
        if (!string.IsNullOrWhiteSpace(departmentCode))
        {
            var departmentPolicy = await _db.SecurityPolicies
                .Include(p => p.Department)
                .FirstOrDefaultAsync(p => p.IsActive && p.Department != null &&
                    (p.Department.Code == departmentCode || p.Department.Name == departmentCode));
            if (departmentPolicy != null) return departmentPolicy;
        }

        return await _db.SecurityPolicies.FirstOrDefaultAsync(p => p.IsActive && p.DepartmentId == null)
            ?? await _db.SecurityPolicies.FirstOrDefaultAsync(p => p.IsActive)
            ?? new SecurityPolicy { Name = "Default Policy" };
    }

    private sealed record DetectorRule(
        string Name,
        string Pattern,
        int Weight,
        int MinimumScore,
        Func<SecurityPolicy, bool> Enabled);
}
