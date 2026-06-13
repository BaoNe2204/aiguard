namespace aiguard_api.DTOs.Dashboard;

public class DashboardStatsResponse
{
    public int TotalPromptsChecked { get; set; }
    public int BlockedIncidents { get; set; }
    public int MaskedDetections { get; set; }
    public int PendingApprovals { get; set; }
    public int ActiveProtectedDevices { get; set; }
    public int FailedBlockchainBatches { get; set; }
    public int ExtensionActiveCount { get; set; }
    public int PolicySyncedCount { get; set; }
    public int CriticalLeaksPrevented { get; set; }
    public int SensitivePasteDetected { get; set; }
}

public class DepartmentRiskResponse
{
    public string DepartmentName { get; set; } = string.Empty;
    public int UserCount { get; set; }
    public int TotalPrompts { get; set; }
    public int MaskedCount { get; set; }
    public int BlockedCount { get; set; }
    public double AvgRiskScore { get; set; }
    public string TopDataType { get; set; } = string.Empty;
}

public class TrendDataPoint
{
    public string Date { get; set; } = string.Empty;
    public int AllowCount { get; set; }
    public int MaskCount { get; set; }
    public int BlockCount { get; set; }
    public int PendingCount { get; set; }
}

public class AgentRiskResponse
{
    public int TotalAgents { get; set; }
    public int TotalToolCalls { get; set; }
    public int BlockedToolCalls { get; set; }
    public int PendingToolCalls { get; set; }
    public List<AgentRiskItem> TopRiskyAgents { get; set; } = new();
}

public class AgentRiskItem
{
    public string AgentName { get; set; } = string.Empty;
    public int ToolCallCount { get; set; }
    public int BlockedCount { get; set; }
    public double AvgRiskScore { get; set; }
}

public class DlpScanRequest
{
    public string Content { get; set; } = string.Empty;
    public string? Hostname { get; set; }
    public string? UserEmail { get; set; }
    public string? WebsiteAi { get; set; }
    public string? DepartmentCode { get; set; }
}

public class DlpScanResponse
{
    public Guid ScanId { get; set; }
    public string Receipt { get; set; } = string.Empty;
    public string ContentHash { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public string Decision { get; set; } = string.Empty;
    public List<DetectionMatch> Matches { get; set; } = new();
    public string? MaskedContent { get; set; }
    public string? PolicyVersion { get; set; }
    public string? PolicyReason { get; set; }
    public Guid? MatchedRuleId { get; set; }
    public string? MatchedRuleName { get; set; }
}

public class DetectionMatch
{
    public string DataType { get; set; } = string.Empty;
    public int Weight { get; set; }
    public int Count { get; set; }
    public string Sample { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public List<DetectionLocation> Locations { get; set; } = new();
}

public class DetectionLocation
{
    public int StartIndex { get; set; }
    public int EndIndex { get; set; }
    public int Line { get; set; }
    public int Column { get; set; }
}
