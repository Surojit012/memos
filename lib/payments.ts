import { ethers } from 'ethers'
import { get0GNetworkConfig } from './0g-network'
import { SKILL_PAYMENT_ESCROW_ABI } from './payment-abi'
import { PaymentVerification, Skill } from './types'

function getContractAddress() {
  const network = get0GNetworkConfig()
  const address = network.paymentContractAddress
  if (!address) {
    throw new Error('NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS is missing. Deploy the escrow contract and set the address.')
  }
  return address
}

function getPlatformWalletAddress() {
  const network = get0GNetworkConfig()
  if (!network.platformWalletAddress) {
    throw new Error('PLATFORM_WALLET_ADDRESS is missing. Add it to .env.local for payment verification.')
  }
  return network.platformWalletAddress
}

export function getSkillPaymentAmountWei(skill: Skill) {
  return ethers.parseUnits(skill.price || '0', 18)
}

export function prepareSkillPayment(skill: Skill) {
  const amountWei = getSkillPaymentAmountWei(skill)
  const network = get0GNetworkConfig()

  return {
    paymentRequired: amountWei > BigInt(0),
    skillId: skill.id,
    amountOg: skill.price,
    amountWei: amountWei.toString(),
    publisherAddress: skill.publisherAddress,
    platformAddress: getPlatformWalletAddress(),
    contractAddress: getContractAddress(),
    chainId: network.chainId,
    chainExplorerBase: network.chainExplorerBase,
  }
}

export async function verifySkillPaymentTransaction(skill: Skill, txHash: string): Promise<PaymentVerification> {
  const network = get0GNetworkConfig()
  const expectedAmountWei = getSkillPaymentAmountWei(skill)
  const provider = new ethers.JsonRpcProvider(network.rpcUrl)
  const receipt = await provider.getTransactionReceipt(txHash)

  if (!receipt) {
    throw new Error('Payment transaction receipt not found yet. Wait for confirmation and try again.')
  }
  if (receipt.status !== 1) {
    throw new Error('Payment transaction failed on-chain.')
  }

  const iface = new ethers.Interface(SKILL_PAYMENT_ESCROW_ABI)
  const contractAddress = getContractAddress().toLowerCase()
  const platformAddress = getPlatformWalletAddress().toLowerCase()

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress) continue

    try {
      const parsed = iface.parseLog(log)
      if (parsed?.name !== 'SkillPaymentExecuted') continue

      const grossAmount = parsed.args.grossAmount as bigint
      const publisherAmount = parsed.args.publisherAmount as bigint
      const platformFee = parsed.args.platformFee as bigint
      const skillId = String(parsed.args.skillId)
      const payer = String(parsed.args.payer)
      const publisher = String(parsed.args.publisher)
      const platform = String(parsed.args.platform)

      if (skillId !== skill.id) continue
      if (publisher.toLowerCase() !== skill.publisherAddress.toLowerCase()) {
        throw new Error('Payment publisher does not match the skill publisher.')
      }
      if (platform.toLowerCase() !== platformAddress) {
        throw new Error('Payment platform recipient does not match the configured platform wallet.')
      }
      if (grossAmount !== expectedAmountWei) {
        throw new Error('Payment amount does not match the skill price.')
      }

      const expectedFee = (expectedAmountWei * BigInt(5)) / BigInt(100)
      const expectedPublisherAmount = expectedAmountWei - expectedFee

      if (platformFee !== expectedFee || publisherAmount !== expectedPublisherAmount) {
        throw new Error('Payment split does not match the expected 95/5 payout.')
      }

      return {
        txHash,
        skillId,
        payer,
        publisherAddress: publisher,
        platformAddress: platform,
        grossAmountWei: grossAmount.toString(),
        publisherAmountWei: publisherAmount.toString(),
        platformFeeWei: platformFee.toString(),
        blockNumber: receipt.blockNumber,
        chainId: network.chainId,
        verifiedAt: Date.now(),
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('match')) throw error
    }
  }

  throw new Error('No valid SkillPaymentExecuted event was found for this transaction.')
}
