# 🛡️ AIGuard Control Tower - Hướng Dẫn Khởi Chạy Toàn Hệ Thống

Chào mừng bạn đến với dự án **AIGuard Control Tower** - Hệ thống kiểm soát AI Agent và bảo vệ dữ liệu (DLP) kết hợp công nghệ Blockchain.

Dự án này là một hệ thống lớn bao gồm nhiều phân hệ nhỏ tương tác qua lại. Dưới đây là hướng dẫn chi tiết cách để khởi động toàn bộ hệ thống trên máy cá nhân (Local Environment).

---

## 🏗️ 1. Thiết lập Cơ Sở Dữ Liệu (SQL Server Database)

Hệ thống lưu trữ cấu hình, chính sách và lịch sử log thông qua SQL Server.
- **Vị trí file SQL:** `database/production-idempotent.sql` (File bạn vừa di chuyển)
- **Các bước thực hiện:**
  1. Mở phần mềm quản lý Database (như SQL Server Management Studio hoặc Azure Data Studio).
  2. Kết nối vào SQL Server ở máy của bạn (vd: `localhost` hoặc `.\SQLEXPRESS`).
  3. Kéo thả file `production-idempotent.sql` vào màn hình query và nhấn nút **Execute** (hoặc F5). Thao tác này sẽ tự động tạo cấu trúc bảng và dữ liệu mẫu cần thiết.
  4. Đảm bảo cấu hình `ConnectionStrings` bên trong API Backend đã khớp với thông tin đăng nhập database của bạn.

---

## ⚙️ 2. Khởi động Backend API (C# / .NET Core)

Bộ não xử lý trung tâm, giao tiếp với Database và Blockchain.
- **Thư mục code:** `aiguard-api`
- **Yêu cầu:** Đã cài đặt .NET SDK (C#)
- **Các bước thực hiện:**
  1. Mở Terminal / PowerShell và trỏ vào thư mục API: `cd aiguard-api`
  2. Phục hồi thư viện: `dotnet restore`
  3. Chạy server API:
     ```bash
     dotnet run
     ```
     *(Mẹo: Bạn có thể dùng `dotnet watch run` để server tự động cập nhật nếu có sửa code)*
  4. Mặc định API sẽ chạy ở cổng `http://localhost:5000` hoặc `5001`. Bạn có thể thêm `/swagger` vào cuối đường dẫn để xem tài liệu API.

---

## 🎨 3. Khởi động Frontend Web Admin (React / Vite)

Trang tổng quan (Control Tower Console) dành cho việc quản lý tập trung.
- **Thư mục code:** `aiguard-web`
- **Yêu cầu:** Đã cài Node.js (Phiên bản 18+)
- **Các bước thực hiện:**
  1. Mở một Terminal / PowerShell mới và trỏ vào thư mục Frontend: `cd aiguard-web`
  2. Cài đặt các thư viện (chỉ cần làm 1 lần):
     ```bash
     npm install
     ```
  3. Khởi chạy giao diện web:
     ```bash
     npm run dev
     ```
  4. Mở trình duyệt và truy cập: 👉 **http://localhost:5173**

---

## 🤖 4. Khởi động AI Engine (Python / Docker)

Phân hệ trí tuệ nhân tạo chuyên sâu (nếu có kích hoạt).
- **Thư mục code:** `aiguard-ai`
- **Yêu cầu:** Đã cài đặt Docker
- **Các bước thực hiện:**
  1. Mở Terminal trỏ vào thư mục: `cd aiguard-ai`
  2. Build hình ảnh Docker:
     ```bash
     docker build -t aiguard-ai .
     ```
  3. Khởi động container:
     ```bash
     docker run -p 5000:5000 aiguard-ai
     ```

---

## 🔗 5. Smart Contracts Blockchain (Solidity)

Thành phần lưu trữ hash (mã băm) không thể tẩy xóa để phục vụ kiểm toán (Audit).
- **Thư mục code:** `aiguard-contracts`
- **Yêu cầu:** Node.js
- **Các bước thực hiện (Môi trường giả lập local):**
  1. Chuyển vào thư mục: `cd aiguard-contracts`
  2. Cài đặt: `npm install`
  3. Bật mạng blockchain local ảo: `npx hardhat node`
  4. Mở thêm 1 terminal phụ để đẩy contract lên mạng ảo: `npx hardhat run scripts/deploy.js --network localhost`

---

## 🛡️ 6. Endpoint Agent & Browser Extension

Các thành phần chạy trên máy tính hoặc trình duyệt người dùng để giám sát DLP.
- Bạn hãy vào các thư mục `aiguard-endpoint-agent` và `aiguard-extension` để đọc file README.md cục bộ bên trong đó. Các file này sẽ hướng dẫn cách cài đặt thành file phần mềm hoặc tải tiện ích lên Chrome.

---

> 💡 **Thứ Tự Khởi Chạy Chuẩn:**
> 1. Database (Chỉ chạy script 1 lần)
> 2. Backend API (`aiguard-api`)
> 3. Frontend Web (`aiguard-web`)
> 4. Các module râu ria khác (AI, Blockchain, Agent) khi cần test chức năng đó.
