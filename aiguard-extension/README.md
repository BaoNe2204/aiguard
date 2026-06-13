# AIGuard Browser Extension

Manifest V3 extension bảo vệ thao tác dán, gửi prompt và upload file trên:

- ChatGPT
- Gemini
- Claude

## Chạy extension

1. Chạy Backend API tại `http://127.0.0.1:5185`.
2. Mở `chrome://extensions` hoặc `edge://extensions`.
3. Bật **Developer mode**.
4. Chọn **Load unpacked**.
5. Chọn thư mục `aiguard-extension\dist`.
6. Extension tự mở trang cấu hình.

## Đăng ký thiết bị

1. Đăng nhập AIGuard Control Tower bằng tài khoản quản trị.
2. Vào **Bảo vệ thiết bị > Triển khai**.
3. Rotate enrollment token để nhận token mới.
4. Trong trang cấu hình Extension, nhập:
   - Backend API URL
   - Tên thiết bị
   - Email nhân viên đã tồn tại trong hệ thống
   - Phòng ban
   - Enrollment token
5. Bấm **Đăng ký và bật bảo vệ**.
6. Bấm **Kiểm tra kết nối**.

Sau khi đăng ký thành công, popup hiển thị badge `ON`.

## Đóng gói lại sau khi sửa code

Chạy:

```bat
build-extension.cmd
```

Lệnh sẽ đồng bộ file sang `dist` và kiểm tra cú pháp JavaScript.

## Hành vi bảo vệ

- Prompt an toàn: cho phép gửi.
- Medium: tự động che dữ liệu rồi mới gửi.
- High: chặn và tạo yêu cầu phê duyệt.
- Critical: chặn ngay.
- File upload được giữ lại cho đến khi Backend trả quyết định.
- Khi Backend mất kết nối, mặc định extension chặn thao tác (fail closed).

## Triển khai doanh nghiệp

Production nên:

- Cấp cấu hình bằng managed browser storage.
- Ép cài extension bằng Chrome/Edge Enterprise Policy.
- Không cho nhân viên gỡ hoặc tắt extension.
- Sử dụng HTTPS cho Backend API.
