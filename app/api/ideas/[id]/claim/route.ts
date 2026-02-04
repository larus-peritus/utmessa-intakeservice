import { NextRequest, NextResponse } from 'next/server';
import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { validateClaimRequest } from '@/lib/validators/claimRequestValidator';
import { claimIdea } from '@/lib/services/claimService';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors/claim-errors';
import {
  formatSuccessResponse,
  formatAuthError,
  formatNotFoundError,
  formatConflictResponse,
  formatValidationError,
  formatInternalError,
} from '@/lib/formatters/claim-response-formatter';

/**
 * POST /api/ideas/[id]/claim
 *
 * Atomically claim an idea for processing. Protected endpoint.
 *
 * Headers:
 * - X-ORCH-KEY: Shared secret for orchestrator authentication (required)
 *
 * URL Parameters:
 * - id: UUID of the idea to claim
 *
 * Request Body (optional):
 * - claimedBy: Identifier for who is claiming (e.g., orchestrator instance ID)
 *
 * Response:
 * - 200 OK: Idea successfully claimed, returns full idea object
 * - 400 Bad Request: Invalid UUID or request body
 * - 401 Unauthorized: Invalid or missing X-ORCH-KEY
 * - 404 Not Found: Idea with given ID does not exist
 * - 409 Conflict: Idea is not claimable (already claimed, running, etc.)
 * - 500 Internal Server Error: Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = performance.now();
  const resolvedParams = await params;
  const ideaId = resolvedParams.id;

  try {
    // 1. Authentication - require X-ORCH-KEY header
    if (!validateOrchKey(request)) {
      console.warn('[API] POST /api/ideas/[id]/claim: Authentication failed', { ideaId });
      return formatAuthError();
    }

    // 2. Parse request body (may be empty)
    let body: unknown;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : undefined;
    } catch {
      console.warn('[API] POST /api/ideas/[id]/claim: Invalid JSON body', { ideaId });
      return formatValidationError([
        { field: 'body', message: 'Request body must be valid JSON' }
      ]);
    }

    // 3. Validate request (UUID + body)
    let validated;
    try {
      validated = validateClaimRequest(ideaId, body);
    } catch (error) {
      if (error instanceof ValidationError) {
        console.warn('[API] POST /api/ideas/[id]/claim: Validation failed', {
          ideaId,
          details: error.details,
        });
        return formatValidationError(error.details);
      }
      throw error;
    }

    // 4. Execute claim operation
    const result = await claimIdea(validated.ideaId, validated.claimedBy);

    // 5. Handle result
    if (result.success) {
      const durationMs = performance.now() - startTime;
      console.log('[API] POST /api/ideas/[id]/claim: Success', {
        ideaId: result.idea.id,
        claimedBy: validated.claimedBy ?? '(anonymous)',
        durationMs: Math.round(durationMs),
      });
      return formatSuccessResponse(result.idea);
    }

    // 6. Handle specific errors
    if (result.error instanceof NotFoundError) {
      console.log('[API] POST /api/ideas/[id]/claim: Not found', { ideaId });
      return formatNotFoundError(ideaId);
    }

    if (result.error instanceof ConflictError) {
      console.log('[API] POST /api/ideas/[id]/claim: Conflict', {
        ideaId,
        currentStatus: result.error.currentStatus,
        claimedAt: result.error.claimedAt.toISOString(),
        claimedBy: result.error.claimedBy,
      });
      return formatConflictResponse(
        result.error.claimedAt,
        result.error.claimedBy,
        result.error.currentStatus
      );
    }

    // Unexpected error type
    console.error('[API] POST /api/ideas/[id]/claim: Unexpected error type', {
      ideaId,
      error: result.error,
    });
    return formatInternalError();

  } catch (error) {
    // Log full error details server-side
    console.error('[API] POST /api/ideas/[id]/claim: Internal error', {
      ideaId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return safe error message to client
    return formatInternalError();
  }
}
