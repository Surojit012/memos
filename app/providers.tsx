'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, sepolia } from 'wagmi/chains';

// 0G Galileo Testnet
const galileo = {
  id: 16602,
  name: 'Galileo Testnet',
  nativeCurrency: {
    decimals: 18,
    name: '0G',
    symbol: 'A0GI', // Testnet token
  },
  rpcUrls: {
    public: { http: ['https://rpc-testnet.0g.ai'] },
    default: { http: ['https://rpc-testnet.0g.ai'] },
  },
  blockExplorers: {
    default: { name: '0G Scan', url: 'https://scan-testnet.0g.ai' },
  },
} as const;

const config = getDefaultConfig({
  appName: 'MemoryOS',
  projectId: 'ee8bdf88651a5c2826a761e1141ef366', // WalletConnect Cloud Project ID
  chains: [galileo, mainnet, sepolia],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#5E7D7E',
            accentColorForeground: '#F4F1EE',
            borderRadius: 'medium',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
