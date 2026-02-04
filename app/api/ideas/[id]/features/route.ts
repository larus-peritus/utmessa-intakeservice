import { NextRequest, NextResponse } from 'next/server';
import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { UpsertFeaturesRequestSchema, UpsertFeaturesResponseSchema } from '@utmessa/shared';
import { upsertFeatures } from '@/lib/services/featuresService';

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/ideas/[id]/features
 *
 * Upsert feature list for an idea. Protected endpoint for orchestrator.
 *
 * Headers:
 * - X-ORCH-KEY: Shared secret for orchestrator authentication (required)
 *
 * URL Parameters:
 * - id: UUID of the idea
 *
 * Request Body:
 * - features: Array of feature objects with id, ideaId, featureId, title, status
 *
 * Response:
 * - 200 OK: Features successfully upserted
 * - 400 Bad Request: Invalid UUID or request body
 * - 401 Unauthorized: Invalid or missing X-ORCH-KEY
 * - 404 Not Found: Idea with given ID does not exist
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
      console.warn('[API] POST /api/ideas/[id]/features: Authentication failed', {
        ideaId,
      });
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Valid X-ORCH-KEY header is required',
        },
        { status: 401 }
      );
    }

    // 2. Validate UUID format
    if (!UUID_REGEX.test(ideaId)) {
      console.warn('[API] POST /api/ideas/[id]/features: Invalid UUID format', {
        ideaId,
      });
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid UUID format',
          details: [{ field: 'ideaId', message: 'Invalid UUID format' }],
        },
        { status: 400 }
      );
    }

    // 3. Parse request body
    let body: unknown;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      console.warn('[API] POST /api/ideas/[id]/features: Invalid JSON body', {
        ideaId,
      });
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Request body must be valid JSON',
          details: [{ field: 'body', message: 'Request body must be valid JSON' }],
        },
        { status: 400 }
      );
    }

    // 4. Validate request body with Zod
    const validation = UpsertFeaturesRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      console.warn('[API] POST /api/ideas/[id]/features: Validation failed', {
        ideaId,
        errors,
      });

      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid request body',
          details: errors,
        },
        { status: 400 }
      );
    }

    // 5. Execute upsert operation
    const result = await upsertFeatures(ideaId, validation.data.features);

    // 6. Handle result
    if (result.success) {
      const durationMs = performance.now() - startTime;
      console.log('[API] POST /api/ideas/[id]/features: Success', {
        ideaId: result.ideaId,
        featuresCount: result.featuresCount,
        durationMs: Math.round(durationMs),
      });

      // Return response matching UpsertFeaturesResponseSchema
      const response = UpsertFeaturesResponseSchema.parse({
        success: true,
      });

      return NextResponse.json(response, { status: 200 });
    }

    // 7. Handle specific errors
    const error = result.error;

    switch (error.type) {
      case 'NOT_FOUND':
        console.log('[API] POST /api/ideas/[id]/features: Not found', { ideaId });
        return NextResponse.json(
          {
            error: 'Not Found',
            message: `Idea with ID ${ideaId} not found`,
          },
          { status: 404 }
        );

      case 'DATABASE_ERROR':
        console.error('[API] POST /api/ideas/[id]/features: Database error', {
          ideaId,
          message: error.message,
        });
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            message: 'Failed to upsert features',
          },
          { status: 500 }
        );

      default:
        // Unexpected error type
        console.error('[API] POST /api/ideas/[id]/features: Unexpected error type', {
          ideaId,
          error: result.error,
        });
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
          },
          { status: 500 }
        );
    }
  } catch (error) {
    // Log full error details server-side
    console.error('[API] POST /api/ideas/[id]/features: Internal error', {
      ideaId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return safe error message to client
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
