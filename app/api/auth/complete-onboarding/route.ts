import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

import { markOnboardingComplete } from '@/lib/db/client';

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

    let verifiedClaims;
    try {
      verifiedClaims = await privyClient.verifyAuthToken(privyToken);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = verifiedClaims.userId;

    await markOnboardingComplete(userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[complete-onboarding] Error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
