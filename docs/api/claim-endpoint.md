# POST /api/ideas/[id]/claim

Atomically claim an idea for processing by an orchestrator.

## Overview

This endpoint allows the Orchestrator service to claim submitted ideas for processing. The claim operation is atomic - only one orchestrator can successfully claim any given idea. Subsequent claim attempts will receive a conflict response with details about the existing claim.

## Authentication

This is a protected endpoint requiring the `X-ORCH-KEY` header.

| Header | Required | Description |
|--------|----------|-------------|
| `X-ORCH-KEY` | Yes | Shared secret key for orchestrator authentication |

## Request

### URL Pattern

```
POST /api/ideas/{ideaId}/claim
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ideaId` | UUID | Yes | The unique identifier of the idea to claim |

### Request Body

```json
{
  "claimedBy": "orchestrator-1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `claimedBy` | string | No | Identifier for the claiming orchestrator instance |

The request body is optional. If provided, `claimedBy` must be a non-empty string.

### Example Requests

**Claim with orchestrator ID:**
```bash
curl -X POST \
  https://intake.example.com/api/ideas/550e8400-e29b-41d4-a716-446655440000/claim \
  -H "X-ORCH-KEY: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"claimedBy": "orchestrator-booth-42"}'
```

**Claim without orchestrator ID:**
```bash
curl -X POST \
  https://intake.example.com/api/ideas/550e8400-e29b-41d4-a716-446655440000/claim \
  -H "X-ORCH-KEY: your-secret-key"
```

**Node.js fetch example:**
```typescript
async function claimIdea(ideaId: string, claimedBy?: string): Promise<ClaimResult> {
  const response = await fetch(`${INTAKE_URL}/api/ideas/${ideaId}/claim`, {
    method: 'POST',
    headers: {
      'X-ORCH-KEY': process.env.ORCH_KEY!,
      'Content-Type': 'application/json',
    },
    body: claimedBy ? JSON.stringify({ claimedBy }) : undefined,
  });

  if (response.status === 200) {
    const idea = await response.json();
    return { success: true, idea };
  }

  if (response.status === 409) {
    const conflict = await response.json();
    return { success: false, conflict: conflict.details };
  }

  throw new Error(`Claim failed: ${response.status}`);
}
```

## Responses

### 200 OK - Claim Successful

The idea was successfully claimed. The response contains the complete idea with updated status.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "V1StGXR8Z5jdHi9B2vBJ4",
  "title": "Recipe App",
  "problem": "Need to track family recipes with search functionality",
  "email": "user@example.com",
  "status": "claimed",
  "mustHaves": ["search", "categories"],
  "createdAt": "2026-01-27T09:00:00.000Z",
  "updatedAt": "2026-01-27T10:00:00.000Z"
}
```

### 401 Unauthorized - Authentication Failed

The request is missing or has an invalid `X-ORCH-KEY` header.

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or missing X-ORCH-KEY header"
}
```

### 400 Bad Request - Validation Error

The request has invalid parameters.

**Invalid UUID:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    {
      "field": "ideaId",
      "message": "Invalid UUID format"
    }
  ]
}
```

**Invalid claimedBy:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    {
      "field": "claimedBy",
      "message": "claimedBy cannot be empty"
    }
  ]
}
```

### 404 Not Found - Idea Does Not Exist

The specified idea ID does not exist in the database.

```json
{
  "error": "NOT_FOUND",
  "message": "Idea not found: 550e8400-e29b-41d4-a716-446655440000"
}
```

### 409 Conflict - Already Claimed

The idea has already been claimed by another orchestrator or is in a non-claimable status.

```json
{
  "error": "ALREADY_CLAIMED",
  "message": "Idea is not claimable. Current status: running",
  "details": {
    "claimedAt": "2026-01-27T08:00:00.000Z",
    "claimedBy": "orchestrator-booth-1",
    "currentStatus": "running"
  }
}
```

| Detail Field | Type | Description |
|--------------|------|-------------|
| `claimedAt` | string (ISO 8601) | When the idea was originally claimed |
| `claimedBy` | string or null | Which orchestrator claimed it (if provided) |
| `currentStatus` | string | Current status of the idea |

### 500 Internal Server Error

An unexpected error occurred. Details are not exposed for security.

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

## Claimable Statuses

An idea can only be claimed when its status is one of:

| Status | Description |
|--------|-------------|
| `submitted` | Initial state after user submits |
| `ready` | Validated and ready for processing |

All other statuses (`claimed`, `running`, `waiting`, `deployed`, `failed`, `abandoned`) will result in a 409 Conflict response.

## Concurrency Behavior

The claim operation uses an atomic database transaction to prevent race conditions:

1. The operation executes as: `UPDATE ideas SET status='claimed' WHERE id=? AND status IN ('submitted', 'ready')`
2. Only one request can successfully update the row
3. Other concurrent requests will find the row no longer matches the WHERE clause
4. Failed requests receive a 409 response with the current claim details

This ensures exactly one orchestrator wins when multiple attempt to claim simultaneously.

## Error Handling Best Practices

```typescript
async function handleClaimResult(ideaId: string) {
  const result = await claimIdea(ideaId, 'my-orchestrator');

  if (result.success) {
    // Proceed with processing
    console.log(`Claimed idea: ${result.idea.token}`);
    return startProcessing(result.idea);
  }

  // Handle conflict - another orchestrator claimed it
  console.log(`Idea already claimed by: ${result.conflict.claimedBy}`);
  console.log(`Claimed at: ${result.conflict.claimedAt}`);

  // Do not retry - the claim is permanent
  return null;
}
```

## Related Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/ideas?status=submitted` | List claimable ideas |
| `POST /api/ideas/[id]/update` | Update idea status and progress |
