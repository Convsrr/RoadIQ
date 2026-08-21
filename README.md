# RoadIQ

RoadIQ is a mobile-first visual driving judgement game. A player sees an automotive situation, makes a call, receives an immediate result with community percentages, earns XP and moves into the next challenge.

The checkout runs as a complete mock product without accounts or external credentials. Supabase files provide a production activation path, but this repository does not claim that a live project has been migrated or verified.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Leave the Supabase variables blank for mock mode.

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Mock mode

Mock mode is the default and supports the full consumer flow:

- 24 image-led challenges across all six categories and four difficulties
- objective and community results with seeded vote distributions
- anonymous local identity, responses, XP, RoadIQ, ranks and achievements
- Daily sets, duplicate-safe completion bonus, streaks, leaderboard and Profile
- direct challenge URLs, Open Graph images, 9:16 share cards and PWA shell

RoadIQ stores progress under `roadiq:progress:v1` in browser local storage. Reset it from Profile or clear site data. Before a mock submission, the app imports only challenge IDs, answer IDs and timestamps into the server-side mock service, which revalidates and reconstructs XP and correctness rather than trusting saved result fields. The public response body remains `{ challengeId, answerId, idempotencyKey }`. Public challenge payloads exclude fixture votes and correct-answer keys; correctness is returned only after a valid submission.

Seed photography uses remote Unsplash development images. Each challenge records provider, creator label, source URL and a development-license note in `src/data/challenges.server.ts`. Review and replace image rights metadata before a public production launch.

## Architecture

The UI consumes public domain types and application contracts. Mock evaluation and Supabase use the same response shape:

- `src/lib/domain` contains stable product types and scoring configuration.
- `src/lib/services` owns scoring, feed selection, percentages, achievements and streak rules.
- `src/lib/repositories` defines the adapter contracts and local/Supabase implementations.
- `src/app/api/v1` exposes versioned challenge, response, Daily, reaction, event and leaderboard routes.
- `supabase/migrations` owns the production schema, secure functions and RLS policies.

Durable mock progress stays on the client, while the mock application service mirrors authoritative response and Daily-completion contracts for the active runtime. Live mode moves those operations to `submit_challenge_response` and `complete_daily`, which validate the authenticated actor, challenge and answer before awarding XP, streaks, achievements or score changes.

## Activate Supabase

1. Create a Supabase project and apply `supabase/migrations/202608210001_roadiq_core.sql` with the Supabase CLI or SQL editor.
2. Enable Anonymous Sign-Ins and Manual Identity Linking in Auth settings. Configure email OTP and Google only if you intend to offer them.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and the deployment environment.
4. Set `SUPABASE_SERVICE_ROLE_KEY` in your local shell, run `npm run seed:supabase`, then remove the key from the shell when the script finishes.
5. Run credential-backed smoke tests before routing consumer traffic to the live adapter.

The repository includes Supabase auth and challenge adapters, but deliberately leaves adapter selection in the application composition layer. Setting credentials alone does not claim or force a live cutover; wire the live adapters after migration, seed and RLS smoke tests pass against the target project.

`importAnonymousProgress` replays on-device responses with their original idempotency keys through the same secure RPCs, then replays unique Daily dates. This is the account-conversion seam for moving a mock player into an authenticated Supabase identity without duplicating rewards.

The service-role key is operator-only. Never expose it through a `NEXT_PUBLIC_*` variable. The runtime does not require it. Anonymous users receive a normal Supabase user ID, so email or Google linking can retain the same profile and progress.

The migration separates objective answer keys from public answer copy. RLS and column grants prevent players from writing XP, RoadIQ scores, correctness, Daily bonuses, aggregate events or achievements. Security-definer functions perform those updates with fixed search paths and idempotency constraints.

## PWA and offline behavior

The manifest includes 192px, 512px and maskable icons. The service worker caches the offline page, icons and versioned static assets. It never caches API requests, responses or result payloads. Production hosting must use HTTPS for installation and service-worker support.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical links, sitemap, OG metadata and auth redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | Live mode | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Live mode | Public browser/server Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed script only | Inserts protected seed answer keys; never used by the app runtime |

## Deferred

RoadIQ does not include comments, user-created challenges, friends, social feeds, ads, billing, an admin UI, AI features or native wrappers. Privacy and Terms are marked product placeholders and require operator review before production account collection.
