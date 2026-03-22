import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const getSupabaseClientCache = () => {
  const globalWithSupabase = globalThis as typeof globalThis & {
    __serviceSupabaseClient?: ReturnType<typeof createClient> | null;
    __anonSupabaseClient?: ReturnType<typeof createClient> | null;
  };

  return globalWithSupabase;
};

export const getServiceSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  const cache = getSupabaseClientCache();
  if (!cache.__serviceSupabaseClient) {
    cache.__serviceSupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return cache.__serviceSupabaseClient;
};

export const getAnonSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const cache = getSupabaseClientCache();
  if (!cache.__anonSupabaseClient) {
    cache.__anonSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return cache.__anonSupabaseClient;
};
