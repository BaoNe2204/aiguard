using System.Security.Claims;

namespace aiguard_api.Services;

public interface IDataScopeContext
{
    string TenantCode { get; }
    Guid? DepartmentId { get; }
    bool RestrictToDepartment { get; }
    bool IsPlatformAdmin { get; }
    void SetEndpointScope(string tenantCode, Guid? departmentId);
}

public class DataScopeContext : IDataScopeContext
{
    private readonly IHttpContextAccessor _http;
    private string? _endpointTenant;
    private Guid? _endpointDepartment;
    public DataScopeContext(IHttpContextAccessor http) => _http = http;
    public string TenantCode => _endpointTenant ?? _http.HttpContext?.User.FindFirstValue("tenantCode") ?? "DEFAULT";
    public Guid? DepartmentId => _endpointDepartment ?? ParseGuid(_http.HttpContext?.User.FindFirstValue("departmentId"));
    public bool RestrictToDepartment => _endpointDepartment.HasValue || _http.HttpContext?.User.IsInRole("DepartmentManager") == true;
    public bool IsPlatformAdmin => _http.HttpContext?.User.IsInRole("PlatformAdmin") == true;
    public void SetEndpointScope(string tenantCode, Guid? departmentId)
    {
        _endpointTenant = tenantCode;
        _endpointDepartment = departmentId;
    }
    private static Guid? ParseGuid(string? value) => Guid.TryParse(value, out var id) ? id : null;
}
