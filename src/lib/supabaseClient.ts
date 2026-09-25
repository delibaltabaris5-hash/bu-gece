import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || 'https://xyndfirudvkwgimdmzse.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bmRmaXJ1ZHZrd2dpbWRtenNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMjQxMzgsImV4cCI6MjEwNTkwMDEzOH0.MMzVt8djHyJfpqN_WmRkb13cWlyv5X6y22YadZrO9ZE';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
