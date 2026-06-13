# AIGuard Endpoint Agent

Windows Service that enrolls a machine, stores its endpoint key with DPAPI
LocalMachine protection, sends heartbeats and synchronizes policy.

Publish and install:

```powershell
dotnet publish -c Release -r win-x64 --self-contained true
sc.exe create AIGuardEndpointAgent binPath= "C:\Program Files\AIGuard\aiguard-endpoint-agent.exe" start= auto
sc.exe start AIGuardEndpointAgent
```

Before first start create
`C:\ProgramData\AIGuard\agent-config.json` using the enrollment token generated
by the Control Tower. After enrollment, rotate or remove that enrollment token.
