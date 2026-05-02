'use client';

import { useState, useCallback, useEffect } from 'react';
import { useEthersSigner } from './ethers-adapter';
import { createZGComputeNetworkBroker, ZGComputeNetworkBroker } from '@0gfoundation/0g-compute-ts-sdk';

export function useComputeBroker() {
  const signer = useEthersSigner();
  const [broker, setBroker] = useState<ZGComputeNetworkBroker | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!signer) return;
      setIsInitializing(true);
      setError(null);
      try {
        const b = await createZGComputeNetworkBroker(signer);
        setBroker(b);
      } catch (err: any) {
        console.error('Failed to initialize 0G Broker:', err);
        setError(err.message || 'Failed to initialize compute broker');
      } finally {
        setIsInitializing(false);
      }
    }
    
    init();
  }, [signer]);

  const getLedger = useCallback(async () => {
    if (!broker) throw new Error('Broker not initialized');
    return broker.ledger.getLedger();
  }, [broker]);

  const deposit = useCallback(async (amount0G: number) => {
    if (!broker) throw new Error('Broker not initialized');
    // depositFund takes the amount in 0G tokens
    return broker.ledger.depositFund(amount0G);
  }, [broker]);

  const transferToProvider = useCallback(async (providerAddress: string, amount0G: number) => {
    if (!broker) throw new Error('Broker not initialized');
    // transferFund expects the amount in neurons (10^18)
    const amountNeurons = BigInt(amount0G * 1e18);
    return broker.ledger.transferFund(providerAddress, 'inference', amountNeurons);
  }, [broker]);

  const addLedger = useCallback(async (amount0G: number) => {
    if (!broker) throw new Error('Broker not initialized');
    return broker.ledger.addLedger(amount0G);
  }, [broker]);

  return {
    broker,
    isInitializing,
    error,
    getLedger,
    deposit,
    addLedger,
    transferToProvider
  };
}
