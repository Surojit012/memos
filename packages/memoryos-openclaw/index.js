function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function createFetchHeaders(extraHeaders) {
  return {
    "Content-Type": "application/json",
    ...(extraHeaders || {}),
  };
}

export class MemoryOSClient {
  constructor(config) {
    if (!config || !config.apiUrl || !config.agentId) {
      throw new Error("MemoryOSClient requires apiUrl and agentId");
    }

    if (!config.fetch && typeof fetch !== "function") {
      throw new Error("No fetch implementation available. Pass config.fetch explicitly.");
    }

    this.apiUrl = trimTrailingSlash(config.apiUrl);
    this.agentId = config.agentId;
    this.fetchImpl = config.fetch || fetch;
    this.headers = config.headers || {};
  }

  async request(path, init = {}) {
    const response = await this.fetchImpl(`${this.apiUrl}${path}`, {
      ...init,
      headers: createFetchHeaders({
        ...this.headers,
        ...(init.headers || {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `MemoryOS request failed: ${response.status}`);
    }

    return data;
  }

  // ── Memory API ────────────────────────────────────────────────

  /**
   * Memory API: Write, read, search, and delete Agent memories.
   */
  memory = {
    /**
     * Save a new memory to 0G Storage.
     * @param {string} content - The memory content
     * @param {Object} [options] - Optional settings
     * @param {'episodic'|'semantic'|'procedural'} [options.type] - The type of memory
     * @param {string[]} [options.tags] - Array of tags
     * @param {number} [options.importance] - 1 to 5 scale
     * @param {Record<string,string>} [options.metadata] - Arbitrary metadata
     * @returns {Promise<{memory: Object}>} The saved memory
     */
    save: async (content, options = {}) => {
      return this.request("/api/memory", {
        method: "POST",
        body: JSON.stringify({
          agentId: this.agentId,
          content,
          type: options.type || "semantic",
          tags: options.tags || [],
          importance: options.importance || 3,
          metadata: options.metadata,
        }),
      });
    },

    /**
     * List memories for this agent.
     * @param {Object} [options]
     * @param {'episodic'|'semantic'|'procedural'} [options.type] - Filter by type
     * @param {number} [options.limit] - Max results (default 20)
     * @returns {Promise<{memories: Array, count: number}>}
     */
    list: async (options = {}) => {
      const params = new URLSearchParams({
        agentId: this.agentId,
      });

      if (options.type) params.set("type", options.type);
      if (typeof options.limit === "number") params.set("limit", String(options.limit));

      return this.request(`/api/memory?${params.toString()}`, {
        method: "GET",
      });
    },

    /**
     * Get a specific memory by ID.
     * @param {string} memoryId
     * @returns {Promise<{memory: Object}>}
     */
    get: async (memoryId) => {
      return this.request(`/api/memory/${encodeURIComponent(memoryId)}`, {
        method: "GET",
      });
    },

    /**
     * Search memories semantically using 0G Compute embeddings.
     * @param {string} query - The search string
     * @returns {Promise<{memories: Array, count: number, searchMethod: string}>}
     */
    search: async (query) => {
      return this.request("/api/search", {
        method: "POST",
        body: JSON.stringify({
          agentId: this.agentId,
          query,
        }),
      });
    },

    /**
     * Delete a memory by ID.
     * @param {string} memoryId
     * @returns {Promise<{deleted: boolean}>}
     */
    delete: async (memoryId) => {
      return this.request(`/api/memory/${encodeURIComponent(memoryId)}?agentId=${encodeURIComponent(this.agentId)}`, {
        method: "DELETE",
      });
    },
  };

  // ── Skills API ────────────────────────────────────────────────

  /**
   * Skills API: Access and execute skills on the marketplace.
   */
  skills = {
    /**
     * List all skills on the marketplace.
     * @returns {Promise<{skills: Array}>}
     */
    list: async () => {
      return this.request("/api/skills", {
        method: "GET",
      });
    },

    /**
     * Publish a new skill.
     * @param {Object} skill - The skill definition
     * @returns {Promise<{skill: Object}>}
     */
    publish: async (skill) => {
      return this.request("/api/skills", {
        method: "POST",
        body: JSON.stringify({
          ...skill,
          publisherAgentId: skill.publisherAgentId || this.agentId,
        }),
      });
    },

    /**
     * Run a skill.
     * @param {string} skillId - The skill ID
     * @param {string} userInput - The input for the skill
     * @param {Object} [paymentProof] - Optional proof from the /api/pay verification
     * @returns {Promise<{output: string, model: string, tokensUsed: number}>}
     */
    run: async (skillId, userInput, paymentProof) => {
      return this.request("/api/execute", {
        method: "POST",
        body: JSON.stringify({
          skillId,
          userInput,
          paymentProof,
        }),
      });
    },

    /**
     * Prepare a payment or verify an on-chain payment for a paid skill.
     * @param {'prepare' | 'verify'} action
     * @param {string} skillId
     * @param {string} [txHash] - Required when action is 'verify'
     * @returns {Promise<Object>}
     */
    pay: async (action, skillId, txHash) => {
      return this.request("/api/pay", {
        method: "POST",
        body: JSON.stringify({
          action,
          skillId,
          txHash,
        }),
      });
    },
  };

  // ── Identity API ──────────────────────────────────────────────

  /**
   * Identity API: Manage your agent identity on 0G.
   */
  identity = {
    /**
     * Get this agent's identity from 0G.
     * @returns {Promise<{agent: Object}>}
     */
    get: async () => {
      return this.request(`/api/identity?agentId=${encodeURIComponent(this.agentId)}`, {
        method: "GET",
      });
    },

    /**
     * Register a new agent identity on 0G.
     * @param {string} [name] - Display name (defaults to agentId)
     * @returns {Promise<{agent: Object}>}
     */
    register: async (name) => {
      return this.request("/api/identity", {
        method: "POST",
        body: JSON.stringify({
          agentId: this.agentId,
          name: name || this.agentId,
        }),
      });
    },
  };

  // ── RAG API ───────────────────────────────────────────────────

  /**
   * RAG API: Context-augmented generative responses from agent memories.
   */
  rag = {
    /**
     * Perform Contextual RAG over the agent's 0G memories.
     * @param {string} query
     * @returns {Promise<{answer: string, contextUsed: number, memories: Array}>}
     */
    ask: async (query) => {
      return this.request("/api/rag", {
        method: "POST",
        body: JSON.stringify({
          agentId: this.agentId,
          query,
        }),
      });
    },
  };

  // ── Dreams API ────────────────────────────────────────────────

  /**
   * Dreams API: Trigger and read agent memory consolidation cycles.
   */
  dreams = {
    /**
     * Trigger a "dream cycle" — consolidates episodic memories into
     * semantic patterns, runs importance decay, and uploads results to 0G.
     * @returns {Promise<{consolidated: Array, decayed: Array, summary: string}>}
     */
    sleep: async () => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/dreams`, {
        method: "POST",
      });
    },

    /**
     * Get the dream cycle history for this agent.
     * @returns {Promise<{dreams: Array}>}
     */
    history: async () => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/dreams`, {
        method: "GET",
      });
    },
  };

  // ── Snapshot API ──────────────────────────────────────────────

  /**
   * Snapshot API: Full brain snapshots stored on 0G Storage.
   */
  snapshot = {
    /**
     * Take a full brain snapshot of this agent (all memories bundled into one 0G blob).
     * @returns {Promise<{snapshotHash: string, memoriesCount: number, explorerUrl: string}>}
     */
    create: async () => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/snapshot`, {
        method: "POST",
      });
    },

    /**
     * List all brain snapshots for this agent.
     * @returns {Promise<{snapshots: Array}>}
     */
    list: async () => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/snapshot`, {
        method: "GET",
      });
    },
  };

  // ── Vault API ─────────────────────────────────────────────────

  /**
   * Vault API: AES-256-GCM encrypted memories on 0G Storage.
   * Only the owning wallet can decrypt.
   */
  vault = {
    /**
     * Save an encrypted memory to the vault.
     * @param {string} content - Plaintext content (encrypted before upload)
     * @param {Object} [options]
     * @param {'episodic'|'semantic'|'procedural'} [options.type]
     * @param {string[]} [options.tags]
     * @param {number} [options.importance]
     * @returns {Promise<{memory: Object}>}
     */
    save: async (content, options = {}) => {
      return this.request("/api/memory/encrypted", {
        method: "POST",
        body: JSON.stringify({
          agentId: this.agentId,
          content,
          type: options.type || "semantic",
          tags: options.tags || [],
          importance: options.importance || 3,
        }),
      });
    },

    /**
     * List all encrypted vault memories for this agent.
     * @returns {Promise<{memories: Array}>}
     */
    list: async () => {
      return this.request(`/api/memory/encrypted?agentId=${encodeURIComponent(this.agentId)}`, {
        method: "GET",
      });
    },
  };

  // ── Pipeline API ──────────────────────────────────────────────

  /**
   * Pipeline API: Chain multiple skills into a multi-step execution pipeline.
   */
  pipeline = {
    /**
     * Execute a multi-skill pipeline.
     * @param {Array<{skillId: string, transform?: string}>} steps - Pipeline steps
     * @param {string} initialInput - Starting input for the first skill
     * @returns {Promise<{finalOutput: string, steps: Array}>}
     */
    run: async (steps, initialInput) => {
      return this.request("/api/pipeline", {
        method: "POST",
        body: JSON.stringify({
          steps,
          initialInput,
          agentId: this.agentId,
        }),
      });
    },
  };

  // ── Sharing API ───────────────────────────────────────────────

  /**
   * Sharing API: Cross-agent (A2A) memory sharing with revocation.
   */
  sharing = {
    /**
     * Grant memory access to another agent.
     * @param {string} toAgentId - Recipient agent ID
     * @param {string[]} memoryIds - Which memories to share
     * @param {Object} [options]
     * @param {string} [options.message] - Optional message to recipient
     * @param {number} [options.expiresIn] - TTL in milliseconds
     * @returns {Promise<{grant: Object}>}
     */
    grant: async (toAgentId, memoryIds, options = {}) => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/share`, {
        method: "POST",
        body: JSON.stringify({
          toAgentId,
          memoryIds,
          message: options.message,
          expiresIn: options.expiresIn,
        }),
      });
    },

    /**
     * List all sharing grants for this agent (both sent and received).
     * @returns {Promise<{grants: Array}>}
     */
    list: async () => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/share`, {
        method: "GET",
      });
    },

    /**
     * Revoke a previously granted memory share.
     * @param {string} grantId - The grant ID to revoke
     * @returns {Promise<{revoked: boolean}>}
     */
    revoke: async (grantId) => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/share?grantId=${encodeURIComponent(grantId)}`, {
        method: "DELETE",
      });
    },
  };

  // ── INFT API ──────────────────────────────────────────────────

  /**
   * INFT API: ERC-7857 Agent Brain intelligent NFTs.
   */
  inft = {
    /**
     * Mint a new Agent Brain INFT from this agent's current state.
     * @returns {Promise<{tokenId: string, txHash: string}>}
     */
    mint: async () => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/mint-inft`, {
        method: "POST",
      });
    },

    /**
     * List INFTs minted by this agent.
     * @returns {Promise<{infts: Array}>}
     */
    list: async () => {
      return this.request(`/api/agent/${encodeURIComponent(this.agentId)}/mint-inft`, {
        method: "GET",
      });
    },
  };

  // ── Status API ────────────────────────────────────────────────

  /**
   * Get the MemoryOS platform status (0G connectivity, manifest, stats).
   * @returns {Promise<{configured: boolean, manifest: Object, hydration: Object, writeQueue: Object}>}
   */
  status = async () => {
    return this.request("/api/status", { method: "GET" });
  };

  // ── Cleanup ───────────────────────────────────────────────────

  /**
   * Release any resources held by the client.
   * Currently a no-op for fetch-based clients, but present for API consistency
   * with the Python SDK and future connection pooling.
   */
  close = () => {
    // No persistent connections in fetch-based client
  };
}

// ── Plugin Factory ──────────────────────────────────────────────

export function MemoryOSPlugin(config) {
  const client = new MemoryOSClient(config);

  return {
    name: "memoryos",
    config,
    client,
    memory: client.memory,
    skills: client.skills,
    identity: client.identity,
    rag: client.rag,
    dreams: client.dreams,
    snapshot: client.snapshot,
    vault: client.vault,
    pipeline: client.pipeline,
    sharing: client.sharing,
    inft: client.inft,
    attach(agent = {}) {
      const mergedSkills = {
        ...(agent.skills || {}),
        list: client.skills.list,
        publish: client.skills.publish,
        run: client.skills.run,
      };

      return {
        ...agent,
        memory: client.memory,
        skills: mergedSkills,
        identity: client.identity,
        rag: client.rag,
        dreams: client.dreams,
        snapshot: client.snapshot,
        vault: client.vault,
        pipeline: client.pipeline,
        sharing: client.sharing,
        inft: client.inft,
        memoryos: client,
      };
    },
  };
}

export default MemoryOSPlugin;
