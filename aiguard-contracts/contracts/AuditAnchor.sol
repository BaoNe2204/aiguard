// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuditAnchor {
    address public owner;
    address public pendingOwner;

    struct Batch {
        bytes32 batchHash;
        uint256 timestamp;
        string metadata;
    }

    mapping(bytes32 => Batch) public batches;

    event BatchAnchored(bytes32 indexed batchHash, uint256 timestamp, string metadata);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchorBatch(bytes32 batchHash, string calldata metadata) external onlyOwner {
        require(batchHash != bytes32(0), "Empty hash");
        require(batches[batchHash].timestamp == 0, "Batch exists");
        batches[batchHash] = Batch(batchHash, block.timestamp, metadata);
        emit BatchAnchored(batchHash, block.timestamp, metadata);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        address previousOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, owner);
    }

    function verifyBatch(bytes32 batchHash) external view returns (bool, uint256, string memory) {
        Batch memory batch = batches[batchHash];
        return (batch.timestamp != 0, batch.timestamp, batch.metadata);
    }
}
