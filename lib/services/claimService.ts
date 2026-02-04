import { db } from '../db/client';
import { ideas } from '../db/schema';
import { eq, inArray, sql, and } from 'drizzle-orm';
import type { Idea } from '../db/types';
import { NotFoundError, ConflictError } from '../errors/claim-errors';

/**
 * Result types for claim operations
 */
export type ClaimResult =
  | { success: true; idea: Idea }
  | { success: false; error: NotFoundError | ConflictError };

/**
 * Claimable status values - ideas in these states can be claimed
 */
const CLAIMABLE_STATUSES = ['submitted', 'ready'] as const;

/**
 * Atomically claim an idea for processing
 *
 * This function uses an atomic UPDATE with a WHERE clause to prevent
 * race conditions when multiple orchestrators try to claim the same idea.
 *
 * Operation flow:
 * 1. Attempt atomic UPDATE: SET status='claimed' WHERE id=X AND status IN ('submitted','ready')
 * 2. If 1 row affected: Success - idea was claimed
 * 3. If 0 rows affected: Check if idea exists
 *    - If not exists: Return NOT_FOUND error
 *    - If exists: Return CONFLICT error with current claim details
 *
 * Security: The atomic nature prevents TOCTOU race conditions.
 *
 * @param ideaId - UUID of the idea to claim
 * @param claimedBy - Optional identifier for who is claiming (e.g., orchestrator instance ID)
 * @returns Promise resolving to ClaimResult (success with idea, or error)
 *
 * @example
 * ```typescript
 * const result = await claimIdea('550e8400-e29b-41d4-a716-446655440000', 'orch-1');
 * if (result.success) {
 *   console.log('Claimed:', result.idea.title);
 * } else if (result.error instanceof NotFoundError) {
 *   console.log('Idea not found');
 * } else if (result.error instanceof ConflictError) {
 *   console.log('Already claimed at:', result.error.claimedAt);
 * }
 * ```
 */
export async function claimIdea(
  ideaId: string,
  claimedBy?: string
): Promise<ClaimResult> {
  const now = new Date();

  try {
    // Atomic UPDATE: Only update if status is claimable
    // This prevents race conditions - only one caller can succeed
    const updatedIdeas = await db
      .update(ideas)
      .set({
        status: 'claimed',
        claimedAt: now,
        claimedBy: claimedBy ?? null,
        updatedAt: now,
      })
      .where(
        and(
          eq(ideas.id, ideaId),
          inArray(ideas.status, [...CLAIMABLE_STATUSES])
        )
      )
      .returning();

    // Check if update succeeded (exactly 1 row affected)
    if (updatedIdeas.length === 1) {
      console.log('[ClaimService] Idea claimed successfully', {
        ideaId,
        claimedBy: claimedBy ?? '(anonymous)',
        status: updatedIdeas[0].status,
      });
      return { success: true, idea: updatedIdeas[0] };
    }

    // Update affected 0 rows - either idea doesn't exist or is not claimable
    // Query to determine which case
    const existingIdea = await db
      .select()
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .limit(1);

    if (existingIdea.length === 0) {
      // Idea doesn't exist
      console.log('[ClaimService] Idea not found', { ideaId });
      return {
        success: false,
        error: new NotFoundError(ideaId),
      };
    }

    // Idea exists but is not in a claimable state
    const idea = existingIdea[0];
    console.log('[ClaimService] Idea not claimable', {
      ideaId,
      currentStatus: idea.status,
      claimedAt: idea.claimedAt?.toISOString(),
      claimedBy: idea.claimedBy,
    });

    return {
      success: false,
      error: new ConflictError(
        idea.status,
        idea.claimedAt ?? idea.updatedAt ?? idea.createdAt,
        idea.claimedBy
      ),
    };
  } catch (error) {
    // Log the full error for debugging
    console.error('[ClaimService] Database error during claim', {
      ideaId,
      claimedBy,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw to let the route handler deal with it
    throw error;
  }
}

/**
 * Check if an idea is claimable (without claiming it)
 *
 * Useful for checking status before attempting a claim.
 * Note: Due to race conditions, a claimable idea may become
 * non-claimable between this check and an actual claim attempt.
 *
 * @param ideaId - UUID of the idea to check
 * @returns Promise resolving to { claimable, idea?, reason? }
 */
export async function isIdeaClaimable(ideaId: string): Promise<{
  claimable: boolean;
  idea?: Idea;
  reason?: string;
}> {
  try {
    const [idea] = await db
      .select()
      .from(ideas)
      .where(eq(ideas.id, ideaId))
      .limit(1);

    if (!idea) {
      return { claimable: false, reason: 'Idea not found' };
    }

    const claimable = CLAIMABLE_STATUSES.includes(
      idea.status as (typeof CLAIMABLE_STATUSES)[number]
    );

    if (!claimable) {
      return {
        claimable: false,
        idea,
        reason: `Status '${idea.status}' is not claimable`,
      };
    }

    return { claimable: true, idea };
  } catch (error) {
    console.error('[ClaimService] Error checking claimability', { ideaId, error });
    throw error;
  }
}
