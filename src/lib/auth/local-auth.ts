import type { AuthAdapter, AuthState } from "@/lib/auth/contracts";

export class LocalAuthAdapter implements AuthAdapter {
  constructor(private readonly actorId: string) {}
  async state(): Promise<AuthState> { return { mode: "mock", actorId: this.actorId, anonymous: true, email: null }; }
  async ensureAnonymousSession(): Promise<AuthState> { return this.state(); }
  async linkEmail(): Promise<void> { throw new Error("SUPABASE_NOT_CONFIGURED"); }
  async linkGoogle(): Promise<void> { throw new Error("SUPABASE_NOT_CONFIGURED"); }
  async signOut(): Promise<void> { return; }
}
