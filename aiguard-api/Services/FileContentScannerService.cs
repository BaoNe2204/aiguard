using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml;
using SharpCompress.Archives;
using UglyToad.PdfPig;
using aiguard_api.DTOs.Dashboard;
using aiguard_api.Models;

namespace aiguard_api.Services;

public interface IFileContentScannerService
{
    Task<DlpScanResponse> ScanAsync(IFormFile file, Device device);
}

public class FileContentScannerService : IFileContentScannerService
{
    private const long MaxUploadBytes = 25 * 1024 * 1024;
    private const long MaxExtractedBytes = 10 * 1024 * 1024;
    private readonly IDlpScannerService _scanner;
    private readonly IScanReceiptService _receipts;
    private readonly IOcrService _ocr;

    public FileContentScannerService(IDlpScannerService scanner, IScanReceiptService receipts, IOcrService ocr)
    {
        _scanner = scanner;
        _receipts = receipts;
        _ocr = ocr;
    }

    public async Task<DlpScanResponse> ScanAsync(IFormFile file, Device device)
    {
        if (file.Length <= 0 || file.Length > MaxUploadBytes)
            throw new ArgumentException("File must be between 1 byte and 25 MB.");

        await using var source = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await source.CopyToAsync(buffer);
        var bytes = buffer.ToArray();
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var text = extension switch
        {
            ".pdf" => await ExtractPdfWithOcrAsync(bytes, file.FileName, file.ContentType),
            ".docx" => ExtractWord(new MemoryStream(bytes)),
            ".xlsx" => ExtractSpreadsheet(new MemoryStream(bytes)),
            ".zip" or ".rar" or ".7z" or ".tar" or ".gz" => ExtractArchive(bytes),
            ".png" or ".jpg" or ".jpeg" or ".webp" or ".bmp" or ".tif" or ".tiff"
                => await _ocr.ExtractTextAsync(bytes, file.FileName, file.ContentType),
            ".txt" or ".csv" or ".json" or ".xml" or ".md" or ".cs" or ".java" or ".js" or ".ts"
                or ".py" or ".sql" or ".env" or ".yml" or ".yaml" or ".properties"
                => await ReadTextAsync(new MemoryStream(bytes)),
            _ => throw new NotSupportedException($"Unsupported file type: {extension}")
        };

        if (Encoding.UTF8.GetByteCount(text) > MaxExtractedBytes)
            throw new ArgumentException("Extracted text exceeds the 10 MB safety limit.");

        var result = await _scanner.ScanContentAsync(new DlpScanRequest
        {
            Content = text,
            Hostname = device.Hostname,
            UserEmail = device.UserEmail,
            WebsiteAi = "FileUpload",
            DepartmentCode = device.DepartmentName
        });
        await _receipts.AttachReceiptAsync(result, device, text);
        return result;
    }

    private async Task<string> ExtractPdfWithOcrAsync(byte[] bytes, string fileName, string? contentType)
    {
        var text = ExtractPdf(new MemoryStream(bytes));
        return text.Trim().Length >= 20
            ? text
            : await _ocr.ExtractTextAsync(bytes, fileName, contentType ?? "application/pdf");
    }

    private static string ExtractPdf(Stream stream)
    {
        using var document = PdfDocument.Open(stream);
        var builder = new StringBuilder();
        foreach (var page in document.GetPages()) builder.AppendLine(page.Text);
        return builder.ToString();
    }
    private static string ExtractWord(Stream stream)
    {
        using var document = WordprocessingDocument.Open(stream, false);
        return document.MainDocumentPart?.Document?.Body?.InnerText ?? string.Empty;
    }

    private static string ExtractSpreadsheet(Stream stream)
    {
        using var document = SpreadsheetDocument.Open(stream, false);
        return string.Join(" ", document.WorkbookPart?.WorksheetParts
            .SelectMany(p => p.Worksheet?.Descendants<DocumentFormat.OpenXml.Spreadsheet.Text>() ?? [])
            .Select(t => t.Text) ?? []);
    }

    private static string ExtractArchive(byte[] bytes)
    {
        var builder = new StringBuilder();
        var state = new ArchiveScanState();
        ExtractArchiveRecursive(bytes, builder, state, 0, "root");
        return builder.ToString();
    }

    private static void ExtractArchiveRecursive(
        byte[] bytes, StringBuilder builder, ArchiveScanState state, int depth, string parent)
    {
        if (depth > 3) throw new ArgumentException("Nested archive depth exceeds 3.");
        using var archive = ArchiveFactory.OpenArchive(new MemoryStream(bytes));
        foreach (var entry in archive.Entries)
        {
            if (entry.IsDirectory) continue;
            if (++state.EntryCount > 500) throw new ArgumentException("Archive contains more than 500 files.");
            if (entry.Size > 5 * 1024 * 1024) continue;
            state.ExtractedBytes += entry.Size;
            if (state.ExtractedBytes > MaxExtractedBytes) throw new ArgumentException("Archive exceeds extraction limit.");
            using var entryStream = entry.OpenEntryStream();
            using var entryBuffer = new MemoryStream();
            entryStream.CopyTo(entryBuffer);
            var entryBytes = entryBuffer.ToArray();
            var key = entry.Key ?? "unknown";
            if (IsArchiveFile(key))
            {
                ExtractArchiveRecursive(entryBytes, builder, state, depth + 1, $"{parent}/{key}");
                continue;
            }
            if (!IsTextFile(key)) continue;
            builder.AppendLine($"FILE: {parent}/{key}");
            builder.AppendLine(Encoding.UTF8.GetString(entryBytes));
        }
    }

    private static bool IsTextFile(string key)
    {
        var ext = Path.GetExtension(key).ToLowerInvariant();
        return new[] { ".txt", ".csv", ".json", ".xml", ".md", ".cs", ".java", ".js", ".ts",
            ".py", ".sql", ".env", ".yml", ".yaml", ".properties", ".config", ".go", ".php" }.Contains(ext);
    }

    private static bool IsArchiveFile(string key)
    {
        var ext = Path.GetExtension(key).ToLowerInvariant();
        return new[] { ".zip", ".rar", ".7z", ".tar", ".gz" }.Contains(ext);
    }

    private static async Task<string> ReadTextAsync(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, true, leaveOpen: false);
        return await reader.ReadToEndAsync();
    }

    private sealed class ArchiveScanState
    {
        public long ExtractedBytes { get; set; }
        public int EntryCount { get; set; }
    }
}
