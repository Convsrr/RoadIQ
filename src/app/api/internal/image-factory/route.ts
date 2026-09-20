import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex/server";
import {
  hasImageFactorySession,
  imageFactoryOperatorToken,
  isImageFactoryConfigured,
} from "@/lib/image-factory/operator.server";

export const dynamic = "force-dynamic";

const batchFilter = z.enum(["missing", "selected", "category", "difficulty", "failed_qa", "unapproved"]);
const list = z.array(z.string().min(1).max(1_000)).max(30);
const updateFields = z.object({
  challengeId: z.string().min(1).max(80),
  styleProfile: z.string().min(1).max(2_000).optional(),
  camera: z.string().min(1).max(2_000).optional(),
  scene: z.string().min(1).max(4_000).optional(),
  roadEnvironment: z.string().min(1).max(4_000).optional(),
  composition: z.string().min(1).max(4_000).optional(),
  mustShow: list.optional(),
  mustNotShow: list.optional(),
  criticalFacts: list.optional(),
  regionRules: list.optional(),
  prompt: z.string().min(1).max(12_000).optional(),
  negativePrompt: z.string().min(1).max(8_000).optional(),
  candidateCount: z.number().int().min(1).max(4).optional(),
  status: z.enum(["draft", "ready", "needs_review"]).optional(),
  imageAlt: z.string().min(1).max(500).optional(),
  imagePosition: z.string().min(1).max(100).optional(),
}).strict();

const commandSchema = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("startBatch"),
    filterMode: batchFilter,
    challengeStableIds: z.array(z.string().min(1).max(80)).max(500).optional(),
    category: z.enum(["Driver IQ", "Parking IQ", "Road IQ", "Who's Wrong?", "Car IQ", "Spot It"]).optional(),
    difficulty: z.enum(["Easy", "Medium", "Hard", "Expert"]).optional(),
    provider: z.enum(["mock", "gemini"]).optional(),
    model: z.string().min(1).max(200).optional(),
    candidateCount: z.number().int().min(1).max(4).optional(),
  }).strict(),
  z.object({ command: z.literal("updateSpec"), ...updateFields.shape }).strict(),
  z.object({ command: z.literal("approveCandidate"), candidateId: z.string().min(1), notes: z.string().max(1_000).optional() }).strict(),
  z.object({ command: z.literal("rejectCandidate"), candidateId: z.string().min(1), notes: z.string().max(1_000).optional() }).strict(),
  z.object({ command: z.literal("publishCandidate"), candidateId: z.string().min(1) }).strict(),
  z.object({ command: z.literal("rollbackAsset"), challengeId: z.string().min(1).max(80), assetId: z.string().min(1) }).strict(),
  z.object({ command: z.literal("rebuildMetrics") }).strict(),
]);

function cleanOptional<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as T;
}

function withoutCommand<T extends { command: string }>(input: T): Omit<T, "command"> {
  const { command, ...rest } = input;
  void command;
  return rest;
}

function safeCommandError(error: unknown): string {
  const message = error instanceof Error ? error.message.replace(/\s+/g, " ").trim() : "";
  const match = message.match(/\b(?:GEMINI|IMAGE|MOCK|NO_CHALLENGES|INVALID|CATEGORY|DIFFICULTY|CHALLENGE|CANDIDATE|QA|ASSET|BATCH)_[A-Z0-9_]+(?:: [^\n]{1,260})?/);
  return match?.[0] ?? "COMMAND_FAILED";
}

async function canUseImageFactory(): Promise<boolean> {
  return isImageFactoryConfigured() && await hasImageFactorySession();
}

export async function GET(request: Request) {
  if (!await canUseImageFactory()) return NextResponse.json({ error: "Operator access is required." }, { status: 401 });
  const url = new URL(request.url);
  const parsedLimit = Number(url.searchParams.get("limit") ?? "12");
  const numItems = Number.isInteger(parsedLimit) ? Math.min(25, Math.max(1, parsedLimit)) : 12;
  const cursor = url.searchParams.get("cursor");
  try {
    const dashboard = await getConvexClient().query(api.imageFactory.getDashboard, {
      operatorToken: imageFactoryOperatorToken(),
      paginationOpts: { numItems, cursor },
    });
    return NextResponse.json(dashboard, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Image Factory data is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!await canUseImageFactory()) return NextResponse.json({ error: "Operator access is required." }, { status: 401 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the Image Factory command details." }, { status: 400 });
  const client = getConvexClient();
  const operatorToken = imageFactoryOperatorToken();
  try {
    switch (parsed.data.command) {
      case "startBatch": {
        const input = withoutCommand(parsed.data);
        const result = await client.mutation(api.imageFactory.startBatch, cleanOptional({ operatorToken, ...input }));
        return NextResponse.json(result, { status: 202 });
      }
      case "updateSpec": {
        const input = withoutCommand(parsed.data);
        const result = await client.mutation(api.imageFactory.updateSpec, cleanOptional({ operatorToken, ...input }));
        return NextResponse.json(result);
      }
      case "approveCandidate": {
        const result = await client.mutation(api.imageFactory.approveCandidate, cleanOptional({
          operatorToken,
          candidateId: parsed.data.candidateId as Id<"imageCandidates">,
          notes: parsed.data.notes,
        }));
        return NextResponse.json(result);
      }
      case "rejectCandidate": {
        const result = await client.mutation(api.imageFactory.rejectCandidate, cleanOptional({
          operatorToken,
          candidateId: parsed.data.candidateId as Id<"imageCandidates">,
          notes: parsed.data.notes,
        }));
        return NextResponse.json(result);
      }
      case "publishCandidate": {
        const result = await client.mutation(api.imageFactory.publishCandidate, {
          operatorToken,
          candidateId: parsed.data.candidateId as Id<"imageCandidates">,
        });
        return NextResponse.json(result);
      }
      case "rollbackAsset": {
        const result = await client.mutation(api.imageFactory.rollbackAsset, {
          operatorToken,
          challengeId: parsed.data.challengeId,
          assetId: parsed.data.assetId as Id<"challengeAssets">,
        });
        return NextResponse.json(result);
      }
      case "rebuildMetrics": {
        const result = await client.mutation(api.imageFactory.rebuildMetrics, { operatorToken });
        return NextResponse.json(result);
      }
    }
  } catch (error) {
    return NextResponse.json({ error: safeCommandError(error) }, { status: 400 });
  }
}
