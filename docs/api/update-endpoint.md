# Update Endpoint Documentation

## PATCH /api/ideas/[id]/update

Update an idea's status and progress during orchestrator processing.

### Authentication

This endpoint requires the `X-ORCH-KEY` header with the shared secret configured in the environment.

```bash
X-ORCH-KEY: your-orchestrator-secret-key
```

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | The unique identifier of the idea to update |

### Request Body

All fields are optional. Only provided fields will be updated. Omitted fields are preserved.

```typescript
{
  status?: 'running' | 'waiting' | 'deployed' | 'failed' | 'abandoned';
  progress?: number;       // 0-100, integer
  currentStep?: string;    // Human-readable activity (max 500 chars)
  currentFeature?: string; // Current feature code e.g., "F1" (max 100 chars)
  waitingQuestion?: string; // Question when status is "waiting" (max 1000 chars)
  demoUrl?: string;        // Demo URL when deployed
  repoUrl?: string;        // Repository URL
}
```

### Example Requests

**Start building:**
```bash
curl -X PATCH \
  http://localhost:3000/api/ideas/550e8400-e29b-41d4-a716-446655440000/update \
  -H "X-ORCH-KEY: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "running",
    "progress": 0,
    "currentStep": "Initializing build environment",
    "currentFeature": "F1"
  }'
```

**Update progress:**
```bash
curl -X PATCH \
  http://localhost:3000/api/ideas/550e8400-e29b-41d4-a716-446655440000/update \
  -H "X-ORCH-KEY: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 35,
    "currentStep": "Implementing feature F2"
  }'
```

**Ask a question (waiting):**
```bash
curl -X PATCH \
  http://localhost:3000/api/ideas/550e8400-e29b-41d4-a716-446655440000/update \
  -H "X-ORCH-KEY: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "waiting",
    "waitingQuestion": "Should I use PostgreSQL or MongoDB for the database?"
  }'
```

**Complete deployment:**
```bash
curl -X PATCH \
  http://localhost:3000/api/ideas/550e8400-e29b-41d4-a716-446655440000/update \
  -H "X-ORCH-KEY: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "deployed",
    "progress": 100,
    "demoUrl": "https://my-app.vercel.app",
    "repoUrl": "https://github.com/user/my-app",
    "currentStep": "Deployment complete"
  }'
```

### Response

#### 200 OK - Success

Returns the updated idea object.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "token": "V1StGXR8Z5jdHi9B2vBJ4",
  "title": "My Awesome App",
  "problem": "Problem description...",
  "mustHaves": ["feature1", "feature2"],
  "email": "user@example.com",
  "status": "running",
  "progress": 35,
  "currentStep": "Implementing feature F2",
  "currentFeature": "F2",
  "createdAt": "2026-01-27T09:00:00.000Z",
  "updatedAt": "2026-01-27T11:30:00.000Z"
}
```

**Note:** Null optional fields (`waitingQuestion`, `demoUrl`, `repoUrl`) are omitted from the response.

#### 400 Bad Request - Validation Error

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    { "field": "progress", "message": "Progress cannot exceed 100" }
  ]
}
```

#### 400 Bad Request - Invalid Status Transition

```json
{
  "error": "INVALID_TRANSITION",
  "message": "Cannot transition from waiting to deployed",
  "details": {
    "currentStatus": "waiting",
    "requestedStatus": "deployed",
    "allowedTransitions": ["running", "failed"]
  }
}
```

#### 401 Unauthorized

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or missing X-ORCH-KEY header"
}
```

#### 403 Forbidden - Not Claimed

```json
{
  "error": "NOT_CLAIMED",
  "message": "Idea is in submitted status and must be claimed before updating",
  "details": {
    "currentStatus": "submitted"
  }
}
```

#### 404 Not Found

```json
{
  "error": "NOT_FOUND",
  "message": "Idea not found: 550e8400-e29b-41d4-a716-446655440000"
}
```

#### 500 Internal Server Error

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

### Status Transition Rules

The following status transitions are allowed:

| From | To |
|------|-----|
| `claimed` | `running`, `failed` |
| `running` | `running`, `waiting`, `deployed`, `failed` |
| `waiting` | `running`, `failed` |
| `deployed` | `deployed` (idempotent) |
| `failed` | `failed` (idempotent) |
| `abandoned` | `abandoned` (idempotent) |

**Not updateable:** Ideas with status `submitted` or `ready` cannot be updated - they must first be claimed via the `/api/ideas/[id]/claim` endpoint.

### URL Validation

URLs provided in `demoUrl` and `repoUrl` must:
- Use `http://` or `https://` protocol only
- Be valid URL format
- Not exceed 2083 characters (IE max URL length)

**Rejected protocols:** `javascript:`, `data:`, `file:`, `ftp:`, `mailto:`, `vbscript:`

### Security Considerations

1. **Authentication**: Always include the `X-ORCH-KEY` header
2. **XSS Prevention**: URLs are validated to prevent script injection
3. **Input Validation**: All fields are validated for type and length
4. **Safe Error Messages**: Internal errors return generic messages to avoid information leakage
