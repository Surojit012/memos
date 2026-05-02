'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  LayoutGrid, 
  Key, 
  Settings, 
  Database,
  Zap,
  Copy,
  Check,
  Layers,
  ChevronRight,
  Plus,
  Loader2,
  X,
  Camera,
  ExternalLink,
  Cpu,
  MessageSquare,
  Globe,
  Moon,
  Shield,
  Brain,
  Send,
  Share2,
  Users
} from 'lucide-react';
import { AgentIdentity, Memory, ZGComputeService } from '@/lib/types';
import { v4 as uuid } from 'uuid';
import { useComputeBroker } from '@/lib/use-broker';

function MemoryStudioTab({ agents }: { agents: AgentIdentity[] }) {
  const { address } = useAccount();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-select first agent if available
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].agentId);
    }
  }, [agents, selectedAgentId]);

  const [simText, setSimText] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/memory?agentId=${selectedAgentId}&limit=100`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchMemories();
    
    // Auto-poll every 5 seconds to catch delayed 0G Storage hashes completing in the background
    const interval = setInterval(() => {
      fetchMemories();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchMemories]);

  const handleSimulate = async () => {
    if (!selectedAgentId || !simText.trim()) return;
    setIsSimulating(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          content: simText,
          type: 'episodic',
          tags: ['simulated', 'demo'],
          importance: Math.floor(Math.random() * 5) + 1
        })
      });
      if (res.ok) {
        setSimText('');
        await fetchMemories();
      } else {
        throw new Error('Upload to 0G failed');
      }
    } catch (err: any) {
      alert(err.message || 'Simulation Error');
    } finally {
      setIsSimulating(false);
    }
  };

  if (agents.length === 0) {
    return (
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-12 text-center shadow-sm">
         <Database size={32} className="mx-auto text-gray-600 mb-4" />
         <h3 className="text-white font-medium mb-2">No agents found</h3>
         <p className="text-gray-400 text-sm">You need an active agent to stream memory data. Create one in the Overview tab.</p>
      </div>
    );
  }

  const TypeBadge = ({ type }: { type: string }) => {
    switch (type) {
      case 'episodic':
        return <span className="px-2 py-1 bg-[#8B6F66]/10 text-[#8B6F66] border border-[#8B6F66]/20 rounded-md text-xs font-medium">Episodic</span>;
      case 'semantic':
        return <span className="px-2 py-1 bg-[#5E7D7E]/10 text-[#5E7D7E] border border-[#5E7D7E]/20 rounded-md text-xs font-medium">Semantic</span>;
      case 'procedural':
        return <span className="px-2 py-1 bg-[#A67B73]/10 text-[#A67B73] border border-[#A67B73]/20 rounded-md text-xs font-medium">Procedural</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-md text-xs font-medium">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
           <h2 className="text-xl font-bold text-white mb-2">0G Data Studio</h2>
           <p className="text-sm text-gray-400">Stream and cryptographically verify the raw memory contexts your agents are injecting into the 0G network.</p>
        </div>
        
        <div className="flex gap-4 items-center bg-[#151A17] border border-[#2A302C] p-4 rounded-xl shadow-sm">
          <label className="text-sm font-medium text-gray-300 whitespace-nowrap">Target Agent Stream</label>
          <select 
            value={selectedAgentId} 
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="flex-1 bg-[#0F1210] border border-[#3D4540] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#5E7D7E]"
          >
            {agents.map(a => (
               <option key={a.agentId} value={a.agentId}>{a.name} ({a.agentId})</option>
            ))}
          </select>
        </div>

        {/* SIMULATOR UI */}
        <div className="bg-gradient-to-r from-[#5E7D7E]/10 to-transparent border border-[#5E7D7E]/20 p-5 rounded-xl flex gap-4 items-center">
           <Zap className="text-[#5E7D7E] shrink-0" size={24} />
           <div className="flex-1">
             <div className="text-sm text-[#5E7D7E] font-medium mb-1">Simulate Agent Thought</div>
             <div className="flex gap-3">
               <input 
                 type="text" 
                 value={simText}
                 onChange={(e) => setSimText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                 placeholder="E.g., 'User prefers dark mode UI elements...'" 
                 className="flex-1 bg-[#0F1210]/50 border border-[#3D4540] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#5E7D7E]"
               />
               <button 
                 onClick={handleSimulate}
                 disabled={isSimulating || !simText.trim()}
                 className="bg-[#5E7D7E] text-[#F4F1EE] px-6 py-2 rounded-lg font-medium text-sm hover:bg-[#6E8D8E] disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(94,125,126,0.2)]"
               >
                 {isSimulating ? <Loader2 size={16} className="animate-spin" /> : 'Inject to 0G'}
               </button>
             </div>
           </div>
        </div>
      </div>

      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center">
             <Loader2 size={32} className="animate-spin text-[#5E7D7E]" />
          </div>
        ) : memories.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
             No memory records localized to this agent ID. Switch agents or inject new memories.
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-sm">
               <thead>
                 <tr className="bg-[#0f1318] border-b border-[#2a3441] text-left">
                   <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest w-1/12">Type</th>
                   <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest w-5/12">Memory Payload Snip</th>
                   <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest w-2/12">Tags</th>
                   <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest w-1/12">Imp</th>
                   <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest w-3/12">0G Cryptographic Hash</th>
                 </tr>
               </thead>
               <tbody>
                 {memories.map(m => (
                   <tr key={m.id} className="border-b border-[#2a3441]/50 hover:bg-[#1c2330]/30 transition-colors group">
                     <td className="p-4"><TypeBadge type={m.type} /></td>
                     <td className="p-4 text-gray-300 font-medium truncate max-w-[200px]">{m.content}</td>
                     <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(m.tags || []).slice(0, 2).map((t, i) => (
                             <span key={i} className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#3d4f63]/30 text-gray-400">{t}</span>
                          ))}
                          {(m.tags || []).length > 2 && <span className="text-[10px] text-gray-500">+{(m.tags || []).length - 2}</span>}
                        </div>
                     </td>
                     <td className="p-4">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                             <div key={i} className={`w-1.5 h-3 rounded-sm ${i < m.importance ? 'bg-[#5E7D7E]' : 'bg-[#2A302C]'}`} />
                          ))}
                        </div>
                     </td>
                     <td className="p-4">
                        {m.storageHash ? (
                          <a 
                            href={`https://storagescan-galileo.0g.ai/tx/${m.storageHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#5E7D7E]/5 hover:bg-[#5E7D7E]/10 text-[#5E7D7E] px-2 py-1 rounded transition-colors border border-[#5E7D7E]/20"
                          >
                            {m.storageHash.slice(0, 6)}...{m.storageHash.slice(-4)}
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-gray-500 text-xs italic font-mono flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Batching</span>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RouterBalanceCard() {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/compute/router?action=balance')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setBalance(d.balance); }
      })
      .catch(() => setError('Router not configured'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={14} className="animate-spin" /> Checking Router balance...</div>;
  if (error) return (
    <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-4 text-sm text-gray-400">
      <span className="text-gray-500 font-mono text-xs">Not configured</span> — Set <code className="text-[#7A9E8E] bg-[#7A9E8E]/10 px-1 rounded">ZG_ROUTER_API_KEY</code> in .env.local to enable.
    </div>
  );

  return (
    <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-4 flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500 mb-1">Router Balance</div>
        <div className="text-xl font-bold text-white">{Number(balance || 0).toFixed(4)} <span className="text-sm text-[#7A9E8E]">0G</span></div>
      </div>
      <a
        href="https://pc.0g.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-mono bg-[#7A9E8E]/10 hover:bg-[#7A9E8E]/20 text-[#7A9E8E] px-4 py-2 rounded-lg border border-[#7A9E8E]/20 transition-all"
      >
        Deposit at pc.0g.ai
      </a>
    </div>
  );
}

function ComputeFundingTab() {
  const { broker, isInitializing, error, getLedger, deposit, transferToProvider, addLedger } = useComputeBroker();
  const [ledger, setLedger] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('3');
  const [providerAddress, setProviderAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [needsAccountCreation, setNeedsAccountCreation] = useState(false);

  const fetchLedger = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getLedger();
      setLedger(data);
      setFetchError(null);
      setNeedsAccountCreation(false);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('Ledger not found') || err.message?.includes('Account does not exist')) {
        setNeedsAccountCreation(true);
        setFetchError(null);
      } else if (err.message?.includes('Broker not initialized')) {
        // Just ignore it if it triggers too early
      } else {
        setFetchError(`Failed to fetch ledger: ${err.message || 'Unknown network error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getLedger]);

  useEffect(() => {
    if (broker && !isInitializing) {
      fetchLedger();
    }
  }, [broker, isInitializing, fetchLedger]);

  const handleCreateLedger = async () => {
    try {
      setIsLoading(true);
      if (addLedger) {
        await addLedger(Math.max(3, Number(depositAmount)));
      }
      await fetchLedger();
    } catch (err: any) {
      alert(err.message || 'Account creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    try {
      setIsLoading(true);
      await deposit(Number(depositAmount));
      await fetchLedger();
    } catch (err: any) {
      alert(err.message || 'Deposit failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing || !broker) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-[#5E7D7E]" size={32} /></div>;
  }

  if (error || fetchError) {
     return <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">Error: {error || fetchError}</div>;
  }

  if (needsAccountCreation) {
    return (
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-8 shadow-sm text-center">
        <h3 className="text-xl font-bold text-white mb-2">Initialize 0G Compute Account</h3>
        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
          Your wallet does not have an active 0G Ledger deployed yet. Bootstrapping a new compute ledger requires a minimum deposit of 3 0G tokens to the network.
        </p>
        <div className="flex gap-4 items-center justify-center max-w-md mx-auto">
          <input 
            type="number" 
            className="flex-1 bg-[#0F1210] border border-[#3D4540] text-white rounded-lg px-4 py-2"
            value={depositAmount} 
            onChange={e => setDepositAmount(e.target.value)} 
            placeholder="Amount in 0G (Min. 3)"
            min="3"
          />
          <button 
            onClick={handleCreateLedger} 
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#5E7D7E] text-[#F4F1EE] font-medium px-4 py-2 rounded-lg hover:bg-[#6E8D8E]"
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Bootstrap Ledger'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-white mb-2">0G Compute Ledger</h2>
        <p className="text-sm text-gray-400 mb-6">Deposit 0G tokens to your compute ledger to fund AI inference tasks for your agents.</p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-4">
             <div className="text-sm text-gray-500 mb-1">Total Balance</div>
             <div className="text-2xl font-bold text-white">{ledger ? (Number(ledger.totalBalance) / 1e18).toFixed(4) : '0.0000'} <span className="text-sm text-[#5E7D7E]">0G</span></div>
          </div>
          <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-4">
             <div className="text-sm text-gray-500 mb-1">Status</div>
             <div className="text-xl font-bold text-white mt-1">
               {ledger ? <span className="text-green-400">Active</span> : <span className="text-gray-500">Not Created</span>}
             </div>
          </div>
        </div>

        <div className="border-t border-[#2A302C] pt-6">
           <h3 className="text-md font-medium text-white mb-4">Deposit Funds</h3>
           <div className="flex gap-3">
             <input type="number" step="0.1" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-48 bg-[#0F1210] border border-[#3D4540] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#5E7D7E]" placeholder="Amount in 0G" />
             <button onClick={handleDeposit} disabled={isLoading} className="bg-[#5E7D7E] text-[#F4F1EE] px-6 py-2 rounded-lg font-medium hover:bg-[#6E8D8E] disabled:opacity-50 flex items-center gap-2">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Deposit'}
             </button>
           </div>
           <p className="text-xs text-gray-500 mt-2">Minimum deposit is typically 3 0G directly mapping to the LedgerManager contract.</p>
        </div>

        <div className="border-t border-[#2A302C] pt-6">
           <h3 className="text-md font-medium text-white mb-2">Allocate to Inference Providers</h3>
           <p className="text-sm text-gray-400 mb-4">Transfer portions of your total ledger balance directly to decentralized node providers to pay for LLM/Embedding executions.</p>
           
           <div className="space-y-4">
             <div className="flex flex-col gap-2">
               <label className="text-sm text-gray-400">Provider Address</label>
               <input type="text" value={providerAddress} onChange={e => setProviderAddress(e.target.value)} className="w-full bg-[#0F1210] border border-[#3D4540] rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#5E7D7E]" placeholder="0x..." />
             </div>
             
             <div className="flex gap-3 items-end">
               <div className="flex flex-col gap-2 flex-1">
                 <label className="text-sm text-gray-400">Allocation Amount (0G)</label>
                 <input type="number" step="0.1" id="transferAmt" className="w-full bg-[#0F1210] border border-[#3D4540] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#5E7D7E]" placeholder="Amount in 0G" />
               </div>
               <button 
                 onClick={async () => {
                   const amt = (document.getElementById('transferAmt') as HTMLInputElement).value;
                   if (!providerAddress || !amt) return;
                   setIsLoading(true);
                   try {
                     await transferToProvider(providerAddress, Number(amt));
                     alert('Successfully transferred to provider!');
                     await fetchLedger();
                   } catch (err: any) {
                     alert(err.message || 'Transfer failed');
                   } finally {
                     setIsLoading(false);
                   }
                 }} 
                 disabled={isLoading || !providerAddress} 
                 className="bg-[#1c2330] border border-[#3d4f63] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2a3441] disabled:opacity-50 min-w-32 flex justify-center"
               >
                 {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Transfer'}
               </button>
             </div>
            </div>
         </div>

        {/* 0G Router Balance */}
        <div className="border-t border-[#2A302C] pt-6">
          <h3 className="text-md font-medium text-white mb-4">0G Router (Managed API)</h3>
          <p className="text-sm text-gray-400 mb-4">
            Router uses a single unified balance with automatic provider failover. 
            <a href="https://pc.0g.ai" target="_blank" rel="noopener noreferrer" className="text-[#7A9E8E] hover:underline ml-1">
              Manage at pc.0g.ai →
            </a>
          </p>
          <RouterBalanceCard />
        </div>
      </div>
    </div>
  );
}

function BrainSnapshotsTab({ agents }: { agents: AgentIdentity[] }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mintingId, setMintingId] = useState<number | null>(null);
  const [mintResult, setMintResult] = useState<{ tokenId: number; txHash: string; explorerUrl: string } | null>(null);

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].agentId);
    }
  }, [agents, selectedAgentId]);

  const fetchSnapshots = useCallback(async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/${selectedAgentId}/snapshot`);
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  const handleSnapshot = async () => {
    if (!selectedAgentId) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/agent/${selectedAgentId}/snapshot`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchSnapshots();
    } catch (err: any) {
      alert(err.message || 'Snapshot failed');
    } finally {
      setCreating(false);
    }
  };

  const handleMintINFT = async (snapshot: any, index: number) => {
    if (!selectedAgentId || !snapshot.snapshotHash) return;
    setMintingId(index);
    setMintResult(null);
    try {
      const res = await fetch(`/api/agent/${selectedAgentId}/mint-inft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brainHash: snapshot.snapshotHash,
          memoriesCount: snapshot.memoriesCount,
          snapshotVersion: snapshot.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMintResult(data);
    } catch (err: any) {
      alert(err.message || 'INFT minting failed');
    } finally {
      setMintingId(null);
    }
  };

  if (agents.length === 0) {
    return (
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-12 text-center shadow-sm">
        <Camera size={32} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-white font-medium mb-2">No agents found</h3>
        <p className="text-gray-400 text-sm">Create an agent first to take brain snapshots.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Agent Brain Snapshots</h2>
        <p className="text-sm text-gray-400">Export your agent&apos;s complete cognitive state to a single 0G Storage hash. One hash = one brain. Import it anywhere.</p>
      </div>

      <div className="flex gap-4 items-center bg-[#151A17] border border-[#2A302C] p-4 rounded-xl shadow-sm">
        <select 
          value={selectedAgentId} 
          onChange={(e) => setSelectedAgentId(e.target.value)}
          className="flex-1 bg-[#0F1210] border border-[#3D4540] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#5E7D7E]"
        >
          {agents.map(a => (
            <option key={a.agentId} value={a.agentId}>{a.name} ({a.agentId})</option>
          ))}
        </select>
        <button 
          onClick={handleSnapshot}
          disabled={creating}
          className="flex items-center gap-2 bg-[#5E7D7E] text-[#F4F1EE] px-5 py-2 rounded-lg font-medium text-sm hover:bg-[#6E8D8E] disabled:opacity-50 shadow-[0_0_10px_rgba(94,125,126,0.2)]"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {creating ? 'Snapshotting...' : 'Take Snapshot'}
        </button>
      </div>

      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-[#5E7D7E]" /></div>
        ) : snapshots.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No snapshots yet. Click &quot;Take Snapshot&quot; to export this agent&apos;s brain to 0G Storage.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f1318] border-b border-[#2a3441] text-left">
                <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Version</th>
                <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Memories</th>
                <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Date</th>
                <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">0G Hash</th>
                <th className="p-4 text-xs font-mono text-gray-500 uppercase tracking-widest text-right">INFT</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s: any, i: number) => (
                <tr key={i} className="border-b border-[#2a3441]/50 hover:bg-[#1c2330]/30 transition-colors">
                  <td className="p-4 text-white font-bold">v{s.version}</td>
                  <td className="p-4 text-gray-300">{s.memoriesCount} memories</td>
                  <td className="p-4 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="p-4">
                    <a 
                      href={`https://storagescan-galileo.0g.ai/tx/${s.snapshotHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#5E7D7E]/5 hover:bg-[#5E7D7E]/10 text-[#5E7D7E] px-2 py-1 rounded transition-colors border border-[#5E7D7E]/20"
                    >
                      {s.snapshotHash?.slice(0, 8)}...{s.snapshotHash?.slice(-6)}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleMintINFT(s, i)}
                      disabled={mintingId === i || !s.snapshotHash}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg bg-[#7A9E8E]/10 hover:bg-[#7A9E8E]/20 text-[#7A9E8E] border border-[#7A9E8E]/20 transition-all disabled:opacity-50"
                    >
                      {mintingId === i ? (
                        <><Loader2 size={10} className="animate-spin" /> Minting...</>
                      ) : (
                        '🧠 Mint INFT'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* INFT Mint Success Banner */}
      {mintResult && (
        <div className="bg-[#7A9E8E]/10 border border-[#7A9E8E]/20 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <div className="text-sm font-bold text-white">Brain INFT Minted — Token #{mintResult.tokenId}</div>
              <div className="text-[10px] font-mono text-gray-400">ERC-7857 Intelligent NFT on 0G Chain</div>
            </div>
          </div>
          <a
            href={mintResult.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-mono bg-[#7A9E8E]/10 hover:bg-[#7A9E8E]/20 text-[#7A9E8E] px-4 py-2 rounded-lg border border-[#7A9E8E]/20 transition-all"
          >
            View on Explorer <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}

function InferenceLabTab() {
  const [providers, setProviders] = useState<ZGComputeService[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [serviceFilter, setServiceFilter] = useState<string>('chatbot');

  // Fetch providers
  useEffect(() => {
    setLoadingProviders(true);
    fetch(`/api/compute/providers?type=${serviceFilter}`)
      .then(r => r.json())
      .then(d => {
        setProviders(d.providers || []);
        if (d.providers?.length > 0 && !selectedProvider) {
          setSelectedProvider(d.providers[0].provider);
        }
      })
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false));
  }, [serviceFilter]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedProvider || isStreaming) return;
    
    const newMessages = [...messages, { role: 'user', content: inputText }];
    setMessages(newMessages);
    setInputText('');
    setIsStreaming(true);
    setStreamContent('');
    setLastResult(null);

    try {
      const res = await fetch('/api/compute/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerAddress: selectedProvider,
          messages: newMessages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          try {
            const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
            const event = JSON.parse(jsonStr);
            
            if (event.type === 'chunk' && event.content) {
              accumulated += event.content;
              setStreamContent(accumulated);
            } else if (event.type === 'done' && event.result) {
              setLastResult(event.result);
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      }

      // Add assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
      setStreamContent('');
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠ Error: ${err.message}` }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const selectedProviderInfo = providers.find(p => p.provider === selectedProvider);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">0G Inference Lab</h2>
        <p className="text-sm text-gray-400">Chat directly with decentralized AI models on the 0G Compute Network. All responses are settled on-chain via processResponse().</p>
      </div>

      {/* Service Type Filter */}
      <div className="flex gap-2">
        {['chatbot', 'text-to-image', 'speech-to-text'].map(type => (
          <button
            key={type}
            onClick={() => { setServiceFilter(type); setSelectedProvider(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              serviceFilter === type
                ? 'bg-[#5E7D7E]/15 text-[#5E7D7E] border border-[#5E7D7E]/30'
                : 'bg-[#151A17] text-gray-500 border border-[#2A302C] hover:text-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Provider Discovery */}
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#2A302C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[#5E7D7E]" />
            <span className="text-sm font-medium text-gray-300">Discovered Providers</span>
          </div>
          <span className="text-xs font-mono text-gray-500">
            {loadingProviders ? 'Scanning...' : `${providers.length} providers`}
          </span>
        </div>
        
        {loadingProviders ? (
          <div className="p-8 flex justify-center">
            <Loader2 size={24} className="animate-spin text-[#5E7D7E]" />
          </div>
        ) : providers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No {serviceFilter} providers found on the network.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {providers.map(p => (
              <button
                key={p.provider}
                onClick={() => setSelectedProvider(p.provider)}
                className={`w-full text-left px-4 py-3 border-b border-[#2A302C]/50 transition-colors flex items-center justify-between ${
                  selectedProvider === p.provider
                    ? 'bg-[#5E7D7E]/8'
                    : 'hover:bg-[#1A1F1C]/30'
                }`}
              >
                <div>
                  <div className="text-xs font-mono text-gray-300">
                    {p.provider?.slice(0, 10) || 'Unknown'}...{p.provider?.slice(-6) || ''}
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 mt-0.5">{p.model}</div>
                </div>
                <div className="flex items-center gap-2">
                  {p.verifiability === 'TeeML' && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#7A9E8E]/10 text-[#7A9E8E] border border-[#7A9E8E]/20">
                      TEE ✓
                    </span>
                  )}
                  {selectedProvider === p.provider && (
                    <div className="w-2 h-2 rounded-full bg-[#5E7D7E] shadow-[0_0_6px_rgba(94,125,126,0.6)]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Interface */}
      {selectedProvider && serviceFilter === 'chatbot' && (
        <div className="bg-[#151A17] border border-[#2A302C] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#2A302C] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-[#5E7D7E]" />
              <span className="text-sm font-medium text-gray-300">Chat</span>
              {selectedProviderInfo && (
                <span className="text-[10px] font-mono text-gray-500 ml-2">
                  {selectedProviderInfo.model}
                </span>
              )}
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setStreamContent(''); setLastResult(null); }}
                className="text-xs text-gray-500 hover:text-gray-300 font-mono"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !streamContent && (
              <div className="text-center text-gray-600 text-sm py-12">
                Send a message to start chatting with the decentralized model.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#5E7D7E]/15 text-gray-200 rounded-br-md'
                    : 'bg-[#1A1F1C] text-gray-300 border border-[#2A302C] rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md text-sm bg-[#1A1F1C] text-gray-300 border border-[#5E7D7E]/20 whitespace-pre-wrap">
                  {streamContent}
                  <span className="inline-block w-2 h-4 bg-[#5E7D7E] ml-1 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#2A302C] flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-[#0F1210] border border-[#3D4540] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#5E7D7E] transition-colors"
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !inputText.trim()}
              className="bg-[#5E7D7E] text-[#F4F1EE] px-5 py-3 rounded-xl font-medium text-sm hover:bg-[#6E8D8E] disabled:opacity-50 flex items-center gap-2 shadow-[0_0_10px_rgba(94,125,126,0.2)]"
            >
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
            </button>
          </div>

          {/* Verification Meta */}
          {lastResult && (
            <div className="px-4 pb-4">
              <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-3 flex flex-wrap gap-4 text-[10px] font-mono text-gray-500">
                <span>Model: <strong className="text-gray-300">{lastResult.model}</strong></span>
                <span>Tokens: <strong className="text-gray-300">{lastResult.tokensUsed}</strong></span>
                <span>Provider: <strong className="text-gray-300">{lastResult.providerAddress?.slice(0,8)}...{lastResult.providerAddress?.slice(-4)}</strong></span>
                <span className={`px-2 py-0.5 rounded-full border ${
                  lastResult.verified
                    ? 'bg-[#7A9E8E]/10 text-[#7A9E8E] border-[#7A9E8E]/20'
                    : 'bg-[#C27065]/10 text-[#C27065] border-[#C27065]/20'
                }`}>
                  {lastResult.verified ? 'processResponse() ✓ Settled' : 'Settlement pending'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManifestStatusTab() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading || !status) {
    return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-[#5E7D7E]" /></div>;
  }

  const { manifest, hydration, writeQueue, stats } = status;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">0G Manifest System</h2>
        <p className="text-sm text-gray-400">Live observability into the decentralized manifest powering your MemoryOS instance. All state lives on 0G.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-widest">Manifest Version</div>
          <div className="text-3xl font-bold text-white">v{manifest?.version || 0}</div>
        </div>
        <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-widest">Hydration</div>
          <div className="text-lg font-bold mt-1">
            {hydration?.state === 'done' ? (
              <span className="text-green-400 flex items-center gap-2"><Check size={16} /> Synced</span>
            ) : (
              <span className="text-yellow-400 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> {hydration?.state}</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">Source: {hydration?.source || 'unknown'}</div>
        </div>
        <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-widest">Write Queue</div>
          <div className="text-3xl font-bold text-white">{writeQueue?.pending || 0}</div>
          <div className="text-xs text-gray-500 mt-1">pending writes</div>
        </div>
        <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-widest">Uploads</div>
          <div className="text-3xl font-bold text-white">{manifest?.uploads || 0}</div>
          <div className="text-xs text-gray-500 mt-1">manifest uploads to 0G</div>
        </div>
      </div>

      {/* Current Manifest Hash */}
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Current Manifest Hash</h3>
        {manifest?.hash ? (
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-[#0F1210] border border-[#3D4540] rounded-lg px-4 py-3 text-sm font-mono text-[#5E7D7E] overflow-hidden text-ellipsis">
              {manifest.hash}
            </code>
            <a 
              href={`https://storagescan-galileo.0g.ai/tx/${manifest.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#5E7D7E]/10 hover:bg-[#5E7D7E]/20 text-[#5E7D7E] px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-[#5E7D7E]/20"
            >
              <ExternalLink size={14} /> View on 0G Explorer
            </a>
          </div>
        ) : (
          <div className="text-gray-500 text-sm italic">No manifest hash yet — trigger an update by adding a memory or agent.</div>
        )}
      </div>

      {/* Record Counts */}
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Manifest Records</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{manifest?.memories || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Memories</div>
          </div>
          <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{manifest?.skills || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Skills</div>
          </div>
          <div className="bg-[#0F1210] border border-[#3D4540] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{manifest?.agents || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Agents</div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-4">System Info</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">0G Configured</span> <span className="text-white font-mono">{status.configured ? '✅ Yes' : '❌ No'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Network</span> <span className="text-white font-mono">{status.network?.network || 'unknown'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Manifest Dirty</span> <span className="text-white font-mono">{manifest?.isDirty ? '⏳ Pending flush' : '✅ Clean'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Manifest Uploading</span> <span className="text-white font-mono">{manifest?.isUploading ? '🔄 Yes' : '—'}</span></div>
        </div>
      </div>
    </div>
  );
}

// ── A2A Cross-Agent Sharing Tab ──────────────────────────────
function A2ASharingTab({ agents }: { agents: AgentIdentity[] }) {
  const [fromAgentId, setFromAgentId] = useState<string>('');
  const [toAgentId, setToAgentId] = useState<string>('');
  const [memories, setMemories] = useState<any[]>([]);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<any>(null);
  const [sharingData, setSharingData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (agents.length > 0 && !fromAgentId) setFromAgentId(agents[0].agentId);
    if (agents.length > 1 && !toAgentId) setToAgentId(agents[1].agentId);
  }, [agents, fromAgentId, toAgentId]);

  // Fetch memories for the FROM agent
  const fetchMemories = useCallback(async () => {
    if (!fromAgentId) return;
    try {
      const res = await fetch(`/api/memory?agentId=${fromAgentId}&limit=50`);
      const data = await res.json();
      setMemories(data.memories || []);
      setSelectedMemoryIds([]);
    } catch (e) { console.error(e); }
  }, [fromAgentId]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  // Fetch sharing grants
  const fetchSharingData = useCallback(async () => {
    if (!fromAgentId) return;
    setLoadingData(true);
    try {
      const res = await fetch(`/api/agent/${fromAgentId}/share`);
      const data = await res.json();
      setSharingData(data);
    } catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  }, [fromAgentId]);

  useEffect(() => { fetchSharingData(); }, [fetchSharingData]);

  const toggleMemory = (id: string) => {
    setSelectedMemoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    if (!fromAgentId || !toAgentId || selectedMemoryIds.length === 0) return;
    setIsSharing(true);
    setShareResult(null);
    try {
      const res = await fetch(`/api/agent/${fromAgentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toAgentId, memoryIds: selectedMemoryIds, message: message || undefined }),
      });
      const data = await res.json();
      setShareResult(data);
      if (data.grant) {
        setSelectedMemoryIds([]);
        setMessage('');
        fetchSharingData();
      }
    } catch (e: any) {
      setShareResult({ error: e.message });
    } finally { setIsSharing(false); }
  };

  const handleRevoke = async (grantId: string) => {
    try {
      await fetch(`/api/agent/${fromAgentId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId }),
      });
      fetchSharingData();
    } catch (e) { console.error(e); }
  };

  const otherAgents = agents.filter(a => a.agentId !== fromAgentId);

  return (
    <div className="space-y-6">
      {/* Share memories */}
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Share2 size={20} className="text-cyan-400" /> Cross-Agent Memory Sharing
            </h2>
            <p className="text-sm text-gray-500 mt-1">Share specific memories between agents. Agent A learns something, Agent B can access it via a revocable grant.</p>
          </div>
        </div>

        {/* Agent selectors */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">From Agent (Sharer)</label>
            <select
              value={fromAgentId}
              onChange={(e) => setFromAgentId(e.target.value)}
              className="w-full bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-3 py-2"
            >
              {agents.map(a => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">To Agent (Recipient)</label>
            <select
              value={toAgentId}
              onChange={(e) => setToAgentId(e.target.value)}
              className="w-full bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-3 py-2"
            >
              {otherAgents.map(a => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Memory picker */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Select memories to share ({selectedMemoryIds.length} selected)</div>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-[#2A302C] rounded-lg p-2 bg-[#0F1210]">
            {memories.length === 0 ? (
              <p className="text-xs text-gray-500 p-2">No memories found for this agent.</p>
            ) : memories.map((mem: any) => (
              <label key={mem.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                selectedMemoryIds.includes(mem.id) ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-[#1A1F1C]'
              }`}>
                <input
                  type="checkbox"
                  checked={selectedMemoryIds.includes(mem.id)}
                  onChange={() => toggleMemory(mem.id)}
                  className="mt-1 accent-cyan-400"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{mem.content}</div>
                  <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                    <span className="text-cyan-400/60">{mem.type}</span>
                    <span>⭐{mem.importance}</span>
                    {mem.storageHash && <span className="text-green-400/60">on 0G</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Optional message */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message to recipient agent..."
          className="w-full bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-4 py-2 mb-3 focus:outline-none focus:border-cyan-500/50"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            disabled={isSharing || selectedMemoryIds.length === 0 || !toAgentId}
            className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-5 py-2 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSharing ? <><Loader2 size={14} className="animate-spin" /> Sharing...</> : <><Share2 size={14} /> 🤝 Share {selectedMemoryIds.length} Memories</>}
          </button>
          {shareResult?.grant && (
            <span className="text-xs text-cyan-300">✅ Shared! Grant: {shareResult.grant.id}</span>
          )}
          {shareResult?.error && (
            <span className="text-xs text-red-400">⚠ {shareResult.error}</span>
          )}
        </div>
      </div>

      {/* Active grants */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sent */}
        <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6">
          <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
            <Send size={14} className="text-cyan-400" /> Sent Grants
            <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{sharingData?.sent?.grants?.length || 0}</span>
          </h3>
          {loadingData ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>
          ) : !sharingData?.sent?.grants?.length ? (
            <p className="text-sm text-gray-500">No memories shared yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sharingData.sent.grants.map((g: any) => (
                <div key={g.id} className="bg-[#0F1210] border border-[#2A302C] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white">→ {g.toAgentName}</span>
                    <button onClick={() => handleRevoke(g.id)} className="text-xs text-red-400 hover:text-red-300">Revoke</button>
                  </div>
                  <div className="text-xs text-gray-500">{g.memoryIds.length} memories • {new Date(g.sharedAt).toLocaleString()}</div>
                  {g.message && <div className="text-xs text-gray-400 mt-1 italic">"{g.message}"</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Received */}
        <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6">
          <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={14} className="text-green-400" /> Received Grants
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">{sharingData?.received?.grants?.length || 0}</span>
          </h3>
          {loadingData ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>
          ) : !sharingData?.received?.grants?.length ? (
            <p className="text-sm text-gray-500">No shared memories received.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sharingData.received.grants.map((g: any) => (
                <div key={g.id} className="bg-[#0F1210] border border-[#2A302C] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white">← {g.fromAgentName}</span>
                    <span className="text-xs text-gray-500">Read {g.accessCount}x</span>
                  </div>
                  {g.message && <div className="text-xs text-cyan-400 mb-2 italic">"{g.message}"</div>}
                  <div className="space-y-1">
                    {g.sharedMemories?.map((m: any) => (
                      <div key={m.id} className="text-xs text-gray-300 pl-2 border-l-2 border-green-500/30">
                        <span className="text-green-400/60">[{m.type}]</span> {m.content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Agent Dreams Tab ─────────────────────────────────────────
function AgentDreamsTab({ agents }: { agents: AgentIdentity[] }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isDreaming, setIsDreaming] = useState(false);
  const [dreamResult, setDreamResult] = useState<any>(null);
  const [dreamHistory, setDreamHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) setSelectedAgentId(agents[0].agentId);
  }, [agents, selectedAgentId]);

  const fetchDreamHistory = useCallback(async () => {
    if (!selectedAgentId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/agent/${selectedAgentId}/dreams`);
      const data = await res.json();
      setDreamHistory(data.dreamHistory || []);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  }, [selectedAgentId]);

  useEffect(() => { fetchDreamHistory(); }, [fetchDreamHistory]);

  const triggerDream = async () => {
    if (!selectedAgentId) return;
    setIsDreaming(true);
    setDreamResult(null);
    try {
      const res = await fetch(`/api/agent/${selectedAgentId}/dreams`, { method: 'POST' });
      const data = await res.json();
      setDreamResult(data);
      fetchDreamHistory();
    } catch (e: any) {
      setDreamResult({ error: e.message });
    } finally { setIsDreaming(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Moon size={20} className="text-indigo-400" /> Agent Dreams
            </h2>
            <p className="text-sm text-gray-500 mt-1">Trigger memory consolidation — like human sleep. Extracts patterns from episodic memories into semantic facts.</p>
          </div>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-3 py-2"
          >
            {agents.map(a => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
          </select>
        </div>

        <button
          onClick={triggerDream}
          disabled={isDreaming || !selectedAgentId}
          className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isDreaming ? <><Loader2 size={16} className="animate-spin" /> Dreaming...</> : <><Moon size={16} /> 🌙 Start Dream Cycle</>}
        </button>

        {dreamResult && !dreamResult.error && (
          <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
            <div className="text-sm text-indigo-300 font-medium mb-2">Dream Cycle Complete — {dreamResult.durationMs}ms</div>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center"><div className="text-2xl font-bold text-white">{dreamResult.consolidatedCount}</div><div className="text-xs text-gray-500">Facts Extracted</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-white">{dreamResult.decayedCount}</div><div className="text-xs text-gray-500">Memories Decayed</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-white">{dreamResult.totalMemoriesProcessed}</div><div className="text-xs text-gray-500">Total Processed</div></div>
            </div>
            {dreamResult.consolidated?.length > 0 && (
              <div className="space-y-2 mt-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider">Extracted Semantic Facts</div>
                {dreamResult.consolidated.map((fact: string, i: number) => (
                  <div key={i} className="bg-[#0F1210] rounded-lg px-3 py-2 text-sm text-white border border-[#2A302C]">🧠 {fact}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {dreamResult?.error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">{dreamResult.error}</div>
        )}
      </div>

      {/* Dream History */}
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6">
        <h3 className="text-md font-semibold text-white mb-4">Dream History</h3>
        {loadingHistory ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>
        ) : dreamHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No dream cycles yet. Trigger one above to start consolidating memories.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {dreamHistory.map((dream, i) => (
              <div key={i} className="bg-[#0F1210] border border-[#2A302C] rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">{new Date(dream.timestamp).toLocaleString()}</span>
                  <span className="text-xs text-gray-500">{dream.durationMs}ms</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-indigo-400">🧠 {dream.consolidated.length} facts</span>
                  <span className="text-amber-400">📉 {dream.decayed} decayed</span>
                </div>
                {dream.consolidated.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dream.consolidated.map((f: string, j: number) => (
                      <div key={j} className="text-xs text-gray-300 pl-3 border-l-2 border-indigo-500/30">{f}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── RAG Chat Tab ─────────────────────────────────────────────
function RAGChatTab({ agents }: { agents: AgentIdentity[] }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string; contextUsed?: number }>>([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) setSelectedAgentId(agents[0].agentId);
  }, [agents, selectedAgentId]);

  const handleAsk = async () => {
    if (!selectedAgentId || !query.trim()) return;
    const q = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setIsThinking(true);
    const currentAgent = agents.find(a => a.agentId === selectedAgentId);
    try {
      const res = await fetch('/api/rag', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentAgent?.apiKey || ''}`
        },
        body: JSON.stringify({ agentId: selectedAgentId, query: q }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'agent', text: data.answer || data.error || 'No response.', contextUsed: data.contextUsed }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'agent', text: `Error: ${e.message}` }]);
    } finally { setIsThinking(false); }
  };

  return (
    <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6 flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain size={20} className="text-emerald-400" /> RAG Chat — Ask Your Agent
          </h2>
          <p className="text-sm text-gray-500 mt-1">Query your agent&apos;s 0G-stored memories using the Autonomous RAG pipeline. 7 distinct 0G operations per message.</p>
        </div>
        <select
          value={selectedAgentId}
          onChange={(e) => { setSelectedAgentId(e.target.value); setMessages([]); }}
          className="bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-3 py-2"
        >
          {agents.map(a => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
        </select>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px] max-h-[450px]">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Brain size={40} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Ask your agent anything. It will search its 0G Storage memories and synthesize an answer.</p>
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {['What do you know about me?', 'Summarize your recent memories', 'What patterns have you noticed?'].map((suggestion) => (
                  <button key={suggestion} onClick={() => { setQuery(suggestion); }} className="text-xs bg-[#1A1F1C] text-gray-400 border border-[#2A302C] px-3 py-1.5 rounded-full hover:text-white hover:border-emerald-500/30 transition-colors">
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/20' 
                : 'bg-[#0F1210] text-gray-200 border border-[#2A302C]'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.contextUsed !== undefined && (
                <div className="mt-2 text-xs text-gray-500">📚 Used {msg.contextUsed} memories from 0G Storage</div>
              )}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-[#0F1210] border border-[#2A302C] rounded-lg px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Searching 0G memories & synthesizing...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Ask your agent anything..."
          className="flex-1 bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          onClick={handleAsk}
          disabled={isThinking || !query.trim()}
          className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 rounded-lg hover:bg-emerald-500/30 transition-all disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Encrypted Vault Tab ──────────────────────────────────────
function EncryptedVaultTab({ agents }: { agents: AgentIdentity[] }) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [vaultMemories, setVaultMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) setSelectedAgentId(agents[0].agentId);
  }, [agents, selectedAgentId]);

  const fetchVault = useCallback(async () => {
    if (!selectedAgentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/memory/encrypted?agentId=${selectedAgentId}`);
      const data = await res.json();
      setVaultMemories(data.vaultMemories || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedAgentId]);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  const handleEncrypt = async () => {
    if (!selectedAgentId || !newContent.trim()) return;
    setIsEncrypting(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/memory/encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, content: newContent.trim(), type: 'semantic', importance: 4 }),
      });
      const data = await res.json();
      if (data.memory) {
        setSuccessMsg(`🔐 Encrypted & stored on 0G → ${data.memory.storageHash?.slice(0, 16)}...`);
        setNewContent('');
        fetchVault();
      } else {
        setSuccessMsg(`⚠ ${data.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setSuccessMsg(`⚠ ${e.message}`);
    } finally { setIsEncrypting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield size={20} className="text-amber-400" /> Encrypted Memory Vault
            </h2>
            <p className="text-sm text-gray-500 mt-1">AES-256-GCM encrypted memories. 0G Storage nodes see only ciphertext — only the owning wallet can decrypt.</p>
          </div>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-3 py-2"
          >
            {agents.map(a => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
          </select>
        </div>

        {/* Create encrypted memory */}
        <div className="mb-4">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Enter sensitive content to encrypt and store on 0G..."
            rows={3}
            className="w-full bg-[#0F1210] border border-[#2A302C] text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500/50 resize-none"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleEncrypt}
              disabled={isEncrypting || !newContent.trim()}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isEncrypting ? <><Loader2 size={14} className="animate-spin" /> Encrypting...</> : <><Shield size={14} /> 🔐 Encrypt & Store</>}
            </button>
            {successMsg && <span className="text-xs text-amber-300">{successMsg}</span>}
          </div>
        </div>
      </div>

      {/* Vault contents */}
      <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6">
        <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          Vault Contents <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{vaultMemories.length} encrypted</span>
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading vault...</div>
        ) : vaultMemories.length === 0 ? (
          <p className="text-sm text-gray-500">No encrypted memories yet. Create one above to see it here.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {vaultMemories.map((mem: any) => (
              <div key={mem.id} className="bg-[#0F1210] border border-[#2A302C] rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-amber-400" />
                    <span className="text-xs font-mono text-gray-500">{mem.id}</span>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(mem.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-white mt-1">{mem.content}</div>
                {mem.storageHash && (
                  <div className="text-xs text-gray-500 mt-2 font-mono">0G: {mem.storageHash.slice(0, 20)}... <span className="text-amber-500/50">encrypted on-chain</span></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [activeTab, setActiveTab] = useState<'overview' | 'apikeys' | 'funding' | 'studio' | 'snapshots' | 'inference' | 'manifest' | 'dreams' | 'rag' | 'vault' | 'a2a' | 'settings'>('overview');
  const [agents, setAgents] = useState<AgentIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchAgents = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/identity?ownerAddress=${address}`);
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (e) {
      console.error('Failed to fetch agents', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchAgents();
    } else {
      setAgents([]);
      setLoading(false);
    }
  }, [isConnected, address]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !address) return;
    
    setIsCreating(true);
    setCreateError(null);
    const newAgentId = `agent_${uuid().slice(0, 8)}`;
    
    try {
      // Step 1: Fetch the next nonce for replay protection
      const nonceRes = await fetch(`/api/identity/nonce?address=${address}`);
      const nonceData = await nonceRes.json();
      const nextNonce = nonceData.nonce || 1;

      // Step 2: Sign a message with the connected wallet to prove ownership
      const message = `Register agent ${newAgentId} on MemoryOS | nonce: ${nextNonce}`;
      const signature = await signMessageAsync({ message });

      // Step 2: Send the signed payload to the API
      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: newAgentId,
          name: newAgentName,
          ownerAddress: address,
          signature,
          message,
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setNewAgentName('');
      setIsModalOpen(false);
      // Refresh the agents list
      fetchAgents();
    } catch (err: any) {
      console.error('Failed to create agent', err);
      if (err?.message?.includes('User rejected')) {
        setCreateError('Signature rejected. You must sign the message to register an agent.');
      } else {
        setCreateError(err?.message || 'Failed to register agent. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const Sidebar = () => (
    <div className="w-64 border-r border-[#2A302C] bg-[#0F1210] flex flex-col h-screen fixed top-0 left-0">
      <div className="h-16 flex items-center px-6 border-b border-[#2A302C]">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-syne font-bold text-xl text-white">Memory</span>
          <span className="font-syne font-normal text-xl text-[#5E7D7E]">OS</span>
        </Link>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1">
        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 px-2">Project Console</div>
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <LayoutGrid size={16} /> Overview
        </button>
        <button 
          onClick={() => setActiveTab('apikeys')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'apikeys' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Key size={16} /> API Keys
        </button>
        <button 
          onClick={() => setActiveTab('funding')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'funding' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Layers size={16} /> Compute Funding
        </button>
        <button 
          onClick={() => setActiveTab('studio')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'studio' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Database size={16} /> Memory Studio
        </button>
        <button 
          onClick={() => setActiveTab('snapshots')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'snapshots' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Camera size={16} /> Brain Snapshots
        </button>
        <button 
          onClick={() => setActiveTab('inference')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'inference' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <MessageSquare size={16} /> Inference Lab
        </button>
        <button 
          onClick={() => setActiveTab('manifest')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'manifest' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Cpu size={16} /> 0G Manifest
        </button>
        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-4 mb-2 px-2">Intelligence</div>
        <button 
          onClick={() => setActiveTab('dreams')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dreams' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Moon size={16} /> Agent Dreams
        </button>
        <button 
          onClick={() => setActiveTab('rag')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'rag' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Brain size={16} /> RAG Chat
        </button>
        <button 
          onClick={() => setActiveTab('vault')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'vault' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Shield size={16} /> Encrypted Vault
        </button>
        <button 
          onClick={() => setActiveTab('a2a')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'a2a' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Share2 size={16} /> A2A Sharing
        </button>
        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-4 mb-2 px-2">System</div>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-[#1A1F1C] text-white' : 'text-gray-400 hover:text-white hover:bg-[#151A17]'}`}
        >
          <Settings size={16} /> Settings
        </button>
      </div>

      <div className="p-4 border-t border-[#2A302C]">
        <div className="bg-[#151A17] rounded-lg p-3 border border-[#2A302C]">
          <div className="text-xs text-gray-400 mb-1">Current Network</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7A9E8E] shadow-[0_0_8px_rgba(122,158,142,0.5)]"></div>
            <span className="text-sm text-white font-medium">0G Galileo Testnet</span>
          </div>
        </div>
      </div>
    </div>
  );

  const Header = () => (
    <header className="h-16 border-b border-[#2A302C] bg-[#0F1210]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
        {isConnected ? 'Project' : 'System'} <ChevronRight size={14} /> 
        <span className="text-white">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
      </div>
      <div>
        <ConnectButton 
          showBalance={false}
          chainStatus="icon" 
        />
      </div>
    </header>
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0F1210] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5E7D7E] rounded-full blur-[120px] opacity-[0.03] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#151A17] border border-[#2A302C] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(94,125,126,0.05)]">
            <LayoutGrid size={24} className="text-[#5E7D7E]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Developer Console</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Connect your Web3 wallet to manage your AI agents, generate OpenClaw API keys, and monitor your 0G network storage usage.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const totalMemories = agents.reduce((acc, curr) => acc + (curr.memoryCount || 0), 0);

  return (
    <div className="min-h-screen bg-[#0F1210] flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col h-screen relative overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Header Area */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Agent Details</h1>
                <p className="text-gray-400 text-sm">Manage your deployed agents and their decentralized capabilities.</p>
              </div>
              {activeTab === 'overview' && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-[#5E7D7E] text-[#F4F1EE] px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#6E8D8E] transition-colors shadow-[0_0_15px_rgba(94,125,126,0.3)]"
                >
                  <Plus size={16} /> New Agent
                </button>
              )}
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 text-gray-400 mb-3 text-sm">
                      <LayoutGrid size={16} className="text-[#8B6F66]" /> Active Agents
                    </div>
                    <div className="text-3xl font-bold text-white">{agents.length}</div>
                  </div>
                  <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 text-gray-400 mb-3 text-sm">
                      <Database size={16} className="text-[#5E7D7E]" /> 0G Memories
                    </div>
                    <div className="text-3xl font-bold text-white">{totalMemories.toLocaleString()}</div>
                  </div>
                  <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 text-gray-400 mb-3 text-sm">
                      <Zap size={16} className="text-[#A67B73]" /> Executions
                    </div>
                    <div className="text-3xl font-bold text-white">{agents.reduce((acc, curr) => acc + (curr.totalReads || 0), 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Agent List */}
                <h2 className="text-lg font-semibold text-white mt-8 mb-4">Your Agents</h2>
                <div className="bg-[#151A17] border border-[#2A302C] rounded-xl overflow-hidden shadow-sm">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">
                      <Loader2 size={24} className="animate-spin mx-auto text-[#5E7D7E]" />
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center border-dashed border-2 border-[#2A302C] m-4 rounded-xl">
                      <LayoutGrid size={32} className="text-gray-600 mb-4" />
                      <h3 className="text-white font-medium mb-2">No agents found</h3>
                      <p className="text-gray-400 text-sm mb-4 max-w-sm">You haven't bound any AI agents to this wallet yet. Create one to get started.</p>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="text-[#5E7D7E] text-sm font-medium hover:underline"
                      >
                        Create your first agent
                      </button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#2A302C] bg-[#0F1210]">
                          <th className="text-left p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Name</th>
                          <th className="text-left p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Agent ID</th>
                          <th className="text-left p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Status</th>
                          <th className="text-right p-4 text-xs font-mono text-gray-500 uppercase tracking-widest">Memories</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.map(a => (
                          <tr key={a.agentId} className="border-b border-[#2A302C]/50 hover:bg-[#1A1F1C]/30 transition-colors">
                            <td className="p-4 font-medium text-white">{a.name}</td>
                            <td className="p-4 text-sm font-mono text-gray-400">{a.agentId}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#5E7D7E]/10 text-[#5E7D7E] border border-[#5E7D7E]/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#5E7D7E]"></div>
                                {a.identityHash ? 'Indexed on 0G' : 'Pending Storage'}
                              </span>
                            </td>
                            <td className="p-4 text-right text-gray-300 font-mono">{(a.memoryCount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* TAB CONTENT: API KEYS */}
            {activeTab === 'apikeys' && (
              <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white mb-2">OpenClaw API Keys</h2>
                <p className="text-sm text-gray-400 mb-6">Use these keys to authenticate your Python or Node.js agents with the MemoryOS infrastructure.</p>
                
                <div className="space-y-4">
                  {agents.length === 0 ? (
                     <div className="p-8 text-center border-dashed border-2 border-[#2A302C] rounded-xl">
                       <p className="text-gray-400 text-sm">Create an agent first to generate an API key.</p>
                     </div>
                  ) : agents.map(agent => (
                    <div key={agent.agentId} className="p-4 bg-[#0F1210] border border-[#2A302C] rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium text-white">{agent.name} <span className="text-gray-500 font-mono text-xs ml-2">({agent.agentId})</span></div>
                        <div className="text-xs text-gray-500 font-mono">Created: {new Date(agent.createdAt || (agent as any).registeredAt || Date.now()).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          value={agent.apiKey || 'No API key generated.'} 
                          readOnly 
                          className="flex-1 bg-[#151A17] border border-[#3D4540] rounded px-3 py-2 text-sm font-mono text-gray-300 focus:outline-none"
                        />
                        <button 
                          onClick={() => agent.apiKey && copyToClipboard(agent.apiKey, agent.agentId)}
                          disabled={!agent.apiKey}
                          className="px-3 py-2 bg-[#1A1F1C] border border-[#3D4540] rounded text-gray-300 hover:text-white hover:bg-[#2A302C] transition-colors disabled:opacity-50"
                        >
                          {copiedKey === agent.agentId ? <Check size={16} className="text-[#5E7D7E]" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setActiveTab('overview')}
                    className="flex items-center gap-2 bg-[#1A1F1C] border border-[#3D4540] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#2A302C] transition-colors"
                  >
                     Go to Overview to Manage Agents
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: COMPUTE FUNDING */}
            {activeTab === 'funding' && (
              <ComputeFundingTab />
            )}

            {/* TAB CONTENT: MEMORY STUDIO */}
            {activeTab === 'studio' && (
              <MemoryStudioTab agents={agents} />
            )}

            {/* TAB CONTENT: BRAIN SNAPSHOTS */}
            {activeTab === 'snapshots' && (
              <BrainSnapshotsTab agents={agents} />
            )}

            {/* TAB CONTENT: 0G INFERENCE LAB */}
            {activeTab === 'inference' && (
              <InferenceLabTab />
            )}

            {/* TAB CONTENT: 0G MANIFEST */}
            {activeTab === 'manifest' && (
              <ManifestStatusTab />
            )}

            {/* TAB CONTENT: AGENT DREAMS */}
            {activeTab === 'dreams' && (
              <AgentDreamsTab agents={agents} />
            )}

            {/* TAB CONTENT: RAG CHAT */}
            {activeTab === 'rag' && (
              <RAGChatTab agents={agents} />
            )}

            {/* TAB CONTENT: ENCRYPTED VAULT */}
            {activeTab === 'vault' && (
              <EncryptedVaultTab agents={agents} />
            )}

            {/* TAB CONTENT: A2A SHARING */}
            {activeTab === 'a2a' && (
              <A2ASharingTab agents={agents} />
            )}

            {/* TAB CONTENT: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-[#151A17] border border-[#2A302C] rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white mb-6">Project Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Address Bound</label>
                    <input 
                      type="text" 
                      value={address} 
                      disabled 
                      className="w-full max-w-md bg-[#0F1210] border border-[#2A302C] rounded-lg px-4 py-2 text-sm font-mono text-gray-500 opacity-70"
                    />
                  </div>
                  <hr className="border-[#2A302C]" />
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
                    <p className="text-xs text-gray-500 mb-4 max-w-md">Deleting your project will permanently orphan any agents and memories stored on the 0G Network linked to this wallet. This action cannot be reversed.</p>
                    <button className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">
                      Delete Project
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* NEW AGENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0F1210]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151A17] border border-[#2A302C] rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#2A302C]">
              <h3 className="text-xl font-bold text-white">Register New Agent</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAgent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Agent Name</label>
                  <input 
                    type="text" 
                    value={newAgentName}
                    onChange={e => setNewAgentName(e.target.value)}
                    placeholder="e.g. Sales Support Bot..."
                    className="w-full bg-[#0F1210] border border-[#3D4540] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#5E7D7E] transition-colors"
                    autoFocus
                    required
                  />
                </div>
                
                <div className="bg-[#5E7D7E]/10 border border-[#5E7D7E]/20 rounded-lg p-4 flex gap-3">
                  <Database size={20} className="text-[#5E7D7E] shrink-0" />
                  <p className="text-xs text-[#5E7D7E]/80 leading-relaxed">
                    This will permanently assign a unique on-chain identity for this agent on the 0G Network linked to your connected wallet.
                  </p>
                </div>

              {createError && (
                <div className="bg-[#C27065]/10 border border-[#C27065]/20 rounded-lg p-3 text-xs text-[#C27065] font-mono">
                  {createError}
                </div>
              )}
              </div>
              
              <div className="mt-8 flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1A1F1C] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !newAgentName.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#5E7D7E] text-[#F4F1EE] hover:bg-[#6E8D8E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(94,125,126,0.3)]"
                >
                  {isCreating ? (
                    <><Loader2 size={16} className="animate-spin" /> Registering...</>
                  ) : (
                    'Register Identity'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
