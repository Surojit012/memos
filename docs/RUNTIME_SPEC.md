# memos Runtime Spec

memos is the primary framework for persistent AI agents.

The Runtime layer executes LangGraph Graphs without owning long-term cognition. memos Brain remains mandatory and owns:

- Memory
- Remember
- Reason
- Dream

LangGraph is optional and may be used only as an execution runtime. memos must never become a LangGraph wrapper.

The Runtime layer consists of these components only:

- LangGraph Runtime
- LangGraph Checkpointer
- Thread Manager
- Graph Builder
- Execution Context
- Installer
- Module Loader

---

## LangGraph Runtime

**Purpose**

Execute LangGraph Graphs when a memos Agent needs structured runtime execution.

**Responsibilities**

- Run LangGraph Graphs.
- Manage execution transitions inside a LangGraph Graph.
- Support pauses, resumes, and step-level execution state.
- Delegate cognition to memos Brain.
- Keep runtime execution separate from persistent Brain ownership.

**Inputs**

- LangGraph Graph definition from Graph Builder.
- Execution Context.
- Thread identifier.
- User or system input.
- Runtime configuration.

**Outputs**

- LangGraph Graph execution result.
- Runtime state updates.
- Resume requests.
- Checkpoint requests.
- Errors for memos to handle.

**Ownership**

LangGraph owns execution state, thread state, resume lifecycle, and checkpoint lifecycle while the graph is running. memos owns the Agent, Brain state, Adapters, Module Installation, and final persistence policy.

**Failure Handling**

- Runtime errors are returned to memos with thread and checkpoint context.
- Partial execution state is checkpointed when possible.
- Failed runs may resume from the last valid checkpoint.
- Brain operations fail closed: memos decides whether Memory, Reason, or Dream updates are committed.

**Persistence Strategy**

Runtime does not persist directly to 0G. It emits checkpoint data through the LangGraph Checkpointer, which is owned by memos and persists checkpoints through the Storage Adapter.

**Interaction With Brain**

- Calls memos Reason for cognition.
- Reads and writes Memory only through memos Brain APIs.
- Does not implement Remember, Reason, or Dream.
- May request Brain operations, but memos owns execution and persistence of those lifecycle steps.

**Interaction With 0G**

No direct 0G access. All 0G reads and writes go through memos Adapters.

**Lifecycle**

Created for a run, receives an Execution Context, executes a LangGraph Graph, requests checkpoints during execution, returns output or resume state, and exits without owning long-term Agent state.

**Examples**

- A support flow that classifies a ticket, reasons over prior memory, and drafts a response.
- A research flow that gathers inputs, reasons over stored knowledge, and writes a summary memory.
- A coding flow that checks repository context and produces a review response.

---

## LangGraph Checkpointer

**Purpose**

Persist and restore LangGraph execution checkpoints without giving LangGraph direct access to 0G.

**Responsibilities**

- Capture graph checkpoint state.
- Restore checkpoint state for resume.
- Associate checkpoints with Agents and threads.
- Hand off checkpoint persistence to the Storage Adapter.
- Preserve memos ownership over checkpoint storage.

**Inputs**

- Agent identifier.
- Thread identifier.
- Runtime checkpoint payload.
- Execution metadata.
- Checkpoint version.

**Outputs**

- Checkpoint reference.
- Restored checkpoint payload.
- Checkpoint persistence status.
- Checkpoint error metadata.

**Ownership**

Checkpoint ownership remains inside memos. LangGraph may produce and consume checkpoint payloads, but memos owns where, when, and how checkpoints are stored.

**Failure Handling**

- If local checkpoint capture fails, the run fails with a recoverable runtime error.
- If 0G persistence fails, memos may keep the checkpoint pending and retry through the Storage Adapter.
- Resume uses the latest valid checkpoint known to memos.
- Corrupt or incompatible checkpoints are rejected and not passed back into LangGraph.

**Persistence Strategy**

All checkpoints eventually persist to 0G Storage through the Storage Adapter.

**Interaction With Brain**

- Checkpoints reference Brain state but do not replace it.
- Memory, Reason, and Dream outputs are committed by memos separately from runtime checkpoint payloads.
- A restored checkpoint must reconcile with current Brain state through memos.

**Interaction With 0G**

Never directly accesses 0G. It uses memos checkpoint persistence through the Storage Adapter.

**Lifecycle**

Created with a runtime run, receives checkpoint writes during execution, stores checkpoint references under the owning thread, restores checkpoints for resume, and expires or archives checkpoints according to memos policy.

**Examples**

- Saving state before a human approval step.
- Resuming after a tool call timeout.
- Restoring a multi-step agent run after process restart.

---

## Thread Manager

**Purpose**

Track runtime conversation or execution threads for an Agent.

**Responsibilities**

- Create thread identifiers.
- Map threads to Agents.
- Track active, paused, resumed, completed, and failed thread states.
- Provide thread context to LangGraph Runtime.
- Connect threads to checkpoints.

**Inputs**

- Agent identifier.
- User or system request.
- Existing thread identifier.
- Runtime status updates.
- Checkpoint references.

**Outputs**

- Thread identifier.
- Thread state.
- Resume target.
- Thread metadata.
- Completion or failure status.

**Ownership**

LangGraph owns thread state during graph execution. memos owns thread identity, authorization, checkpoint references, and long-term thread records.

**Failure Handling**

- Missing thread identifiers create new threads only when allowed by memos.
- Invalid thread ownership fails authorization.
- Failed runtime threads are marked failed with recoverable checkpoint references when available.
- Resume attempts without a valid checkpoint fail safely.

**Persistence Strategy**

Thread metadata is owned by memos. Durable thread recovery depends on checkpoint references that persist through the Storage Adapter.

**Interaction With Brain**

- Supplies thread context to Reason.
- Does not own Memory.
- Does not summarize or consolidate the Brain by itself.
- May request that memos write thread outcomes as Memories when appropriate.

**Interaction With 0G**

No direct 0G access. Thread checkpoint references and durable state are persisted through memos Adapters.

**Lifecycle**

Thread is created, passed into runtime execution, updated as the graph progresses, linked to checkpoints, completed or paused, and later resumed or archived by memos.

**Examples**

- A single chat session for a support Agent.
- A long-running research task with pauses.
- A multi-step graph awaiting external approval.

---

## Graph Builder

**Purpose**

Build LangGraph Graphs from memos-approved runtime definitions.

**Responsibilities**

- Assemble LangGraph Graphs.
- Bind graph nodes to memos Brain operations.
- Keep graph structure separate from Brain ownership.
- Validate that graphs do not bypass memos Adapters.
- Produce graph definitions for LangGraph Runtime.

**Inputs**

- Agent capability requirements.
- Runtime flow definition.
- memos Brain operation references.
- Module references when needed.
- Runtime configuration.

**Outputs**

- LangGraph Graph.
- Graph metadata.
- Validation result.
- Runtime configuration.

**Ownership**

memos owns graph construction policy. LangGraph owns execution after a valid LangGraph Graph is handed to the runtime.

**Failure Handling**

- Invalid graph definitions are rejected before runtime execution.
- Nodes that attempt direct 0G access are rejected.
- Missing Brain operations fail graph construction.
- Unsupported runtime patterns are not converted into custom orchestration.

**Persistence Strategy**

Graph definitions may be stored as memos runtime metadata when needed. Runtime checkpoints are handled by the LangGraph Checkpointer and persist through the Storage Adapter.

**Interaction With Brain**

- Maps graph nodes to Remember, Reason, and Dream operations.
- Does not implement those operations.
- Ensures cognition remains inside memos Brain.

**Interaction With 0G**

No direct 0G access. Graph nodes use memos Adapters when storage, compute, marketplace, or economy operations are required.

**Lifecycle**

Receives a runtime flow requirement, validates it against memos rules, builds a LangGraph Graph, hands it to LangGraph Runtime, and remains outside execution state.

**Examples**

- A graph with input, memory retrieval, reasoning, response, and memory write nodes.
- A graph that pauses for approval before committing a memory.
- A graph that invokes a Module through memos Marketplace and records usage through memos Economy.

---

## Execution Context

**Purpose**

Provide Runtime with the minimum required context to execute on behalf of a memos Agent.

**Responsibilities**

- Carry Agent identity.
- Carry thread identity.
- Carry authorization context.
- Carry runtime configuration.
- Carry Brain access handles through memos.
- Prevent runtime components from owning cognition or infrastructure adapters.

**Inputs**

- Agent identifier.
- Identity proof or authorization result.
- Thread identifier.
- User or system input.
- Runtime options.
- memos Brain interface.

**Outputs**

- Context available to graph execution.
- Authorized Brain operation calls.
- Runtime metadata.
- Final execution envelope.

**Ownership**

Owned by memos. LangGraph Runtime receives it for execution but does not own or persist it directly.

**Failure Handling**

- Missing Agent identity fails before runtime execution.
- Unauthorized context fails before Brain access.
- Invalid thread context fails before resume.
- Expired or incompatible context requires memos to create a new Execution Context.

**Persistence Strategy**

Execution Context is runtime-scoped. Durable state is persisted through Memory, Ledger records, and checkpoints. Checkpoints persist through the Storage Adapter.

**Interaction With Brain**

- Provides authorized access to Remember, Reason, and Dream.
- Carries enough context for Brain operations to attribute outputs to the correct Agent and thread.
- Does not store Brain state itself.

**Interaction With 0G**

No direct 0G access. It exposes memos Adapters to runtime components when 0G-backed operations are needed.

**Lifecycle**

Created before runtime execution, passed into LangGraph Runtime, used by graph nodes to call memos Brain and Adapters, included in checkpoint metadata as needed, and discarded after execution completes.

**Examples**

- Context for a user chat turn.
- Context for resuming a paused graph.
- Context for a Module execution that must write a memory after completion.

---

## Installer

**Purpose**

Install Modules for an Agent without giving Runtime ownership of memory or agent state.

**Responsibilities**

- Install a selected Module for an Agent.
- Validate Module metadata.
- Record installation state through memos.
- Coordinate with Module Loader for execution readiness.
- Keep Module Installation separate from Marketplace discovery.

**Inputs**

- Agent identifier.
- Module reference.
- Installation request.
- Authorization context.

**Outputs**

- Installation record.
- Installation status.
- Module Loader reference.
- Errors for invalid or unauthorized installation.

**Ownership**

memos owns Module Installation. Runtime owns the Installer component as execution-layer machinery, but it does not own Marketplace catalog, Agent memory, or Module business rules.

**Failure Handling**

- Invalid Module manifests are rejected.
- Unauthorized installation fails before state is recorded.
- Failed installation does not mutate Agent memory.
- Retriable persistence failures are handled through memos Adapters.

**Persistence Strategy**

Installation records are memos state. Module manifests persist to 0G Storage through the Storage Adapter.

**Interaction With Brain**

- May make a Module available to Reason.
- Does not write Memory directly unless Brain explicitly records installation context.
- Does not alter Dream behavior without Brain policy.

**Interaction With 0G**

No direct 0G access. Uses Storage Adapter for Module manifest reads and installation persistence.

**Lifecycle**

Receives an installation request, validates the Module, records installation, prepares the Module Loader, and returns installation status.

**Examples**

- Installing a ticket classifier Module.
- Installing a code review summarizer Module.
- Installing a document parser Module.

---

## Module Loader

**Purpose**

Load installed Modules for execution without making Modules part of Runtime state.

**Responsibilities**

- Resolve installed Module references.
- Load Module metadata and handler entrypoint.
- Validate input and output boundaries.
- Provide callable Module handles to LangGraph Graph nodes.
- Prevent direct 0G access from Module execution.

**Inputs**

- Agent identifier.
- Installed Module reference.
- Module manifest.
- Execution Context.
- Module input.

**Outputs**

- Loaded Module handle.
- Module execution result.
- Validation errors.
- Usage event for Economy.

**Ownership**

memos owns Module definitions, Module Installation, and Module usage policy. Runtime owns the loading mechanism during execution only.

**Failure Handling**

- Missing installed Module fails before execution.
- Invalid manifest fails loading.
- Handler errors are returned to memos with execution context.
- Failed Module execution does not commit Memory unless Brain explicitly accepts the result.

**Persistence Strategy**

Module manifests persist to 0G Storage through the Storage Adapter. Usage events are recorded by Economy through memos.

**Interaction With Brain**

- May provide Module outputs to Reason.
- May return results that Brain chooses to Remember.
- Does not own Memory or Dream.

**Interaction With 0G**

No direct 0G access. Uses memos Adapters only.

**Lifecycle**

Resolves an installed Module, loads its manifest and handler, executes it inside an Execution Context, returns output to memos, and emits usage for Economy.

**Examples**

- Loading a summarizer Module inside a graph.
- Loading a classifier Module for a support turn.
- Loading a parser Module before Reason uses extracted content.
