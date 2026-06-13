using System.Globalization;
using System.IO.Compression;
using System.Text;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;
using aiguard_api.Models;

namespace aiguard_api.Services;

public record ReportExport(byte[] Content, string ContentType, string FileName);

public interface IReportExportService
{
    Task<ReportExport> ExportEndpointEventsAsync(
        string format,
        DateTime? from,
        DateTime? to,
        Guid? departmentId,
        string? riskLevel,
        CancellationToken cancellationToken);
}

public class ReportExportService : IReportExportService
{
    private readonly AiguardDbContext _db;

    public ReportExportService(AiguardDbContext db) => _db = db;

    public async Task<ReportExport> ExportEndpointEventsAsync(
        string format,
        DateTime? from,
        DateTime? to,
        Guid? departmentId,
        string? riskLevel,
        CancellationToken cancellationToken)
    {
        var start = from?.ToUniversalTime() ?? DateTime.UtcNow.AddDays(-30);
        var end = to?.ToUniversalTime() ?? DateTime.UtcNow;
        if (end < start || end - start > TimeSpan.FromDays(366))
            throw new ArgumentException("Report range must be between 0 and 366 days.");

        var query = _db.EndpointEvents.AsNoTracking()
            .Where(x => x.CreatedAt >= start && x.CreatedAt <= end);
        if (departmentId.HasValue) query = query.Where(x => x.DepartmentId == departmentId);
        if (!string.IsNullOrWhiteSpace(riskLevel)) query = query.Where(x => x.RiskLevel == riskLevel);
        var events = await query.OrderByDescending(x => x.CreatedAt)
            .Take(50000).ToListAsync(cancellationToken);
        var stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);

        return format.ToLowerInvariant() switch
        {
            "xlsx" or "excel" => new ReportExport(
                CreateExcel(events, start, end),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"aiguard-dlp-report-{stamp}.xlsx"),
            "pdf" => new ReportExport(
                CreatePdf(events, start, end),
                "application/pdf",
                $"aiguard-dlp-report-{stamp}.pdf"),
            _ => throw new ArgumentException("Supported formats are xlsx and pdf.")
        };
    }

    private static byte[] CreateExcel(IReadOnlyList<EndpointEvent> events, DateTime from, DateTime to)
    {
        using var stream = new MemoryStream();
        using (var document = SpreadsheetDocument.Create(stream, SpreadsheetDocumentType.Workbook, true))
        {
            var workbookPart = document.AddWorkbookPart();
            workbookPart.Workbook = new Workbook();
            var worksheetPart = workbookPart.AddNewPart<WorksheetPart>();
            var sheetData = new SheetData();
            worksheetPart.Worksheet = new Worksheet(sheetData);
            var sheets = workbookPart.Workbook.AppendChild(new Sheets());
            sheets.Append(new Sheet
            {
                Id = workbookPart.GetIdOfPart(worksheetPart),
                SheetId = 1,
                Name = "DLP Events"
            });

            sheetData.Append(RowOf(
                "Created UTC", "User", "Hostname", "Browser", "AI Website",
                "Event Type", "Risk Score", "Risk Level", "Decision",
                "Data Types", "Policy Version", "Original SHA-256"));
            foreach (var item in events)
            {
                sheetData.Append(RowOf(
                    item.CreatedAt.ToString("O"),
                    item.UserEmail,
                    item.Hostname,
                    item.Browser,
                    item.WebsiteAi,
                    item.EventType,
                    item.RiskScore.ToString(CultureInfo.InvariantCulture),
                    item.RiskLevel,
                    item.Decision,
                    item.DataTypeMatched,
                    item.PolicyVersion,
                    item.OriginalHash));
            }

            workbookPart.Workbook.Save();
        }
        return stream.ToArray();
    }

    private static Row RowOf(params string[] values)
    {
        var row = new Row();
        foreach (var value in values)
            row.Append(new Cell
            {
                DataType = CellValues.InlineString,
                InlineString = new InlineString(new Text(value ?? string.Empty))
            });
        return row;
    }

    private static byte[] CreatePdf(IReadOnlyList<EndpointEvent> events, DateTime from, DateTime to)
    {
        var lines = new List<string>
        {
            "AIGuard Control Tower - DLP Event Report",
            $"Range UTC: {from:yyyy-MM-dd HH:mm} to {to:yyyy-MM-dd HH:mm}",
            $"Total events: {events.Count}",
            $"Blocked: {events.Count(x => x.Decision == "Block")}  Masked: {events.Count(x => x.Decision == "Mask")}  Pending: {events.Count(x => x.Decision == "PendingApproval")}",
            ""
        };
        lines.AddRange(events.Select(x =>
            $"{x.CreatedAt:yyyy-MM-dd HH:mm} | {x.RiskLevel,-8} | {x.Decision,-15} | {x.UserEmail} | {x.WebsiteAi} | {x.DataTypeMatched}"));

        const int linesPerPage = 50;
        var pages = lines.Chunk(linesPerPage).ToList();
        var objects = new List<string>
        {
            "<< /Type /Catalog /Pages 2 0 R >>",
            $"<< /Type /Pages /Kids [{string.Join(" ", Enumerable.Range(0, pages.Count).Select(i => $"{4 + i * 2} 0 R"))}] /Count {pages.Count} >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        };

        for (var index = 0; index < pages.Count; index++)
        {
            var pageObject = 4 + index * 2;
            var contentObject = pageObject + 1;
            objects.Add($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents {contentObject} 0 R >>");
            var content = new StringBuilder("BT\n/F1 8 Tf\n35 805 Td\n");
            foreach (var line in pages[index])
                content.Append('(').Append(EscapePdf(ToPdfAscii(line))).Append(") Tj\n0 -15 Td\n");
            content.Append($"(Page {index + 1} of {pages.Count}) Tj\nET");
            var bytes = Encoding.ASCII.GetByteCount(content.ToString());
            objects.Add($"<< /Length {bytes} >>\nstream\n{content}\nendstream");
        }

        using var stream = new MemoryStream();
        using var writer = new StreamWriter(stream, Encoding.ASCII, 1024, true) { NewLine = "\n" };
        writer.Write("%PDF-1.4\n");
        writer.Flush();
        var offsets = new List<long> { 0 };
        for (var index = 0; index < objects.Count; index++)
        {
            offsets.Add(stream.Position);
            writer.Write($"{index + 1} 0 obj\n{objects[index]}\nendobj\n");
            writer.Flush();
        }
        var xref = stream.Position;
        writer.Write($"xref\n0 {objects.Count + 1}\n0000000000 65535 f \n");
        foreach (var offset in offsets.Skip(1))
            writer.Write($"{offset:0000000000} 00000 n \n");
        writer.Write($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF");
        writer.Flush();
        return stream.ToArray();
    }

    private static string EscapePdf(string value) =>
        value.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");

    private static string ToPdfAscii(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        return new string(normalized.Where(ch =>
            CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark &&
            ch is >= ' ' and <= '~').ToArray());
    }
}
