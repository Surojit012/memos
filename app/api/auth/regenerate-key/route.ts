import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import crypto from 'crypto';

import { updateUserApiKey } from '@/lib/db/client';

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

    // Generate a new API key
    const newApiKey = 'mk0s_' + crypto.randomUUID().replace(/-/g, '');

    // Update the user's API key in the database
    await updateUserApiKey(userId, newApiKey);

    return NextResponse.json({ apiKey: newApiKey });
  } catch (err) {
    console.error('[regenerate-key] Error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
