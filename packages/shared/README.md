# @utmessa/shared

Shared TypeScript types and Zod schemas for the Utmessa platform.

## Features

- **Idea & Feature Schemas**: Core entity schemas for idea submission and feature tracking
- **Intake API DTOs**: Request/response types for Intake service endpoints
- **Orchestrator API DTOs**: Request/response types for Orchestrator local API
- **State Computation**: Pure functions for computing project state from events
- **Event Schemas**: JSONL event type definitions for booth.log.jsonl
- **File Format Schemas**: Schemas for booth.project.json, features.json, booth.state.json
- **Type Safety**: Full TypeScript coverage with discriminated unions
- **Runtime Validation**: Zod schemas for all data validation
- **Cross-Platform**: Works in Node.js and browser environments

## Installation

```bash
npm install @utmessa/shared
```

## Usage

### Validating Ideas

```typescript
import { IdeaSchema, validateIdea, safeValidateIdea } from '@utmessa/shared';
import type { Idea, IdeaStatus } from '@utmessa/shared';

// Validate idea from API response
const idea: Idea = validateIdea({
  id: '550e8400-e29b-41d4-a716-446655440000',
  token: 'receipt-abc123',
  title: 'Todo App with Dark Mode',
  problem: 'I need a simple todo app that supports dark mode and cloud sync.',
  email: 'user@example.com',
  status: 'running',
  progress: 45,
  createdAt: '2026-01-26T10:00:00.000Z',
  updatedAt: '2026-01-26T11:30:00.000Z',
});

// Safe validation (doesn't throw)
const result = safeValidateIdea(userInput);
if (result.success) {
  processIdea(result.data);
} else {
  showErrors(result.error.errors);
}
```

### Validating Features

```typescript
import { FeatureSchema, validateFeature, FEATURE_STATUSES } from '@utmessa/shared';
import type { Feature, FeatureStatus } from '@utmessa/shared';

// Validate a feature
const feature: Feature = validateFeature({
  id: 'feat-123',
  ideaId: '550e8400-e29b-41d4-a716-446655440000',
  featureId: 'F1',
  title: 'User Authentication',
  description: 'Allow users to sign up and log in',
  status: 'done',
  order: 0,
});

// All valid feature statuses
console.log(FEATURE_STATUSES); // ['planned', 'in_progress', 'done', 'failed', 'skipped']
```

### Validating File Formats

```typescript
import {
  validateProjectFile,
  validateFeaturesFile,
  validateStateFile
} from '@utmessa/shared';

// Validate booth.project.json
const projectFile = validateProjectFile({
  schemaVersion: 1,
  ideaId: '550e8400-e29b-41d4-a716-446655440000',
  token: 'receipt-abc123',
  slug: 'my-todo-app',
  createdAt: '2026-01-26T10:00:00.000Z',
});

// Validate features.json
const featuresFile = validateFeaturesFile({
  schemaVersion: 1,
  planned: true,
  features: [
    { id: 'F1', title: 'Auth', status: 'done' },
    { id: 'F2', title: 'CRUD', status: 'in_progress' },
  ],
});

// Validate booth.state.json
const stateFile = validateStateFile({
  schemaVersion: 1,
  status: 'running',
  progress: 50,
  currentFeature: 'F2',
  updatedAt: '2026-01-26T11:30:00.000Z',
});
```

### Validating Events

```typescript
import { BoothEventSchema } from '@utmessa/shared';

// Parse and validate an event from JSONL line
const line = '{"ts":"2026-01-26T10:00:00Z","type":"JOB_STARTED"}';
const data = JSON.parse(line);
const result = BoothEventSchema.safeParse(data);

if (result.success) {
  const event = result.data; // Typed as BoothEvent
  console.log('Valid event:', event.type);
} else {
  console.error('Invalid event:', result.error.format());
}
```

### Type Narrowing

```typescript
import { BoothEvent } from '@utmessa/shared';

function handleEvent(event: BoothEvent) {
  switch (event.type) {
    case 'JOB_STARTED':
      console.log('Job started at', event.ts);
      break;
    case 'FEATURE_STARTED':
      console.log(`Feature ${event.featureId} started`);
      break;
    case 'FEATURE_DONE':
      console.log(`Feature ${event.featureId} completed`);
      break;
    case 'JOB_DONE':
      console.log('Job completed');
      break;
    // TypeScript enforces exhaustive handling
  }
}
```

### Creating Events

```typescript
import { JobStartedEvent, JobStartedEventSchema } from '@utmessa/shared';

// Type-safe event creation
const event: JobStartedEvent = {
  ts: new Date().toISOString(),
  type: 'JOB_STARTED',
  message: 'Starting build',
  meta: { buildId: '12345' },
};

// Validate before writing
const validated = JobStartedEventSchema.parse(event);
const jsonLine = JSON.stringify(validated);
```

### Intake API DTOs

Request/response types for all Intake service endpoints.

#### Public Endpoints

**Submit Idea** (POST /api/ideas):
```typescript
import { SubmitIdeaRequestSchema, SubmitIdeaResponse } from '@utmessa/shared';
import { z } from 'zod';

// Intake handler - validate incoming request
app.post('/api/ideas', async (req, res) => {
  try {
    const request = SubmitIdeaRequestSchema.parse(req.body);
    const idea = await db.createIdea(request);

    const response: SubmitIdeaResponse = {
      id: idea.id,
      token: idea.token,
      createdAt: idea.createdAt,
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    throw error;
  }
});
```

**Get Idea by Token** (GET /api/ideas/[token]):
```typescript
import { GetIdeaResponse, PublicIdea } from '@utmessa/shared';

// Intake handler - return public-safe fields only
app.get('/api/ideas/:token', async (req, res) => {
  const idea = await db.getIdeaByToken(req.params.token);
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  // PublicIdea excludes orchestrator metadata
  const response: GetIdeaResponse = idea;
  res.json(response);
});
```

#### Protected Endpoints (Orchestrator)

**Claim Idea** (POST /api/ideas/[id]/claim):
```typescript
import { ClaimIdeaRequestSchema, ClaimIdeaResponse } from '@utmessa/shared';

// Orchestrator client
async function claimIdea(ideaId: string, orchestratorId: string): Promise<ClaimIdeaResponse> {
  const response = await fetch(`/api/ideas/${ideaId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ORCH-KEY': process.env.ORCH_KEY!,
    },
    body: JSON.stringify({ claimedBy: orchestratorId }),
  });

  if (!response.ok) {
    throw new Error(`Claim failed: ${response.status}`);
  }

  return response.json();
}
```

**Update Idea Status** (POST /api/ideas/[id]/update):
```typescript
import { UpdateIdeaRequest, UpdateIdeaResponse } from '@utmessa/shared';

// Orchestrator client - partial updates
async function updateIdeaStatus(ideaId: string, updates: UpdateIdeaRequest): Promise<UpdateIdeaResponse> {
  const response = await fetch(`/api/ideas/${ideaId}/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ORCH-KEY': process.env.ORCH_KEY!,
    },
    body: JSON.stringify(updates),
  });

  return response.json();
}

// Usage
await updateIdeaStatus(ideaId, {
  status: 'running',
  progress: 60,
  currentFeature: 'F3',
});
```

**List Ideas by Status** (GET /api/ideas?status=...):
```typescript
import { ListIdeasResponseSchema, ListIdeasResponse } from '@utmessa/shared';

// Orchestrator client - defensive validation
async function listIdeas(status?: string): Promise<ListIdeasResponse> {
  const url = status ? `/api/ideas?status=${status}` : '/api/ideas';
  const response = await fetch(url, {
    headers: { 'X-ORCH-KEY': process.env.ORCH_KEY! },
  });

  const data = await response.json();

  // Optional validation for early detection of API contract violations
  const result = ListIdeasResponseSchema.safeParse(data);
  if (!result.success) {
    console.error('API contract violation', result.error);
    throw new Error('Invalid response from Intake API');
  }

  return result.data;
}
```

#### Public vs. Protected Types

- **PublicIdea**: Excludes internal fields (safe for public exposure)
- **Idea**: Full schema with all fields (for orchestrator use)

Use `PublicIdea` for:
- Public receipt pages
- User-facing APIs
- Any unauthenticated endpoints

Use `Idea` for:
- Orchestrator endpoints
- Internal admin tools
- Authenticated APIs

### Orchestrator API DTOs

Request/response types for the local Orchestrator HTTP API (Dashboard communication).

#### Queue Endpoint (GET /api/queue)

```typescript
import { QueueResponse, QueueResponseSchema } from '@utmessa/shared';

// Dashboard - fetch queue and display
async function loadQueue(): Promise<QueueResponse> {
  const response = await fetch('/api/queue');
  const data = await response.json();
  return QueueResponseSchema.parse(data);
}

// Display queue items
const queue = await loadQueue();
queue.items.forEach(item => {
  console.log(`[${item.status}] ${item.title}`);
  console.log(`  Problem: ${item.problem}`);
});
```

#### Start POC Endpoint (POST /api/start/[ideaId])

```typescript
import { StartPocResult, StartPocResultSchema } from '@utmessa/shared';

// Dashboard - start a POC project
async function startProject(ideaId: string): Promise<StartPocResult> {
  const response = await fetch(`/api/start/${ideaId}`, { method: 'POST' });
  return StartPocResultSchema.parse(await response.json());
}

// Handle success/error
const result = await startProject(ideaId);
if (result.success) {
  console.log('Project started:', result.projectSlug);
  console.log('Path:', result.projectPath);
} else {
  console.error('Failed:', result.error);
}
```

#### Projects List (GET /api/projects)

```typescript
import { ProjectsListResponse, ProjectsListResponseSchema } from '@utmessa/shared';

// Dashboard - list all active projects
async function listProjects(): Promise<ProjectsListResponse> {
  const response = await fetch('/api/projects');
  return ProjectsListResponseSchema.parse(await response.json());
}

// Display projects
const { projects } = await listProjects();
projects.forEach(project => {
  console.log(`${project.slug}: ${project.status} (${project.progress ?? 'N/A'}%)`);
  if (project.waitingQuestion) {
    console.log(`  Waiting: ${project.waitingQuestion}`);
  }
});
```

#### Project Detail (GET /api/projects/[slug])

```typescript
import { ProjectDetail, ProjectDetailSchema } from '@utmessa/shared';

// Dashboard - get full project details
async function getProject(slug: string): Promise<ProjectDetail> {
  const response = await fetch(`/api/projects/${slug}`);
  return ProjectDetailSchema.parse(await response.json());
}

// Access nested data
const detail = await getProject('recipe-app');
console.log(`Idea: ${detail.idea.title}`);
console.log(`Features: ${detail.features.length}`);
console.log(`Recent events: ${detail.recentEvents.length}`);
console.log(`State: ${detail.state.status}`);
```

#### SSE Event Stream (GET /api/projects/[slug]/stream)

```typescript
import { SSEEvent, SSEEventSchema } from '@utmessa/shared';

// Dashboard - connect to real-time updates
function connectToStream(slug: string) {
  const eventSource = new EventSource(`/api/projects/${slug}/stream`);

  eventSource.onmessage = (event) => {
    const data: SSEEvent = SSEEventSchema.parse(JSON.parse(event.data));

    switch (data.type) {
      case 'state-change':
        // Update UI with new state
        updateProjectState(data.state);
        break;
      case 'new-event':
        // Append to event log
        appendEvent(data.event);
        break;
    }
  };

  return eventSource;
}
```

#### Answer Submission (POST /api/projects/[slug]/answer)

```typescript
import { AnswerRequest, AnswerResponse, AnswerRequestSchema } from '@utmessa/shared';

// Dashboard - submit answer to waiting question
async function submitAnswer(slug: string, answer: string): Promise<AnswerResponse> {
  const request: AnswerRequest = { answer };

  const response = await fetch(`/api/projects/${slug}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AnswerRequestSchema.parse(request)),
  });

  return response.json();
}

// Usage
const result = await submitAnswer('recipe-app', 'Use JWT for authentication');
if (result.success && result.eventWritten) {
  console.log('Answer recorded');
}
```

#### Manual Override (POST /api/projects/[slug]/manual)

```typescript
import { ManualOverrideRequest, ManualOverrideResponse, MANUAL_OVERRIDE_ACTIONS } from '@utmessa/shared';

// Dashboard - manual status override
async function manualOverride(
  slug: string,
  action: 'done' | 'failed' | 'deployed',
  reason?: string
): Promise<ManualOverrideResponse> {
  const request: ManualOverrideRequest = { action, reason };

  const response = await fetch(`/api/projects/${slug}/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return response.json();
}

// Mark as manually failed
await manualOverride('recipe-app', 'failed', 'Unable to resolve API issue');
```

### State Computation

Pure functions for computing project state from features and event log.

#### Basic Usage

```typescript
import { computeProjectState, ProjectState } from '@utmessa/shared';
import type { Feature, BoothEvent } from '@utmessa/shared';

const features: Feature[] = [
  { id: 'feat-1', ideaId: '...', featureId: 'F1', title: 'Auth', status: 'done' },
  { id: 'feat-2', ideaId: '...', featureId: 'F2', title: 'CRUD', status: 'in_progress' },
];

const events: BoothEvent[] = [
  { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
  { type: 'FEATURES_PLANNED', total: 2, ts: '2026-01-26T10:00:10Z' },
  { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
  { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
  { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:06:00Z' },
];

const state = computeProjectState(features, events);
// state = {
//   status: 'running',
//   progress: 50,
//   currentStep: null,
//   currentFeature: 'F2',
//   waitingQuestion: null,
//   demoUrl: null,
//   repoUrl: null,
// }
```

#### Status Derivation Priority

The status is derived using priority rules (highest first):

1. **'waiting'**: Unclosed `WAITING_FOR_INPUT` exists
2. **'deployed'**: `DEPLOY_DONE` without subsequent `JOB_FAILED`
3. **'failed'**: `JOB_FAILED` without subsequent `JOB_STARTED` (no recovery)
4. **'running'**: `JOB_STARTED` exists
5. **'not_started'**: Default (no events)

```typescript
import { computeStatus, findWaitingQuestion } from '@utmessa/shared';

// Compute waiting question first (needed for status)
const waitingQuestion = findWaitingQuestion(events);
const status = computeStatus(events, waitingQuestion);
```

#### Progress Computation

Progress is computed from feature completion events:

```typescript
import { computeProgress, isFeatureComplete } from '@utmessa/shared';

// Returns null if no FEATURES_PLANNED event
// Returns 0-100 based on completed features
const progress = computeProgress(features, events);

// A feature is complete if it has:
// - FEATURE_DONE
// - FEATURE_FAILED
// - FEATURE_SKIPPED
const isComplete = isFeatureComplete('F1', events);
```

#### Current Feature Detection

```typescript
import { findCurrentFeature } from '@utmessa/shared';

// Returns the most recent FEATURE_STARTED without completion event
const currentFeature = findCurrentFeature(events);
// currentFeature === 'F2'
```

#### Waiting Question Extraction

```typescript
import { findWaitingQuestion } from '@utmessa/shared';

const events = [
  { type: 'WAITING_FOR_INPUT', question: 'Choose auth method?', ts: '...' },
];

// Returns question from most recent unclosed prompt
const question = findWaitingQuestion(events);
// question === 'Choose auth method?'
```

#### Deployment URL Extraction

```typescript
import { extractDeploymentUrls } from '@utmessa/shared';

const events = [
  { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '...' },
  { type: 'REPO_PUBLISHED', repoUrl: 'https://github.com/user/repo', ts: '...' },
];

const { demoUrl, repoUrl } = extractDeploymentUrls(events);
// demoUrl === 'https://demo.example.com'
// repoUrl === 'https://github.com/user/repo'
```

#### Event Lookup Helpers

```typescript
import {
  findEvent,
  findMostRecentEvent,
  findEventAfter,
  findMostRecentInArray,
} from '@utmessa/shared';

// Find first event of type (array order)
const jobStarted = findEvent(events, 'JOB_STARTED');

// Find most recent event of type (by timestamp)
const latestDeploy = findMostRecentEvent(events, 'DEPLOY_DONE');

// Find event after timestamp (for recovery detection)
const recovery = findEventAfter(events, 'JOB_STARTED', failedEvent.ts);

// Find most recent in pre-filtered array
const filtered = events.filter(e => e.type === 'FEATURE_STARTED');
const mostRecent = findMostRecentInArray(filtered);
```

#### Pure Function Design

All state computation functions are:

- **Pure**: No I/O, no side effects, deterministic
- **Immutable**: No mutation of input parameters
- **Memoizable**: Same inputs always produce same output

```typescript
// Safe to memoize
import memoize from 'lodash/memoize';

const memoizedCompute = memoize(
  computeProjectState,
  (features, events) => JSON.stringify({ features, events })
);
```

#### ProjectRunStatus Values

```typescript
import { PROJECT_RUN_STATUSES, ProjectRunStatus } from '@utmessa/shared';

// All valid status values
console.log(PROJECT_RUN_STATUSES);
// ['not_started', 'running', 'waiting', 'failed', 'deployed']

// Type-safe status handling
function getStatusColor(status: ProjectRunStatus): string {
  switch (status) {
    case 'not_started': return 'gray';
    case 'running': return 'blue';
    case 'waiting': return 'yellow';
    case 'failed': return 'red';
    case 'deployed': return 'green';
  }
}
```

## Event Types

The package exports 17 event types organized into categories:

### Job Events (4)
- `JOB_CREATED` - POC project initialized
- `JOB_STARTED` - Build process started
- `JOB_FAILED` - Build failed (includes `reason`)
- `JOB_DONE` - Build completed successfully

### Feature Events (5)
- `FEATURES_PLANNED` - Feature list finalized (includes `total`)
- `FEATURE_STARTED` - Feature implementation started (includes `featureId`)
- `FEATURE_DONE` - Feature completed (includes `featureId`)
- `FEATURE_FAILED` - Feature failed (includes `featureId`, `reason`)
- `FEATURE_SKIPPED` - Feature intentionally skipped (includes `featureId`)

### Human-in-the-Loop Events (2)
- `WAITING_FOR_INPUT` - Build paused for human decision (includes `question`)
- `INPUT_RECEIVED` - Human provided answer (includes `answer`)

### Deployment Events (3)
- `DEPLOY_STARTED` - Deployment process started
- `DEPLOY_DONE` - Deployment completed (includes `url`)
- `REPO_PUBLISHED` - Repository published (includes `repoUrl`)

### Test Events (3)
- `TESTS_STARTED` - Test suite started
- `TESTS_PASSED` - All tests passed
- `TESTS_FAILED` - Tests failed (includes `reason`)

## Idea & Feature Types

### IdeaStatus (8 states)
- `submitted` - Initial state when user submits idea
- `ready` - Validated and ready for Orchestrator
- `claimed` - Orchestrator has claimed the idea
- `running` - Build process is active
- `waiting` - Awaiting human input (HITL)
- `deployed` - Build complete, app deployed
- `failed` - Build encountered fatal error
- `abandoned` - Idea was abandoned

### FeatureStatus (5 states)
- `planned` - Feature defined but not started
- `in_progress` - Feature implementation underway
- `done` - Feature completed successfully
- `failed` - Feature implementation failed
- `skipped` - Feature intentionally skipped

## File Format Types

### booth.project.json
Maps local project folder to Intake idea record.
- `schemaVersion` (1)
- `ideaId` (UUID)
- `token` (string)
- `slug` (string)
- `createdAt` (ISO 8601)
- `startedAt?` (ISO 8601)
- `templateId?` (string)
- `notes?` (string)

### features.json
Defines feature list for progress computation.
- `schemaVersion` (1)
- `planned` (boolean)
- `features` (array of FeatureItem)

### booth.state.json
Cached computed state for fast loading.
- `schemaVersion` (1)
- `status` (ProjectRunStatus)
- `updatedAt` (ISO 8601)
- `progress?` (0-100)
- `currentStep?` (string)
- `currentFeature?` (string)
- `waitingQuestion?` (string | null)
- `demoUrl?` (URL | null)
- `repoUrl?` (URL | null)

## API Reference

See [docs/events.md](./docs/events.md) for event API documentation.

## Development

```bash
npm run build      # Build package
npm test           # Run tests
npm run typecheck  # Check types
npm run dev        # Watch mode
```
