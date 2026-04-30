import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation | MemoryOS — Build with 0G-Native AI Infrastructure',
  description: 'Developer documentation for MemoryOS. API reference, prompt templates, deployed smart contracts, and resources for building autonomous AI agents on 0G Network.',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
