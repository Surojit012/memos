import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import crypto from 'crypto';

import { getUserByPrivyId, createUser } from '@/lib/db/client';

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function POST(req: Request) {
  try {
    const { privyToken } = await req.json();

    if (!privyToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the Privy access token
    let verifiedClaims;
    try {
      verifiedClaims = await privyClient.verifyAuthToken(privyToken);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = verifiedClaims.userId;

    // Check if user already exists
    const existingUser = await getUserByPrivyId(userId);
    if (existingUser) {
      return NextResponse.json({
        agentId: existingUser.agent_id,
        apiKey: existingUser.api_key,
        isNewUser: false,
        onboardingComplete: existingUser.onboarding_complete ?? false,
      });
    }

    // Generate agentId and apiKey for the new user
    const agentId = `agent_${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${crypto.randomBytes(4).toString('hex')}`;
    const apiKey = 'mk0s_' + crypto.randomUUID().replace(/-/g, '');

    if (!agentId || !apiKey) {
      console.error('[provision] Failed to generate credentials');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Persist the mapping
    await createUser(userId, agentId, apiKey);

    return NextResponse.json({
      agentId,
      apiKey,
      isNewUser: true,
      onboardingComplete: false,
    });
  } catch (err) {
    console.error('[provision] Error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
