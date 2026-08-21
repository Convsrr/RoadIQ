"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/supabase/config";

export function createBrowserSupabaseClient() {
  const config = supabaseConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.publishableKey);
}
