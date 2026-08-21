"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountProgressImportTarget } from "@/lib/auth/progress-import";

export class SupabaseProgressImportTarget implements AccountProgressImportTarget {
  constructor(private readonly client: SupabaseClient) {}

  async submitResponse(input: {
    challengeId: string;
    answerId: string;
    idempotencyKey: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("submit_challenge_response", {
      p_challenge_id: input.challengeId,
      p_answer_id: input.answerId,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) throw error;
  }

  async completeDaily(date: string): Promise<void> {
    const { error } = await this.client.rpc("complete_daily", {
      p_challenge_date: date,
    });
    if (error) throw error;
  }
}
