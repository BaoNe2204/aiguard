# AIGuard Browser Extension

Extension Manifest V3 bảo vệ nhân viên khi dùng AI tạo sinh trên trình duyệt.
Extension chặn hoặc che dữ liệu nhạy cảm trước khi nội dung được gửi tới:

- ChatGPT
- Gemini
- Claude
- Microsoft Copilot

## Luồng dành cho nhân viên

1. Admin cài extension hoặc gửi thư mục `dist` để nhân viên load.
2. Nhân viên mở popup AIGuard, bấm **Cấu hình**.
3. Nhân viên dán token, setup link hoặc lệnh triển khai do admin gửi.
4. Extension tự điền API URL, email, phòng ban và enrollment token.
5. Nhân viên bấm **Đăng ký ngay**.
6. Popup chuyển sang trạng thái **AIGuard đang bảo vệ**.

Sau khi đăng ký, enrollment token không được lưu lại. Extension chỉ lưu endpoint key
để gọi API bảo mật.

## Setup nhanh bằng lệnh triển khai

Trang cấu hình có thể đọc nội dung dạng:

```powershell
.\aiguard-extension setup --api https://api.company.vn --token "<enrollment-token>" --email "employee@company.com" --department "Dev"
```

Hoặc setup link:

```text
chrome-extension://<extension-id>/options.html?api=https%3A%2F%2Fapi.company.vn&token=<token>&email=employee@company.com&department=Dev
```

Nếu không nhập tên thiết bị, extension tự sinh mã dạng `BROWSER-XXXXXXXX`.

## Setup thủ công

1. Backend API URL, ví dụ `http://127.0.0.1:5185`.
2. Email nhân viên đã tồn tại trong tenant.
3. Phòng ban.
4. Enrollment token.
5. Bấm **Đăng ký và bật bảo vệ**.
6. Bấm **Kiểm tra kết nối** để xác nhận policy.

## Cài extension khi dev/test

1. Chạy `build-extension.cmd`.
2. Mở `chrome://extensions` hoặc `edge://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục `aiguard-extension\dist`.

## Build lại sau khi sửa code

```bat
build-extension.cmd
```

Lệnh này copy file sang `dist` và chạy `node --check` cho JavaScript.

## Enterprise policy

Extension hỗ trợ `chrome.storage.managed` qua `managed_schema.json`.
Doanh nghiệp có thể ép cấu hình bằng Chrome/Edge Enterprise Policy:

```json
{
  "apiBaseUrl": "https://api.company.vn",
  "enrollmentToken": "<token>",
  "userEmail": "employee@company.com",
  "departmentName": "Dev",
  "enabled": true,
  "offlineCriticalBlock": true,
  "autoEnroll": true,
  "lockSettings": true
}
```

Ghi chú:

- Với triển khai thật, `userEmail` nên được hệ thống MDM/Intune/GPO render theo từng user.
- `enrollmentToken` nên có thời hạn ngắn và rotate sau đợt triển khai.
- `lockSettings=true` làm nhân viên không sửa cấu hình trong options page.

## Hành vi bảo vệ

- Low: cho phép.
- Medium: hiển thị bản đã che và cho dùng bản masked.
- High: tạo yêu cầu phê duyệt, extension poll kết quả duyệt.
- Critical: chặn gửi.
- File upload được quét qua backend trước khi trình duyệt gửi lên AI.
- Khi backend mất kết nối, mặc định extension fail closed để tránh rò rỉ.
