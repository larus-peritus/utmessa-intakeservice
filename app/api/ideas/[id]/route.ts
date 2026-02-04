import { NextRequest, NextResponse } from 'next/server';
import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { deleteIdea, getIdeaById } from '@/lib/db/ideas';
import { z } from 'zod';

/**
 * UUID validation schema
 */
const UUIDSchema = z.string().uuid('Invalid UUID format');

/**
 * DELETE /api/ideas/[id]
 *
 * Delete an idea from the queue. Protected endpoint.
 *
 * Headers:
 * - X-ORCH-KEY: Shared secret for orchestrator authentication (required)
 *
 * URL Parameters:
 * - id: UUID of the idea to delete
 *
 * Response:
 * - 200 OK: Idea successfully deleted
 * - 400 Bad Request: Invalid UUID format
 * - 401 Unauthorized: Invalid or missing X-ORCH-KEY
 * - 404 Not Found: Idea with given ID does not exist
 * - 500 Internal Server Error: Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const startTime = performance.now();
  const resolvedParams = await params;
  const ideaId = resolvedParams.id;

  try {
    // 1. Authentication - require X-ORCH-KEY header
    if (!validateOrchKey(request)) {
      console.warn('[API] DELETE /api/ideas/[id]: Authentication failed', { ideaId });
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Invalid or missing X-ORCH-KEY header',
        },
        { status: 401 }
      );
    }

    // 2. Validate UUID format
    const uuidResult = UUIDSchema.safeParse(ideaId);
    if (!uuidResult.success) {
      console.warn('[API] DELETE /api/ideas/[id]: Invalid UUID', { ideaId });
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid idea ID format',
          details: [{ field: 'id', message: 'Must be a valid UUID' }],
        },
        { status: 400 }
      );
    }

    // 3. Check if idea exists first (for better error message)
    const existingIdea = await getIdeaById(ideaId);
    if (!existingIdea) {
      console.log('[API] DELETE /api/ideas/[id]: Not found', { ideaId });
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Idea with ID ${ideaId} not found`,
        },
        { status: 404 }
      );
    }

    // 4. Delete the idea
    const deleted = await deleteIdea(ideaId);

    if (!deleted) {
      // This shouldn't happen since we checked existence, but handle it anyway
      console.warn('[API] DELETE /api/ideas/[id]: Delete failed unexpectedly', { ideaId });
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Idea with ID ${ideaId} not found`,
        },
        { status: 404 }
      );
    }

    // 5. Log success
    const durationMs = performance.now() - startTime;
    console.log('[API] DELETE /api/ideas/[id]: Success', {
      ideaId,
      title: existingIdea.title,
      durationMs: Math.round(durationMs),
    });

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        deleted: true,
        id: ideaId,
      },
      { status: 200 }
    );

  } catch (error) {
    // Log full error details server-side
    console.error('[API] DELETE /api/ideas/[id]: Internal error', {
      ideaId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return safe error message to client
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
