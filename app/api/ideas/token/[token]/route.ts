import { NextRequest, NextResponse } from 'next/server';
import { getIdeaByToken } from '@/lib/db';
import type { PublicIdea } from '@utmessa/shared';

/**
 * API Error Response type
 */
interface ApiErrorResponse {
  error: string;
  message: string;
}

/**
 * Mask an email address for privacy
 * e.g., "user@example.com" → "u***@e***.com"
 *
 * @param email - The email address to mask
 * @returns Masked email or empty string if no email
 */
function maskEmail(email: string | null): string {
  if (!email || !email.includes('@')) {
    return '';
  }

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return '';
  }

  // Mask local part: show first char + ***
  const maskedLocal = localPart.length > 0
    ? localPart[0] + '***'
    : '***';

  // Mask domain: show first char + *** + TLD
  const domainParts = domain.split('.');
  const tld = domainParts.pop() || '';
  const domainName = domainParts.join('.');
  const maskedDomain = domainName.length > 0
    ? domainName[0] + '***.' + tld
    : '***.' + tld;

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * GET /api/ideas/token/[token]
 *
 * Public endpoint to retrieve idea details by receipt token.
 * Used by the receipt page to display idea status and progress.
 *
 * URL Parameters:
 * - token: 21-character receipt token (nanoid)
 *
 * Response:
 * - 200 OK: Returns PublicIdea object (excludes internal fields)
 * - 400 Bad Request: Invalid token format
 * - 404 Not Found: Token does not match any idea
 * - 500 Internal Server Error: Unexpected error
 *
 * Security:
 * - No authentication required (public endpoint)
 * - Only returns public fields (excludes claimedBy, claimedAt, slug)
 * - Logged 404s for security monitoring
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<PublicIdea | ApiErrorResponse>> {
  const startTime = performance.now();
  const resolvedParams = await params;
  const { token } = resolvedParams;

  try {
    // Validate token format (21-character nanoid)
    if (!token || token.length < 10 || token.length > 30) {
      console.warn('[API] GET /api/ideas/token/[token]: Invalid token format', {
        tokenLength: token?.length,
      });
      return NextResponse.json(
        {
          error: 'INVALID_TOKEN',
          message: 'Invalid receipt token format',
        },
        { status: 400 }
      );
    }

    // Fetch idea by token
    const idea = await getIdeaByToken(token);

    if (!idea) {
      // Log 404s for security monitoring (may indicate token guessing attacks)
      console.warn('[API] GET /api/ideas/token/[token]: Not found', {
        tokenPrefix: token.substring(0, 4),
      });
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: 'The receipt token you provided does not match any submitted idea.',
        },
        { status: 404 }
      );
    }

    // Map to public idea (exclude internal fields like slug, claimedBy, claimedAt)
    // Email is masked for privacy - only shows pattern like "u***@e***.com"
    const publicIdea: PublicIdea = {
      id: idea.id,
      token: idea.token,
      title: idea.title,
      problem: idea.problem,
      mustHaves: idea.mustHaves,
      email: maskEmail(idea.email),
      status: idea.status as PublicIdea['status'],
      progress: idea.progress ?? undefined,
      currentStep: idea.currentStep ?? undefined,
      currentFeature: idea.currentFeature ?? undefined,
      waitingQuestion: idea.waitingQuestion ?? undefined,
      demoUrl: idea.demoUrl ?? undefined,
      repoUrl: idea.repoUrl ?? undefined,
      createdAt: idea.createdAt.toISOString(),
      updatedAt: (idea.updatedAt ?? idea.createdAt).toISOString(),
    };

    const durationMs = performance.now() - startTime;
    console.log('[API] GET /api/ideas/token/[token]: Success', {
      ideaId: idea.id,
      status: idea.status,
      durationMs: Math.round(durationMs),
    });

    return NextResponse.json(publicIdea, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('[API] GET /api/ideas/token/[token]: Internal error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching the idea.',
      },
      { status: 500 }
    );
  }
}
