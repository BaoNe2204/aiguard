# 📖 HƯỚNG DẪN CHẠY BÁO CÁO & DEMO HỆ THỐNG AIGUARD CONTROL TOWER
*(Tài liệu dành cho Giảng viên / Hội đồng Đánh giá)*

Tài liệu này hướng dẫn chi tiết từng bước để cài đặt, khởi chạy toàn bộ 6 phân hệ của hệ thống **AIGuard Control Tower** trên môi trường máy tính cá nhân (Local) để chạy demo chấm điểm.

---

## 🛠️ YÊU CẦU PHẦN MỀM CẦN CÀI TRƯỚC (Prerequisites)

Để hệ thống chạy mượt mà, máy tính cần cài sẵn các công cụ sau:
1. **Node.js (Phiên bản 18 hoặc 20 LTS):** [Tải tại đây](https://nodejs.org/) (Dùng chạy Frontend & Blockchain).
2. **.NET 10.0 SDK (hoặc .NET 8.0/9.0):** [Tải tại đây](https://dotnet.microsoft.com/download) (Dùng chạy Backend API và Windows Agent).
3. **Python 3.10 hoặc 3.11:** [Tải tại đây](https://www.python.org/) (Dùng chạy AI Security Engine). *Lưu ý: Tích chọn "Add Python to PATH" khi cài.*
4. **SQL Server & SSMS:** Cài đặt bản SQL Server Express (miễn phí) và phần mềm SQL Server Management Studio (SSMS).

---

## 🚀 QUY TRÌNH 7 BƯỚC KHỞI CHẠY HỆ THỐNG

### BƯỚC 1: KHỞI TẠO CƠ SỞ DỮ LIỆU (SQL SERVER)
1. Mở phần mềm **SQL Server Management Studio (SSMS)**.
2. Kết nối vào SQL Server cục bộ (thường tên Server Name là `.` hoặc `localhost` hoặc `.\SQLEXPRESS`).
3. Mở file [database/production-idempotent.sql](file:///g:/Dự%20Án/DuAn2026/database/production-idempotent.sql) bằng SSMS.
4. Bấm nút **Execute** (hoặc phím **F5**) để tự động tạo cơ sở dữ liệu `AiguardDb` cùng toàn bộ bảng và dữ liệu mẫu thử nghiệm.
5. Cấu hình kết nối:
   - Mở file cấu hình API [appsettings.json](file:///g:/Dự%20Án/DuAn2026/aiguard-api/appsettings.json).
   - Kiểm tra dòng `ConnectionStrings.DefaultConnection`. Đảm bảo khớp thông tin xác thực SQL Server của máy (Ví dụ dùng Windows Authentication hoặc nhập tài khoản `sa`).

---

### BƯỚC 2: KHỞI CHẠY AI SECURITY SERVICE (PYTHON FASTAPI)
Phân hệ này chạy mô hình Llama Guard và bộ lọc Regex để phân loại dữ liệu nhạy cảm tại cổng **8000**.
1. Mở cửa sổ **Terminal (PowerShell hoặc CMD)** tại thư mục dự án.
2. Di chuyển vào thư mục: `cd aiguard-ai`
3. Chạy file script PowerShell tự động setup môi trường ảo và khởi động:
   ```powershell
   .\start-aiguard-ai.ps1
   ```
   *(Hoặc chạy thủ công: `pip install -r requirements.txt` sau đó chạy `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`)*
4. **Kiểm tra thành công:** Truy cập trang [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) thấy giao diện tài liệu Swagger của AI Engine là thành công.

---

### BƯỚC 3: KHỞI CHẠY BACKEND API (C# .NET)
Cung cấp dịch vụ Gateway và lưu vết dữ liệu tại cổng **5000 / 5001**.
1. Mở một cửa sổ **Terminal** mới.
2. Di chuyển vào thư mục API: `cd aiguard-api`
3. Chạy lệnh:
   ```bash
   dotnet restore
   dotnet run
   ```
4. **Kiểm tra thành công:** Truy cập địa chỉ [http://localhost:5000/swagger](http://localhost:5000/swagger) hiển thị danh sách API Swagger của hệ thống.

---

### BƯỚC 4: KHỞI CHẠY FRONTEND DASHBOARD (REACT / VITE)
Giao diện Web Admin và bảng điều khiển tại cổng **5173**.
1. Mở một cửa sổ **Terminal** mới.
2. Di chuyển vào thư mục Frontend: `cd aiguard-web`
3. Cài thư viện và chạy:
   ```bash
   npm install
   npm run dev
   ```
4. **Đường dẫn truy cập:** Truy cập trình duyệt 👉 **http://localhost:5173**

---

### BƯỚC 5: CÀI ĐẶT TIỆN ÍCH TRÌNH DUYỆT (CHROME EXTENSION)
Theo dõi hành vi gửi Prompt lên các trang AI (ChatGPT, Gemini...).
1. Mở trình duyệt Google Chrome và truy cập đường dẫn: `chrome://extensions/`
2. Kích hoạt nút **Chế độ nhà phát triển (Developer mode)** ở góc trên bên phải.
3. Bấm vào nút **Load unpacked (Tải tiện ích đã giải nén)** ở góc trái.
4. Trỏ và chọn thư mục [aiguard-extension](file:///g:/Dự%20Án/DuAn2026/aiguard-extension) trong dự án của bạn để hoàn tất cài đặt.

---

### BƯỚC 6: CHẠY WINDOWS DESKTOP AGENT (AGENT MÁY TRẠM)
Theo dõi Clipboard và đồng bộ các chính sách bảo vệ máy trạm.
1. Mở thư mục [aiguard-endpoint-agent](file:///g:/Dự%20Án/DuAn2026/aiguard-endpoint-agent).
2. Chạy file Visual Studio Solution (`aiguard-endpoint-agent.sln`) hoặc chạy nhanh bằng lệnh Terminal:
   ```bash
   cd aiguard-endpoint-agent
   dotnet run
   ```
3. Giao diện C# WPF Agent sẽ xuất hiện dưới khay hệ thống, kết nối trực tiếp với API cục bộ.

---

### BƯỚC 7 (TÙY CHỌN): CHẠY BLOCKCHAIN LEDGER (HARDHAT)
Neo giữ mã băm Merkle Root chống sửa xóa nhật ký logs.
1. Mở Terminal mới: `cd aiguard-contracts`
2. Khởi chạy mạng ảo: `npx hardhat node`
3. Deploy Smart Contract lên mạng ảo:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

---

## 🔒 HƯỚNG DẪN KỊCH BẢN DEMO (DEMO SCENARIOS)

Để trình diễn cho giảng viên, bạn có thể thực hiện đăng nhập bằng 3 tài khoản mẫu ứng với 3 vai trò khác nhau trong doanh nghiệp:

### 1. Kịch bản Nhân viên (Employee)
* **Tài khoản:** `nguyenvana@company.com` / `Employee@123`
* **Cách demo:**
  1. Mở ChatGPT/Gemini, nhập một đoạn văn bản bình thường -> Hệ thống cho phép gửi đi (`Allow`).
  2. Thử dán một số thông tin nhạy cảm ở mức trung bình (ví dụ: Số điện thoại, email cá nhân) -> Tiện ích mở rộng sẽ tự động che dấu thành `[PHONE_NUMBER_1]`, `[EMAIL_1]` trước khi gửi lên AI để bảo vệ dữ liệu.
  3. Đăng nhập trang [http://localhost:5173/app/my-usage/overview](http://localhost:5173/app/my-usage/overview) để xem **Điểm an toàn (Safety Score)** và biểu đồ thống kê thời gian thực của chính nhân viên đó.

### 2. Kịch bản Chủ doanh nghiệp (Tenant Owner)
* **Tài khoản:** `admin@company.com` / `Admin@123`
* **Cách demo:**
  1. Đăng nhập trang quản trị để thiết lập các chính sách DLP nâng cao (Ví dụ: bật/tắt quét mã nguồn, đổi hành động từ Che dấu sang Chặn hoàn toàn).
  2. Duyệt các yêu cầu gửi thông tin của nhân viên tại **Trung tâm phê duyệt (Approval Center)**.
  3. Xem thống kê tình hình rò rỉ dữ liệu của toàn bộ thiết bị trạm trong công ty.

### 3. Kịch bản Quản trị hệ thống SaaS (Platform Admin)
* **Tài khoản:** `platform@aiguard.com` / `PlatformPassword@123`
* **Cách demo:**
  1. Quản lý danh sách các công ty đăng ký sử dụng (Tenants).
  2. Tạo lập gói cước bán hàng (Pricing Plans).
  3. **Thử nghiệm phê duyệt đơn hàng:** Vào danh sách đơn hàng cần duyệt, bấm **Duyệt và cấp License ngay** -> Hệ thống tự động tạo mã hóa đơn và sinh License Key tương ứng ngay lập tức.

---

## 🛡️ HƯỚNG DẪN XỬ LÝ SỰ CỐ (TROUBLESHOOTING)
- **Lỗi không kết nối được database:** Kiểm tra SQL Server Service đã bật trong Windows Services (`services.msc`), hoặc sửa kết nối SQL Server thành `Server=localhost;Database=AiguardDb;Trusted_Connection=True;TrustServerCertificate=True;`.
- **Lỗi CORS trên trình duyệt:** Đảm bảo cả frontend (cổng 5173), API (cổng 5000) và AI (cổng 8000) đều đang chạy đồng thời.
- **Tiến trình Backend API bị lỗi Lock File:** Chạy lệnh `taskkill /f /im aiguard-api.exe` trong CMD để giải phóng file bị chiếm dụng, sau đó chạy lại `dotnet run`.
