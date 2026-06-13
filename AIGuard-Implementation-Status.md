# AIGuard Control Tower - Trạng thái triển khai hiện tại

Cập nhật: 2026-06-13

Tài liệu này ghi lại trạng thái code hiện tại của hệ thống AIGuard sau đợt triển khai enterprise feature set. Mục tiêu là mở dự án lên biết phần nào đã chạy được, chạy bằng lệnh nào, phần nào đã test, và phần nào vẫn cần hạ tầng Windows/enterprise riêng nếu muốn chặn cứng ở tầng hệ điều hành.

## 1. Thành phần hiện có

| Thành phần | Thư mục | Trạng thái |
|---|---|---|
| Backend API .NET 10 | `aiguard-api` | Build pass, có migration, API test 106/106 pass |
| Web quản trị | `aiguard-web` | Build pass, nối API thật, có MFA login, Governance, Endpoint, Notification Center |
| Browser Extension MV3 | `aiguard-extension` | Build ra `aiguard-extension/dist`, load unpacked được |
| Windows Endpoint Agent | `aiguard-endpoint-agent` | Build pass, heartbeat + telemetry metadata |
| AI scanner service phụ | `aiguard-ai` | Có skeleton FastAPI/regex/Llama Guard adapter |
| Blockchain contracts | `aiguard-contracts` | Có smart contract project; backend hỗ trợ local anchor và EVM config |

## 2. Các chức năng đã triển khai

### 2.1 Browser Extension

- Chặn thao tác paste/send trên ChatGPT, Gemini, Claude.
- Quét file upload qua backend trước khi cho gửi.
- Popup chặn chuyên nghiệp:
  - risk score, risk level, decision
  - loại dữ liệu phát hiện
  - vị trí line/column
  - lý do policy
  - masked preview
  - nút sửa prompt
  - dùng bản đã che
  - gửi phê duyệt kèm lý do nghiệp vụ
  - báo cáo chặn nhầm
- Poll kết quả approval:
  - Approve
  - Reject
  - Approve With Masking
  - Expired/Revoked
- Shadow AI Discovery:
  - phát hiện website AI ngoài allowlist
  - gửi discovery event về backend bằng endpoint key
  - chuyển tab sang trang block của extension khi backend trả `shouldBlock = true`.
- Extension heartbeat riêng, không giả vờ Desktop Agent biết extension còn chạy.

### 2.2 Backend DLP và bảo mật event

- DLP scanner phát hiện:
  - email, số điện thoại, CCCD
  - API key, password, token
  - AWS, Azure, GitHub, JWT, private key, connection string và secret phổ biến
  - source code
  - dữ liệu khớp Exact Data Match
- File scanner:
  - PDF, Word, Excel, text, source
  - ảnh/PDF scan qua OCR provider cấu hình ngoài
  - ZIP/archive lồng nhau có giới hạn chống zip bomb
- Backend ký scan receipt, endpoint event không còn tin `riskScore/decision` do client tự gửi.
- Reused/expired/mismatched receipt bị reject.
- Thiết bị quarantine/remote disabled bị chặn scan.
- Legacy SQL Server bootstrap tự sửa một số DB cũ thiếu bảng/cột runtime quan trọng.

### 2.3 Đăng nhập và MFA

- Login thường vẫn cấp JWT + refresh token cho user chưa bật MFA.
- User có `mfaRequired` hoặc đã `mfaEnabled` sẽ không nhận token ngay sau mật khẩu.
- Backend tạo MFA challenge tạm thời, hết hạn theo cấu hình `MfaSettings:ChallengeExpiryMinutes` mặc định 5 phút.
- Nếu user chưa setup MFA:
  - backend sinh secret Base32
  - trả `otpauth://` provisioning URI
  - web hiển thị secret/URI để quét bằng Microsoft Authenticator, Google Authenticator hoặc 1Password.
- Sau khi nhập đúng mã TOTP 6 số:
  - backend mới cấp JWT + refresh token
  - lưu secret bằng ASP.NET DataProtection
  - đánh dấu `mfaEnabled = true`
  - challenge đã dùng không thể dùng lại.
- Regression test đã cover:
  - password login trả MFA setup challenge
  - verify TOTP cấp JWT
  - challenge dùng lại bị 401.

### 2.4 Approval lifecycle

- High risk prompt/file/action tạo approval.
- Nhân viên gửi lý do nghiệp vụ.
- Quản lý/Security Admin xử lý:
  - Approve
  - Reject
  - Approve With Masking
- Có expiry, revoke, history.
- Extension poll approval status và tự xử lý kết quả.
- SignalR phát realtime event cho dashboard/topbar.

### 2.5 False positive và whitelist

- Nhân viên báo cáo chặn nhầm từ extension hoặc API.
- Security Admin review.
- Approve có thể tạo whitelist theo content hash và detector.
- Whitelist có thời hạn.
- Notification trả về cho người báo cáo.

### 2.6 Users, departments, device management

- CRUD user, department.
- Khóa tài khoản.
- Import CSV/XLSX user.
- Cờ MFA required, MFA enabled, auth provider, external subject đã có trong schema/API.
- Device dashboard:
  - online/offline
  - extension active
  - policy sync
  - agent status
  - quarantine/release
  - remote enable/disable
  - rotate/revoke endpoint key.

### 2.7 Policy Rule Builder

- Rule dạng điều kiện:
  - department
  - data type
  - website pattern
  - user email
  - hostname/device
  - time window
- Action:
  - Allow
  - Mask
  - PendingApproval
  - Block
- Draft, publish, snapshot/version.
- Simulation API.
- DLP scanner enforce published policy rule.
- Policy không được downgrade Critical Block xuống Allow.

### 2.8 Shadow AI Discovery

- Backend:
  - `GET /api/endpoints/shadow-ai/policy`
  - `POST /api/endpoints/shadow-ai/discover`
  - `GET /api/endpoints/shadow-ai`
- Extension:
  - theo dõi tab URL bằng `tabs.onUpdated`
  - so khớp domain AI phổ biến + policy từ server
  - log domain, device, user, decision
  - block website AI chưa được phép.
- Admin UI:
  - Endpoint > AI Websites có bảng Shadow AI Discovery.

### 2.9 Desktop Agent telemetry

Windows Agent hiện thu metadata an toàn:

- Removable storage connected/disconnected.
- Network share observed.
- RDP client running.
- Email client running.
- Print Spooler running.
- Agent health.
- Gửi batch về `POST /api/endpoints/telemetry`.
- Admin xem ở Endpoint > Events > Desktop Agent Telemetry.

Lưu ý: agent hiện không đọc nội dung clipboard, email, file in, USB file content. Nó chỉ log metadata để điều tra.

### 2.10 Incident, notifications, SIEM, reports, retention

- Incident Management:
  - tạo incident thủ công
  - cập nhật status/resolution
  - Shadow AI chưa allowlist tự tạo incident.
- Notification Center:
  - DB notification
  - SignalR realtime
  - topbar web có notification dropdown.
- SIEM/integration:
  - Webhook
  - Syslog
  - Splunk HEC
  - Microsoft Sentinel style webhook
  - Teams
  - Slack
  - Email SMTP
  - retry delivery queue, backoff, delivery history.
- Reports:
  - PDF report
  - Excel/XLSX report
  - filter date/department/risk.
- Retention/privacy:
  - retention days cho endpoint events, audit logs, notifications, incidents
  - cleanup worker
  - prompt gốc không bắt buộc lưu; hệ thống ưu tiên hash/masked preview.

### 2.11 Blockchain audit

- Audit log hash chain.
- Background worker gộp batch.
- Local anchoring khi chưa bật blockchain thật.
- Có EVM client config cho RPC/contract/wallet.
- Verification endpoint kiểm tra batch hash.

## 3. Những phần cần hạ tầng enterprise để chặn cứng cấp OS

Các mục dưới đây đã có metadata telemetry hoặc chỗ tích hợp policy, nhưng muốn chặn cứng trong production cần quyền/hạ tầng Windows enterprise:

| Yêu cầu | Trạng thái hiện tại | Muốn chặn cứng cần thêm |
|---|---|---|
| Clipboard sang app khác | Agent ghi capability status, chưa đọc/chặn clipboard từ Windows Service | Interactive tray/helper chạy trong user session, Windows hooks, hoặc DLP SDK |
| USB file copy | Agent phát hiện removable drive metadata | Windows Defender Device Control, GPO/Intune, minifilter driver hoặc EDR integration |
| Print | Agent phát hiện Print Spooler/process metadata | Print driver/filter, Windows Print policy, hoặc DLP print proxy |
| Network Share | Agent phát hiện mapped/network drive metadata | Firewall/GPO/SMB policy/EDR integration |
| RDP | Agent phát hiện RDP client running | GPO/Firewall/RD Gateway policy |
| Desktop email client content | Agent phát hiện email client running | Outlook add-in, MAPI integration, mail gateway hoặc EDR/DLP connector |
| SSO Microsoft Entra/Google | Schema/API flag đã sẵn | OIDC/SAML provider config, callback UI, tenant app registration |

Không nên giả lập các mục này bằng UI vì sẽ tạo cảm giác bảo vệ sai. Bản hiện tại làm phần có thể làm trong app/service bình thường và ghi rõ ranh giới OS.

## 4. Lệnh chạy và kiểm thử

Backend:

```powershell
cd "G:\Dự Án\DuAn2026\aiguard-api"
dotnet run --no-build --environment Development --urls http://127.0.0.1:5185
```

Web:

```powershell
cd "G:\Dự Án\DuAn2026\aiguard-web"
npm.cmd run dev -- --host 127.0.0.1
```

Extension:

```powershell
cd "G:\Dự Án\DuAn2026\aiguard-extension"
cmd.exe /c build-extension.cmd
```

Load Chrome/Edge unpacked từ:

```text
G:\Dự Án\DuAn2026\aiguard-extension\dist
```

Windows Agent:

```powershell
cd "G:\Dự Án\DuAn2026\aiguard-endpoint-agent"
dotnet build --no-restore
```

API regression test:

```powershell
cd "G:\Dự Án\DuAn2026\aiguard-api"
powershell.exe -ExecutionPolicy Bypass -File .\Tests\run-api-tests.ps1
```

Kết quả mới nhất:

```text
Passed: 106 / 106
```

## 5. Kết quả build mới nhất

| Lệnh | Kết quả |
|---|---|
| `dotnet build --no-restore` trong `aiguard-api` | Pass, 0 warning/error |
| `powershell.exe -ExecutionPolicy Bypass -File .\Tests\run-api-tests.ps1` trong `aiguard-api` | Pass, 106/106 |
| `dotnet ef migrations has-pending-model-changes --no-build` trong `aiguard-api` | No pending changes |
| `npm.cmd run build` trong `aiguard-web` | Pass; có warning từ `@microsoft/signalr` pure annotation của Rolldown |
| `dotnet build --no-restore` trong `aiguard-endpoint-agent` | Pass, 0 warning/error |
| `cmd.exe /c build-extension.cmd` trong `aiguard-extension` | Pass |

## 6. Migration mới

Migration mới nhất:

```text
20260612202803_AddTotpMfa
```

Migration này thêm:

- `Users.MfaEnabled`
- `Users.MfaEnabledAt`
- `Users.MfaSecretProtected`
- bảng `MfaLoginChallenges`
- index unique cho `ChallengeTokenHash`
- index cho `ExpiresAt`
- foreign key về `Users`.

File deploy SQL đã được cập nhật:

```text
aiguard-api\Data\Migrations\production-idempotent.sql
```

## 7. Ghi chú kiểm tra giao diện bằng Browser plugin

Web đã build thành công và API regression đã cover login MFA bằng request thật. Tuy nhiên Browser plugin trong môi trường Codex Desktop hiện vẫn bị Windows sandbox chặn khi mở in-app browser:

```text
CreateProcessAsUserW failed: 5
```

Vì vậy chưa thể xác nhận bằng thao tác click trực tiếp trong in-app browser ở phiên này. Đây là lỗi môi trường browser automation, không phải lỗi build web/backend.
