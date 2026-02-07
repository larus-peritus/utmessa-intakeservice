# CLAUDE.md - Intake Service

## What This Is

Public-facing Next.js app for the **UT messa 2026** Peritus booth. Conference visitors scan a QR code, submit a POC idea, and get a receipt page that shows live build progress as an AI orchestrator builds their app.

**Domain**: utmessa.peritus.is
**Language**: Icelandic UI, English code

## Tech Stack

- **Framework**: Next.js 15 (App Router) on Vercel
- **Database**: Vercel Postgres (Neon-compatible) + Drizzle ORM
- **Validation**: Zod via `@utmessa/shared` (local package at `packages/shared`)
- **Styling**: Tailwind CSS with Peritus brand colors (`peritus-blue`, `peritus-orange`)
- **Email**: Resend (status notifications)
- **Testing**: Vitest + React Testing Library (jsdom environment)
- **TypeScript**: Strict mode, path alias `@/*` maps to project root

## Project Structure

```
app/
  page.tsx                     # Landing page (Icelandic)
  submit/page.tsx              # Idea submission form
  i/[token]/page.tsx           # Public receipt page (live status)
  api/ideas/
    route.ts                   # POST (submit idea, public) + GET (list queue, protected)
    token/[token]/route.ts     # GET idea by receipt token (public)
    [id]/claim/route.ts        # POST claim idea (protected)
    [id]/update/route.ts       # POST update status (protected)
    [id]/features/route.ts     # POST upsert features (protected)
    [id]/route.ts              # GET idea by ID (protected)
components/
  receipt/                     # Receipt page components (StatusBadge, ProgressDisplay, etc.)
  Logo.tsx                     # Peritus logo
lib/
  auth/validateOrchKey.ts      # X-ORCH-KEY header validation (constant-time comparison)
  db/                          # Drizzle schema, client, operations
  email/                       # Resend email templates and service
  errors/                      # Typed error classes (claim, update)
  formatters/                  # API response formatters
  services/                    # Business logic (claimService, updateService, ideasService, featuresService)
  utils/                       # Tokens (nanoid), rate limiting
  validators/                  # Request validation (Zod-based)
packages/
  shared/                      # @utmessa/shared - Zod schemas, DTOs, event types, state computation
  e2e/                         # End-to-end tests (Playwright + Vitest)
```

## Key Commands

```bash
npm run dev          # Start dev server on port 3002
npm test             # Run Vitest in watch mode
npm run test:ci      # Run tests once
npm run typecheck    # TypeScript type checking
npm run build        # Build (also runs shared package build + DB migrations)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
```

## Environment Variables

See `.env.example`. Key variables:
- `POSTGRES_URL` - Database connection string
- `ORCH_KEY` - Shared secret for orchestrator API auth (X-ORCH-KEY header)
- `RESEND_API_KEY` - Email service key
- `NEXT_PUBLIC_APP_URL` - Base URL for receipt links

## Architecture Notes

- **Public endpoints**: idea submission (POST /api/ideas), receipt lookup (GET /api/ideas/token/[token])
- **Protected endpoints**: require `X-ORCH-KEY` header - queue listing, claim, update, features
- **Status flow**: submitted → ready → claimed → running → waiting → deployed/failed/abandoned
- **Receipt tokens**: 21-char nanoid (~121 bits entropy) - used for public receipt URLs at `/i/[token]`
- **Rate limiting**: In-memory, 10 requests/min per IP on public submit endpoint
- **Email**: Non-blocking (fire-and-forget on status changes)
- **Shared package**: Must be built before the main app (`npm run prebuild` handles this)

## Testing Patterns

- Unit tests colocated with source (`*.test.ts` / `*.test.tsx`)
- E2E tests in `packages/e2e/` and `tests/e2e/`
- DB operations are mocked in unit tests
- Vitest with `@/*` path alias configured in `vitest.config.ts`

## Common Gotchas

- The shared package (`packages/shared`) must be built before running the main app or tests. The `prebuild` script handles this for production builds.
- DB client auto-detects provider (Neon vs Vercel Postgres vs standard postgres) from connection string and environment.
- Status transitions are validated - not all status changes are allowed (see `statusTransitionValidator.ts`).
- The `ideas` table uses `jsonb` for `mustHaves` (string array).
