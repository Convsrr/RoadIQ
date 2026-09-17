import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { CHALLENGE_SEEDS } from "../src/data/challenges.server.ts";
import { ACHIEVEMENTS } from "../src/lib/services/achievements.ts";
import { createImageSpecDraft } from "../src/lib/image-factory/spec.ts";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const seedToken = process.env.ROADIQ_SEED_TOKEN;
if (!convexUrl || !seedToken) {
  throw new Error("Set NEXT_PUBLIC_CONVEX_URL and ROADIQ_SEED_TOKEN before seeding Convex.");
}

const client = new ConvexHttpClient(convexUrl);
const challenges = CHALLENGE_SEEDS.map((challenge) => ({
  ...challenge,
  imageSpec: createImageSpecDraft(challenge),
}));
let insertedChallenges = 0;
let updatedChallenges = 0;
let seededAchievements = 0;

for (let start = 0; start < challenges.length; start += 100) {
  const result = await client.mutation(api.seed.importChallenges, {
    seedToken,
    challenges: challenges.slice(start, start + 100),
    achievements: start === 0 ? ACHIEVEMENTS : [],
  });
  insertedChallenges += result.insertedChallenges;
  updatedChallenges += result.updatedChallenges;
  seededAchievements += result.seededAchievements;
}

console.log(`Convex seed complete: ${insertedChallenges} inserted, ${updatedChallenges} updated, ${seededAchievements} achievements added.`);
