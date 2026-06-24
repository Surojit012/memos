import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getUserByPrivyId } from '@/lib/db/client';
import { createApiKey, listApiKeys } from '@/lib/db/api-keys';

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

async function resolveUser(privyToken: string | null) {
  if (!privyToken) return null;
  try {
    const { userId } = await privyClient.verifyAuthToken(privyToken);
    return await getUserByPrivyId(userId);
  } catch {
    return null;
  }
}

function readToken(req: Request, body?: { privyToken?: string }): string | null {
  return (
    body?.privyToken ||
    req.headers.get('Authorization')?.replace('Bearer ', '') ||
    null
  );
}

/** GET /api/auth/keys?privyToken=… — list keys for the logged-in user. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('privyToken') || readToken(req);
  const user = await resolveUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const keys = await listApiKeys(user.agent_id);
    return NextResponse.json({ agentId: user.agent_id, keys });
  } catch (err) {
    const msg = (err as Error).message || 'Failed to list keys';
    if (/PGRST205|could not find the table|api_keys/i.test(msg)) {
      return NextResponse.json(
        { error: 'API keys table is missing. Run the migration in lib/db/schema.sql against your Supabase project.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/auth/keys — body: { privyToken, name }. Returns plaintext ONCE. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = readToken(req, body);
  const user = await resolveUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const name = typeof body.name === 'string' ? body.name : '';
  if (!name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const { plaintext, record } = await createApiKey(user.id, user.agent_id, name);
    // Plaintext is returned once. The client must show it to the user immediately
    // and never persist it server-side beyond the hash already stored.
    return NextResponse.json({ key: record, plaintext }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message || 'Failed to create key';
    // Surface the most common setup error in plain language.
    if (/PGRST205|could not find the table|api_keys/i.test(msg)) {
      return NextResponse.json(
        { error: 'API keys table is missing. Run the migration in lib/db/schema.sql against your Supabase project.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
