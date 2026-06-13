# AIGuard Backend API

Backend cho Endpoint AI DLP và AI Agent Control Tower.

## Chạy dự án

```powershell
dotnet build
dotnet run
```

Mặc định:

- HTTP: `http://localhost:5185`
- OpenAPI JSON: `http://localhost:5185/openapi/v1.json`
- SignalR: `http://localhost:5185/hubs/notifications`
- Liveness: `GET /api/health/live`
- Readiness: `GET /api/health/ready`

## Cấu hình

Development dùng SQL Server:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=AIGuardDb;Trusted_Connection=true;Encrypt=false;TrustServerCertificate=true;"
}
```

Production cần cấu hình bằng environment variable hoặc secret store:

```text
ConnectionStrings__DefaultConnection
JwtSettings__Secret
BlockchainSettings__RpcUrl
BlockchainSettings__ContractAddress
```

Không dùng development JWT secret trong production.

## Tài khoản seed

| Email | Password | Role |
|---|---|---|
| `admin@aiguard.com` | `Admin@123` | SystemAdmin |
| `security.admin@company.com` | `Security@123` | SecurityAdmin |
| `hr.manager@company.com` | `HrManager@123` | DepartmentManager |
| `nguyenvana@company.com` | `Employee@123` | Employee |
| `auditor@company.com` | `Auditor@123` | Auditor |

Chỉ sử dụng các tài khoản này cho development/demo.

## Luồng thiết bị

1. System Admin đăng nhập lấy JWT.
2. Gọi `POST /api/endpoints/deployment/rotate-token`.
3. Desktop Agent gọi `POST /api/endpoints/deployment/enroll`.
4. Backend trả endpoint key một lần.
5. Agent/Extension gửi endpoint key trong header:

```text
X-Endpoint-Key: <device-endpoint-key>
```

Endpoint key được yêu cầu cho:

- `POST /api/endpoints/devices/heartbeat`
- `GET /api/policies/current?hostname=...`
- `POST /api/dlp/scan`
- `POST /api/dlp/files/scan`
- `POST /api/endpoints/events`

## API chính

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `GET /api/auth/profile`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Endpoint DLP

- `POST /api/endpoints/deployment/enroll`
- `GET /api/endpoints/devices`
- `POST /api/endpoints/devices/{id}/rotate-key`
- `POST /api/endpoints/devices/{id}/revoke-key`
- `POST /api/endpoints/devices/heartbeat`
- `GET /api/policies/current`
- `POST /api/dlp/scan`
- `POST /api/endpoints/events`
- `GET /api/endpoints/events`
- `GET /api/endpoints/ai-websites`

### Policy

- `GET /api/policies/departments`
- `PUT /api/policies/departments/{id}`
- `GET /api/policies/whitelist-blacklist`
- `POST /api/policies/whitelist-blacklist`
- `GET /api/policies/versions`

### Approval

- `GET /api/approvals/pending`
- `POST /api/approvals/{id}/action`
- `GET /api/approvals/history`

### AI Agent

- `GET /api/agents`
- `POST /api/agents`
- `PUT /api/agents/{id}`
- `GET /api/agents/{id}/tool-permissions`
- `PUT /api/agents/{id}/tool-permissions`
- `POST /api/agents/tool-call/check`
- `GET /api/agents/tool-calls`

### Audit và Blockchain

- `GET /api/audit/logs`
- `GET /api/blockchain/batches`
- `POST /api/blockchain/verify/{batchId}`

Blockchain mặc định ở chế độ local anchoring. Chỉ bật
`BlockchainSettings:Enabled=true` sau khi đã cấu hình RPC, wallet và smart contract thật.

## Lưu ý database

Ứng dụng hiện dùng `EnsureCreatedAsync` cho development. Khi thay model trên database đã tồn tại, nên tạo database development mới hoặc bổ sung EF Core migration trước khi triển khai production.
