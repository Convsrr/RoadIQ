/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as challenges from "../challenges.js";
import type * as daily from "../daily.js";
import type * as imageFactory from "../imageFactory.js";
import type * as imageGeneration from "../imageGeneration.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_achievements from "../lib/achievements.js";
import type * as lib_challengeStats from "../lib/challengeStats.js";
import type * as lib_daily from "../lib/daily.js";
import type * as lib_imageProvider from "../lib/imageProvider.js";
import type * as lib_imageQa from "../lib/imageQa.js";
import type * as lib_imageWorkflow from "../lib/imageWorkflow.js";
import type * as lib_players from "../lib/players.js";
import type * as lib_progression from "../lib/progression.js";
import type * as lib_validators from "../lib/validators.js";
import type * as players from "../players.js";
import type * as progress from "../progress.js";
import type * as reactions from "../reactions.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  challenges: typeof challenges;
  daily: typeof daily;
  imageFactory: typeof imageFactory;
  imageGeneration: typeof imageGeneration;
  leaderboard: typeof leaderboard;
  "lib/achievements": typeof lib_achievements;
  "lib/challengeStats": typeof lib_challengeStats;
  "lib/daily": typeof lib_daily;
  "lib/imageProvider": typeof lib_imageProvider;
  "lib/imageQa": typeof lib_imageQa;
  "lib/imageWorkflow": typeof lib_imageWorkflow;
  "lib/players": typeof lib_players;
  "lib/progression": typeof lib_progression;
  "lib/validators": typeof lib_validators;
  players: typeof players;
  progress: typeof progress;
  reactions: typeof reactions;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
