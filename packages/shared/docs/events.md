# Event Schemas Reference

Complete reference for all booth event types in `@utmessa/shared`.

## Overview

Events are written to `booth.log.jsonl` as JSONL (one JSON object per line). All events extend the base event schema and use a discriminated union on the `type` field.

## Base Event Schema

All events include these common fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ts` | string | Yes | ISO 8601 timestamp (e.g., "2026-01-26T10:00:00Z") |
| `type` | string | Yes | Event type discriminator |
| `message` | string | No | Optional human-readable message |
| `meta` | object | No | Optional arbitrary metadata |

## Job Events

### JOB_CREATED

Written when a POC project is initialized.

```json
{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"recipe-app"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectSlug` | string | No | Project identifier |

### JOB_STARTED

Written when build process begins execution.

```json
{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED","message":"Starting build"}
```

No additional fields.

### JOB_FAILED

Written when build process encounters fatal error.

```json
{"ts":"2026-01-26T10:10:00Z","type":"JOB_FAILED","reason":"Dependency install failed"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Error description (non-empty) |

### JOB_DONE

Written when build process completes successfully.

```json
{"ts":"2026-01-26T10:15:30Z","type":"JOB_DONE","message":"Build complete"}
```

No additional fields.

## Feature Events

### FEATURES_PLANNED

Written when feature list is finalized.

```json
{"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":5}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total` | number | Yes | Number of planned features (positive integer) |

### FEATURE_STARTED

Written when feature implementation begins.

```json
{"ts":"2026-01-26T10:01:00Z","type":"FEATURE_STARTED","featureId":"F1","title":"User Authentication"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `featureId` | string | Yes | Feature identifier (non-empty) |
| `title` | string | No | Human-readable feature title |

### FEATURE_DONE

Written when feature implementation completes successfully.

```json
{"ts":"2026-01-26T10:05:00Z","type":"FEATURE_DONE","featureId":"F1"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `featureId` | string | Yes | Feature identifier (non-empty) |

### FEATURE_FAILED

Written when feature implementation encounters error.

```json
{"ts":"2026-01-26T10:08:30Z","type":"FEATURE_FAILED","featureId":"F2","reason":"API endpoint returned 500"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `featureId` | string | Yes | Feature identifier (non-empty) |
| `reason` | string | Yes | Error description (non-empty) |

### FEATURE_SKIPPED

Written when feature is intentionally skipped.

```json
{"ts":"2026-01-26T10:10:00Z","type":"FEATURE_SKIPPED","featureId":"F3","reason":"Optional feature"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `featureId` | string | Yes | Feature identifier (non-empty) |
| `reason` | string | No | Reason for skipping |

## Human-in-the-Loop Events

### WAITING_FOR_INPUT

Written when build pauses for human decision.

```json
{"ts":"2026-01-26T10:10:00Z","type":"WAITING_FOR_INPUT","question":"Choose auth method","choices":["JWT","OAuth","Session"]}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Question to ask (non-empty) |
| `choices` | string[] | No | Predefined options |

### INPUT_RECEIVED

Written when human provides answer.

```json
{"ts":"2026-01-26T10:12:30Z","type":"INPUT_RECEIVED","answer":"JWT"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `answer` | string | Yes | User's response (non-empty) |

## Deployment Events

### DEPLOY_STARTED

Written when deployment process begins.

```json
{"ts":"2026-01-26T10:15:00Z","type":"DEPLOY_STARTED","target":"vercel"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string | No | Deployment platform |

### DEPLOY_DONE

Written when deployment completes successfully.

```json
{"ts":"2026-01-26T10:16:30Z","type":"DEPLOY_DONE","url":"https://recipe-app-abc123.vercel.app"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Deployed URL (valid URL) |

### REPO_PUBLISHED

Written when repository is published.

```json
{"ts":"2026-01-26T10:17:00Z","type":"REPO_PUBLISHED","repoUrl":"https://github.com/user/recipe-app"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repoUrl` | string | Yes | Repository URL (valid URL) |

## Test Events

### TESTS_STARTED

Written when test suite execution begins.

```json
{"ts":"2026-01-26T10:14:00Z","type":"TESTS_STARTED"}
```

No additional fields.

### TESTS_PASSED

Written when all tests pass successfully.

```json
{"ts":"2026-01-26T10:14:30Z","type":"TESTS_PASSED"}
```

No additional fields.

### TESTS_FAILED

Written when one or more tests fail.

```json
{"ts":"2026-01-26T10:14:30Z","type":"TESTS_FAILED","reason":"2 of 10 tests failed"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Failure description (non-empty) |

## Example Event Sequences

### Successful Build

```jsonl
{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"recipe-app"}
{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED"}
{"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":3}
{"ts":"2026-01-26T10:01:00Z","type":"FEATURE_STARTED","featureId":"F1","title":"User Auth"}
{"ts":"2026-01-26T10:05:00Z","type":"FEATURE_DONE","featureId":"F1"}
{"ts":"2026-01-26T10:05:10Z","type":"FEATURE_STARTED","featureId":"F2","title":"Recipe CRUD"}
{"ts":"2026-01-26T10:10:00Z","type":"FEATURE_DONE","featureId":"F2"}
{"ts":"2026-01-26T10:10:10Z","type":"FEATURE_STARTED","featureId":"F3","title":"Search"}
{"ts":"2026-01-26T10:12:00Z","type":"FEATURE_DONE","featureId":"F3"}
{"ts":"2026-01-26T10:12:10Z","type":"TESTS_STARTED"}
{"ts":"2026-01-26T10:13:00Z","type":"TESTS_PASSED"}
{"ts":"2026-01-26T10:13:10Z","type":"DEPLOY_STARTED","target":"vercel"}
{"ts":"2026-01-26T10:14:30Z","type":"DEPLOY_DONE","url":"https://recipe-app.vercel.app"}
{"ts":"2026-01-26T10:15:00Z","type":"REPO_PUBLISHED","repoUrl":"https://github.com/user/recipe-app"}
{"ts":"2026-01-26T10:15:10Z","type":"JOB_DONE"}
```

### Build with Human Input

```jsonl
{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"auth-app"}
{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED"}
{"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":2}
{"ts":"2026-01-26T10:01:00Z","type":"FEATURE_STARTED","featureId":"F1","title":"Authentication"}
{"ts":"2026-01-26T10:02:00Z","type":"WAITING_FOR_INPUT","question":"Choose auth method","choices":["JWT","OAuth","Session"]}
{"ts":"2026-01-26T10:05:30Z","type":"INPUT_RECEIVED","answer":"JWT"}
{"ts":"2026-01-26T10:08:00Z","type":"FEATURE_DONE","featureId":"F1"}
{"ts":"2026-01-26T10:08:10Z","type":"FEATURE_STARTED","featureId":"F2","title":"User Profile"}
{"ts":"2026-01-26T10:10:00Z","type":"FEATURE_DONE","featureId":"F2"}
{"ts":"2026-01-26T10:10:30Z","type":"JOB_DONE"}
```

### Failed Build

```jsonl
{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"broken-app"}
{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED"}
{"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":2}
{"ts":"2026-01-26T10:01:00Z","type":"FEATURE_STARTED","featureId":"F1","title":"Database Setup"}
{"ts":"2026-01-26T10:03:00Z","type":"FEATURE_FAILED","featureId":"F1","reason":"Database connection refused"}
{"ts":"2026-01-26T10:03:05Z","type":"JOB_FAILED","reason":"Feature F1 failed: Database connection refused"}
```

## TypeScript Usage

### Importing

```typescript
// Import schemas for validation
import { BoothEventSchema, JobStartedEventSchema } from '@utmessa/shared';

// Import types for type annotations
import type { BoothEvent, JobStartedEvent } from '@utmessa/shared';
```

### Type Guards

```typescript
import { BoothEvent } from '@utmessa/shared';

function isFeatureEvent(event: BoothEvent): event is BoothEvent & { featureId: string } {
  return event.type.startsWith('FEATURE_');
}
```

### Exhaustive Handling

```typescript
import { BoothEvent } from '@utmessa/shared';

function handleEvent(event: BoothEvent): string {
  switch (event.type) {
    case 'JOB_CREATED': return `Created: ${event.projectSlug ?? 'unknown'}`;
    case 'JOB_STARTED': return 'Started';
    case 'JOB_FAILED': return `Failed: ${event.reason}`;
    case 'JOB_DONE': return 'Done';
    case 'FEATURES_PLANNED': return `Planning ${event.total} features`;
    case 'FEATURE_STARTED': return `Started: ${event.featureId}`;
    case 'FEATURE_DONE': return `Done: ${event.featureId}`;
    case 'FEATURE_FAILED': return `Failed: ${event.featureId} - ${event.reason}`;
    case 'FEATURE_SKIPPED': return `Skipped: ${event.featureId}`;
    case 'WAITING_FOR_INPUT': return `Waiting: ${event.question}`;
    case 'INPUT_RECEIVED': return `Received: ${event.answer}`;
    case 'DEPLOY_STARTED': return `Deploying to: ${event.target ?? 'unknown'}`;
    case 'DEPLOY_DONE': return `Deployed: ${event.url}`;
    case 'REPO_PUBLISHED': return `Published: ${event.repoUrl}`;
    case 'TESTS_STARTED': return 'Tests started';
    case 'TESTS_PASSED': return 'Tests passed';
    case 'TESTS_FAILED': return `Tests failed: ${event.reason}`;
  }
}
```
