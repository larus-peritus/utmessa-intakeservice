# Package Plan: Shared Contracts (@utmessa/shared)

## Overview
Single source of truth for all TypeScript types, Zod schemas, and shared logic used across the Intake, Orchestrator, and Dashboard apps. Prevents contract drift and ensures type safety across the entire system.

**Package Name**: @utmessa/shared
**Type**: Internal npm package (workspace)

## Consumers
1. **apps/intake** - API validation, database types
2. **apps/orchestrator** - Event parsing, state computation, API DTOs
3. **apps/dashboard** - Type definitions for API responses

## Key Responsibilities
1. Define canonical types and Zod schemas for all shared data
2. Define JSONL event types and validation
3. Define file format schemas (booth.project.json, features.json, etc.)
4. Provide state computation logic (events → status/progress)
5. Define API DTOs for both Intake and Orchestrator endpoints

---

## Essential Features (MVP)

### F1: Idea & Feature Schemas
Core data types for ideas and features.
- **Priority**: P0 (Critical)
- **Depends on**: None
- **Acceptance**: IdeaSchema, FeatureSchema, status enums with Zod validation

### F2: Event Schemas
JSONL event type definitions.
- **Priority**: P0 (Critical)
- **Depends on**: None
- **Acceptance**: All event types (JOB_*, FEATURE_*, WAITING_*, DEPLOY_*) with discriminated union

### F3: File Format Schemas
POC project file schemas.
- **Priority**: P0 (Critical)
- **Depends on**: F1, F2
- **Acceptance**: booth.project.json, features.json, booth.state.json schemas

### F4: State Computation
Pure function to derive state from events + features.
- **Priority**: P0 (Critical)
- **Depends on**: F2
- **Acceptance**: computeProjectState() correctly derives status, progress, currentFeature, waitingQuestion

### F5: Intake API DTOs
Request/response types for Intake endpoints.
- **Priority**: P0 (Critical)
- **Depends on**: F1
- **Acceptance**: ClaimRequest/Response, UpdateRequest/Response, ListIdeasResponse

### F6: Orchestrator API DTOs
Request/response types for Orchestrator endpoints.
- **Priority**: P0 (Critical)
- **Depends on**: F1, F4
- **Acceptance**: QueueItem, ProjectSummary, ProjectDetail, AnswerRequest

---

## Important Features (Phase 2)

### F7: JSONL Parsing Utilities
Helpers for safely parsing event logs.
- **Priority**: P1
- **Depends on**: F2
- **Acceptance**: parseEventLine(), parseEventLog() with error handling

### F8: Progress Helpers
Derived computation utilities.
- **Priority**: P1
- **Depends on**: F4
- **Acceptance**: computeProgressPercent(), isWaitingForInput(), getCurrentFeature()

### F9: Schema Versioning
Support for backward-compatible schema evolution.
- **Priority**: P1
- **Depends on**: F3
- **Acceptance**: Version field in schemas, migration helpers if needed

---

## Nice-to-Have Features (Future)

### F10: Event Builders
Helper functions to create valid events.
- **Priority**: P2
- **Depends on**: F2
- **Acceptance**: createJobStartedEvent(), createFeatureDoneEvent(), etc.

### F11: Validation Error Formatting
Human-readable validation error messages.
- **Priority**: P2
- **Depends on**: All schemas
- **Acceptance**: formatValidationError() for better debugging

---

## Type Definitions

### Status Enums

```typescript
// Idea status (Intake-visible)
export const IdeaStatus = z.enum([
  'submitted',    // Just submitted, in queue
  'ready',        // Triaged, eligible to start
  'claimed',      // Orchestrator claimed, creating project
  'running',      // Build in progress
  'waiting',      // Needs human input
  'deployed',     // Successfully deployed
  'failed',       // Build failed
  'abandoned',    // Manually abandoned
]);

// Feature status
export const FeatureStatus = z.enum([
  'planned',      // Defined but not started
  'in_progress',  // Currently being built
  'done',         // Successfully completed
  'failed',       // Failed to build
  'skipped',      // Intentionally skipped
]);

// Project run status (derived)
export const ProjectRunStatus = z.enum([
  'not_started',  // Exists in Intake only
  'running',      // Active build
  'waiting',      // Needs input
  'failed',       // Build failed
  'deployed',     // Successfully deployed
]);
```

### Event Types

```typescript
// Base event fields
interface BaseEvent {
  ts: string;      // ISO timestamp
  type: string;    // Event type discriminator
  message?: string;
  meta?: Record<string, unknown>;
}

// Job events
type JobCreatedEvent = BaseEvent & { type: 'JOB_CREATED'; projectSlug?: string };
type JobStartedEvent = BaseEvent & { type: 'JOB_STARTED' };
type JobFailedEvent = BaseEvent & { type: 'JOB_FAILED'; reason: string };
type JobDoneEvent = BaseEvent & { type: 'JOB_DONE' };

// Feature events
type FeaturesPlannedEvent = BaseEvent & { type: 'FEATURES_PLANNED'; total: number };
type FeatureStartedEvent = BaseEvent & { type: 'FEATURE_STARTED'; featureId: string; title?: string };
type FeatureDoneEvent = BaseEvent & { type: 'FEATURE_DONE'; featureId: string };
type FeatureFailedEvent = BaseEvent & { type: 'FEATURE_FAILED'; featureId: string; reason: string };
type FeatureSkippedEvent = BaseEvent & { type: 'FEATURE_SKIPPED'; featureId: string; reason?: string };

// Waiting events
type WaitingForInputEvent = BaseEvent & { type: 'WAITING_FOR_INPUT'; question: string; choices?: string[] };
type InputReceivedEvent = BaseEvent & { type: 'INPUT_RECEIVED'; answer: string };

// Deploy events
type DeployStartedEvent = BaseEvent & { type: 'DEPLOY_STARTED'; target?: string };
type DeployDoneEvent = BaseEvent & { type: 'DEPLOY_DONE'; url: string };
type RepoPublishedEvent = BaseEvent & { type: 'REPO_PUBLISHED'; repoUrl: string };

// Union type
type BoothEvent = JobCreatedEvent | JobStartedEvent | ... ;
```

---

## State Computation Rules

```typescript
function computeProjectState(
  features: Feature[],
  events: BoothEvent[]
): ProjectState {
  // 1. Status derivation (priority order):
  //    - Last unclosed WAITING_FOR_INPUT → 'waiting'
  //    - DEPLOY_DONE exists (not followed by JOB_FAILED) → 'deployed'
  //    - JOB_FAILED exists (not followed by JOB_STARTED) → 'failed'
  //    - JOB_STARTED exists → 'running'
  //    - Otherwise → 'not_started'

  // 2. Progress:
  //    - If features.planned = false → undefined (still planning)
  //    - Else → (doneFeatures / totalFeatures) * 100

  // 3. Current feature:
  //    - Last FEATURE_STARTED without corresponding DONE/FAILED/SKIPPED

  // 4. Waiting question:
  //    - Last WAITING_FOR_INPUT without corresponding INPUT_RECEIVED
}
```

---

## Package Structure

```
packages/shared/
├── src/
│   ├── schemas/
│   │   ├── idea.ts           # Idea, IdeaStatus
│   │   ├── feature.ts        # Feature, FeatureStatus
│   │   ├── events.ts         # All event types
│   │   ├── files.ts          # File format schemas
│   │   ├── api-intake.ts     # Intake API DTOs
│   │   └── api-orchestrator.ts # Orchestrator API DTOs
│   ├── state/
│   │   ├── computeProjectState.ts
│   │   └── helpers.ts        # Progress, waiting, etc.
│   ├── utils/
│   │   └── jsonl.ts          # JSONL parsing
│   └── index.ts              # Public exports
├── package.json
├── tsconfig.json
└── tsup.config.ts            # Build config
```

---

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Validation**: Zod
- **Build**: tsup (ESM + CJS)
- **Testing**: Vitest

---

## Constraints
- No UI components
- No network calls
- No framework-specific code (pure TypeScript)
- Must work in both Node.js and browser
- Backward-compatible schema evolution

---

## Implementation Sequence

**Phase 1: Core Schemas**
1. F1: Idea & Feature Schemas
2. F2: Event Schemas
3. F3: File Format Schemas
4. F4: State Computation
5. F5: Intake API DTOs
6. F6: Orchestrator API DTOs

**Phase 2: Utilities**
7. F7: JSONL Parsing
8. F8: Progress Helpers
9. F9: Schema Versioning

**Phase 3: Developer Experience**
10. F10: Event Builders
11. F11: Validation Error Formatting

---

## Success Criteria
- [ ] All apps compile against @utmessa/shared without duplicating types
- [ ] Orchestrator validates JSONL events using shared schemas
- [ ] Dashboard renders state computed by shared computeProjectState()
- [ ] Intake validates API payloads with shared DTOs
- [ ] No type errors when consuming package
