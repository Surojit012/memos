export type MemoryType = "episodic" | "semantic" | "procedural";

export interface Memory {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  tags: string[];
  importance: number;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  storageHash?: string;
  embedding?: number[];
  embeddingModel?: string;
  metadata?: Record<string, string>;
}

export interface Skill {
  id: string; name: string; description: string; category: string;
  prompt: string; inputLabel: string; outputLabel: string; price: string;
  publisherAddress: string; publisherName: string; publisherAgentId: string;
  createdAt: number; usageCount: number; totalEarned: number;
  tags: string[]; storageHash?: string;
}

export interface AgentIdentity {
  agentId: string; name: string; createdAt: number; memoryCount: number;
  skillsPublished: number; totalReads: number; totalEarned: number;
  storageUsed: number; openClawConnected: boolean;
  identityHash?: string; ownerAddress?: string; apiKey?: string;
}

export interface SharedMemoryGrant {
  id: string; fromAgentId: string; toAgentId: string;
  memoryIds: string[]; sharedAt: number; expiresAt?: number;
  accessCount: number; revoked: boolean; message?: string;
}

export interface MemorySaveOptions {
  type?: MemoryType; tags?: string[]; importance?: number;
  metadata?: Record<string, string>;
}

export interface MemoryListOptions { type?: MemoryType; limit?: number; }

export interface PublishSkillInput {
  name: string; description: string; category?: string; prompt: string;
  inputLabel?: string; outputLabel?: string; price: string;
  publisherAddress?: string; publisherName?: string;
  publisherAgentId?: string; tags?: string[];
}

export interface PipelineStep { skillId: string; transform?: string; }
export interface SharingGrantOptions { message?: string; expiresIn?: number; }

// ── Response Types ──────────────────────────────────────────────

export interface MemorySaveResponse { memory: Memory; }
export interface MemoryListResponse { memories: Memory[]; count: number; }
export interface MemorySearchResponse { memories: Memory[]; count: number; searchMethod: string; }
export interface SkillListResponse { skills: Skill[]; }
export interface SkillPublishResponse { skill: Skill; }
export interface SkillExecutionResponse { output: string; model: string; tokensUsed: number; fee?: string; }
export interface IdentityResponse { agent: AgentIdentity; }
export interface RagResponse { answer: string; contextUsed: number; memories: Memory[]; }
export interface DreamResponse { consolidated: Array<{ fact: string; sources: string[] }>; decayed: Array<{ id: string }>; summary: string; }
export interface DreamHistoryResponse { dreams: Array<{ timestamp: number; summary: string }>; }
export interface SnapshotCreateResponse { snapshotHash: string; memoriesCount: number; explorerUrl: string; }
export interface SnapshotListResponse { snapshots: Array<{ hash: string; createdAt: number }>; }
export interface PipelineResponse { finalOutput: string; steps: Array<{ skillId: string; output: string }>; }
export interface SharingGrantResponse { grant: SharedMemoryGrant; }
export interface SharingListResponse { grants: SharedMemoryGrant[]; }
export interface InftMintResponse { tokenId: string; txHash: string; }
export interface InftListResponse { infts: Array<{ tokenId: string; metadataHash: string }>; }
export interface PlatformStatusResponse { configured: boolean; manifest: object; hydration: object; writeQueue: object; }

// ── Config ──────────────────────────────────────────────────────

export interface MemoryOSPluginConfig {
  apiUrl: string; agentId: string;
  fetch?: typeof fetch; headers?: Record<string, string>;
}

export interface MemoryOSAgentShape {
  memory?: Record<string, unknown>; skills?: Record<string, unknown>;
  identity?: Record<string, unknown>; memoryos?: MemoryOSClient;
}

// ── Client ──────────────────────────────────────────────────────

export declare class MemoryOSClient {
  constructor(config: MemoryOSPluginConfig);
  readonly apiUrl: string;
  readonly agentId: string;
  request(path: string, init?: RequestInit): Promise<unknown>;

  memory: {
    save(content: string, options?: MemorySaveOptions): Promise<MemorySaveResponse>;
    list(options?: MemoryListOptions): Promise<MemoryListResponse>;
    get(memoryId: string): Promise<MemorySaveResponse>;
    search(query: string): Promise<MemorySearchResponse>;
    delete(memoryId: string): Promise<{ deleted: boolean }>;
  };
  skills: {
    list(): Promise<SkillListResponse>;
    publish(skill: PublishSkillInput): Promise<SkillPublishResponse>;
    run(skillId: string, userInput: string, paymentProof?: object): Promise<SkillExecutionResponse>;
    pay(action: "prepare" | "verify", skillId: string, txHash?: string): Promise<object>;
  };
  identity: {
    get(): Promise<IdentityResponse>;
    register(name?: string): Promise<IdentityResponse>;
  };
  rag: { ask(query: string): Promise<RagResponse>; };
  dreams: {
    sleep(): Promise<DreamResponse>;
    history(): Promise<DreamHistoryResponse>;
  };
  snapshot: {
    create(): Promise<SnapshotCreateResponse>;
    list(): Promise<SnapshotListResponse>;
  };
  vault: {
    save(content: string, options?: MemorySaveOptions): Promise<MemorySaveResponse>;
    list(): Promise<MemoryListResponse>;
  };
  pipeline: { run(steps: PipelineStep[], initialInput: string): Promise<PipelineResponse>; };
  sharing: {
    grant(toAgentId: string, memoryIds: string[], options?: SharingGrantOptions): Promise<SharingGrantResponse>;
    list(): Promise<SharingListResponse>;
    revoke(grantId: string): Promise<{ revoked: boolean }>;
  };
  inft: {
    mint(): Promise<InftMintResponse>;
    list(): Promise<InftListResponse>;
  };
  status(): Promise<PlatformStatusResponse>;
  close(): void;
}

export interface MemoryOSPluginInstance {
  name: "memoryos"; config: MemoryOSPluginConfig; client: MemoryOSClient;
  memory: MemoryOSClient["memory"]; skills: MemoryOSClient["skills"];
  identity: MemoryOSClient["identity"]; rag: MemoryOSClient["rag"];
  dreams: MemoryOSClient["dreams"]; snapshot: MemoryOSClient["snapshot"];
  vault: MemoryOSClient["vault"]; pipeline: MemoryOSClient["pipeline"];
  sharing: MemoryOSClient["sharing"]; inft: MemoryOSClient["inft"];
  attach<T extends MemoryOSAgentShape>(agent?: T): T & {
    memory: MemoryOSClient["memory"]; skills: T["skills"] & MemoryOSClient["skills"];
    identity: MemoryOSClient["identity"]; rag: MemoryOSClient["rag"];
    dreams: MemoryOSClient["dreams"]; snapshot: MemoryOSClient["snapshot"];
    vault: MemoryOSClient["vault"]; pipeline: MemoryOSClient["pipeline"];
    sharing: MemoryOSClient["sharing"]; inft: MemoryOSClient["inft"];
    memoryos: MemoryOSClient;
  };
}

export declare function MemoryOSPlugin(config: MemoryOSPluginConfig): MemoryOSPluginInstance;
export default MemoryOSPlugin;
