import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChallengeRepository } from "@/lib/repositories/contracts";
import type { ChallengeResult, PublicChallenge } from "@/lib/domain/types";

type ChallengeRow = {
  id: string;
  slug: string;
  question: string;
  image_url: string;
  image_alt: string;
  image_position: string;
  image_creator: string;
  image_source_url: string;
  category: PublicChallenge["category"];
  difficulty: PublicChallenge["difficulty"];
  challenge_type: PublicChallenge["challengeType"];
  explanation: string;
  region: string;
  challenge_answers: Array<{ id: string; answer_text: string; sort_order: number }>;
};

function mapChallenge(row: ChallengeRow): PublicChallenge {
  return {
    id: row.id,
    slug: row.slug,
    question: row.question,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    imagePosition: row.image_position,
    imageAttribution: {
      provider: "Unsplash",
      creator: row.image_creator,
      sourceUrl: row.image_source_url,
      licenseNote: "Development image. Verify production rights before launch.",
    },
    category: row.category,
    difficulty: row.difficulty,
    challengeType: row.challenge_type,
    explanation: row.explanation,
    region: row.region,
    answers: [...row.challenge_answers].sort((a, b) => a.sort_order - b.sort_order).map((answer) => ({ id: answer.id, text: answer.answer_text })),
  };
}

export class SupabaseChallengeRepository implements ChallengeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPublished(): Promise<PublicChallenge[]> {
    const { data, error } = await this.client.from("challenges").select("id,slug,question,image_url,image_alt,image_position,image_creator,image_source_url,category,difficulty,challenge_type,explanation,region,challenge_answers(id,answer_text,sort_order)").eq("status", "published").order("published_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as ChallengeRow[]).map(mapChallenge);
  }

  async findByIdOrSlug(id: string): Promise<PublicChallenge | null> {
    const { data, error } = await this.client.from("challenges").select("id,slug,question,image_url,image_alt,image_position,image_creator,image_source_url,category,difficulty,challenge_type,explanation,region,challenge_answers(id,answer_text,sort_order)").or(`id.eq.${id},slug.eq.${id}`).eq("status", "published").maybeSingle();
    if (error) throw error;
    return data ? mapChallenge(data as unknown as ChallengeRow) : null;
  }

  async submitResponse(input: Parameters<ChallengeRepository["submitResponse"]>[0]): Promise<ChallengeResult> {
    const { data, error } = await this.client.rpc("submit_challenge_response", {
      p_challenge_id: input.challengeId,
      p_answer_id: input.answerId,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) throw error;
    return data as unknown as ChallengeResult;
  }
}
