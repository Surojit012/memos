import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getUserByPrivyId, updateAgentName } from '@/lib/db/client';

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

/**
 * POST /api/auth/agent-name — body: { privyToken, name }.
 * Sets or renames the display name for the caller's agent. The agent_id
 * (the real auth key) is never changed, so existing keys keep working.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token: string | null =
    body?.privyToken ||
    req.headers.get('Authorization')?.replace('Bearer ', '') ||
    null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    ({ userId } = await privyClient.verifyAuthToken(token));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: 'name must be 120 characters or fewer' }, { status: 400 });
  }

  try {
    const existing = await getUserByPrivyId(userId);
    if (!existing) {
      return NextResponse.json({ error: 'No agent found for this account' }, { status: 404 });
    }
    const updated = await updateAgentName(userId, name);
    return NextResponse.json({ agentId: updated.agent_id, agentName: updated.agent_name });
  } catch (err) {
    const msg = (err as Error).message || 'Failed to set agent name';
    if (/agent_name|column .* does not exist/i.test(msg)) {
      return NextResponse.json(
        { error: 'agent_name column is missing. Run lib/db/migrations/002_agent_name.sql in Supabase.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
