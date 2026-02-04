import { eq } from 'drizzle-orm';
import { db } from '../db';
import { ideas } from '../db/schema';
import type { IdeaStatus } from '@utmessa/shared';
import {
  validateStatusTransition,
  isUpdateable,
  getAllowedTransitions,
} from '../validators/statusTransitionValidator';
import type { Idea } from '../db/types';
import { sendStatusEmail, shouldSendEmail } from '../email';

/**
 * Update request fields
 */
export interface UpdateIdeaInput {
  status?: IdeaStatus;
  progress?: number;
  currentStep?: string | null;
  currentFeature?: string | null;
  waitingQuestion?: string | null;
  demoUrl?: string | null;
  repoUrl?: string | null;
}

/**
 * Error types for update operations
 */
export type UpdateError =
  | { type: 'NOT_FOUND'; ideaId: string }
  | { type: 'NOT_CLAIMED'; currentStatus: IdeaStatus }
  | {
      type: 'INVALID_TRANSITION';
      currentStatus: IdeaStatus;
      requestedStatus: IdeaStatus;
      allowedTransitions: IdeaStatus[];
    };

/**
 * Result type for update operations
 */
export type UpdateResult =
  | { success: true; idea: Idea }
  | { success: false; error: UpdateError };

/**
 * Update an idea with partial fields
 *
 * Performs validation:
 * 1. Idea must exist
 * 2. Idea must be claimed (not submitted/ready)
 * 3. Status transitions must be valid
 *
 * Only provided fields are updated. Omitted fields are preserved.
 * Null values clear the field.
 *
 * @param ideaId - UUID of the idea to update
 * @param updates - Partial update fields
 * @returns Update result with updated idea or error
 *
 * @example
 * ```typescript
 * // Update progress only
 * const result = await updateIdea(ideaId, { progress: 50 });
 *
 * // Update status and progress
 * const result = await updateIdea(ideaId, { status: 'running', progress: 25 });
 *
 * // Clear waiting question
 * const result = await updateIdea(ideaId, { waitingQuestion: null });
 * ```
 */
export async function updateIdea(
  ideaId: string,
  updates: UpdateIdeaInput
): Promise<UpdateResult> {
  // Fetch current idea
  const [current] = await db
    .select()
    .from(ideas)
    .where(eq(ideas.id, ideaId))
    .limit(1);

  if (!current) {
    console.log('[UpdateService] Idea not found', { ideaId });
    return {
      success: false,
      error: { type: 'NOT_FOUND', ideaId },
    };
  }

  // Check if idea can be updated (must be claimed first)
  if (!isUpdateable(current.status as IdeaStatus)) {
    console.log('[UpdateService] Idea not updateable', {
      ideaId,
      currentStatus: current.status,
    });
    return {
      success: false,
      error: { type: 'NOT_CLAIMED', currentStatus: current.status as IdeaStatus },
    };
  }

  // Validate status transition if status is being updated
  if (updates.status !== undefined) {
    const transitionResult = validateStatusTransition(
      current.status as IdeaStatus,
      updates.status
    );

    if (!transitionResult.valid) {
      console.log('[UpdateService] Invalid status transition', {
        ideaId,
        currentStatus: current.status,
        requestedStatus: updates.status,
        allowedTransitions: transitionResult.allowedTransitions,
      });
      return {
        success: false,
        error: {
          type: 'INVALID_TRANSITION',
          currentStatus: current.status as IdeaStatus,
          requestedStatus: updates.status,
          allowedTransitions:
            transitionResult.allowedTransitions ||
            getAllowedTransitions(current.status as IdeaStatus),
        },
      };
    }
  }

  // Build partial update object (only include provided fields)
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.progress !== undefined) updateData.progress = updates.progress;
  if (updates.currentStep !== undefined) updateData.currentStep = updates.currentStep;
  if (updates.currentFeature !== undefined) updateData.currentFeature = updates.currentFeature;
  if (updates.waitingQuestion !== undefined) updateData.waitingQuestion = updates.waitingQuestion;
  if (updates.demoUrl !== undefined) updateData.demoUrl = updates.demoUrl;
  if (updates.repoUrl !== undefined) updateData.repoUrl = updates.repoUrl;

  // Execute update
  const [updated] = await db
    .update(ideas)
    .set(updateData)
    .where(eq(ideas.id, ideaId))
    .returning();

  console.log('[UpdateService] Idea updated successfully', {
    ideaId,
    updatedFields: Object.keys(updateData).filter((k) => k !== 'updatedAt'),
    newStatus: updated.status,
  });

  // Send email notification if applicable (async, don't await)
  if (
    updates.status &&
    shouldSendEmail(updates.status, current.status as IdeaStatus, !!updated.email)
  ) {
    sendStatusEmail({
      to: updated.email!,
      ideaTitle: updated.title,
      token: updated.token,
      status: updates.status,
      waitingQuestion: updated.waitingQuestion ?? undefined,
      demoUrl: updated.demoUrl ?? undefined,
      repoUrl: updated.repoUrl ?? undefined,
    }).catch((err) => {
      console.error('[UpdateService] Email send error (non-blocking):', err);
    });
  }

  return {
    success: true,
    idea: updated as Idea,
  };
}

/**
 * Check if an idea exists and is updateable
 *
 * Useful for pre-validation without modifying data.
 *
 * @param ideaId - UUID of the idea
 * @returns Result indicating if idea can be updated
 */
export async function canUpdateIdea(
  ideaId: string
): Promise<
  | { canUpdate: true; currentStatus: IdeaStatus }
  | { canUpdate: false; reason: 'NOT_FOUND' | 'NOT_CLAIMED'; currentStatus?: IdeaStatus }
> {
  const [idea] = await db
    .select({ status: ideas.status })
    .from(ideas)
    .where(eq(ideas.id, ideaId))
    .limit(1);

  if (!idea) {
    return { canUpdate: false, reason: 'NOT_FOUND' };
  }

  const status = idea.status as IdeaStatus;

  if (!isUpdateable(status)) {
    return { canUpdate: false, reason: 'NOT_CLAIMED', currentStatus: status };
  }

  return { canUpdate: true, currentStatus: status };
}
