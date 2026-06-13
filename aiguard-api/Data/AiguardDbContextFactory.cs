using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using aiguard_api.Services;

namespace aiguard_api.Data;

public class AiguardDbContextFactory : IDesignTimeDbContextFactory<AiguardDbContext>
{
    public AiguardDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AiguardDbContext>()
            .UseSqlServer("Server=localhost;Database=AIGuardDb;Trusted_Connection=true;TrustServerCertificate=true;")
            .Options;
        return new AiguardDbContext(options, new DesignTimeScope());
    }

    private sealed class DesignTimeScope : IDataScopeContext
    {
        public string TenantCode => "DEFAULT";
        public Guid? DepartmentId => null;
        public bool RestrictToDepartment => false;
        public void SetEndpointScope(string tenantCode, Guid? departmentId) { }
    }
}
