import { createClient } from "@supabase/supabase-js";
import { CHALLENGE_SEEDS } from "../src/data/challenges.server.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
}

const client = createClient(url, serviceKey, { auth: { persistSession: false } });
for (const challenge of CHALLENGE_SEEDS) {
  const { error: challengeError } = await client.from("challenges").upsert({
    id: challenge.id,
    slug: challenge.slug,
    question: challenge.question,
    image_url: challenge.imageUrl,
    image_alt: challenge.imageAlt,
    image_position: challenge.imagePosition,
    image_creator: challenge.imageAttribution.creator,
    image_source_url: challenge.imageAttribution.sourceUrl,
    category: challenge.category,
    difficulty: challenge.difficulty,
    challenge_type: challenge.challengeType,
    explanation: challenge.explanation,
    region: challenge.region,
    status: "published",
    published_at: new Date().toISOString(),
  });
  if (challengeError) throw challengeError;

  const { error: answerError } = await client.from("challenge_answers").upsert(
    challenge.answers.map((answer, index) => ({ id: answer.id, challenge_id: challenge.id, answer_text: answer.text, sort_order: index })),
  );
  if (answerError) throw answerError;

  if (challenge.correctAnswerId) {
    const { error: keyError } = await client.from("objective_answer_keys").upsert({ challenge_id: challenge.id, answer_id: challenge.correctAnswerId });
    if (keyError) throw keyError;
  }
}

console.log(`Seeded ${CHALLENGE_SEEDS.length} RoadIQ challenges.`);
