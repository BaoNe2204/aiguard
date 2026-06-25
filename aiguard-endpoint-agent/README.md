# AIGuard Endpoint Agent

Desktop Agent chạy ngầm trên máy nhân viên để đăng ký thiết bị với AIGuard API,
gửi heartbeat, đồng bộ policy, gửi telemetry endpoint và gọi API DLP để quét
prompt/file trước khi dữ liệu đi ra ngoài.

## Chức năng đã nối API

- Enroll thiết bị bằng enrollment key từ Control Tower.
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
dotnet run -- configure --api http://127.0.0.1:5185 --token "<enrollment-key>" --email "employee@company.com" --department "Dev" --clear-state
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

Test luong noi bat: AI coding app doc repo co du lieu nhay cam.

```powershell
$env:AIGUARD_WORKSPACE_ROOTS="D:\tmp\aiguard-sensitive-test"
New-Item -ItemType Directory -Force "D:\tmp\aiguard-sensitive-test\.git"
Set-Content "D:\tmp\aiguard-sensitive-test\.env" "OPENAI_API_KEY=sk-test"
dotnet run -- telemetry-once
```

Sau khi chay, vao Control Tower > Bao ve thiet bi > Theo doi Agent / DLP.
Agent se day cac telemetry moi:

- `AiCodeApp` khi thay Cursor, Codex, VS Code, Copilot, Claude, Windsurf, Trae hoac Tabnine dang chay.
- `SensitiveWorkspace` khi thay thu muc source code.
- `DeveloperSecret` khi thay `.env`, private key, certificate hoac file cau hinh nhay cam trong repo.

`DeveloperSecret` duoc cham `Critical`, `AiCodeApp` va `SensitiveWorkspace` duoc cham `High` de admin co the xem audit log,
quarantine thiet bi hoac remote disable. Day la lop phat hien/canh bao dang chay duoc; chan cung viec process doc file
can them Windows policy, signed interactive helper, driver hoac tich hop EDR/Intune/GPO.

## Test full theo yeu cau doanh nghiep

Muc tieu luong test:

```text
Admin tao policy tren web
-> Agent may con sync policy
-> Agent phat hien AI code app + repo/file nhay cam
-> Agent cham risk
-> Low: Allow
-> High: PendingApproval/Alert
-> Critical: Block/KillProcess/Quarantine
-> Gui telemetry va audit log
```

### 1. Tao repo gia co secret de test

```powershell
dotnet run -- create-test-fixture --path "C:\tmp\aiguard-sensitive-test"
```

Lenh nay tao `.git`, `package.json`, `.env`, va `private.key`.

### 2. Test offline khong can API

```powershell
dotnet run -- ai-code-check --workspace-roots "C:\tmp\aiguard-sensitive-test"
```

Ket qua mong doi:

- `AiCodeApp` neu Cursor, Codex, VS Code/Copilot, Claude, Windsurf, Trae hoac Tabnine dang chay.
- `SensitiveWorkspace` khi thay repo/source.
- `DeveloperSecret` khi thay `.env`, `private.key`, certificate hoac file secret.
- `AiCodePolicyDecision` ket luan risk va decision.

Vi du dung:

```text
[Critical] AiCodePolicyDecision/Blocked
Risk=Critical; Decision=Block; Enforcement=BlockRequestedProcessKillDisabled
```

`ProcessKillDisabled` la dung khi test an toan. Agent khong dong app cua ban neu chua bat enforcement.

### 3. Test payload truoc khi gui server

```powershell
dotnet run -- telemetry-once --dry-run --workspace-roots "C:\tmp\aiguard-sensitive-test"
```

Lenh nay in telemetry ra console va khong goi API.

### 4. Gui telemetry that len Control Tower

Lay enrollment key o web: `Bao ve thiet bi > aiguard-endpoint-agent`.

```powershell
$env:AIGUARD_AGENT_HOME="C:\tmp\aiguard-agent-test"
dotnet run -- configure --api http://127.0.0.1:5185 --token "<enrollment-key>" --email "dev@company.com" --department "Dev" --workspace-roots "C:\tmp\aiguard-sensitive-test" --clear-state
dotnet run -- enroll
dotnet run -- telemetry-once
```

Xem ket qua tren web:

```text
Bao ve thiet bi -> Theo doi Agent / DLP
Bao ve thiet bi -> Thiet bi da trien khai
Audit log
```

### 5. Test block/kill/quarantine

Mac dinh agent chi bao `BlockRequestedProcessKillDisabled` de test an toan.
Chi bat kill process khi da chac chan muon agent dong Cursor/Codex/VS Code AI theo policy:

```powershell
dotnet run -- configure --enable-process-kill true
dotnet run -- ai-code-check --workspace-roots "C:\tmp\aiguard-sensitive-test" --critical-action Block
```

Neu policy tren web de `CriticalAction = Block`, khi gui telemetry that backend se tu quarantine thiet bi.
Neu `--enable-process-kill true`, agent se co gang dong cac process AI code app khop danh sach.

### 6. Lenh cau hinh quan trong

```powershell
dotnet run -- configure `
  --api http://127.0.0.1:5185 `
  --token "<enrollment-key>" `
  --email "employee@company.com" `
  --department "Dev" `
  --workspace-roots "D:\repo1;D:\repo2" `
  --ai-code-protection true `
  --enable-process-kill false
```

Ghi nho:

- `--workspace-roots` giup test dung thu muc, khong quet lan.
- `--enable-process-kill false` la mac dinh an toan.
- `--dry-run` chi in ket qua, khong gui API.
- `ai-code-check` la lenh test nhanh nhat cho tinh nang AI code app protection.

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
.\aiguard-endpoint-agent.exe configure --api https://api.your-aiguard.vn --token "<enrollment-key>" --email "employee@company.com" --department "Dev" --clear-state
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
