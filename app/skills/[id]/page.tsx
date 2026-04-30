'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ethers } from 'ethers'
import { getChainTxExplorerUrl, getPublic0GNetworkConfig } from '@/lib/0g-network'
import { SKILL_PAYMENT_ESCROW_ABI } from '@/lib/payment-abi'
import { Skill, ComputeProvider, ZGComputeService } from '@/lib/types'

const PUBLIC_0G = getPublic0GNetworkConfig()

type ExecutionMeta = {
  tokens?: number
  node?: string
  fee?: string
  model?: string
  paymentTxHash?: string
  computeProvider?: ComputeProvider
  zgProviderAddress?: string
  zgChatID?: string
  zgVerified?: boolean
}

const PROVIDER_INFO: Record<ComputeProvider, { label: string; desc: string; color: string; icon: string }> = {
  fireworks:    { label: 'Fireworks AI',  desc: 'Centralized · Fast · Low latency',       color: '#F97316', icon: '🔥' },
  '0g-router':  { label: '0G Router',    desc: 'Decentralized · Auto-failover · Simple',  color: '#7A9E8E', icon: '◉' },
  '0g-compute': { label: '0G Direct',    desc: 'Decentralized · TEE Verified · On-chain', color: '#5E7D7E', icon: '⬡' },
}

export default function SkillDetailPage() {
  const { id } = useParams()
  const [skill, setSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [meta, setMeta] = useState<ExecutionMeta | null>(null)
  const [error, setError] = useState('')
  const [runStatus, setRunStatus] = useState('')

  // ── Hybrid Compute Provider State ──
  const [computeProvider, setComputeProvider] = useState<ComputeProvider>('fireworks')
  const [zgProviders, setZgProviders] = useState<ZGComputeService[]>([])
  const [selectedZgProvider, setSelectedZgProvider] = useState('')
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [availableProviders, setAvailableProviders] = useState<ComputeProvider[]>([])

  useEffect(() => {
    fetch('/api/skills', { cache: 'no-store' }).then(r => r.json()).then(d => {
      const found = d.skills?.find((s: Skill) => s.id === id)
      setSkill(found ?? null)
      setLoading(false)
    })
  }, [id])

  // Detect available providers
  useEffect(() => {
    fetch('/api/execute', { method: 'OPTIONS' }).catch(() => {})
    // Just set all three as potentially available; the backend will error if not configured
    setAvailableProviders(['fireworks', '0g-compute'])
  }, [])

  // Load 0G providers when user selects 0g-compute
  useEffect(() => {
    if (computeProvider === '0g-compute' && zgProviders.length === 0) {
      setLoadingProviders(true)
      fetch('/api/compute/providers?type=chatbot')
        .then(r => r.json())
        .then(d => {
          setZgProviders(d.providers || [])
          if (d.providers?.length > 0 && !selectedZgProvider) {
            setSelectedZgProvider(d.providers[0].provider)
          }
        })
        .catch(() => setZgProviders([]))
        .finally(() => setLoadingProviders(false))
    }
  }, [computeProvider, zgProviders.length, selectedZgProvider])

  async function ensureWalletOnChain(chainId: number) {
    const ethereum = (window as any).ethereum
    if (!ethereum) throw new Error('A wallet like MetaMask is required for paid skill execution.')

    const chainIdHex = `0x${chainId.toString(16)}`
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })
    } catch (error: any) {
      if (error?.code !== 4902) throw error

      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainIdHex,
          chainName: PUBLIC_0G.label,
          nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
          rpcUrls: [PUBLIC_0G.rpcUrl],
          blockExplorerUrls: [PUBLIC_0G.chainExplorerBase],
        }],
      })
    }
  }

  async function runSkill() {
    if (!input.trim() || !skill) return

    setRunning(true)
    setOutput('')
    setError('')
    setMeta(null)
    setRunStatus('')

    try {
      let paymentProof: any = undefined
      let paymentTxHash: string | undefined
      const paidSkill = parseFloat(skill.price) > 0

      if (paidSkill) {
        setRunStatus('Preparing on-chain payment...')
        const prepareRes = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'prepare', skillId: skill.id }),
        })
        const prepare = await prepareRes.json()
        if (!prepareRes.ok) throw new Error(prepare.error)

        await ensureWalletOnChain(prepare.chainId)
        setRunStatus('Waiting for Agent to sign deposit (MetaMask)...')

        const browserProvider = new ethers.BrowserProvider((window as any).ethereum)
        const signer = await browserProvider.getSigner()
        const contract = new ethers.Contract(
          prepare.contractAddress,
          SKILL_PAYMENT_ESCROW_ABI,
          signer
        )

        const tx = await contract.executeSkillPayment(
          prepare.skillId,
          prepare.publisherAddress,
          prepare.platformAddress,
          BigInt(prepare.amountWei),
          { value: BigInt(prepare.amountWei) }
        )

        setRunStatus('Broadcasting Escrow to Galileo Testnet (0G EVM)...')
        const receipt = await tx.wait()
        paymentTxHash = receipt?.hash || tx.hash

        const verifyRes = await fetch('/api/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', skillId: skill.id, txHash: paymentTxHash }),
        })
        const verify = await verifyRes.json()
        if (!verifyRes.ok) throw new Error(verify.error)
        paymentProof = verify.paymentProof
        setRunStatus('Payment verified on 0G. Running skill...')
      } else {
        const providerLabel = PROVIDER_INFO[computeProvider].label
        setRunStatus(`Running skill via ${providerLabel}...`)
      }

      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: skill.id,
          userInput: input,
          paymentProof,
          computeProvider,
          zgProviderAddress: computeProvider === '0g-compute' ? selectedZgProvider : undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setOutput(d.output)
      setMeta({
        tokens: d.tokensUsed,
        node: d.computeNode,
        fee: d.fee,
        model: d.model,
        paymentTxHash: d.paymentTxHash || paymentTxHash,
        computeProvider: d.computeProvider,
        zgProviderAddress: d.zgProviderAddress,
        zgChatID: d.zgChatID,
        zgVerified: d.zgVerified,
      })
      setRunStatus(paymentTxHash ? 'On-chain payment verified and execution completed.' : 'Execution completed.')
    } catch (e: any) {
      setError(e.message)
      setRunStatus('')
    } finally {
      setRunning(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (!skill) return (
    <div className="empty" style={{ paddingTop: 120 }}>
      <div className="empty-title">Skill not found</div>
      <Link href="/skills" className="btn btn-primary" style={{ marginTop: 16 }}>← Back to Skills</Link>
    </div>
  )

  const paidSkill = parseFloat(skill.price) > 0
  const activeProviderInfo = PROVIDER_INFO[computeProvider]

  return (
    <>
      <nav className="nav flex items-center justify-between px-6 lg:px-8 py-4 border-b border-[#2A302C] bg-[rgba(15,18,16,0.9)] backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-display text-xl font-bold text-[#5E7D7E] tracking-tight">
          Memory<span className="text-[#5A6460] font-normal">OS</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/skills" className="text-sm font-medium text-[#8A9490] hover:text-[#F4F1EE] transition-colors">← Skills</Link>
        </div>
      </nav>

      <div className="page" style={{ maxWidth: 780, paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ marginBottom: 36 }}>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="px-3 py-1 rounded-lg bg-[#8B6F66]/10 text-[#8B6F66] border border-[#8B6F66]/20 font-mono text-[10px] uppercase tracking-wider">{skill.category}</span>
            {skill.storageHash?.startsWith('0x') ? (
              <a
                href={`${PUBLIC_0G.storageExplorerBase}/${skill.storageHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#5E7D7E]/10 border border-[#5E7D7E]/20 text-[#5E7D7E] font-mono text-[10px] hover:bg-[#5E7D7E]/20 transition-all"
              >
                ⬡ Verified on 0G Explorer ↗
              </a>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-[#A67B73]/10 border border-[#A67B73]/20 text-[#A67B73] font-mono text-[10px]">⬡ Uploading to 0G...</span>
            )}
            {paidSkill && <span className="px-3 py-1 rounded-lg bg-[#A67B73]/10 border border-[#A67B73]/20 text-[#A67B73] font-mono text-[10px]">⬡ On-chain payment required</span>}
          </div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12, lineHeight: 1.1 }}>
            {skill.name}
          </div>
          <div style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {skill.description}
          </div>
          <div className="flex gap-6 font-mono text-xs text-[#5A6460] flex-wrap items-center">
            <span>by <strong className="text-[#8A9490]">{skill.publisherName}</strong></span>
            <span className="w-1 h-1 rounded-full bg-[#2A302C]" />
            <span>{skill.usageCount} executions</span>
            <span className="w-1 h-1 rounded-full bg-[#2A302C]" />
            <span>{skill.totalEarned.toFixed(4)} OG earned</span>
            <span className="w-1 h-1 rounded-full bg-[#2A302C]" />
            <span className="text-[#5E7D7E] font-bold">{paidSkill ? `${skill.price} OG per run` : 'Free skill'}</span>
          </div>
          {paidSkill && (
            <div className="mt-4 p-3 bg-[#A67B73]/5 border border-[#A67B73]/20 rounded-xl text-[10px] font-mono text-[#8A9490] inline-flex items-center gap-4">
              <span className="flex items-center gap-2">Publisher Earnings: <strong className="text-[#A67B73]">{(parseFloat(skill.price) * 0.95).toFixed(5)} OG</strong> (95%)</span>
              <span className="text-[#2A302C]">/</span>
              <span className="flex items-center gap-2">Network Escrow Fee: <strong className="text-[#5A6460]">{(parseFloat(skill.price) * 0.05).toFixed(5)} OG</strong> (5%)</span>
            </div>
          )}
        </div>

        {skill.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 32 }}>
            {skill.tags.map(t => <span key={t} className="skill-tag">#{t}</span>)}
          </div>
        )}

        {/* ── COMPUTE PROVIDER SELECTOR ── */}
        <div className="box" style={{ marginBottom: 20 }}>
          <div className="box-title" style={{ marginBottom: 16 }}>Compute Provider</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {availableProviders.map(provider => {
              const info = PROVIDER_INFO[provider]
              const isActive = computeProvider === provider
              return (
                <button
                  key={provider}
                  onClick={() => setComputeProvider(provider)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
                    borderRadius: 14, border: `2px solid ${isActive ? info.color : '#2A302C'}`,
                    background: isActive ? `${info.color}10` : '#0F1210',
                    cursor: 'pointer', transition: 'all 0.2s',
                    flex: '1 1 160px', minWidth: 160,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{info.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, fontFamily: 'var(--display)',
                      color: isActive ? info.color : '#8A9490',
                    }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#5A6460', lineHeight: 1.4 }}>
                      {info.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 0G Provider selector */}
          {computeProvider === '0g-compute' && (
            <div style={{ 
              background: '#0F1210', border: '1px solid #3D4540', borderRadius: 12, padding: 16,
              animation: 'fadeIn 0.3s ease-out',
            }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#5E7D7E', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5E7D7E', boxShadow: '0 0 8px rgba(94,125,126,0.5)' }} />
                DECENTRALIZED PROVIDER SELECTION
              </div>
              {loadingProviders ? (
                <div style={{ color: '#5A6460', fontSize: 12, fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 14, height: 14 }} /> Discovering providers on 0G Network...
                </div>
              ) : zgProviders.length === 0 ? (
                <div style={{ color: '#C27065', fontSize: 12, fontFamily: 'var(--mono)' }}>
                  No chatbot providers discovered. The network may be temporarily unavailable.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {zgProviders.slice(0, 5).map(p => (
                    <button
                      key={p.provider}
                      onClick={() => setSelectedZgProvider(p.provider)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 10,
                        border: `1px solid ${selectedZgProvider === p.provider ? '#5E7D7E' : '#2A302C'}`,
                        background: selectedZgProvider === p.provider ? 'rgba(94,125,126,0.08)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#F4F1EE', wordBreak: 'break-all' }}>
                          {p.provider.slice(0, 8)}...{p.provider.slice(-6)}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#5A6460', marginTop: 2 }}>
                          {p.model}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.verifiability === 'TeeML' && (
                          <span style={{
                            fontSize: 9, fontFamily: 'var(--mono)', padding: '3px 8px', borderRadius: 20,
                            background: 'rgba(122,158,142,0.1)', color: '#7A9E8E', border: '1px solid rgba(122,158,142,0.25)',
                          }}>
                            TEE ✓
                          </span>
                        )}
                        <span style={{
                          fontSize: 10, fontFamily: 'var(--mono)',
                          color: selectedZgProvider === p.provider ? '#5E7D7E' : '#5A6460',
                        }}>
                          {selectedZgProvider === p.provider ? '● Selected' : '○'}
                        </span>
                      </div>
                    </button>
                  ))}
                  {zgProviders.length > 5 && (
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#5A6460', textAlign: 'center', padding: 4 }}>
                      +{zgProviders.length - 5} more providers available
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── INPUT & EXECUTE ── */}
        <div className="box">
          <div className="box-title">Input — {skill.inputLabel}</div>
          <textarea className="form-textarea" style={{ marginBottom: 14, minHeight: 120 }}
            placeholder={skill.inputLabel} value={input} onChange={e => setInput(e.target.value)} />
          <button
            className="w-full py-4 rounded-2xl font-bold text-sm hover:scale-[1.01] transition-all shadow-lg"
            style={{
              background: activeProviderInfo.color,
              color: '#fff',
              boxShadow: `0 4px 20px ${activeProviderInfo.color}20`,
            }}
            onClick={runSkill} disabled={running || !input.trim()}
          >
            {running
              ? <><span className="spinner" /> {runStatus || 'Processing...'}</>
              : paidSkill
                ? `Pay on 0G + Run via ${activeProviderInfo.label} — ${skill.price} OG`
                : `Run via ${activeProviderInfo.label} ${activeProviderInfo.icon}`}
          </button>
          {paidSkill && (
            <div className="form-hint" style={{ marginTop: 10 }}>
              Wallet flow: approve payment on 0G Chain, wait for confirmation, then MemoryOS verifies the tx before execution.
            </div>
          )}
        </div>

        {/* ── OUTPUT ── */}
        {(output || error || running || runStatus) && (
          <div className="box">
            <div className="box-title">Output — {skill.outputLabel}</div>
            {runStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12, marginBottom: output || error ? 14 : 0 }}>
                {running && <span className="spinner" />}
                <span>{runStatus}</span>
              </div>
            )}
            {error && <div style={{ color: 'var(--coral)', fontFamily: 'var(--mono)', fontSize: 12 }}>Error: {error}</div>}
            {output && (
              <>
                <div className="result-box">{output}</div>
                {meta && (
                  <div className="result-meta" style={{ flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: meta.computeProvider === '0g-compute' ? '#5E7D7E' : meta.computeProvider === 'fireworks' ? '#F97316' : '#8B6F66',
                      }} />
                      {meta.computeProvider ? PROVIDER_INFO[meta.computeProvider].label : meta.node}
                    </span>
                    <span>Tokens: {meta.tokens}</span>
                    <span>Platform fee: {meta.fee} OG</span>
                    {meta.model && <span>Model: {meta.model}</span>}
                    {/* 0G Compute Specific */}
                    {meta.zgProviderAddress && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>
                        Provider: {meta.zgProviderAddress.slice(0, 8)}...{meta.zgProviderAddress.slice(-4)}
                      </span>
                    )}
                    {meta.zgVerified !== undefined && (
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 12,
                        background: meta.zgVerified ? 'rgba(122,158,142,0.1)' : 'rgba(194,112,101,0.1)',
                        color: meta.zgVerified ? '#7A9E8E' : '#C27065',
                        border: `1px solid ${meta.zgVerified ? 'rgba(122,158,142,0.25)' : 'rgba(194,112,101,0.25)'}`,
                      }}>
                        {meta.zgVerified ? 'TEE Verified ✓' : 'Unverified'}
                      </span>
                    )}
                    {meta.paymentTxHash && (
                      <a href={getChainTxExplorerUrl(meta.paymentTxHash)} target="_blank" rel="noreferrer" className="hash-live">
                        Payment tx ↗
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <details style={{ marginTop: 24 }}>
          <summary style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', cursor: 'pointer', userSelect: 'none' }}>
            View system prompt (transparency)
          </summary>
          <pre className="code-block" style={{ marginTop: 12, borderLeft: '3px solid var(--purple)' }}>{skill.prompt}</pre>
        </details>
      </div>
    </>
  )
}
