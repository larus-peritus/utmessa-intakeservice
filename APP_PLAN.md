# App Plan: Intake Service

## Overview
Public-facing website for the UT messa booth that collects POC ideas via QR code and provides receipt pages where submitters can track their idea's build progress in real-time.

**Domain**: utmessa.peritus.is
**Deployment**: Vercel (Next.js)
**Database**: Vercel Postgres

## Target Users
1. **Conference Visitors** - Submit ideas via QR code, view receipt/status
2. **Orchestrator Service** - Claims ideas, updates status via protected API

## User Flows
1. QR Code → `/submit` → Fill form → Get receipt link `/i/[token]`
2. Visit receipt → See idea + live status + demo URL when ready

---

## Essential Features (MVP)

### F1: Idea Submission Form
Submit POC ideas via a mobile-friendly form.
- **Priority**: P0 (Critical)
- **Depends on**: None
- **Acceptance**: Visitor can submit title, problem, must-haves; receives receipt token

### F2: Receipt Page
View submitted idea and live build status.
- **Priority**: P0 (Critical)
- **Depends on**: F1
- **Acceptance**: Token URL shows idea details, status badge, progress bar, demo/repo URLs when available

### F3: Orchestrator Claim API
Protected endpoint for orchestrator to atomically claim an idea.
- **Priority**: P0 (Critical)
- **Depends on**: F1
- **Acceptance**: POST /api/ideas/:id/claim returns idea or 409 if already claimed

### F4: Orchestrator Status Update API
Protected endpoint for orchestrator to push status updates.
- **Priority**: P0 (Critical)
- **Depends on**: F1
- **Acceptance**: POST /api/ideas/:id/update accepts status, progress, currentStep, demoUrl, repoUrl

### F5: Ideas Queue API
Protected endpoint for orchestrator to list eligible ideas.
- **Priority**: P0 (Critical)
- **Depends on**: F1
- **Acceptance**: GET /api/ideas?status=submitted returns list of ideas

---

## Important Features (Phase 2)

### F6: Feature Checklist Display
Show feature-by-feature progress on receipt page.
- **Priority**: P1
- **Depends on**: F2, F4
- **Acceptance**: Receipt shows checklist of features with status (planned/in_progress/done)

### F7: Waiting State Display
Show "waiting for input" prompt on receipt when builder needs clarification.
- **Priority**: P1
- **Depends on**: F2
- **Acceptance**: Receipt clearly shows waiting question when status=waiting

### F8: Email Notifications (Optional)
Send email when idea is deployed with demo URL.
- **Priority**: P1
- **Depends on**: F1, F4
- **Acceptance**: If email provided, send notification on deploy

### F9: Rate Limiting & Bot Protection
Prevent abuse of submission form.
- **Priority**: P1
- **Depends on**: F1
- **Acceptance**: Basic rate limiting and honeypot/captcha on submit

---

## Nice-to-Have Features (Future)

### F10: Receipt QR Code Generator
Generate QR code for receipt URL so visitors can save it easily.
- **Priority**: P2
- **Depends on**: F2
- **Acceptance**: Receipt page shows QR code that links to itself

### F11: Idea Editing (Pre-Claim)
Allow visitors to edit their idea before it's claimed.
- **Priority**: P2
- **Depends on**: F2
- **Acceptance**: Edit button on receipt works until status changes from submitted

---

## Data Model

### Idea
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| token | string | Unguessable receipt token |
| title | string | Idea title |
| problem | string | Problem description |
| mustHaves | string[] | Required features |
| email | string? | Optional contact email |
| status | enum | submitted/ready/claimed/running/waiting/deployed/failed/abandoned |
| progress | number? | 0-100 percentage |
| currentStep | string? | Current activity description |
| currentFeature | string? | Current feature being built |
| waitingQuestion | string? | Question for submitter |
| demoUrl | string? | Deployed demo URL |
| repoUrl | string? | GitHub repo URL |
| claimedAt | timestamp? | When claimed |
| claimedBy | string? | Orchestrator identifier |
| createdAt | timestamp | Created |
| updatedAt | timestamp | Last update |

### Feature (optional)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| ideaId | UUID | FK to Idea |
| featureId | string | e.g., "F1" |
| title | string | Feature name |
| status | enum | planned/in_progress/done/failed/skipped |

---

## API Surface

### Public Endpoints
- `POST /api/ideas` - Submit new idea (returns token)
- `GET /api/ideas/[token]` - Get idea by receipt token (public receipt data)

### Protected Endpoints (X-ORCH-KEY header required)
- `GET /api/ideas?status=...` - List ideas by status
- `POST /api/ideas/[id]/claim` - Atomically claim idea
- `POST /api/ideas/[id]/update` - Update status/progress/URLs
- `POST /api/ideas/[id]/features` - Upsert feature checklist

---

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: Vercel Postgres + Drizzle ORM
- **Validation**: Zod (via @utmessa/shared)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

---

## Security Constraints
- Form includes "no sensitive info" reminder
- Receipt tokens must have sufficient entropy (nanoid or UUID)
- No public listing of all ideas
- Orchestrator endpoints protected by shared secret
- Rate limiting on public endpoints

---

## Implementation Sequence

**Phase 1: Core MVP**
1. F1: Idea Submission Form
2. F2: Receipt Page
3. F3: Claim API
4. F4: Status Update API
5. F5: Queue API

**Phase 2: Enhanced Experience**
6. F6: Feature Checklist
7. F7: Waiting State
8. F9: Rate Limiting

**Phase 3: Polish**
8. F8: Email Notifications
10. F10: Receipt QR
11. F11: Idea Editing

---

## Success Criteria
- [ ] QR → submit works reliably on mobile
- [ ] Receipt shows idea and updates when orchestrator posts status
- [ ] Claim endpoint prevents double-start (409 on re-claim)
- [ ] Demo/repo URLs visible on receipt when set
- [ ] No public browsing of ideas possible
