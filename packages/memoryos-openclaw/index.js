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

  /**
   * Memory API: Write, read, and delete Agent memories.
   */
  memory = {
    /**
     * Save a new memory
     * @param {string} content - The memory content
     * @param {Object} [options] - Optional settings
     * @param {'episodic'|'semantic'|'procedural'} [options.type] - The type of memory
     * @param {string[]} [options.tags] - Array of tags
     * @param {number} [options.importance] - 1 to 5 scale
     * @returns {Promise<Object>} The saved memory
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

    get: async (memoryId) => {
      return this.request(`/api/memory/${memoryId}`, {
        method: "GET",
      });
    },

    /**
     * Search memories semantically using 0G Compute embeddings
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

    delete: async (memoryId) => {
      return this.request(`/api/memory/${memoryId}?agentId=${encodeURIComponent(this.agentId)}`, {
        method: "DELETE",
      });
    },
  };

  /**
   * Skills API: Access and execute skills on the marketplace
   */
  skills = {
    list: async () => {
      return this.request("/api/skills", {
        method: "GET",
      });
    },

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
     * Run a skill
     * @param {string} skillId - The skill ID
     * @param {string} userInput - The input for the skill
     * @param {Object} [paymentProof] - Optional proof from the /api/pay verification
     * @returns {Promise<Object>} The execution result
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
     * Prepare a payment or verify an on-chain payment for a paid skill
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
    }
  };

  /**
   * Identity API: Manage your agent identity on 0G
   */
  identity = {
    get: async () => {
      return this.request(`/api/identity?agentId=${encodeURIComponent(this.agentId)}`, {
        method: "GET",
      });
    },

    register: async (name) => {
      return this.request("/api/identity", {
        method: "POST",
        body: JSON.stringify({
          agentId: this.agentId,
          name,
        }),
      });
    },
  };
  
  /**
   * RAG API: Context-augmented generative responses
   */
  rag = {
    ask: async (query) => {
      return this.request("/api/rag", {
        method: "POST",
        body: JSON.stringify({
          agentId: this.agentId,
          query,
        }),
      });
    }
  };
  
  /**
   * Status API: Get the 0G network status and MemoryOS stats
   */
  status = async () => {
    return this.request("/api/status", { method: "GET" });
  };
}

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
        memoryos: client,
      };
    },
  };
}

export default MemoryOSPlugin;
