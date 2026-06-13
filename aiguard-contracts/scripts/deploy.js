import fs from "node:fs";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

const rpcUrl = process.env.AIGUARD_RPC_URL;
const privateKey = process.env.AIGUARD_DEPLOYER_PRIVATE_KEY;
if (!rpcUrl || !privateKey) throw new Error("Set AIGUARD_RPC_URL and AIGUARD_DEPLOYER_PRIVATE_KEY.");
const artifact = JSON.parse(fs.readFileSync("artifacts/AuditAnchor.json", "utf8"));
const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);
const contract = await new ContractFactory(artifact.abi, artifact.bytecode, wallet).deploy();
await contract.waitForDeployment();
console.log(`AuditAnchor deployed: ${await contract.getAddress()}`);
