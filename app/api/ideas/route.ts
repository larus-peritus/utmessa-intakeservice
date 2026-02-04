import { NextRequest, NextResponse } from 'next/server';
import { SubmitIdeaRequestSchema } from '@utmessa/shared';
import type { SubmitIdeaRequest, SubmitIdeaResponse, QueueItem } from '@utmessa/shared';
import { createIdea } from '@/lib/db/ideas';
import { generateToken } from '@/lib/utils/tokens';
import { IDEA_STATUS } from '@/lib/db/types';
import { sendStatusEmail } from '@/lib/email/email-service';
import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import {
  validateListIdeasParams,
  ValidationError,
} from '@/lib/validators/listIdeasParams';
import { listIdeas } from '@/lib/services/ideasService';
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  DEFAULT_RATE_LIMIT,
} from '@/lib/utils/rateLimit';

/**
 * Response type for GET /api/ideas endpoint
 * Returns QueueItem array (excludes sensitive fields like email, token)
 */
interface ListIdeasApiResponse {
  ideas: QueueItem[];
  total: number;
}

/**
 * POST /api/ideas
 *
 * Submit a new POC idea. This is a public endpoint.
 *
 * Request body should match SubmitIdeaRequestSchema:
 * - title: string (required, 1-100 chars)
 * - problem: string (required, 10-500 chars)
 * - mustHaves: string[] (optional, 1-10 items, each max 100 chars)
 * - email: string (optional, valid email format)
 *
 * Response:
 * - 201 Created: { id, token, createdAt }
 * - 400 Bad Request: { error, details }
 * - 429 Too Many Requests: Rate limit exceeded
 * - 500 Internal Server Error: { error }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 10 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, DEFAULT_RATE_LIMIT);

    if (!rateLimitResult.allowed) {
      console.warn('[API] POST /api/ideas: Rate limit exceeded', {
        ip: clientIp,
        retryAfter: rateLimitResult.retryAfter,
      });
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult, DEFAULT_RATE_LIMIT),
        }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          details: [{ field: 'body', message: 'Request body must be valid JSON' }],
        },
        { status: 400 }
      );
    }

    // Validate with Zod schema from @utmessa/shared
    const validationResult = SubmitIdeaRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const data: SubmitIdeaRequest = validationResult.data;

    // Generate unique receipt token
    const token = generateToken();

    // Save to database
    const idea = await createIdea({
      token,
      title: data.title,
      problem: data.problem,
      mustHaves: data.mustHaves || [],
      email: data.email || null,
      status: IDEA_STATUS.SUBMITTED,
    });

    // Send confirmation email if email was provided (async, don't await)
    if (data.email) {
      sendStatusEmail({
        to: data.email,
        ideaTitle: idea.title,
        token: idea.token,
        status: 'submitted',
      }).catch((err) => {
        console.error('[API] Email send error (non-blocking):', err);
      });
    }

    // Format response
    const response: SubmitIdeaResponse = {
      id: idea.id,
      token: idea.token,
      createdAt: idea.createdAt.toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Log error for debugging
    console.error('Error creating idea:', error);

    // Return generic error to client
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ideas
 *
 * List ideas from the queue. This is a protected endpoint.
 * Requires X-ORCH-KEY header for authentication.
 *
 * Query parameters:
 * - status: Comma-separated statuses (default: "submitted,ready")
 * - limit: Max results (default: 50, max: 100)
 * - offset: Pagination offset (default: 0)
 * - sort: Sort field (default: "createdAt")
 * - order: Sort order "asc" or "desc" (default: "asc")
 *
 * Response:
 * - 200 OK: { ideas, total, limit, offset }
 * - 400 Bad Request: { error, message, validStatuses? }
 * - 401 Unauthorized: { error, message }
 * - 500 Internal Server Error: { error, message }
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    // 1. Authentication - require X-ORCH-KEY header
    if (!validateOrchKey(request)) {
      console.warn('[API] GET /api/ideas: Authentication failed');
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Invalid or missing X-ORCH-KEY header',
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    let params;
    try {
      params = validateListIdeasParams(searchParams);
    } catch (error) {
      if (error instanceof ValidationError) {
        console.warn('[API] GET /api/ideas: Validation error:', error.message);
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: error.message,
            validStatuses: error.validStatuses,
          },
          { status: 400 }
        );
      }
      // Zod validation errors or other parameter validation errors
      const errorMessage = error instanceof Error ? error.message : 'Invalid query parameters';
      console.warn('[API] GET /api/ideas: Parameter validation error:', errorMessage);
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
        },
        { status: 400 }
      );
    }

    // 3. Query database via service
    const result = await listIdeas({
      statuses: params.statuses,
      limit: params.limit,
      offset: params.offset,
      sort: params.sort,
      order: params.order,
    });

    // 4. Build response
    const response: ListIdeasApiResponse = {
      ideas: result.ideas,
      total: result.total,
    };

    // 5. Log success
    const durationMs = performance.now() - startTime;
    console.log('[API] GET /api/ideas: Success', {
      statuses: params.statuses,
      resultCount: result.ideas.length,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      durationMs: Math.round(durationMs),
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Log error server-side with full details
    console.error('[API] GET /api/ideas: Error', {
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
