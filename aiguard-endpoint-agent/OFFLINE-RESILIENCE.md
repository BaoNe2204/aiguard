# AIGuard Endpoint Agent Offline Resilience

The endpoint agent keeps protection state when the backend is temporarily unavailable.

## Implemented

- Successful policy sync is cached in `policy-cache.protected` under the agent home directory.
- The policy cache is protected with Windows DPAPI `LocalMachine`.
- `--offline-policy-ttl-minutes` controls how long a cached policy is trusted.
- When the cache is missing or expired and `--offline-fallback-to-block true` is enabled, the agent uses a strict local fallback policy where all risk levels resolve to `Block`.
- Telemetry delivery failures are written to `offline-telemetry.protected` with DPAPI protection.
- The service replays queued telemetry after a later successful heartbeat.
- `--max-queued-events` caps the offline queue so a long outage cannot grow the file forever.

## Configuration

```powershell
dotnet run -- configure `
  --offline-policy-ttl-minutes 1440 `
  --offline-fallback-to-block true `
  --max-queued-events 1000
```

## Enterprise blocking components still required

This offline resilience layer is not a substitute for kernel-level or session-level blocking:

- Clipboard blocking is implemented as a user-session helper with `aiguard-endpoint-agent clipboard-helper`; production deployments should run it via an ONLOGON scheduled task and sign the binary.
- USB copy blocking needs a file system minifilter driver or Windows Defender Device Control integration.
- Print DLP needs a print driver/filter/proxy.
- Network share blocking needs file-operation enforcement for SMB/DFS paths.
- Outlook send-time blocking needs a VSTO/Office add-in.
- Strong tamper protection needs Windows Protected Service support, signed binaries, installer hardening, and enterprise policy.
