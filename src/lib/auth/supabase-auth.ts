"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthAdapter, AuthState } from "@/lib/auth/contracts";

export class SupabaseAuthAdapter implements AuthAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async state(): Promise<AuthState> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) return { mode: "supabase", actorId: null, anonymous: true, email: null };
    return {
      mode: "supabase",
      actorId: data.user.id,
      anonymous: Boolean(data.user.is_anonymous),
      email: data.user.email ?? null,
    };
  }

  async ensureAnonymousSession(): Promise<AuthState> {
    const current = await this.state();
    if (current.actorId) return current;
    const { error } = await this.client.auth.signInAnonymously();
    if (error) throw error;
    return this.state();
  }

  async linkEmail(email: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ email });
    if (error) throw error;
  }

  async linkGoogle(redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.linkIdentity({ provider: "google", options: { redirectTo } });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
}
