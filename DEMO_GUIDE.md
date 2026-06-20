# Kịch Bản Quay Video Demo Hệ Thống AIGuard

Tài liệu này hướng dẫn chi tiết từng bước quay video demo từ đầu đến cuối, giúp thể hiện toàn bộ tính năng cốt lõi của AIGuard từ cài đặt, chạy test, đến giao diện người dùng và cơ chế bảo vệ.

---

## 🎥 PHẦN 1: Chuẩn Bị Môi Trường (Trước Khi Bắt Đầu Quay)

Để video mượt mà, hãy chuẩn bị sẵn các tab và terminal như sau:

1. **Terminal 1: Chạy Backend API**
   ```powershell
   cd "G:\Dự Án\DuAn2026\aiguard-api"
   # Reset DB về mặc định để có data demo sạch
   dotnet run --environment Testing --urls "http://127.0.0.1:5190" --DatabaseSettings:ResetOnStartup=true
   ```
   *(Sau khi API khởi động xong, bấm `Ctrl+C` rồi chạy lại ở môi trường Development hoặc giữ nguyên tùy mục đích test)*
   Chạy chính thức:
   ```powershell
   dotnet run --environment Development --urls "http://127.0.0.1:5185"
   ```

2. **Terminal 2: Chạy Web Dashboard**
   ```powershell
   cd "G:\Dự Án\DuAn2026\aiguard-web"
   npm run dev -- --host 127.0.0.1
   ```
   *Mở trình duyệt tại địa chỉ: `http://127.0.0.1:5173`*

3. **Terminal 3: Sẵn sàng chạy Regression Test**
   ```powershell
   cd "G:\Dự Án\DuAn2026\aiguard-api"
   # Chuẩn bị sẵn lệnh nhưng chưa bấm Enter
   powershell.exe -ExecutionPolicy Bypass -File .\Tests\run-api-tests.ps1
   ```

4. **Trình duyệt Chrome sạch (Không ẩn danh):**
   - Truy cập `chrome://extensions/`.
   - Bật **Developer mode** ở góc phải.
   - Chọn **Load unpacked** và trỏ đến thư mục: `G:\Dự Án\DuAn2026\aiguard-extension\dist`.

---

## 🎬 KỊCH BẢN QUAY CHI TIẾT (STORYBOARD)

### Cảnh 1: Giới thiệu & Chạy Regression Test (Thời lượng: ~45s)
* **Thao tác:**
  1. Show cấu trúc dự án trên VS Code hoặc thư mục chính.
  2. Mở Terminal 3 lên và nhấn `Enter` chạy bộ test `run-api-tests.ps1`.
  3. Để màn hình cuộn chạy các test cases nhanh chóng và hiển thị dòng chữ xanh: **`Passed: 169 / 169`**.
* **Lời bình/Phụ đề gợi ý:**
  > *"Xin chào các bạn. Hôm nay chúng ta sẽ demo hệ thống bảo mật thông tin AIGuard. Đầu tiên, chúng tôi sẽ chạy bộ thử nghiệm tự động hồi quy gồm 169 testcases để kiểm chứng toàn bộ tính năng API backend từ quản lý thiết bị, dlp engine cho tới tích hợp blockchain."*

### Cảnh 2: Đăng Ký Doanh Nghiệp & Thiết Lập MFA (Thời lượng: ~1m15s)
* **Thao tác:**
  1. Mở trang web đăng ký tài khoản dùng thử (Trial Signup) của Tenant mới hoặc đăng nhập bằng tài khoản Admin mặc định có yêu cầu MFA.
  2. Tạo tài khoản mới: Điền tên công ty (ví dụ: `AIGuard Demo Ltd`), email (`admin@democo.com`).
  3. Hệ thống trả về giao diện **Thiết lập MFA (Multi-Factor Authentication)** kèm mã QR và Secret key Base32.
  4. Dùng điện thoại (Google Authenticator) quét mã QR, lấy mã TOTP 6 số nhập vào.
  5. Đăng nhập thành công và lưu 8 mã dự phòng (Recovery Codes). Show màn hình Dashboard chính vừa được khởi tạo.
* **Lời bình/Phụ đề gợi ý:**
  > *"AIGuard bảo vệ tài khoản quản trị nghiêm ngặt bằng cơ chế xác thực hai lớp TOTP MFA. Ở lần đăng nhập đầu tiên, hệ thống sẽ yêu cầu người dùng thiết lập ứng dụng xác thực và lưu trữ recovery codes phòng trường hợp khẩn cấp."*

### Cảnh 3: Quản Lý Thiết Bị & Đăng Ký Device Key (Thời lượng: ~1m)
* **Thao tác:**
  1. Chuyển sang tab **Endpoint Protection Console** -> Chọn tab **Deployment**.
  2. Bấm nút **Rotate Enrollment Token** để lấy mã đăng ký mới.
  3. Show lệnh cài đặt Windows Agent tự động được tạo ra bên dưới dạng Powershell. Bấm **Copy**.
  4. Mở tab **Deployed Devices**, show trạng thái các máy đang Online/Offline, trạng thái Browser Extension có đang Active hay không theo thời gian thực (realtime).
* **Lời bình/Phụ đề gợi ý:**
  > *"Để quản lý các thiết bị trong mạng lưới doanh nghiệp, AIGuard cấp mã đăng ký thiết bị (Enrollment Token) tự động. Mỗi máy trạm Windows sau khi cài đặt Agent sẽ liên kết trực tiếp, đồng bộ chính sách bảo mật và gửi tín hiệu heartbeat liên tục."*

### Cảnh 4: Chặn Rò Rỉ Dữ Liệu Trên Browser Extension (DLP) (Thời lượng: ~1m30s)
* **Thao tác:**
  1. Mở tab ChatGPT hoặc Gemini trên Chrome đã cài Extension.
  2. **Test case 1: Thông tin cá nhân (PII)** -> Nhập prompt có email/số điện thoại: `"Gửi email cho abc@example.com qua số 0901234567"`. Bấm Send.
     - *Kết quả:* Extension chặn, hiển thị Popup cảnh báo với mã hóa Masking (ví dụ: `abc[EMAIL]`, `090[PHONE]`).
  3. **Test case 2: Secrets / API Keys** -> Nhập prompt chứa AWS Secret Key hoặc API key: `"sk-abcdefghijklmnopqrstuvwxyz123456"`. Bấm Send.
     - *Kết quả:* Extension chặn cứng (Block), hiển thị mức độ rủi ro: **Critical**, lý do policy vi phạm.
  4. **Test case 3: Source Code cần phê duyệt** -> Nhập đoạn code Java/C#: `"public class DatabaseConnection { ... }"`
     - *Kết quả:* Extension hiển thị Popup trạng thái **Pending Approval**. Nhập lý do nghiệp vụ: `"Cần phân tích tối ưu hóa mã nguồn với AI"` và nhấn **Gửi yêu cầu phê duyệt**. Màn hình hiển thị trạng thái đang chờ (Polling).
* **Lời bình/Phụ đề gợi ý:**
  > *"Bây giờ là tính năng quan trọng nhất: Giám sát rò rỉ dữ liệu thông qua Browser Extension. Khi người dùng cố ý gửi thông tin nhạy cảm như email, số điện thoại, mật khẩu, AWS key hoặc mã nguồn lên ChatGPT, AIGuard DLP Engine sẽ phân tích và chặn đứng ngay lập tức dựa trên chính sách của từng phòng ban."*

### Cảnh 5: Luồng Phê Duyệt Approval Realtime (Thời lượng: ~1m)
* **Thao tác:**
  1. Quay lại trang Web quản trị (AIGuard Dashboard) bằng tài khoản Security Admin.
  2. Show thông báo Realtime SignalR nhảy lên ở topbar chuông thông báo và tab **Approvals**.
  3. Click vào yêu cầu phê duyệt mã nguồn vừa gửi ở Cảnh 4.
  4. Xem chi tiết prompt gốc (đã mã hóa bảo mật), chọn hành động: **Approve With Masking** hoặc **Approve** kèm lời nhắn: `"Đã duyệt cho phép sử dụng"`. Bấm gửi.
  5. Quay lại màn hình ChatGPT ban đầu, chỉ ra rằng Extension đã tự động nhận được tín hiệu phê duyệt và cho phép prompt đi qua.
* **Lời bình/Phụ đề gợi ý:**
  > *"Yêu cầu phê duyệt mã nguồn của nhân viên lập tức xuất hiện trên bảng điều khiển của Admin theo thời gian thực nhờ kết nối SignalR. Quản trị viên có thể xem xét lý do nghiệp vụ, phê duyệt cho phép gửi bản đã che thông tin nhạy cảm hoặc duyệt hoàn toàn."*

### Cảnh 6: Phát Hiện Shadow AI (Thời lượng: ~45s)
* **Thao tác:**
  1. Mở một trang web AI chưa được cho phép trong danh mục (ví dụ: `https://unapproved-ai.example/chat`).
  2. Extension phát hiện trang web không nằm trong allowlist, tự động điều hướng (redirect) tab sang trang chặn mặc định của AIGuard.
  3. Trên Web quản trị, vào mục **Shadow AI Discovery**, show danh sách các lượt truy cập website trái phép được gửi về từ máy trạm.
* **Lời bình/Phụ đề gợi ý:**
  > *"Để ngăn chặn rủi ro Shadow AI, AIGuard liên tục phát hiện các lượt truy cập vào các trang AI nằm ngoài danh mục cho phép, ghi nhận thông tin thiết bị và chặn truy cập để bảo vệ tài nguyên số của doanh nghiệp."*

### Cảnh 7: Telemetry Của Desktop Agent & Cấu Hình Chặn App (Thời lượng: ~1m)
* **Thao tác:**
  1. Vào tab **Telemetry Agent** trên Web quản trị, giới thiệu các sự kiện Metadata như kết nối USB (Removable Storage), Network Share, RDP Client, dịch vụ Print Spooler.
  2. Di chuyển sang tab **Tùy chỉnh Agent** (Agent Settings).
  3. Thêm một app lập trình AI cần chặn vào danh sách (ví dụ: `cursor`, `copilot`).
  4. Nhấn lưu và giải thích cơ chế phân tách ranh giới hệ điều hành (chỉ giám sát metadata an toàn, không đọc clipboard tùy tiện để tôn trọng quyền riêng tư).
* **Lời bình/Phụ đề gợi ý:**
  > *"Desktop Agent chạy ngầm trên Windows giúp ghi nhận các sự kiện hệ thống quan trọng như cắm USB, in ấn tài liệu hoặc kết nối mạng dùng chung. Đồng thời, doanh nghiệp có thể cấu hình chặn các tiến trình lập trình AI không an toàn như Cursor hay Copilot."*

### Cảnh 8: Báo Cáo SIEM & Blockchain Audit (Thời lượng: ~45s)
* **Thao tác:**
  1. Chuyển tới tab **Reports**. Bấm tải báo cáo PDF và Excel. Mở nhanh file PDF vừa tải xuống để hiển thị định dạng báo cáo chuyên nghiệp có biểu đồ rủi ro.
  2. Vào tab **Blockchain batches** / **Audit Logs**. Show chuỗi hash liên kết các sự kiện bảo mật.
  3. Bấm **Verify** một lô audit để hệ thống thực hiện kiểm tra tính toàn vẹn (Integrity Match: True).
* **Lời bình/Phụ đề gợi ý:**
  > *"Cuối cùng, mọi hành động bảo mật đều được tổng hợp thành báo cáo PDF/Excel chuyên nghiệp và được ký số, gộp lô định kỳ để lưu vết bằng cơ chế Blockchain Anchor, đảm bảo nhật ký hệ thống không thể bị giả mạo hoặc xóa bỏ."*

---

## 💡 Mẹo Để Video Trông Chuyên Nghiệp Hơn

1. **Hiệu ứng Glassmorphism**: Giao diện AIGuard được thiết kế theo phong cách mờ kính hiện đại (Glassmorphism), hãy chọn chế độ hiển thị màn hình có độ phân giải Full HD (1080p) để làm nổi bật thiết kế này.
2. **Thao tác chậm rãi**: Khi nhấp chuột hoặc chuyển tab, hãy dừng lại 1-2 giây giúp người xem dễ theo dõi.
3. **Che các thông tin nhạy cảm cá nhân**: Vì đây là video demo nên sử dụng dữ liệu giả lập sẵn của bộ test để tránh lộ thông tin thật.
