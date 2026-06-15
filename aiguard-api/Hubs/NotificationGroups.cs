namespace aiguard_api.Hubs;

public static class NotificationGroups
{
    public static string Tenant(string tenantCode) => $"tenant:{Normalize(tenantCode)}";
    public static string Role(string tenantCode, string role) => $"{Tenant(tenantCode)}:role:{Normalize(role)}";
    public static string User(string tenantCode, string email) => $"{Tenant(tenantCode)}:user:{Normalize(email)}";
    public static string Department(string tenantCode, Guid departmentId) => $"{Tenant(tenantCode)}:department:{departmentId:N}";
    public static string Device(string tenantCode, Guid deviceId) => $"{Tenant(tenantCode)}:device:{deviceId:N}";

    private static string Normalize(string value) => value.Trim().ToLowerInvariant();
}
