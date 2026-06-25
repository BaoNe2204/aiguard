using System;
using System.IO;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;

namespace DocGenerator
{
    class Program
    {
        static void Main(string[] args)
        {
            string outDir = @"G:\Dự Án\DuAn2026\TestData\";
            string docPath = Path.Combine(outDir, "6_HR_Contract.docx");
            string excelPath = Path.Combine(outDir, "7_Financial_Report.xlsx");

            CreateWordDoc(docPath);
            CreateExcelDoc(excelPath);

            Console.WriteLine("Successfully generated test .docx and .xlsx files!");
        }

        static void CreateWordDoc(string path)
        {
            using (WordprocessingDocument wordDocument = WordprocessingDocument.Create(path, WordprocessingDocumentType.Document))
            {
                MainDocumentPart mainPart = wordDocument.AddMainDocumentPart();
                mainPart.Document = new Document();
                Body body = mainPart.Document.AppendChild(new Body());

                body.AppendChild(new Paragraph(new DocumentFormat.OpenXml.Wordprocessing.Run(new DocumentFormat.OpenXml.Wordprocessing.Text("=== HỢP ĐỒNG LAO ĐỘNG (BẢO MẬT) ==="))));
                body.AppendChild(new Paragraph(new DocumentFormat.OpenXml.Wordprocessing.Run(new DocumentFormat.OpenXml.Wordprocessing.Text("Tên nhân viên: Trương Thị B"))));
                body.AppendChild(new Paragraph(new DocumentFormat.OpenXml.Wordprocessing.Run(new DocumentFormat.OpenXml.Wordprocessing.Text("CCCD: 079201001234"))));
                body.AppendChild(new Paragraph(new DocumentFormat.OpenXml.Wordprocessing.Run(new DocumentFormat.OpenXml.Wordprocessing.Text("SĐT: 0901234567"))));
                body.AppendChild(new Paragraph(new DocumentFormat.OpenXml.Wordprocessing.Run(new DocumentFormat.OpenXml.Wordprocessing.Text("Mức lương: $3500/tháng (Tuyệt đối giữ bí mật thông tin lương)"))));
                body.AppendChild(new Paragraph(new DocumentFormat.OpenXml.Wordprocessing.Run(new DocumentFormat.OpenXml.Wordprocessing.Text("API Key truy cập Server: sk_live_T5xyz1234567890abcdef1234567890abcdef"))));
            }
        }

        static void CreateExcelDoc(string path)
        {
            using (SpreadsheetDocument spreadsheetDocument = SpreadsheetDocument.Create(path, SpreadsheetDocumentType.Workbook))
            {
                WorkbookPart workbookpart = spreadsheetDocument.AddWorkbookPart();
                workbookpart.Workbook = new Workbook();

                WorksheetPart worksheetPart = workbookpart.AddNewPart<WorksheetPart>();
                worksheetPart.Worksheet = new Worksheet(new SheetData());

                Sheets sheets = spreadsheetDocument.WorkbookPart.Workbook.AppendChild<Sheets>(new Sheets());
                Sheet sheet = new Sheet()
                {
                    Id = spreadsheetDocument.WorkbookPart.GetIdOfPart(worksheetPart),
                    SheetId = 1,
                    Name = "Finance Data"
                };
                sheets.Append(sheet);

                SheetData sheetData = worksheetPart.Worksheet.GetFirstChild<SheetData>();

                // Row 1
                Row row1 = new Row();
                row1.Append(CreateCell("Tên Khách Hàng"));
                row1.Append(CreateCell("Doanh Thu"));
                row1.Append(CreateCell("Thẻ Tín Dụng"));
                sheetData.Append(row1);

                // Row 2
                Row row2 = new Row();
                row2.Append(CreateCell("Công ty ABC"));
                row2.Append(CreateCell("1,500,000 USD"));
                row2.Append(CreateCell("4111-2222-3333-4444"));
                sheetData.Append(row2);

                // Row 3
                Row row3 = new Row();
                row3.Append(CreateCell("Trương Thị B"));
                row3.Append(CreateCell("50,000 USD"));
                row3.Append(CreateCell("5555-6666-7777-8888"));
                sheetData.Append(row3);

                workbookpart.Workbook.Save();
            }
        }

        static Cell CreateCell(string text)
        {
            return new Cell()
            {
                CellValue = new CellValue(text),
                DataType = new EnumValue<CellValues>(CellValues.String)
            };
        }
    }
}
