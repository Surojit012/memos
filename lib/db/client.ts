import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use the service-role key for server-side DB operations (bypasses RLS)
function getClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface UserRecord {
  id: number;
  privy_user_id: string;
  agent_id: string;
  api_key: string;
  api_key_created_at: string;
  created_at: string;
  updated_at: string;
  onboarding_complete: boolean;
}

/**
 * Look up a user by their Privy user ID.
 */
export async function getUserByPrivyId(privyUserId: string): Promise<UserRecord | null> {
  const { data, error } = await getClient()
    .from('users')
    .select('*')
    .eq('privy_user_id', privyUserId)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "no rows found" — expected when user doesn't exist
    console.error('[db] getUserByPrivyId error:', error.message);
  }
  return data as UserRecord | null;
}

/**
 * Look up a user by their agent ID.
 */
export async function getUserByAgentId(agentId: string): Promise<UserRecord | null> {
  const { data, error } = await getClient()
    .from('users')
    .select('*')
    .eq('agent_id', agentId)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[db] getUserByAgentId error:', error.message);
  }
  return data as UserRecord | null;
}

/**
 * Create a new user record mapping a Privy user to an agent.
 */
export async function createUser(
  privyUserId: string,
  agentId: string,
  apiKey: string
): Promise<UserRecord> {
  const { data, error } = await getClient()
    .from('users')
    .insert({
      privy_user_id: privyUserId,
      agent_id: agentId,
      api_key: apiKey,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`[db] createUser failed: ${error.message}`);
  }
  return data as UserRecord;
}

/**
 * Update a user's API key by their Privy user ID.
 */
export async function updateUserApiKey(
  privyUserId: string,
  newApiKey: string
): Promise<UserRecord> {
  const { data, error } = await getClient()
    .from('users')
    .update({
      api_key: newApiKey,
      api_key_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('privy_user_id', privyUserId)
    .select()
    .single();

  if (error) {
    throw new Error(`[db] updateUserApiKey failed: ${error.message}`);
  }
  return data as UserRecord;
}

/**
 * Mark a user's onboarding as complete.
 */
export async function markOnboardingComplete(privyUserId: string): Promise<void> {
  const { error } = await getClient()
    .from('users')
    .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
    .eq('privy_user_id', privyUserId);

  if (error) {
    throw new Error(`[db] markOnboardingComplete failed: ${error.message}`);
  }
}

/**
 * Check if a user has completed onboarding.
 */
export async function getUserOnboardingStatus(privyUserId: string): Promise<boolean> {
  const { data, error } = await getClient()
    .from('users')
    .select('onboarding_complete')
    .eq('privy_user_id', privyUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[db] getUserOnboardingStatus error:', error.message);
  }
  return data?.onboarding_complete ?? false;
}

/**
 * Initialize the database schema — creates the users table and indexes if they don't exist.
 * Run this via Supabase SQL Editor or as a migration. This function calls the schema via RPC
 * as a convenience, but the recommended approach is to run schema.sql directly in Supabase.
 */
export async function initDb(): Promise<void> {
  const { error } = await getClient().rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        privy_user_id VARCHAR(255) UNIQUE NOT NULL,
        agent_id VARCHAR(255) UNIQUE NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        api_key_created_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);
      CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);
    `,
  });

  if (error) {
    console.warn('[db] initDb via RPC failed (run schema.sql manually in Supabase SQL Editor):', error.message);
  }
}

