export interface AuthState {
  mode: "mock" | "convex";
  actorId: string | null;
  anonymous: boolean;
  email: string | null;
}

export interface AuthAdapter {
  state(): Promise<AuthState>;
  ensureAnonymousSession(): Promise<AuthState>;
  linkEmail(email: string): Promise<void>;
  linkGoogle(redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
}
