import { NextRequest, NextResponse } from 'next/server';
import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { validateUpdateRequest } from '@/lib/validators/updateRequestValidator';
import { updateIdea, type UpdateError } from '@/lib/services/updateService';
import {
  formatUpdateSuccessResponse,
  formatUpdateAuthErrorResponse,
  formatUpdateNotFoundResponse,
  formatUpdateForbiddenResponse,
  formatInvalidTransitionResponse,
  formatUpdateValidationErrorResponse,
  formatUpdateInternalErrorResponse,
} from '@/lib/formatters/update-response-formatter';

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/ideas/[id]/update
 *
 * Update an idea's status and progress. Protected endpoint for orchestrator.
 *
 * Headers:
 * - X-ORCH-KEY: Shared secret for orchestrator authentication (required)
 *
 * URL Parameters:
 * - id: UUID of the idea to update
 *
 * Request Body (all fields optional):
 * - status: New status (must follow valid transition rules)
 * - progress: Progress percentage (0-100)
 * - currentStep: Human-readable current activity
 * - currentFeature: Current feature being built (e.g., "F2")
 * - waitingQuestion: Question if status is "waiting"
 * - demoUrl: Demo URL (when deployed)
 * - repoUrl: Repository URL
 *
 * Response:
 * - 200 OK: Idea successfully updated, returns full idea object
 * - 400 Bad Request: Invalid UUID, request body, or status transition
 * - 401 Unauthorized: Invalid or missing X-ORCH-KEY
 * - 403 Forbidden: Idea is not claimed (cannot update submitted/ready ideas)
 * - 404 Not Found: Idea with given ID does not exist
 * - 500 Internal Server Error: Unexpected error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = performance.now();
  const resolvedParams = await params;
  const ideaId = resolvedParams.id;

  try {
    // 1. Authentication - require X-ORCH-KEY header
    if (!validateOrchKey(request)) {
      console.warn('[API] PATCH /api/ideas/[id]/update: Authentication failed', {
        ideaId,
      });
      return formatUpdateAuthErrorResponse();
    }

    // 2. Validate UUID format
    if (!UUID_REGEX.test(ideaId)) {
      console.warn('[API] PATCH /api/ideas/[id]/update: Invalid UUID format', {
        ideaId,
      });
      return formatUpdateValidationErrorResponse([
        { field: 'ideaId', message: 'Invalid UUID format' },
      ]);
    }

    // 3. Parse request body
    let body: unknown;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      console.warn('[API] PATCH /api/ideas/[id]/update: Invalid JSON body', {
        ideaId,
      });
      return formatUpdateValidationErrorResponse([
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    // 4. Validate request body with Zod
    const validation = validateUpdateRequest(body);
    if (!validation.success) {
      console.warn('[API] PATCH /api/ideas/[id]/update: Validation failed', {
        ideaId,
        errors: validation.errors,
      });
      return formatUpdateValidationErrorResponse(validation.errors);
    }

    // 5. Execute update operation
    const result = await updateIdea(ideaId, validation.data);

    // 6. Handle result
    if (result.success) {
      const durationMs = performance.now() - startTime;
      console.log('[API] PATCH /api/ideas/[id]/update: Success', {
        ideaId: result.idea.id,
        newStatus: result.idea.status,
        durationMs: Math.round(durationMs),
      });
      return formatUpdateSuccessResponse(result.idea);
    }

    // 7. Handle specific errors based on error type discriminator
    const error = result.error as UpdateError;

    switch (error.type) {
      case 'NOT_FOUND':
        console.log('[API] PATCH /api/ideas/[id]/update: Not found', { ideaId });
        return formatUpdateNotFoundResponse(ideaId);

      case 'NOT_CLAIMED':
        console.log('[API] PATCH /api/ideas/[id]/update: Forbidden', {
          ideaId,
          currentStatus: error.currentStatus,
        });
        return formatUpdateForbiddenResponse(error.currentStatus);

      case 'INVALID_TRANSITION':
        console.log('[API] PATCH /api/ideas/[id]/update: Invalid transition', {
          ideaId,
          currentStatus: error.currentStatus,
          requestedStatus: error.requestedStatus,
          allowedTransitions: error.allowedTransitions,
        });
        return formatInvalidTransitionResponse(
          error.currentStatus,
          error.requestedStatus,
          error.allowedTransitions
        );

      default:
        // Unexpected error type
        console.error('[API] PATCH /api/ideas/[id]/update: Unexpected error type', {
          ideaId,
          error: result.error,
        });
        return formatUpdateInternalErrorResponse();
    }
  } catch (error) {
    // Log full error details server-side
    console.error('[API] PATCH /api/ideas/[id]/update: Internal error', {
      ideaId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return safe error message to client
    return formatUpdateInternalErrorResponse();
  }
}
