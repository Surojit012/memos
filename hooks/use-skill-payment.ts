'use client';

import { useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { SKILL_PAYMENT_ESCROW_ABI } from '@/lib/payment-abi';

/**
 * Drives the on-chain payment for a paid skill, end to end:
 *
 *   1. POST /api/pay { action: 'prepare' }  → contract address, recipients, amount, chainId
 *   2. Switch the user's wallet to the 0G chain (best-effort).
 *   3. Send `executeSkillPayment(...)` payable with value = price (native OG).
 *   4. Wait for the tx to actually MINE before returning — the backend verifier
 *      reads the receipt, so handing it an unmined hash would 402.
 *
 * Returns the confirmed txHash. The caller passes that to /api/execute as
 * paymentProof.txHash. This uses the Privy wallet (the app's auth layer) via its
 * EIP-1193 provider + ethers — no wagmi provider tree required.
 */
export function useSkillPayment() {
  const { wallets } = useWallets();

  const payForSkill = useCallback(
    async (skillId: string, onStatus?: (status: string) => void): Promise<string> => {
      // 1. Ask the server how much, to whom, on which chain.
      onStatus?.('Preparing payment…');
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare', skillId }),
      });
      const prep = await res.json();
      if (!res.ok) throw new Error(prep.error || 'Failed to prepare payment.');

      const { contractAddress, publisherAddress, platformAddress, amountWei, chainId } = prep;
      if (!contractAddress || !publisherAddress || !platformAddress || !amountWei) {
        throw new Error('Payment is not configured for this skill (missing contract or payout address).');
      }

      // 2. The user must have a wallet connected (embedded or external).
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error('No wallet connected. Log in with a wallet to pay for this skill.');
      }

      // 3. Make sure the wallet is on the 0G testnet chain. Privy prompts the
      //    user to add/switch if needed.
      onStatus?.('Switching to the 0G testnet…');
      try {
        await wallet.switchChain(chainId);
      } catch {
        /* user may already be on the chain, or will be prompted during send */
      }

      // 4. Open the wallet's provider and HARD-VERIFY the active chain before we
      //    move any funds. If the wallet is still on a different network (e.g. a
      //    real mainnet), abort — we must never send a payment off the intended
      //    0G testnet, even if switchChain silently failed.
      const eip1193 = await wallet.getEthereumProvider();
      const provider = new ethers.BrowserProvider(eip1193);
      const activeChainId = Number((await provider.getNetwork()).chainId);
      if (activeChainId !== Number(chainId)) {
        throw new Error(
          `Wrong network: your wallet is on chain ${activeChainId}, but payments must be on the 0G testnet (chain ${chainId}). Switch networks in your wallet and try again.`
        );
      }

      // 5. Send the payable payment through the wallet's own provider.
      onStatus?.('Confirm the payment in your wallet…');
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, SKILL_PAYMENT_ESCROW_ABI, signer);

      const tx = await contract.executeSkillPayment(
        skillId,
        publisherAddress,
        platformAddress,
        amountWei,
        { value: amountWei }
      );

      // 6. Wait for it to mine — the server-side verifier needs the receipt.
      onStatus?.('Waiting for on-chain confirmation…');
      const receipt = await tx.wait();
      const txHash: string = receipt?.hash ?? tx.hash;
      if (!txHash) throw new Error('Payment sent but no transaction hash was returned.');
      return txHash;
    },
    [wallets]
  );

  return { payForSkill, hasWallet: wallets.length > 0 };
}
