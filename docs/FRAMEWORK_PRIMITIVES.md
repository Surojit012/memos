# memos Framework Primitives

memos V1 is the persistent brain for AI agents.

memos is a framework, not an application, not an agent orchestrator, and not a blockchain application. It owns an agent's long-term cognition.

Brain lifecycle:

Remember -> Reason -> Dream

The following primitives are the only framework primitives.

These primitives fit inside the memos architecture:

- Brain
- Runtime
- Modules
- Marketplace
- Economy
- Adapters
- 0G Infrastructure

---

## Agent

**Purpose**

The long-lived subject that accumulates identity, memory, reasoning traces, dreams, Modules, transactions, and ledger state over time.

**Responsibilities**

- Own its persistent brain.
- Bind runtime activity to a stable identity.
- Read and write memories.
- Invoke reasoners and dreams.
- Use Modules.
- Participate in marketplace transactions.

**Inputs**

- Agent identifier.
- Identity reference.
- Memory writes.
- Reasoning requests.
- Module calls.
- Transaction requests.

**Outputs**

- Updated memory state.
- Reasoned responses.
- Dream outputs.
- Module outputs.
- Transaction records.
- Ledger events.

**Relationships**

- Has one Identity.
- Owns many Memories.
- Uses Reasoners.
- Produces Dreams.
- Uses Modules.
- Interacts through the Marketplace.
- Creates Transactions.
- Accumulates Ledger entries.

**Ownership**

Owned by the wallet, account, or authority bound through Identity.

**Persistence Layer**

Agent state is reconstructed through memos Adapters from Identity on 0G Chain, Memory on 0G Storage, Module manifests on 0G Storage, transaction proofs on 0G Chain, and Ledger state inside memos.

**Examples**

- A support agent that remembers customer preferences.
- A research agent that builds durable topic knowledge.
- A coding agent that remembers repository conventions.

**Lifecycle**

Created with Identity, gains Memories, Reasons over them, Dreams to reorganize them, installs Modules through Module Installation, and participates in Marketplace and Economy through Module usage.

---

## Memory

**Purpose**

The durable knowledge unit of an agent's brain.

**Responsibilities**

- Store agent knowledge over time.
- Preserve context beyond runtime sessions.
- Support retrieval for reasoning.
- Carry type, importance, tags, timestamps, and storage proof.

**Inputs**

- Agent identifier.
- Content.
- Memory type.
- Metadata.
- Importance.
- Tags.

**Outputs**

- Memory record.
- Storage hash.
- Retrieval result.
- Updated access and lifecycle metadata.

**Relationships**

- Belongs to one Agent.
- Is anchored by Identity ownership.
- Is read by Reasoner.
- Is reorganized by Dream.
- May be created or transformed by Module outputs.

**Ownership**

Owned by the Agent that writes it.

**Persistence Layer**

0G Storage.

**Examples**

- "User prefers short technical answers."
- "The project uses Next.js App Router."
- "Escalate billing disputes to finance within two hours."

**Lifecycle**

Written during Remember, retrieved during Reason, consolidated during Dream, and used to support Module execution and economic accounting when relevant.

---

## Identity

**Purpose**

The stable, verifiable binding between an Agent and its owner.

**Responsibilities**

- Establish agent existence.
- Bind an agent to an owner.
- Provide the trust root for agent state.
- Reference the current persistent brain state.

**Inputs**

- Agent identifier.
- Agent name.
- Owner address or authority.
- Signature or authorization proof.
- Current state reference.

**Outputs**

- Registered identity.
- Ownership proof.
- Identity hash or state reference.
- Lookup record.

**Relationships**

- Defines ownership for one Agent.
- Authorizes Memory access.
- Authorizes Module Installation, Module execution, and Marketplace actions.
- Grounds Transaction validity.
- Supports Ledger attribution.

**Ownership**

Owned by the wallet, account, or authority that registered the Agent.

**Persistence Layer**

0G Chain.

**Examples**

- A wallet-bound support agent identity.
- A project-owned research agent identity.
- A developer-owned coding assistant identity.

**Lifecycle**

Registered before durable use, referenced by all persistent operations, updated when state references change, and used to recover the Agent across runtimes.

---

## Reasoner

**Purpose**

The compute primitive that turns memories and requests into context-aware outputs.

**Responsibilities**

- Retrieve relevant Memory context.
- Construct reasoning context.
- Execute inference.
- Return grounded outputs.
- Produce reasoning traces when required by the framework.

**Inputs**

- Agent identifier.
- User or system query.
- Retrieved memories.
- Reasoning configuration.
- Module context when applicable.

**Outputs**

- Answer or decision.
- Context used.
- Model or provider metadata.
- Optional trace.

**Relationships**

- Operates for an Agent.
- Reads Memories.
- May invoke Modules.
- May produce new Memories.
- May create Ledger entries for framework accounting.

**Ownership**

Owned by memos as the framework execution path; invoked on behalf of an Agent.

**Persistence Layer**

0G Compute.

**Examples**

- Answering a question from stored memories.
- Summarizing what an agent knows about a user.
- Deciding which remembered procedure applies to a task.

**Lifecycle**

Invoked during Reason, consumes current Memory state, produces an output, and may feed results back into Remember.

---

## Dream

**Purpose**

The background intelligence cycle that reorganizes an agent's memory over time.

**Responsibilities**

- Consolidate repeated or related memories.
- Extract durable facts from events.
- Reduce stale or low-value memory importance.
- Produce consolidated knowledge.

**Inputs**

- Agent identifier.
- Existing memories.
- Dream configuration.
- Time or trigger condition.

**Outputs**

- New semantic memories.
- Updated memory importance.
- Dream summary.
- Processing metadata.

**Relationships**

- Runs for an Agent.
- Reads and writes Memories.
- Uses Reasoner-like compute but remains a separate lifecycle primitive.
- Improves the Brain's structure for future Reason operations.

**Ownership**

Owned by the Agent's lifecycle and executed by memos.

**Persistence Layer**

0G Compute.

**Examples**

- Turning repeated support tickets into a durable policy memory.
- Extracting a user preference from multiple conversations.
- Lowering importance for old operational details.

**Lifecycle**

Triggered after Remember activity or on a schedule, processes Memory, writes improved Memory state, and prepares the Agent for stronger future Reasoning.

---

## Module

**Purpose**

An installable atomic capability that extends what an Agent can do without becoming part of the Agent itself.

**Responsibilities**

- Define a callable capability.
- Specify inputs and outputs.
- Provide execution instructions or metadata.
- Remain portable across agents.
- Do exactly one thing.

**Inputs**

- Module identifier.
- Module definition.
- Input schema or input description.
- Execution instructions.
- Publisher identity.

**Outputs**

- Module result.
- Module metadata.
- Storage hash.
- Optional memory-worthy result.

**Relationships**

- Used by Agents.
- Discovered through Marketplace.
- May be invoked by Reasoner.
- May produce Memories.
- May create Economy usage events when monetized.

**Ownership**

Owned by its publisher.

**Persistence Layer**

0G Storage through the Storage Adapter.

**Examples**

- A ticket classifier.
- A code review summarizer.
- A market brief generator.

**Lifecycle**

Published as a durable definition, discovered through Marketplace, installed through Module Installation, invoked atomically, and optionally priced through Economy.

---

## Marketplace

**Purpose**

The framework distribution surface for Modules.

**Responsibilities**

- Maintain the Module catalog.
- Expose module metadata.
- Track Publishers.
- Support Discovery.
- Track Usage Analytics.
- Connect Module usage to Transactions.
- Keep the framework boundary between capability discovery and agent execution.

**Inputs**

- Module metadata.
- Agent request.
- Search or selection parameters.
- Pricing or usage terms.

**Outputs**

- Module listings.
- Selected Module reference.
- Module Installation reference.
- Usage event.
- Transaction request when payment is required.

**Relationships**

- Indexes Modules.
- Serves Agents.
- Produces Transactions.
- Updates Ledger through successful usage.

**Ownership**

Owned by memos as a framework service.

**Persistence Layer**

memos catalog state, backed by Module manifests on 0G Storage and transaction proofs on 0G Chain through Adapters.

**Examples**

- Discovering a support classification module.
- Selecting a paid code review module.
- Listing modules published by an agent owner.

**Lifecycle**

Receives Module publications, exposes Modules for Discovery, records Module Installation, tracks usage, creates transaction proof requests for paid execution, and informs Ledger state.

---

## Transaction

**Purpose**

The verifiable economic event created when a paid Module execution occurs.

**Responsibilities**

- Record paid Module usage.
- Bind payer, recipient, amount, and module reference.
- Provide verification for framework accounting.
- Prevent duplicate settlement of the same usage event.

**Inputs**

- Payer identity.
- Recipient identity.
- Module identifier.
- Amount.
- Execution or usage reference.

**Outputs**

- Transaction hash.
- Verification result.
- Settlement metadata.
- Ledger event.

**Relationships**

- Created through Marketplace.
- References Agent and Module.
- Updates Ledger.
- May be associated with Reasoner or Module execution output.

**Ownership**

Owned by the participating economic actors and verified by memos.

**Persistence Layer**

0G Chain through the Chain Adapter.

**Examples**

- Paying to run a published module.
- Recording a module execution fee.
- Verifying that an agent has paid for a module.

**Lifecycle**

Prepared by Economy, submitted to 0G Chain through the Chain Adapter, verified by memos, consumed once for the intended operation, and reflected in Ledger.

---

## Ledger

**Purpose**

The memos accounting view of framework usage over time.

**Responsibilities**

- Track framework-level usage.
- Record memory, reasoning, Module, Marketplace, and transaction events.
- Provide attribution for agent growth and monetization.
- Support operational observability.

**Inputs**

- Agent events.
- Memory events.
- Reasoner events.
- Dream events.
- Module events.
- Transaction verification events.

**Outputs**

- Agent activity history.
- Usage totals.
- Usage and billing summaries.
- Framework accounting records.

**Relationships**

- Belongs to memos.
- References Agents, Memories, Reasoners, Dreams, Modules, Marketplace activity, and Transactions.
- Does not replace source-of-truth persistence layers.

**Ownership**

Owned by memos.

**Persistence Layer**

memos.

**Examples**

- Total memories written by an agent.
- Module executions over time.
- Verified transaction totals.
- Dream cycles completed.

**Lifecycle**

Receives events from the full lifecycle, records framework accounting, exposes summaries, and supports the Agent's long-term growth and monetization history.
