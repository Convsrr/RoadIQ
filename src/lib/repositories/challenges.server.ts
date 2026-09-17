import "server-only";

import { api } from "../../../convex/_generated/api";
import { findPublicChallenge, listPublicChallenges } from "@/data/challenges.server";
import type { PublicChallenge } from "@/lib/domain/types";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";

const firstPage = { numItems: 100, cursor: null };

export async function listRuntimeChallenges(): Promise<PublicChallenge[]> {
  if (!isConvexBackendEnabled()) return listPublicChallenges();
  const result = await getConvexClient().query(api.challenges.listPublished, { paginationOpts: firstPage });
  return result.page as PublicChallenge[];
}

export async function findRuntimeChallenge(idOrSlug: string): Promise<PublicChallenge | null> {
  if (!isConvexBackendEnabled()) return findPublicChallenge(idOrSlug);
  return (await getConvexClient().query(api.challenges.getByIdOrSlug, { idOrSlug })) as PublicChallenge | null;
}
