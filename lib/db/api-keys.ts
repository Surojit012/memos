import 'server-only';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface ApiKeyRecord {
  id: string;
  user_id: number;
  agent_id: string;
  name: string;
  prefix: string;
  hashed_key: string;
  request_count: number;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

/** Public DTO — never includes the hashed secret. */
export type ApiKeyView = Omit<ApiKeyRecord, 'hashed_key' | 'user_id'>;

const KEY_PREFIX = 'mk0s_';

/** SHA-256 the plaintext key. Used for at-rest storage and constant-time-ish lookup. */
export function hashApiKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

/** Generate a fresh secret. Returns the plaintext — caller must show it ONCE. */
export function mintApiKey(): { plaintext: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString('hex'); // 48 chars
  const plaintext = KEY_PREFIX + random;
  return {
    plaintext,
    prefix: plaintext.slice(0, 12), // e.g. "mk0s_4f2a89"
    hash: hashApiKey(plaintext),
  };
}

function strip(rec: ApiKeyRecord): ApiKeyView {
  const { hashed_key: _h, user_id: _u, ...view } = rec;
  return view;
}

/**
 * Create a new API key for the given user. Returns the plaintext exactly once,
 * along with the stored record (sans hash) for the dashboard listing.
 */
export async function createApiKey(
  userId: number,
  agentId: string,
  name: string
): Promise<{ plaintext: string; record: ApiKeyView }> {
  const { plaintext, prefix, hash } = mintApiKey();

  const { data, error } = await getClient()
    .from('api_keys')
    .insert({
      user_id: userId,
      agent_id: agentId,
      name: name.trim().slice(0, 120) || 'Untitled key',
      prefix,
      hashed_key: hash,
    })
    .select()
    .single();

  if (error) throw new Error(`[db] createApiKey failed: ${error.message}`);

  return { plaintext, record: strip(data as ApiKeyRecord) };
}

/** List all non-revoked + revoked keys for an agent, newest first. */
export async function listApiKeys(agentId: string): Promise<ApiKeyView[]> {
  const { data, error } = await getClient()
    .from('api_keys')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] listApiKeys error:', error.message);
    // Re-throw so the route can report setup errors (e.g. missing table)
    // instead of silently rendering an empty list.
    throw new Error(error.message);
  }
  return (data as ApiKeyRecord[]).map(strip);
}

/** Look up a key by its hashed secret. Returns null if missing or revoked. */
export async function findActiveApiKeyByHash(hash: string): Promise<ApiKeyRecord | null> {
  const { data, error } = await getClient()
    .from('api_keys')
    .select('*')
    .eq('hashed_key', hash)
    .is('revoked_at', null)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[db] findActiveApiKeyByHash error:', error.message);
  }
  return (data as ApiKeyRecord) ?? null;
}

/** Soft-revoke a key. Owner check: must belong to the given user. */
export async function revokeApiKey(keyId: string, userId: number): Promise<boolean> {
  const { data, error } = await getClient()
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .select()
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[db] revokeApiKey error:', error.message);
  }
  return !!data;
}

/**
 * Increment request_count, stamp last_used_at, and bump today's per-day
 * usage bucket. Fire-and-forget from the auth hot path — callers should
 * not await this.
 */
export async function recordApiKeyUsage(keyId: string, agentId?: string): Promise<void> {
  const client = getClient();
  const now = new Date().toISOString();
  const day = now.slice(0, 10); // UTC YYYY-MM-DD

  // Running total + last_used_at.
  const { error } = await client.rpc('increment_api_key_usage', {
    p_key_id: keyId,
    p_now: now,
  });
  if (error) {
    // Fallback if the RPC isn't installed — best-effort stamp.
    await client.from('api_keys').update({ last_used_at: now }).eq('id', keyId);
  }

  // Per-day bucket for analytics (only when we know the agent).
  if (agentId) {
    const { error: dErr } = await client.rpc('increment_api_key_usage_daily', {
      p_key_id: keyId,
      p_agent_id: agentId,
      p_day: day,
    });
    if (dErr) {
      // Table/RPC not migrated yet — don't let analytics break auth.
      console.warn('[db] usage_daily increment skipped:', dErr.message);
    }
  }
}

export interface UsagePoint {
  /** Short axis label, e.g. "Jun 24", "wk Jun 17", "Jun". */
  label: string;
  /** ISO date of the bucket start, for tooltips / sorting. */
  iso: string;
  count: number;
}

export interface UsageAnalytics {
  range: 'daily' | 'weekly' | 'monthly';
  series: UsagePoint[];
  summary: { today: number; last7: number; last30: number; total: number };
}

const DAY_MS = 86_400_000;
function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Roll the per-day usage table up into daily / weekly / monthly buckets for
 * an agent, plus headline totals. Zero-fills empty periods so charts render a
 * continuous axis. All-time total comes from the api_keys running counters so
 * it stays accurate beyond the daily table's retention window.
 */
export async function getUsageAnalytics(
  agentId: string,
  range: 'daily' | 'weekly' | 'monthly'
): Promise<UsageAnalytics> {
  const client = getClient();
  const today = startOfUTCDay(new Date());

  // Pull ~13 months of daily rows — enough for the monthly view.
  const since = isoDay(new Date(today.getTime() - 400 * DAY_MS));
  const { data, error } = await client
    .from('api_key_usage_daily')
    .select('day, count')
    .eq('agent_id', agentId)
    .gte('day', since);

  if (error) throw new Error(error.message);

  // Sum across keys → one count per day string.
  const perDay = new Map<string, number>();
  for (const row of (data as { day: string; count: number }[]) ?? []) {
    perDay.set(row.day, (perDay.get(row.day) ?? 0) + Number(row.count));
  }

  const countOn = (d: Date) => perDay.get(isoDay(d)) ?? 0;
  const sumLastDays = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += countOn(new Date(today.getTime() - i * DAY_MS));
    return s;
  };

  // All-time total from the running counters (survives daily retention).
  let total = 0;
  try {
    const { data: keyRows } = await client
      .from('api_keys')
      .select('request_count')
      .eq('agent_id', agentId);
    total = ((keyRows as { request_count: number }[]) ?? []).reduce(
      (a, r) => a + Number(r.request_count || 0),
      0
    );
  } catch {
    total = Array.from(perDay.values()).reduce((a, b) => a + b, 0);
  }

  const summary = {
    today: countOn(today),
    last7: sumLastDays(7),
    last30: sumLastDays(30),
    total,
  };

  const series: UsagePoint[] = [];

  if (range === 'daily') {
    // Last 30 days, oldest → newest.
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      series.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        iso: isoDay(d),
        count: countOn(d),
      });
    }
  } else if (range === 'weekly') {
    // Last 12 weeks — 7-day bins ending today.
    for (let w = 11; w >= 0; w--) {
      const binStart = new Date(today.getTime() - (w * 7 + 6) * DAY_MS);
      let count = 0;
      for (let i = 0; i < 7; i++) count += countOn(new Date(binStart.getTime() + i * DAY_MS));
      series.push({
        label: 'wk ' + binStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        iso: isoDay(binStart),
        count,
      });
    }
  } else {
    // Last 12 calendar months.
    for (let m = 11; m >= 0; m--) {
      const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
      const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
      let count = 0;
      Array.from(perDay.entries()).forEach(([day, c]) => {
        const t = new Date(day + 'T00:00:00Z').getTime();
        if (t >= monthStart.getTime() && t < nextMonth.getTime()) count += c;
      });
      series.push({
        label: monthStart.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
        iso: isoDay(monthStart),
        count,
      });
    }
  }

  return { range, series, summary };
}
