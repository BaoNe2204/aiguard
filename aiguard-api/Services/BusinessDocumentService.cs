using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using aiguard_api.Data;

namespace aiguard_api.Services;

public interface IBusinessDocumentService
{
    Task<ReportExport?> ExportInvoiceAsync(Guid id);
    Task<ReportExport?> ExportQuotationAsync(Guid id);
    Task<ReportExport?> ExportContractAsync(Guid id);
}

public class BusinessDocumentService : IBusinessDocumentService
{
    private readonly AiguardDbContext _db;
    public BusinessDocumentService(AiguardDbContext db) => _db = db;

    public async Task<ReportExport?> ExportInvoiceAsync(Guid id)
    {
        var item = await _db.Invoices.Include(x => x.Tenant).Include(x => x.Order)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return null;
        return Pdf($"invoice-{item.InvoiceNumber}.pdf",
            "AIGuard Control Tower - INVOICE",
            $"Invoice number: {item.InvoiceNumber}",
            $"Customer: {item.Tenant.CompanyName}",
            $"Status: {item.Status}",
            $"Issued: {item.IssuedAt:yyyy-MM-dd}",
            $"Due: {item.DueAt:yyyy-MM-dd}",
            $"Subtotal: {Money(item.Subtotal, item.Currency)}",
            $"Discount: {Money(item.DiscountAmount, item.Currency)}",
            $"Tax: {Money(item.TaxAmount, item.Currency)}",
            $"TOTAL: {Money(item.TotalAmount, item.Currency)}",
            $"VAT number: {item.VatNumber ?? "N/A"}",
            $"Billing address: {item.BillingAddress ?? "N/A"}");
    }

    public async Task<ReportExport?> ExportQuotationAsync(Guid id)
    {
        var item = await _db.Quotations.Include(x => x.Tenant).Include(x => x.ProductPlan)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return null;
        return Pdf($"quotation-{item.QuotationNumber}.pdf",
            "AIGuard Control Tower - QUOTATION",
            $"Quotation number: {item.QuotationNumber}",
            $"Customer: {item.Tenant.CompanyName}",
            $"Plan: {item.ProductPlan.Name} / {item.BillingCycle}",
            $"Users: {item.UserQuantity}",
            $"Devices: {item.DeviceQuantity}",
            $"Valid until: {item.ValidUntil:yyyy-MM-dd}",
            $"Subtotal: {Money(item.Subtotal, item.Currency)}",
            $"Discount: {Money(item.DiscountAmount, item.Currency)}",
            $"Tax: {Money(item.TaxAmount, item.Currency)}",
            $"TOTAL: {Money(item.TotalAmount, item.Currency)}",
            $"Terms: {item.Terms ?? "Standard AIGuard commercial terms"}");
    }

    public async Task<ReportExport?> ExportContractAsync(Guid id)
    {
        var item = await _db.CommercialContracts.Include(x => x.Tenant)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return null;
        return Pdf($"contract-{item.ContractNumber}.pdf",
            "AIGuard Control Tower - SERVICE CONTRACT",
            $"Contract number: {item.ContractNumber}",
            $"Title: {item.Title}",
            $"Customer: {item.Tenant.CompanyName}",
            $"Status: {item.Status}",
            $"Effective date: {item.EffectiveAt:yyyy-MM-dd}",
            $"Expiry date: {item.ExpiresAt:yyyy-MM-dd}",
            $"Signed by customer: {item.SignedByCustomer ?? "Pending"}",
            $"Signed by AIGuard: {item.SignedByAiguard ?? "Pending"}",
            "",
            item.Terms ?? "Standard AIGuard service terms apply.");
    }

    private static string Money(decimal amount, string currency) =>
        $"{amount.ToString("N0", CultureInfo.InvariantCulture)} {currency}";

    private static ReportExport Pdf(string fileName, params string[] lines)
    {
        var pages = lines.SelectMany(Wrap).Chunk(45).ToList();
        if (pages.Count == 0) pages.Add(["AIGuard"]);
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
            var content = new StringBuilder("BT\n/F1 10 Tf\n45 790 Td\n");
            foreach (var line in pages[index])
                content.Append('(').Append(Escape(ToAscii(line))).Append(") Tj\n0 -19 Td\n");
            content.Append($"0 -10 Td\n(Page {index + 1} of {pages.Count}) Tj\nET");
            objects.Add($"<< /Length {Encoding.ASCII.GetByteCount(content.ToString())} >>\nstream\n{content}\nendstream");
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
        foreach (var offset in offsets.Skip(1)) writer.Write($"{offset:0000000000} 00000 n \n");
        writer.Write($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF");
        writer.Flush();
        return new ReportExport(stream.ToArray(), "application/pdf", fileName);
    }

    private static IEnumerable<string> Wrap(string value)
    {
        const int width = 85;
        var text = value ?? string.Empty;
        while (text.Length > width)
        {
            var split = text.LastIndexOf(' ', width);
            if (split <= 0) split = width;
            yield return text[..split];
            text = text[split..].TrimStart();
        }
        yield return text;
    }

    private static string Escape(string value) =>
        value.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");

    private static string ToAscii(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        return new string(normalized.Where(ch =>
            CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark &&
            ch is >= ' ' and <= '~').ToArray());
    }
}
