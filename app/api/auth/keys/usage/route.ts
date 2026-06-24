import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getUserByPrivyId } from '@/lib/db/client';
import { getUsageAnalytics } from '@/lib/db/api-keys';

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

async function resolveUser(token: string | null) {
  if (!token) return null;
  try {
    const { userId } = await privyClient.verifyAuthToken(token);
    return await getUserByPrivyId(userId);
  } catch {
    return null;
  }
}

/** GET /api/auth/keys/usage?privyToken=…&range=daily|weekly|monthly */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('privyToken') || req.headers.get('Authorization')?.replace('Bearer ', '') || null;
  const user = await resolveUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rangeParam = searchParams.get('range');
  const range = rangeParam === 'weekly' || rangeParam === 'monthly' ? rangeParam : 'daily';

  try {
    const analytics = await getUsageAnalytics(user.agent_id, range);
    return NextResponse.json(analytics);
  } catch (err) {
    const msg = (err as Error).message || 'Failed to load usage';
    if (/PGRST205|could not find the table|usage_daily/i.test(msg)) {
      return NextResponse.json(
        { error: 'Usage table is missing. Run lib/db/migrations/003_usage_daily.sql in Supabase.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
