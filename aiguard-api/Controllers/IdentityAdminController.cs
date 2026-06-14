using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using aiguard_api.DTOs.Common;
using aiguard_api.DTOs.Governance;
using aiguard_api.Services;

namespace aiguard_api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "TenantOwner")]
public class IdentityAdminController : ControllerBase
{
    private readonly IGovernanceService _governance;
    public IdentityAdminController(IGovernanceService governance) => _governance = governance;

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] PagedQuery query) =>
        Ok(ApiResponse<PagedResult<UserAdminResponse>>.Ok(await _governance.GetUsersAsync(query)));

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] UpsertUserRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<UserAdminResponse>.Ok(await _governance.CreateUserAsync(request), "User created"));

    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpsertUserRequest request)
    {
        var result = await _governance.UpdateUserAsync(id, request);
        return result == null ? NotFound(ApiResponse<object>.Fail("User not found")) :
            Ok(ApiResponse<UserAdminResponse>.Ok(result));
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DisableUser(Guid id) =>
        await _governance.DeleteUserAsync(id)
            ? Ok(ApiResponse<object>.Ok(new { }, "User disabled"))
            : NotFound(ApiResponse<object>.Fail("User not found"));

    [HttpPost("users/import")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ImportUsers(IFormFile file)
    {
        if (file.Length <= 0) return BadRequest(ApiResponse<object>.Fail("Import file is empty."));
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var rows = extension switch
        {
            ".csv" => await ReadCsvAsync(file),
            ".xlsx" => ReadXlsx(file),
            _ => throw new ArgumentException("Only CSV and XLSX files are supported.")
        };

        var created = 0;
        var errors = new List<object>();
        foreach (var row in rows)
        {
            try
            {
                await _governance.CreateUserAsync(row);
                created++;
            }
            catch (Exception ex)
            {
                errors.Add(new { row.Email, error = ex.Message });
            }
        }
        return Ok(ApiResponse<object>.Ok(new { created, failed = errors.Count, errors }));
    }

    [HttpGet("departments")]
    public async Task<IActionResult> GetDepartments() =>
        Ok(ApiResponse<List<DepartmentAdminResponse>>.Ok(await _governance.GetDepartmentsAsync()));

    [HttpPost("departments")]
    public async Task<IActionResult> CreateDepartment([FromBody] UpsertDepartmentRequest request) =>
        StatusCode(StatusCodes.Status201Created,
            ApiResponse<DepartmentAdminResponse>.Ok(await _governance.CreateDepartmentAsync(request), "Department created"));

    [HttpPut("departments/{id:guid}")]
    public async Task<IActionResult> UpdateDepartment(Guid id, [FromBody] UpsertDepartmentRequest request)
    {
        var result = await _governance.UpdateDepartmentAsync(id, request);
        return result == null ? NotFound(ApiResponse<object>.Fail("Department not found")) :
            Ok(ApiResponse<DepartmentAdminResponse>.Ok(result));
    }

    [HttpDelete("departments/{id:guid}")]
    public async Task<IActionResult> DeleteDepartment(Guid id) =>
        await _governance.DeleteDepartmentAsync(id)
            ? Ok(ApiResponse<object>.Ok(new { }, "Department deleted"))
            : NotFound(ApiResponse<object>.Fail("Department not found"));

    private static async Task<List<UpsertUserRequest>> ReadCsvAsync(IFormFile file)
    {
        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8, true);
        var rows = new List<UpsertUserRequest>();
        var header = (await reader.ReadLineAsync())?.Split(',').Select(x => x.Trim().ToLowerInvariant()).ToArray()
            ?? throw new ArgumentException("CSV header is missing.");
        while (await reader.ReadLineAsync() is { } line)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var values = line.Split(',').Select(x => x.Trim().Trim('"')).ToArray();
            string Value(string name) =>
                Array.IndexOf(header, name) is var index && index >= 0 && index < values.Length ? values[index] : string.Empty;
            rows.Add(new UpsertUserRequest
            {
                FullName = Value("fullname"),
                Email = Value("email"),
                Role = string.IsNullOrWhiteSpace(Value("role")) ? "Employee" : Value("role"),
                Password = string.IsNullOrWhiteSpace(Value("password")) ? "ChangeMe@123" : Value("password"),
                AuthProvider = string.IsNullOrWhiteSpace(Value("authprovider")) ? "Local" : Value("authprovider"),
                IsActive = !bool.TryParse(Value("isactive"), out var active) || active,
                MfaRequired = bool.TryParse(Value("mfarequired"), out var mfa) && mfa
            });
        }
        return rows;
    }

    private static List<UpsertUserRequest> ReadXlsx(IFormFile file)
    {
        using var document = SpreadsheetDocument.Open(file.OpenReadStream(), false);
        var workbookPart = document.WorkbookPart ?? throw new ArgumentException("Workbook is invalid.");
        var workbook = workbookPart.Workbook ?? throw new ArgumentException("Workbook metadata is missing.");
        var sheet = workbook.Sheets?.Elements<Sheet>().FirstOrDefault()
            ?? throw new ArgumentException("Workbook has no worksheet.");
        var worksheetPart = (WorksheetPart)workbookPart.GetPartById(sheet.Id!);
        var shared = workbookPart.SharedStringTablePart?.SharedStringTable;
        var worksheet = worksheetPart.Worksheet ?? throw new ArgumentException("Worksheet is invalid.");
        var rows = worksheet.Descendants<Row>().ToList();
        if (rows.Count == 0) throw new ArgumentException("Worksheet is empty.");
        var table = rows.Select(row => row.Elements<Cell>().Select(cell => CellText(cell, shared)).ToList()).ToList();
        var header = table[0].Select(x => x.Trim().ToLowerInvariant()).ToList();
        var result = new List<UpsertUserRequest>();
        foreach (var values in table.Skip(1))
        {
            string Value(string name)
            {
                var index = header.IndexOf(name);
                return index >= 0 && index < values.Count ? values[index].Trim() : string.Empty;
            }
            if (string.IsNullOrWhiteSpace(Value("email"))) continue;
            result.Add(new UpsertUserRequest
            {
                FullName = Value("fullname"),
                Email = Value("email"),
                Role = string.IsNullOrWhiteSpace(Value("role")) ? "Employee" : Value("role"),
                Password = string.IsNullOrWhiteSpace(Value("password")) ? "ChangeMe@123" : Value("password"),
                AuthProvider = string.IsNullOrWhiteSpace(Value("authprovider")) ? "Local" : Value("authprovider"),
                IsActive = !bool.TryParse(Value("isactive"), out var active) || active,
                MfaRequired = bool.TryParse(Value("mfarequired"), out var mfa) && mfa
            });
        }
        return result;
    }

    private static string CellText(Cell cell, SharedStringTable? shared)
    {
        var value = cell.CellValue?.InnerText ?? cell.InnerText;
        if (cell.DataType?.Value == CellValues.SharedString && int.TryParse(value, out var index))
            return shared?.ElementAtOrDefault(index)?.InnerText ?? string.Empty;
        return value;
    }
}
