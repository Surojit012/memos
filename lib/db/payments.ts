import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Durable replay-protection for skill payments.
 *
 * The in-memory reservation set in lib/store.ts protects against concurrent
 * double-spend WITHIN a single process, but it's wiped on restart — so a used
 * txHash could be replayed after a redeploy. This module persists consumed
 * txHashes in Supabase so a payment can never be reused, even across restarts.
 *
 * Everything here degrades gracefully: if the table/env is missing, callers
 * fall back to in-memory-only protection (with a warning) rather than blocking
 * legitimate executions. Run lib/db/migrations/005_consumed_payments.sql to
 * enable durable protection.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Has this txHash already been consumed by a prior execution? Returns false on
 * any error (table missing, network) so we don't block on the durable check —
 * the in-memory guard still applies.
 */
export async function isPaymentConsumedDurable(txHash: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    const { data, error } = await client
      .from('consumed_payments')
      .select('tx_hash')
      .eq('tx_hash', txHash.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[payments] durable consume check failed (allowing):', error.message);
      return false;
    }
    return !!data;
  } catch (e: any) {
    console.warn('[payments] durable consume check threw (allowing):', e.message);
    return false;
  }
}

/**
 * Persist a consumed txHash. Best-effort: a failure here is logged but does not
 * fail the execution (the payment already happened and the user got their
 * result). The in-memory guard covers the rest of this process's lifetime.
 */
export async function markPaymentConsumedDurable(
  txHash: string,
  skillId: string
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client
      .from('consumed_payments')
      .insert({ tx_hash: txHash.toLowerCase(), skill_id: skillId });
    if (error && error.code !== '23505') {
      // 23505 = unique violation = already recorded; that's fine.
      console.warn('[payments] durable consume write failed:', error.message);
    }
  } catch (e: any) {
    console.warn('[payments] durable consume write threw:', e.message);
  }
}
