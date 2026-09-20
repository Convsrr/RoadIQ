# RoadIQ

RoadIQ is a mobile-first visual driving judgement game. Players see a driving situation, choose an answer, receive the result and community percentages, then build XP, RoadIQ, Daily streaks and achievements.

The product has two deliberately separate modes:

- Mock mode remains the default for fast local product work and retains the existing browser progression experience.
- Convex mode is the only production backend path. The same public Convex functions are suitable for web, iOS and Android clients.

## Local development

Requirements: Node.js 22+ and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With `ROADIQ_BACKEND` unset, the full consumer product stays in mock mode and needs no account, database, model credential or external generation call.

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Architecture

```text
Next.js web client ─┐
iOS / Android ─────┼──> Convex functions + Convex storage
Image Factory ─────┘
```

- `convex/schema.ts` defines challenges, server-only objective keys, players, responses, stats, Daily state, reactions, analytics, achievements, entitlements and image-production records.
- `convex/challenges.ts`, `progress.ts`, `daily.ts`, `players.ts`, `reactions.ts`, `analytics.ts` and `leaderboard.ts` are mobile-ready backend contracts.
- Objective answer keys live in `objectiveAnswerKeys`; public challenge queries never return them. `progress.submitResponse` computes correctness, XP, RoadIQ, achievements and idempotency on the server.
- `src/app/api/v1` provides the current web compatibility layer. It calls Convex only when `ROADIQ_BACKEND=convex`; otherwise it preserves the existing mock behavior.
- `src/lib/repositories/challenges.server.ts` makes pages, direct challenge links, OG cards and share cards read active Convex content at request time. Publishing a challenge image therefore needs no Next.js redeploy.
- `entitlements` holds a neutral free/pro capability snapshot. No billing provider is coupled to gameplay.

## Move to Convex

1. Create or select a Convex deployment, then run `npm run convex:dev` locally. The CLI writes `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` into `.env.local`.
2. Set the same `ROADIQ_SEED_TOKEN` in the Convex deployment and your local shell or `.env.local`. This secret is required by the idempotent seed mutation and is never a browser value.
3. Run `npm run seed:convex`. It imports `CHALLENGE_SEEDS`, answer choices, private objective keys, fixture stats, legacy image assets, visual specifications and achievement definitions. Re-running it updates source copy without duplicating records.
4. Set `ROADIQ_BACKEND=convex` in the Next.js environment only after seeding succeeds. The web app then reads challenge content and progress from Convex while retaining local browser progress as a migration source.
5. Run the migration smoke checks below before directing production traffic.

Legacy local progress imports through `players.importProgress`. The client sends only prior challenge IDs, answer IDs, idempotency keys and timestamps; Convex re-validates the challenge and answer, reconstructs correctness and XP, prevents duplicate awards, and adds a Daily completion only when the server can verify all five Daily responses. Regular play never accepts client XP, score, streak or achievement values.

`players.linkAuthenticatedIdentity` is the future Convex Auth seam. It retains the anonymous user row, responses and stats before linking a token identity. Configure a Convex Auth provider before exposing it in the consumer UI.

## RoadIQ Image Factory

`/image-review` is an internal route and is intentionally absent from RoadIQ navigation. It is unavailable unless all of the following are configured:

```env
ROADIQ_BACKEND=convex
ROADIQ_IMAGE_FACTORY_ENABLED=1
ROADIQ_IMAGE_FACTORY_TOKEN=a-long-random-operator-secret
```

Set the same Image Factory environment values in the Next.js deployment and the Convex deployment. Sign in to `/image-review` with the operator token; the browser receives only an HTTP-only, same-site session cookie. The token is passed to privileged Convex functions from the Next.js server, never from ordinary player requests.

The workflow is exact:

1. The seed creates one structured `imageSpecs` record per challenge. Objective specs use a controlled photorealistic educational style; community specs use an editorial style. UK specs require left-hand traffic, UK markings and UK geometry.
2. Select all missing imagery, selected challenges, a category, a difficulty, failed QA or unapproved work. A batch records provider, model, candidates, progress and errors.
3. `imageGeneration.processNext` runs outside queries/mutations. It writes each candidate to Convex storage, records metadata and persists visual QA.
4. QA never publishes. An operator reviews the actual RoadIQ 4:5 crop, visual facts, score and issues, then approves or rejects a candidate.
5. Publishing verifies approval, creates a versioned `challengeAssets` record, deactivates the previous asset and makes the new asset active. Rollback selects a previous version without deleting history.

Production uses direct Gemini through the Interactions API: `gemini-3.1-flash-image` generates portrait 4:5 images and `gemini-3.1-pro` performs structured visual QA. The action sends the persistent prompt, negative requirements, critical facts and regional rules, stores the returned image bytes in Convex storage, then sends that candidate back to Gemini vision with an explicit JSON schema. See the [Gemini image-generation guide](https://ai.google.dev/gemini-api/docs/image-generation) and [structured-output guide](https://ai.google.dev/gemini-api/docs/structured-output). Set `GEMINI_API_KEY` only in the Convex server environment. Set `ROADIQ_IMAGE_PROVIDER=mock` only for local workflow proof; mock output always receives a QA warning and cannot be configured as a production provider. Missing or unavailable Gemini configuration is surfaced as an explicit operator error or batch error.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical and metadata URLs |
| `NEXT_PUBLIC_CONVEX_URL` | Convex mode | Convex deployment URL, written by the CLI |
| `CONVEX_DEPLOYMENT` | Convex CLI | Local/deployment selection, written by the CLI |
| `ROADIQ_BACKEND` | Convex mode | Set to `convex` only after seeding |
| `ROADIQ_SEED_TOKEN` | Seed only | Guards `seed.importChallenges`; set in Convex and locally |
| `ROADIQ_IMAGE_FACTORY_ENABLED` | Image Factory | Explicitly enables the internal route and privileged functions |
| `ROADIQ_IMAGE_FACTORY_TOKEN` | Image Factory | Shared operator secret in Next.js and Convex; never public |
| `ROADIQ_IMAGE_PROVIDER` | Image Factory | `gemini` in production; `mock` only for local workflow proof |
| `ROADIQ_IMAGE_MODEL` | Image batches | Gemini image model; production value `gemini-3.1-flash-image` |
| `ROADIQ_IMAGE_QA_MODEL` | Image batches | Gemini vision QA model; production value `gemini-3.1-pro` |
| `GEMINI_API_KEY` | Gemini batches | Convex deployment secret only; never use a `NEXT_PUBLIC_*` name |

## Production migration checks

1. Run `npx convex dev --once` or `npm run convex:deploy` against the intended deployment to generate API types and apply the schema.
2. Set deployment secrets with the Convex CLI/dashboard: `ROADIQ_SEED_TOKEN`, the same `ROADIQ_IMAGE_FACTORY_TOKEN` used by Vercel, `ROADIQ_IMAGE_FACTORY_ENABLED=1`, `ROADIQ_IMAGE_PROVIDER=gemini`, `ROADIQ_IMAGE_MODEL=gemini-3.1-flash-image`, `ROADIQ_IMAGE_QA_MODEL=gemini-3.1-pro`, and `GEMINI_API_KEY`.
3. Seed once, then check that `challenges.listPublished` returns no correct-answer key before submission and `progress.submitResponse` returns one server-scored result for a repeated idempotency key.
4. Enable `ROADIQ_BACKEND=convex` in the web environment and verify a normal player, a Daily completion and a published asset on a real deployment.
5. Configure Convex Auth before exposing account linking. Keep billing integrations outside the gameplay functions and write entitlements into the existing neutral table.

## PWA and privacy

The PWA caches the offline shell and static assets, never answer/result API traffic. Mock mode stores progress under `roadiq:progress:v1`; Convex mode can import that state through the server-authoritative migration path. Privacy and Terms remain product placeholders and require reviewed production copy before collecting live account data.
