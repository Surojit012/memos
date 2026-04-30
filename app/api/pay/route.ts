import { NextRequest, NextResponse } from 'next/server'
import { getPaymentVerification, getSkillById, markPaymentVerified } from '@/lib/store'
import { prepareSkillPayment, verifySkillPaymentTransaction } from '@/lib/payments'
import { ensureHydrated } from '@/lib/hydration'
import { SKILL_PAYMENT_ESCROW_ABI } from '@/lib/payment-abi'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await ensureHydrated()
    const { action = 'prepare', skillId, txHash } = await req.json()
    if (!skillId) {
      return NextResponse.json({ error: 'skillId is required' }, { status: 400 })
    }

    const skill = getSkillById(skillId)
    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    if (action === 'prepare') {
      const payment = prepareSkillPayment(skill)
      return NextResponse.json({
        ...payment,
        contractAbi: SKILL_PAYMENT_ESCROW_ABI,
      })
    }

    if (action === 'verify') {
      if (!txHash) {
        return NextResponse.json({ error: 'txHash is required for payment verification' }, { status: 400 })
      }

      const existing = getPaymentVerification(txHash)
      const verification = existing || await verifySkillPaymentTransaction(skill, txHash)
      if (!existing) markPaymentVerified(verification)

      return NextResponse.json({
        valid: true,
        paymentProof: verification,
        alreadyUsed: !!verification.consumedAt,
      })
    }

    return NextResponse.json({ error: 'Unsupported action. Use "prepare" or "verify".' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
