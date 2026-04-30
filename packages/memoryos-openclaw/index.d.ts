export type MemoryType = "episodic" | "semantic" | "procedural";

export interface MemorySaveOptions {
  type?: MemoryType;
  tags?: string[];
  importance?: number;
  metadata?: Record<string, string>;
}

export interface MemoryListOptions {
  type?: MemoryType;
  limit?: number;
}

export interface PublishSkillInput {
  name: string;
  description: string;
  category?: string;
  prompt: string;
  inputLabel?: string;
  outputLabel?: string;
  price: string;
  publisherAddress?: string;
  publisherName?: string;
  publisherAgentId?: string;
  tags?: string[];
}

export interface MemoryOSPluginConfig {
  apiUrl: string;
  agentId: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

export interface MemoryOSAgentShape {
  memory?: Record<string, unknown>;
  skills?: Record<string, unknown>;
  identity?: Record<string, unknown>;
  memoryos?: MemoryOSClient;
}

export declare class MemoryOSClient {
  constructor(config: MemoryOSPluginConfig);
  readonly apiUrl: string;
  readonly agentId: string;
  readonly fetchImpl: typeof fetch;
  readonly headers: Record<string, string>;
  request(path: string, init?: RequestInit): Promise<any>;
  memory: {
    save(content: string, options?: MemorySaveOptions): Promise<any>;
    list(options?: MemoryListOptions): Promise<any>;
    get(memoryId: string): Promise<any>;
    search(query: string): Promise<any>;
    delete(memoryId: string): Promise<any>;
  };
  skills: {
    list(): Promise<any>;
    publish(skill: PublishSkillInput): Promise<any>;
    run(skillId: string, userInput: string): Promise<any>;
  };
  identity: {
    get(): Promise<any>;
    register(name?: string): Promise<any>;
  };
  rag: {
    ask(query: string): Promise<any>;
  };
}

export interface MemoryOSPluginInstance {
  name: "memoryos";
  config: MemoryOSPluginConfig;
  client: MemoryOSClient;
  memory: MemoryOSClient["memory"];
  skills: MemoryOSClient["skills"];
  identity: MemoryOSClient["identity"];
  rag: MemoryOSClient["rag"];
  attach<T extends MemoryOSAgentShape>(agent?: T): T & {
    memory: MemoryOSClient["memory"];
    skills: T["skills"] & MemoryOSClient["skills"];
    identity: MemoryOSClient["identity"];
    rag: MemoryOSClient["rag"];
    memoryos: MemoryOSClient;
  };
}

export declare function MemoryOSPlugin(config: MemoryOSPluginConfig): MemoryOSPluginInstance;

export default MemoryOSPlugin;
