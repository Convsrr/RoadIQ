import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { categoryValidator, difficultyValidator, publicChallengeValidator } from "./lib/validators";

export async function toPublicChallenge(
  ctx: QueryCtx,
  challenge: Doc<"challenges">,
) {
  const answers = await ctx.db
    .query("challengeAnswers")
    .withIndex("by_challenge_id_and_sort_order", (q) => q.eq("challengeId", challenge._id))
    .order("asc")
    .take(8);
  const activeAsset = challenge.activeAssetId
    ? await ctx.db.get(challenge.activeAssetId)
    : null;
  const storedUrl = activeAsset?.storageId
    ? await ctx.storage.getUrl(activeAsset.storageId)
    : null;
  const imageUrl = storedUrl ?? activeAsset?.externalUrl ?? challenge.legacyImageUrl ?? "/icons/roadiq-512.png";

  return {
    id: challenge.stableId,
    slug: challenge.slug,
    question: challenge.question,
    imageUrl,
    imageAlt: activeAsset?.imageAlt ?? challenge.imageAlt,
    imagePosition: activeAsset?.imagePosition ?? challenge.imagePosition,
    imageAttribution: activeAsset?.sourceType === "generated"
      ? {
          provider: "RoadIQ Image Factory",
          creator: "RoadIQ",
          licenseNote: "Published internal RoadIQ challenge asset.",
        }
      : {
          provider: challenge.legacyImageProvider ?? "RoadIQ",
          creator: challenge.legacyImageCreator ?? "RoadIQ",
          sourceUrl: challenge.legacyImageSourceUrl,
          licenseNote: challenge.legacyImageLicenseNote ?? "RoadIQ development asset.",
        },
    category: challenge.category,
    difficulty: challenge.difficulty,
    challengeType: challenge.challengeType,
    explanation: challenge.explanation,
    region: challenge.region,
    answers: answers.map((answer) => ({ id: answer.stableId, text: answer.text })),
  };
}

export const listPublished = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(categoryValidator),
    difficulty: v.optional(difficultyValidator),
  },
  returns: v.object({
    page: v.array(publicChallengeValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const queryBuilder = args.category && args.difficulty
      ? ctx.db
          .query("challenges")
          .withIndex("by_status_and_category_and_difficulty", (q) => q
            .eq("status", "published")
            .eq("category", args.category!)
            .eq("difficulty", args.difficulty!))
      : args.category
        ? ctx.db
            .query("challenges")
            .withIndex("by_status_and_category_and_difficulty", (q) => q
              .eq("status", "published")
              .eq("category", args.category!))
        : args.difficulty
          ? ctx.db
              .query("challenges")
              .withIndex("by_status_and_difficulty", (q) => q
                .eq("status", "published")
                .eq("difficulty", args.difficulty!))
          : ctx.db
              .query("challenges")
              .withIndex("by_status_and_published_at", (q) => q.eq("status", "published"));
    const result = await queryBuilder.order("desc").paginate(args.paginationOpts);
    return {
      page: await Promise.all(result.page.map((challenge) => toPublicChallenge(ctx, challenge))),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getByIdOrSlug = query({
  args: { idOrSlug: v.string() },
  returns: v.union(publicChallengeValidator, v.null()),
  handler: async (ctx, args) => {
    const byStableId = await ctx.db
      .query("challenges")
      .withIndex("by_stable_id", (q) => q.eq("stableId", args.idOrSlug))
      .unique();
    const challenge = byStableId ?? await ctx.db
      .query("challenges")
      .withIndex("by_slug", (q) => q.eq("slug", args.idOrSlug))
      .unique();
    if (!challenge || challenge.status !== "published") return null;
    return await toPublicChallenge(ctx, challenge);
  },
});
