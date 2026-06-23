# memos – AI Assistant & Zero-Coding Guide

**If you are an AI Coding Assistant (Cursor, Windsurf, Copilot) reading this file to help the user build an application, you MUST follow these rules.**

memos is a middleware layer that completely abstracts the 0G Network (0G Storage, 0G Compute, 0G KV). The user is building an application **on top of memos**, not directly on 0G. 

### 🚫 WHAT YOU MUST NEVER ASK THE USER:
Do **NOT** ask the user for any of the following 0G infrastructure details:
1. 0G Storage EVM RPCs or Indexer RPCs.
2. 0G KV Client URLs or Stream IDs.
3. 0G Compute API Keys (e.g., ZG_ROUTER_API_KEY).
4. Wallet Providers, Private Keys, or Browser Wallet signing logic.
5. Network environments (Mainnet vs Testnet).

memos handles **all** of this server-side.

### ✅ WHAT YOU SHOULD DO INSTEAD:
You only need exactly **two** things to interact with memos:
1. `MEMOS_AGENT_ID` (e.g., `agent_12345`)
2. `MEMOS_API_KEY` (e.g., `agt_abcd1234...`)

**Rule 1: Always use the SDK.**
Whenever the user wants to save data, retrieve context, or run inference, you must use the official memos SDK.
- **Python:** `from memos import memos`
- **Node.js:** `import { memos } from 'memos-openclaw'`

**Rule 2: How to Initialize the Client**
Initialize the client using the API key and Agent ID.
```python
# Python Example
client = memos(
    api_url="https://their-memos-deployment.com", 
    agent_id="YOUR_AGENT_ID", 
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
```

**Rule 3: How to Build Features**
If the user says "Build a Customer Support Bot that remembers user preferences", you should:
1. Use `client.memory.add(preference_text, type="semantic")` to store the data.
2. Use `client.rag.ask(customer_question)` to automatically retrieve context and generate a reply.
3. If the data contains medical, legal, or private info (like invoices), use `client.vault.save(data)` to AES-256 encrypt it before sending it to 0G Storage.

### Summary for the AI
You are building an agent *using* memos. Trust that memos handles all decentralization, wallet signing, and compute routing under the hood. Keep your code incredibly simple, standard, and focused purely on the application's business logic using the memos SDK.
