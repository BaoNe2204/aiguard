import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const source = fs.readFileSync("contracts/AuditAnchor.sol", "utf8");
const input = {
  language: "Solidity",
  sources: { "AuditAnchor.sol": { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } }
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors || []).filter(x => x.severity === "error");
if (errors.length) throw new Error(errors.map(x => x.formattedMessage).join("\n"));
const artifact = output.contracts["AuditAnchor.sol"].AuditAnchor;
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync(path.join("artifacts", "AuditAnchor.json"), JSON.stringify({
  abi: artifact.abi,
  bytecode: `0x${artifact.evm.bytecode.object}`
}, null, 2));
console.log("Compiled artifacts/AuditAnchor.json");
