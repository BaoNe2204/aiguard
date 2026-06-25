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
    private readonly IAiSecurityEngineClient _aiSecurityEngine;

    private static readonly IReadOnlyList<DetectorRule> Detectors =
    [
        new("Private Key", @"-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----", 90, 90, _ => true),
        new("Database URL", @"(?i)((Server|Data Source|Host)\s*=\s*[^;]+;.*?(Password|Pwd)\s*=|(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s]+)", 75, 85, _ => true),
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
        )", 70, 85, _ => true),
        new("AWS Secret Key", @"(?i)(aws_secret_access_key|aws.?secret)\s*[=:]\s*[""']?[A-Za-z0-9/+=]{32,}", 80, 90, _ => true),
        new("Azure Storage Key", @"(?i)(AccountKey|SharedAccessSignature)\s*=\s*[^;\s]{20,}", 80, 90, _ => true),
        new("Password", @"(?i)(password|passwd|pwd|db_password|secret)\s*[=:]\s*[""']?[^\s;""']+", 70, 85, _ => true),
        new("JWT Token", @"eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}", 70, 85, _ => true),
        new("CCCD", @"(?<!\d)\d{12}(?!\d)", 80, 85, _ => true),
        new("Credit Card", @"\b(?:\d{4}[ -]?){3}\d{4}\b", 80, 85, _ => true),
        new("Source Code", @"(?im)(class\s+\w+|function\s+\w+|def\s+\w+|public\s+(static\s+)?(?:void|class)|import\s+\w+|using\s+[\w.]+;|SELECT\s+.+\s+FROM|CREATE\s+TABLE)", 65, 85, _ => true),
        new("Customer Data", @"(?i)(khách hàng|customer|client|danh sách khách hàng|customer list)", 65, 85, _ => true),
        new("HR Data", @"(?i)(lương|salary|cv ứng viên|hợp đồng lao động|employment contract|đánh giá nhân viên|danh sách nhân sự)", 65, 85, _ => true),
        new("Financial Data", @"(?i)(doanh thu|revenue|lợi nhuận|profit|công nợ|receivable|báo cáo tài chính)", 65, 85, _ => true),
        new("Legal Contract", @"(?i)(NDA|non.?disclosure|bảo mật thông tin|điều khoản hợp đồng|confidential agreement)", 65, 85, _ => true),
        new("Email", @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", 65, 85, _ => true),
        new("Phone", @"(?<!\d)(0\d{9,10}|\+84\d{9,10})(?!\d)", 65, 85, _ => true)
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
        ["Phone"] = "[PHONE]",
        ["Credit Card"] = "[CREDIT_CARD]",
        ["AWS Secret Key"] = "[AWS_SECRET_KEY]",
        ["Azure Storage Key"] = "[AZURE_STORAGE_KEY]"
    };

    public DlpScannerService(AiguardDbContext db, IAiSecurityEngineClient aiSecurityEngine)
    {
        _db = db;
        _aiSecurityEngine = aiSecurityEngine;
    }

    public async Task<DlpScanResponse> ScanContentAsync(DlpScanRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            return new DlpScanResponse { RiskScore = 0, RiskLevel = "Low", Decision = "Allow" };

        var policy = await ResolvePolicyAsync(request.DepartmentCode);
        var now = DateTime.UtcNow;
        var contentHash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(request.Content)));
        var listEntries = await _db.PolicyListEntries
            .Include(e => e.Department)
            .Where(e => e.IsActive && (e.ExpiresAt == null || e.ExpiresAt > now) &&
                (e.DepartmentId == null || (e.Department != null && (e.Department.Code == request.DepartmentCode || e.Department.Name == request.DepartmentCode))))
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

        var aiResult = await _aiSecurityEngine.ScanAsync(request.Content);
        var aiEngineUsed = aiResult.Available;
        if (aiResult.Available)
        {
            totalScore = Math.Max(totalScore, aiResult.RiskScore);

            foreach (var group in aiResult.Findings
                .Where(f => !string.IsNullOrWhiteSpace(f.DataType))
                .GroupBy(f => NormalizeAiDataType(f.DataType), StringComparer.OrdinalIgnoreCase))
            {
                var locations = group
                    .Where(f => f.StartIndex >= 0 && f.EndIndex > f.StartIndex && f.EndIndex <= request.Content.Length)
                    .Take(20)
                    .Select(f => Locate(request.Content, f.StartIndex, f.EndIndex))
                    .ToList();

                var weight = group.Max(f => Math.Clamp(f.RiskWeight, 0, 100));
                var dataType = group.Key;
                matches.Add(new DetectionMatch
                {
                    DataType = dataType,
                    Weight = weight,
                    Count = group.Count(),
                    Sample = MaskLabels.TryGetValue(dataType, out var label) ? label : "[AI_DETECTED]",
                    Reason = $"AI security engine detected {group.Count()} match(es) for {dataType}.",
                    Locations = locations
                });
            }

            foreach (var category in aiResult.TriggeredCategories)
            {
                totalScore = Math.Max(totalScore, Math.Max(aiResult.RiskScore, 60));
                matches.Add(new DetectionMatch
                {
                    DataType = "Prompt Injection",
                    Weight = Math.Max(aiResult.RiskScore, 60),
                    Count = 1,
                    Sample = "[PROMPT_INJECTION]",
                    Reason = $"AI security engine triggered category: {category}."
                });
            }

            var aiMasked = await _aiSecurityEngine.MaskAsync(request.Content, aiResult.Findings.ToList());
            if (!string.IsNullOrWhiteSpace(aiMasked) && aiMasked != request.Content)
                maskedContent = maskedContent == request.Content ? aiMasked : MergeMaskedContent(maskedContent, aiMasked);
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
                : $"Risk level {riskLevel} uses action {decision} from policy {policy.Name}." +
                  (aiEngineUsed ? " AI security engine was included in scoring." : " Local scanner fallback was used."),
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
        return Locate(content, match.Index, match.Index + match.Length);
    }

    private static DetectionLocation Locate(string content, int startIndex, int endIndex)
    {
        var before = content.AsSpan(0, startIndex);
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
            StartIndex = startIndex,
            EndIndex = endIndex,
            Line = line,
            Column = startIndex - lastLineStart + 1
        };
    }

    private static string NormalizeAiDataType(string dataType) => dataType.Trim() switch
    {
        "APIKey" => "API Key",
        "DBUrl" => "Database URL",
        "JWTToken" => "JWT Token",
        "Phone" => "Phone",
        "Email" => "Email",
        "CCCD" => "CCCD",
        _ => dataType.Trim()
    };

    private static string MergeMaskedContent(string localMasked, string aiMasked)
    {
        // Prefer the output that hides more content without keeping raw sensitive matches.
        return aiMasked.Length <= localMasked.Length ? aiMasked : localMasked;
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
