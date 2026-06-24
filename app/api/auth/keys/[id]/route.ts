import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getUserByPrivyId } from '@/lib/db/client';
import { revokeApiKey } from '@/lib/db/api-keys';

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

/** DELETE /api/auth/keys/[id] — soft-revoke a key the caller owns. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as { privyToken?: string }));
  const token =
    body.privyToken ||
    req.headers.get('Authorization')?.replace('Bearer ', '') ||
    null;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let userId: string;
  try {
    ({ userId } = await privyClient.verifyAuthToken(token));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserByPrivyId(userId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ok = await revokeApiKey(params.id, user.id);
  if (!ok) {
    return NextResponse.json(
      { error: 'Key not found, already revoked, or not yours.' },
      { status: 404 }
    );
  }
  return NextResponse.json({ revoked: true });
}
