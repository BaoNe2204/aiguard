# AIGuard Endpoint Agent

Desktop Agent chạy ngầm trên máy nhân viên để đăng ký thiết bị với AIGuard API,
gửi heartbeat, đồng bộ policy, gửi telemetry endpoint và gọi API DLP để quét
prompt/file trước khi dữ liệu đi ra ngoài.

## Chức năng đã nối API

- Enroll thiết bị bằng enrollment token từ Control Tower.
- Lưu endpoint key bằng Windows DPAPI `LocalMachine`.
- Heartbeat về `/api/endpoints/devices/heartbeat`.
- Đồng bộ policy từ `/api/policies/current`.
- Gửi telemetry USB, network share, print spooler, RDP, email client.
- Quét prompt/text qua `/api/dlp/scan`.
- Quét file PDF, Word, Excel, archive/source/text qua `/api/dlp/files/scan`.
- Hỗ trợ chạy CLI để test nhanh và Windows Service để chạy ngầm.

## Test nhanh ở máy dev

Nên dùng thư mục local để không cần quyền ghi `C:\ProgramData`:

```powershell
$env:AIGUARD_AGENT_HOME="G:\Dự Án\DuAn2026\aiguard-endpoint-agent\.local-agent"
```

Cấu hình agent:

```powershell
dotnet run -- configure --api http://127.0.0.1:5185 --token "<enrollment-token>" --email "employee@company.com" --department "Dev" --clear-state
```

Enroll thiết bị:

```powershell
dotnet run -- enroll
```

Kiểm tra trạng thái:

```powershell
dotnet run -- status
```

Quét prompt:

```powershell
dotnet run -- scan --text "AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Quét file upload:

```powershell
dotnet run -- scan-file --path "C:\tmp\report.pdf"
```

Gửi telemetry một lần:

```powershell
dotnet run -- telemetry-once
```

## Chạy dạng Windows Service

Publish bản self-contained:

```powershell
dotnet publish -c Release -r win-x64 --self-contained true
```

Copy file publish vào:

```powershell
C:\Program Files\AIGuard\
```

Cấu hình lần đầu:

```powershell
.\aiguard-endpoint-agent.exe configure --api https://api.your-aiguard.vn --token "<enrollment-token>" --email "employee@company.com" --department "Dev" --clear-state
.\aiguard-endpoint-agent.exe enroll
```

Cài service:

```powershell
sc.exe create AIGuardEndpointAgent binPath= "C:\Program Files\AIGuard\aiguard-endpoint-agent.exe run" start= auto
sc.exe start AIGuardEndpointAgent
```

## Ghi chú triển khai thật

- Enrollment token chỉ dùng lúc cài đặt, sau đó nên rotate hoặc hết hạn tự động.
- Endpoint key nằm trong `agent-state.json` và được bảo vệ bằng DPAPI.
- Windows Service không đọc/chặn clipboard interactive trực tiếp được; phần chặn
  paste/browser nên dùng Browser Extension hoặc interactive helper ký số.
- Agent hiện giám sát và gửi telemetry endpoint. Muốn chặn USB/print/network share
  ở mức kernel/policy thật thì cần tích hợp Windows policy, Intune, GPO hoặc driver.
