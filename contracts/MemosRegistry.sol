// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MemosRegistry
 * @notice Per-agent on-chain registry for Memos.
 *
 * Each agent is registered individually with a single transaction (~10s on 0G Galileo).
 * Reads are free view calls. This replaces the broken single-manifest-hash system
 * where a single failed upload would lose all new agent data.
 *
 * Architecture:
 *   registerAgent()    → one tx per agent (owner-only)
 *   updateAgentHash()  → update 0G storage hash after identity upload
 *   getAgentsByOwner() → free view, returns all agents for a wallet
 *   getAgent()         → free view, lookup by agentId
 */
contract MemosRegistry {

    struct AgentRecord {
        string agentId;
        string name;
        string storageHash;   // 0G Storage root hash for identity proof
        address owner;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // ── Storage ──────────────────────────────────────────────────

    /// @dev agentId → AgentRecord
    mapping(bytes32 => AgentRecord) private _agents;

    /// @dev owner address → list of agentId hashes
    mapping(address => bytes32[]) private _ownerAgentKeys;

    /// @dev agentId hash → owner address (for ownership checks)
    mapping(bytes32 => address) private _agentOwner;

    /// @dev Array of all agentIds for global iteration
    string[] private _allAgentIds;

    /// @dev Total number of registered agents
    uint256 public totalAgents;

    // ── Events ───────────────────────────────────────────────────

    event AgentRegistered(
        address indexed owner,
        string agentId,
        string name,
        uint256 timestamp
    );

    event AgentHashUpdated(
        address indexed owner,
        string agentId,
        string storageHash,
        uint256 timestamp
    );

    // ── Write Functions ──────────────────────────────────────────

    /**
     * @notice Register a new agent. Only callable once per agentId.
     * @param agentId   Unique agent identifier (e.g. "agent_c8306452")
     * @param name      Human-readable name (e.g. "Customer Support Bot")
     */
    function registerAgent(
        string calldata agentId,
        string calldata name
    ) external {
        bytes32 key = keccak256(abi.encodePacked(agentId));
        require(!_agents[key].exists, "Agent already registered");

        _agents[key] = AgentRecord({
            agentId: agentId,
            name: name,
            storageHash: "",
            owner: msg.sender,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        _ownerAgentKeys[msg.sender].push(key);
        _agentOwner[key] = msg.sender;
        _allAgentIds.push(agentId);
        totalAgents++;

        emit AgentRegistered(msg.sender, agentId, name, block.timestamp);
    }

    /**
     * @notice Update the 0G storage hash for an agent's identity proof.
     *         Only the agent's owner can call this.
     * @param agentId     The agent to update
     * @param storageHash The 0G Storage root hash
     */
    function updateAgentHash(
        string calldata agentId,
        string calldata storageHash
    ) external {
        bytes32 key = keccak256(abi.encodePacked(agentId));
        require(_agents[key].exists, "Agent not found");
        require(_agentOwner[key] == msg.sender, "Not the agent owner");

        _agents[key].storageHash = storageHash;
        _agents[key].updatedAt = block.timestamp;

        emit AgentHashUpdated(msg.sender, agentId, storageHash, block.timestamp);
    }

    // ── View Functions (FREE — no gas) ───────────────────────────

    /**
     * @notice Get a single agent by its agentId.
     */
    function getAgent(string calldata agentId)
        external
        view
        returns (AgentRecord memory)
    {
        bytes32 key = keccak256(abi.encodePacked(agentId));
        require(_agents[key].exists, "Agent not found");
        return _agents[key];
    }

    /**
     * @notice Check if an agent exists.
     */
    function agentExists(string calldata agentId)
        external
        view
        returns (bool)
    {
        bytes32 key = keccak256(abi.encodePacked(agentId));
        return _agents[key].exists;
    }

    /**
     * @notice Get the owner of an agent.
     */
    function getAgentOwner(string calldata agentId)
        external
        view
        returns (address)
    {
        bytes32 key = keccak256(abi.encodePacked(agentId));
        require(_agents[key].exists, "Agent not found");
        return _agentOwner[key];
    }

    /**
     * @notice Get ALL agents owned by a specific wallet address.
     *         This is the primary dashboard query.
     */
    function getAgentsByOwner(address owner)
        external
        view
        returns (AgentRecord[] memory)
    {
        bytes32[] storage keys = _ownerAgentKeys[owner];
        AgentRecord[] memory result = new AgentRecord[](keys.length);

        for (uint256 i = 0; i < keys.length; i++) {
            result[i] = _agents[keys[i]];
        }

        return result;
    }

    /**
     * @notice Get the number of agents owned by a wallet.
     */
    function getAgentCount(address owner)
        external
        view
        returns (uint256)
    {
        return _ownerAgentKeys[owner].length;
    }

    /**
     * @notice Get all registered agentIds. Used for platform stats and global indexing.
     */
    function getAllAgentIds()
        external
        view
        returns (string[] memory)
    {
        return _allAgentIds;
    }
}
