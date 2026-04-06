"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session, SupabaseClient, User } from "@supabase/supabase-js";
import { isStorefrontAuthConfigured, tryCreateStorefrontBrowserClient } from "@/lib/supabase/storefront-browser";

type StorefrontAuthContextValue = {
  user: User | null;
  loading: boolean;
  supabase: SupabaseClient | null;
};

const StorefrontAuthContext = createContext<StorefrontAuthContextValue>({
  user: null,
  loading: true,
  supabase: null,
});

export function StorefrontAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (!isStorefrontAuthConfigured()) {
      setLoading(false);
      return;
    }

    const client = tryCreateStorefrontBrowserClient();
    if (!client) {
      setLoading(false);
      return;
    }
    setSupabase(client);

    let cancelled = false;
    void client.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, supabase }), [user, loading, supabase]);

  return <StorefrontAuthContext.Provider value={value}>{children}</StorefrontAuthContext.Provider>;
}

export function useStorefrontAuth() {
  return useContext(StorefrontAuthContext);
}

export default StorefrontAuthProvider;
