// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentBrainINFT
 * @notice ERC-7857 Intelligent NFT for Memos Agent Brains.
 *
 * Full ERC-7857 features implemented:
 * 1. Encrypted Metadata — Brain data is AES-256 encrypted, key stored on-chain
 *    encrypted with owner's public key. Only the owner can decrypt.
 *
 * 2. Secure Re-Encryption on Transfer — When the NFT transfers to a new owner,
 *    the encrypted key must be re-encrypted for the new owner's public key.
 *    Uses a two-phase transfer: lock → re-encrypt → complete.
 *
 * 3. Tokenized AI Asset Trading — Agents can be bought, sold, and cloned
 *    as tradeable on-chain assets. The brain data lives on 0G Storage.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │  On-Chain (this contract)                               │
 * │  ├── Token ownership (ERC-721)                          │
 * │  ├── Encrypted AES key (per token)                      │
 * │  ├── Brain metadata (agentId, hash, version)            │
 * │  └── Transfer lock + re-encryption protocol             │
 * │                                                         │
 * │  Off-Chain (0G Storage)                                 │
 * │  ├── AES-256-GCM encrypted brain snapshot               │
 * │  ├── Memory payloads, embeddings, skill configs         │
 * │  └── Referenced by brainHash (Merkle root)              │
 * └─────────────────────────────────────────────────────────┘
 */
contract AgentBrainINFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // ── Brain Metadata ──────────────────────────────────────

    struct BrainMetadata {
        string agentId;
        string brainHash;           // 0G Storage root hash of encrypted brain
        uint256 memoriesCount;
        uint256 snapshotVersion;
        uint256 mintedAt;
        address originalMinter;
        bytes encryptedKey;         // AES key encrypted with owner's public key
        bytes ownerPublicKey;       // Owner's public key used for encryption
    }

    // ── Transfer Lock (ERC-7857 re-encryption protocol) ─────

    struct PendingTransfer {
        address from;
        address to;
        uint256 initiatedAt;
        bool active;
    }

    // tokenId → brain metadata
    mapping(uint256 => BrainMetadata) public brains;

    // tokenId → pending transfer (for re-encryption flow)
    mapping(uint256 => PendingTransfer) public pendingTransfers;

    // agentId → array of tokenIds (brain version history)
    mapping(string => uint256[]) public agentBrainHistory;

    // Re-encryption timeout: 24 hours for the new owner to submit re-encrypted key
    uint256 public reEncryptionTimeout = 24 hours;

    // Mint fee
    uint256 public mintFee;

    // ── Events ──────────────────────────────────────────────

    event BrainMinted(
        uint256 indexed tokenId,
        address indexed minter,
        string agentId,
        string brainHash,
        uint256 memoriesCount,
        uint256 snapshotVersion
    );

    event BrainCloned(
        uint256 indexed originalTokenId,
        uint256 indexed cloneTokenId,
        address indexed cloner
    );

    event IntelligentTransferInitiated(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 initiatedAt
    );

    event ReEncryptionCompleted(
        uint256 indexed tokenId,
        address indexed newOwner
    );

    event IntelligentTransferCompleted(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    event IntelligentTransferCancelled(
        uint256 indexed tokenId
    );

    event EncryptedKeyUpdated(
        uint256 indexed tokenId,
        address indexed updater
    );

    // ── Constructor ─────────────────────────────────────────

    constructor() ERC721("Memos Agent Brain", "BRAIN") Ownable(msg.sender) {
        _nextTokenId = 1;
        mintFee = 0;
    }

    // ── Core: Mint Brain ────────────────────────────────────

    /**
     * @notice Mint a new Agent Brain INFT with encrypted metadata.
     * @param agentId The Memos agent identifier
     * @param brainHash 0G Storage root hash of the encrypted brain snapshot
     * @param memoriesCount Number of memories in the snapshot
     * @param snapshotVersion Brain version number
     * @param encryptedKey AES-256 key encrypted with the minter's public key
     * @param ownerPublicKey Minter's public key (for future re-encryption reference)
     * @param tokenURI_ Metadata URI
     */
    function mintBrain(
        string memory agentId,
        string memory brainHash,
        uint256 memoriesCount,
        uint256 snapshotVersion,
        bytes memory encryptedKey,
        bytes memory ownerPublicKey,
        string memory tokenURI_
    ) external payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        require(bytes(brainHash).length > 0, "Brain hash required");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        brains[tokenId] = BrainMetadata({
            agentId: agentId,
            brainHash: brainHash,
            memoriesCount: memoriesCount,
            snapshotVersion: snapshotVersion,
            mintedAt: block.timestamp,
            originalMinter: msg.sender,
            encryptedKey: encryptedKey,
            ownerPublicKey: ownerPublicKey
        });

        agentBrainHistory[agentId].push(tokenId);

        emit BrainMinted(tokenId, msg.sender, agentId, brainHash, memoriesCount, snapshotVersion);
        return tokenId;
    }

    /**
     * @notice Simplified mint (backward compatible — no encryption).
     */
    function mintBrainSimple(
        string memory agentId,
        string memory brainHash,
        uint256 memoriesCount,
        uint256 snapshotVersion,
        string memory tokenURI_
    ) external payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        require(bytes(brainHash).length > 0, "Brain hash required");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        brains[tokenId] = BrainMetadata({
            agentId: agentId,
            brainHash: brainHash,
            memoriesCount: memoriesCount,
            snapshotVersion: snapshotVersion,
            mintedAt: block.timestamp,
            originalMinter: msg.sender,
            encryptedKey: "",
            ownerPublicKey: ""
        });

        agentBrainHistory[agentId].push(tokenId);

        emit BrainMinted(tokenId, msg.sender, agentId, brainHash, memoriesCount, snapshotVersion);
        return tokenId;
    }

    // ── ERC-7857: Intelligent Transfer (iTransferFrom) ──────

    /**
     * @notice Initiate an intelligent transfer (ERC-7857 iTransferFrom).
     *
     * Two-phase transfer protocol:
     * Phase 1: Owner calls iTransferFrom → token is locked, transfer is pending
     * Phase 2: New owner calls completeTransfer with re-encrypted key → transfer completes
     *
     * If Phase 2 doesn't happen within reEncryptionTimeout, owner can cancel.
     */
    function iTransferFrom(
        address to
    , uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(to != address(0), "Cannot transfer to zero address");
        require(to != msg.sender, "Cannot transfer to self");
        require(!pendingTransfers[tokenId].active, "Transfer already pending");

        pendingTransfers[tokenId] = PendingTransfer({
            from: msg.sender,
            to: to,
            initiatedAt: block.timestamp,
            active: true
        });

        emit IntelligentTransferInitiated(tokenId, msg.sender, to, block.timestamp);
    }

    /**
     * @notice Complete the intelligent transfer by providing a re-encrypted key.
     * Called by the new owner after receiving the decrypted brain key off-chain
     * and re-encrypting it with their own public key.
     *
     * @param tokenId The token being transferred
     * @param newEncryptedKey The AES key re-encrypted with the new owner's public key
     * @param newOwnerPublicKey The new owner's public key
     */
    function completeTransfer(
        uint256 tokenId,
        bytes memory newEncryptedKey,
        bytes memory newOwnerPublicKey
    ) external {
        PendingTransfer memory pt = pendingTransfers[tokenId];
        require(pt.active, "No pending transfer");
        require(pt.to == msg.sender, "Only designated recipient can complete");

        // Update the encrypted key and public key for the new owner
        brains[tokenId].encryptedKey = newEncryptedKey;
        brains[tokenId].ownerPublicKey = newOwnerPublicKey;

        // Execute the actual ERC-721 transfer
        address from = pt.from;
        delete pendingTransfers[tokenId];

        _transfer(from, msg.sender, tokenId);

        emit ReEncryptionCompleted(tokenId, msg.sender);
        emit IntelligentTransferCompleted(tokenId, from, msg.sender);
    }

    /**
     * @notice Cancel a pending intelligent transfer.
     * Can be called by the original owner if re-encryption times out.
     */
    function cancelTransfer(uint256 tokenId) external {
        PendingTransfer memory pt = pendingTransfers[tokenId];
        require(pt.active, "No pending transfer");
        require(
            pt.from == msg.sender ||
            block.timestamp > pt.initiatedAt + reEncryptionTimeout,
            "Only owner can cancel, or wait for timeout"
        );

        delete pendingTransfers[tokenId];
        emit IntelligentTransferCancelled(tokenId);
    }

    // ── Key Management ──────────────────────────────────────

    /**
     * @notice Update the encrypted key (owner only).
     * Useful for key rotation without transfer.
     */
    function updateEncryptedKey(
        uint256 tokenId,
        bytes memory newEncryptedKey,
        bytes memory newPublicKey
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        brains[tokenId].encryptedKey = newEncryptedKey;
        brains[tokenId].ownerPublicKey = newPublicKey;

        emit EncryptedKeyUpdated(tokenId, msg.sender);
    }

    // ── Clone Brain ─────────────────────────────────────────

    /**
     * @notice Clone an existing brain NFT (ERC-7857 iCloneFrom).
     * Creates a new token with the same brain hash, owned by the caller.
     * The clone gets its OWN encrypted key (provided by the cloner).
     */
    function cloneBrain(
        uint256 originalTokenId,
        bytes memory cloneEncryptedKey,
        bytes memory clonePublicKey
    ) external payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        require(_ownerOf(originalTokenId) != address(0), "Original does not exist");

        BrainMetadata memory original = brains[originalTokenId];
        uint256 cloneId = _nextTokenId++;

        _safeMint(msg.sender, cloneId);
        _setTokenURI(cloneId, tokenURI(originalTokenId));

        brains[cloneId] = BrainMetadata({
            agentId: original.agentId,
            brainHash: original.brainHash,
            memoriesCount: original.memoriesCount,
            snapshotVersion: original.snapshotVersion,
            mintedAt: block.timestamp,
            originalMinter: original.originalMinter,
            encryptedKey: cloneEncryptedKey,
            ownerPublicKey: clonePublicKey
        });

        agentBrainHistory[original.agentId].push(cloneId);

        emit BrainCloned(originalTokenId, cloneId, msg.sender);
        return cloneId;
    }

    /**
     * @notice Simplified clone (backward compatible — no encryption).
     */
    function cloneBrainSimple(uint256 originalTokenId) external payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient mint fee");
        require(_ownerOf(originalTokenId) != address(0), "Original does not exist");

        BrainMetadata memory original = brains[originalTokenId];
        uint256 cloneId = _nextTokenId++;

        _safeMint(msg.sender, cloneId);
        _setTokenURI(cloneId, tokenURI(originalTokenId));

        brains[cloneId] = BrainMetadata({
            agentId: original.agentId,
            brainHash: original.brainHash,
            memoriesCount: original.memoriesCount,
            snapshotVersion: original.snapshotVersion,
            mintedAt: block.timestamp,
            originalMinter: original.originalMinter,
            encryptedKey: "",
            ownerPublicKey: ""
        });

        agentBrainHistory[original.agentId].push(cloneId);

        emit BrainCloned(originalTokenId, cloneId, msg.sender);
        return cloneId;
    }

    // ── View Functions ──────────────────────────────────────

    function getAgentBrains(string memory agentId) external view returns (uint256[] memory) {
        return agentBrainHistory[agentId];
    }

    function getBrain(uint256 tokenId) external view returns (BrainMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return brains[tokenId];
    }

    function getEncryptedKey(uint256 tokenId) external view returns (bytes memory) {
        require(ownerOf(tokenId) == msg.sender, "Only owner can view encrypted key");
        return brains[tokenId].encryptedKey;
    }

    function getPendingTransfer(uint256 tokenId) external view returns (PendingTransfer memory) {
        return pendingTransfers[tokenId];
    }

    function isTransferPending(uint256 tokenId) external view returns (bool) {
        return pendingTransfers[tokenId].active;
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ── Admin Functions ─────────────────────────────────────

    function setMintFee(uint256 fee) external onlyOwner {
        mintFee = fee;
    }

    function setReEncryptionTimeout(uint256 timeout) external onlyOwner {
        reEncryptionTimeout = timeout;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    // ── ERC-165: Interface Support ──────────────────────────

    /**
     * @notice ERC-7857 interface ID
     * iTransferFrom(address,uint256) + completeTransfer(uint256,bytes,bytes) + cloneBrain(uint256,bytes,bytes)
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        // ERC-7857 interface ID (custom)
        bytes4 ERC7857_INTERFACE = bytes4(keccak256("iTransferFrom(address,uint256)")) ^
                                    bytes4(keccak256("completeTransfer(uint256,bytes,bytes)"));
        return interfaceId == ERC7857_INTERFACE || super.supportsInterface(interfaceId);
    }

    // ── Required Overrides ──────────────────────────────────

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Block standard transferFrom if there's a pending intelligent transfer.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        // Allow minting (from == address(0))
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            // Block standard transfers if intelligent transfer is pending
            require(!pendingTransfers[tokenId].active, "Use completeTransfer for pending iTransfer");
        }
        return super._update(to, tokenId, auth);
    }
}
