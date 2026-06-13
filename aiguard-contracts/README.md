# AIGuard Audit Anchor

```powershell
npm install
npm run compile
$env:AIGUARD_RPC_URL="https://..."
$env:AIGUARD_DEPLOYER_PRIVATE_KEY="<secret>"
npm run deploy
```

Put the deployed address in `BlockchainSettings__ContractAddress`. Configure
`BlockchainSettings__PrivateKey` through a secret manager or environment
variable only. The backend account must own the contract.
