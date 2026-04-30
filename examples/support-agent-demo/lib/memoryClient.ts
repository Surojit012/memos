import { MemoryOSClient } from 'memoryos-openclaw'

// Initialize the 0G-native memory client
export const memoryClient = new MemoryOSClient({
  apiUrl: process.env.NEXT_PUBLIC_MEMORYOS_URL || 'http://localhost:3000',
  agentId: process.env.NEXT_PUBLIC_AGENT_ID || '',
  headers: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
  }
})
