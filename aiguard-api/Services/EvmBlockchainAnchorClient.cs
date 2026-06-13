using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;

namespace aiguard_api.Services;

public record AnchorTransactionResult(string TransactionHash, long BlockNumber);

public interface IEvmBlockchainAnchorClient
{
    bool IsEnabled { get; }
    Task<AnchorTransactionResult> AnchorAsync(string batchHash, string metadata);
    Task<bool> VerifyOnChainAsync(string batchHash);
}

public class EvmBlockchainAnchorClient : IEvmBlockchainAnchorClient
{
    private readonly IConfiguration _config;
    public bool IsEnabled => _config.GetValue<bool>("BlockchainSettings:Enabled");

    public EvmBlockchainAnchorClient(IConfiguration config) => _config = config;

    public async Task<AnchorTransactionResult> AnchorAsync(string batchHash, string metadata)
    {
        var web3 = CreateWeb3();
        var contract = Required("BlockchainSettings:ContractAddress");
        var handler = web3.Eth.GetContractTransactionHandler<AnchorBatchFunction>();
        var receipt = await handler.SendRequestAndWaitForReceiptAsync(contract, new AnchorBatchFunction
        {
            BatchHash = Convert.FromHexString(batchHash),
            Metadata = metadata
        });
        if (receipt.Status?.Value != 1) throw new InvalidOperationException("Blockchain transaction reverted.");
        return new AnchorTransactionResult(receipt.TransactionHash, (long)receipt.BlockNumber.Value);
    }

    public async Task<bool> VerifyOnChainAsync(string batchHash)
    {
        var web3 = CreateWeb3();
        var handler = web3.Eth.GetContractQueryHandler<VerifyBatchFunction>();
        var output = await handler.QueryDeserializingToObjectAsync<VerifyBatchOutput>(
            new VerifyBatchFunction { BatchHash = Convert.FromHexString(batchHash) },
            Required("BlockchainSettings:ContractAddress"));
        return output.Exists;
    }

    private Web3 CreateWeb3()
    {
        var privateKey = Required("BlockchainSettings:PrivateKey");
        var chainId = _config.GetValue<long>("BlockchainSettings:ChainId");
        return new Web3(new Account(privateKey, chainId), Required("BlockchainSettings:RpcUrl"));
    }

    private string Required(string key) =>
        !string.IsNullOrWhiteSpace(_config[key]) ? _config[key]!
        : throw new InvalidOperationException($"{key} is required when blockchain anchoring is enabled.");
}

[Function("anchorBatch")]
public class AnchorBatchFunction : FunctionMessage
{
    [Parameter("bytes32", "batchHash", 1)] public byte[] BatchHash { get; set; } = [];
    [Parameter("string", "metadata", 2)] public string Metadata { get; set; } = string.Empty;
}

[Function("verifyBatch", typeof(VerifyBatchOutput))]
public class VerifyBatchFunction : FunctionMessage
{
    [Parameter("bytes32", "batchHash", 1)] public byte[] BatchHash { get; set; } = [];
}

[FunctionOutput]
public class VerifyBatchOutput : IFunctionOutputDTO
{
    [Parameter("bool", "", 1)] public bool Exists { get; set; }
    [Parameter("uint256", "", 2)] public BigInteger Timestamp { get; set; }
    [Parameter("string", "", 3)] public string Metadata { get; set; } = string.Empty;
}
