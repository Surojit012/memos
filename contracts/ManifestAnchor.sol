// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ManifestAnchor.sol
 *
 * Stores the MemoryOS master manifest hash on-chain.
 * Any MemoryOS node anywhere in the world can read this hash,
 * download the manifest from 0G Storage, and fully reconstruct
 * the platform state — zero local files required.
 *
 * This is the "trustless bootstrap" mechanism:
 * 1. MemoryOS uploads manifest to 0G Storage → gets rootHash
 * 2. MemoryOS calls updateManifest(rootHash)
 * 3. New MemoryOS node reads manifestHash from this contract
 * 4. Downloads manifest from 0G → hydrates RAM → starts serving
 */
contract ManifestAnchor {
    address public owner;
    string public manifestHash;
    uint256 public version;
    uint256 public lastUpdated;

    event ManifestUpdated(
        string hash,
        uint256 version,
        uint256 timestamp
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        version = 0;
        lastUpdated = block.timestamp;
    }

    /**
     * Update the manifest hash. Called after each manifest upload to 0G Storage.
     * Only the platform owner can update this.
     */
    function updateManifest(string calldata hash) external onlyOwner {
        require(bytes(hash).length > 0, "Empty hash");
        manifestHash = hash;
        version++;
        lastUpdated = block.timestamp;
        emit ManifestUpdated(hash, version, block.timestamp);
    }

    /**
     * Get the current manifest info.
     * Any node can call this to bootstrap from 0G.
     */
    function getManifestInfo() external view returns (
        string memory hash,
        uint256 ver,
        uint256 updated
    ) {
        return (manifestHash, version, lastUpdated);
    }

    /**
     * Transfer ownership to a new address.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
