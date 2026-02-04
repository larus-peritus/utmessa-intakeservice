/**
 * Custom error types for update operations
 *
 * These error classes provide typed, descriptive errors for the update API.
 * Extends/reuses error types from claim-errors where applicable.
 */

import type { IdeaStatus } from '@utmessa/shared';

// Re-export shared error types
export { NotFoundError, ValidationError } from './claim-errors';

/**
 * Error thrown when trying to update an idea that hasn't been claimed
 *
 * Ideas in 'submitted' or 'ready' status must be claimed first via the claim API.
 *
 * Maps to HTTP 403 Forbidden
 */
export class ForbiddenError extends Error {
  public readonly reason: 'NOT_CLAIMED';
  public readonly currentStatus: IdeaStatus;

  constructor(currentStatus: IdeaStatus) {
    super(
      `Cannot update idea with status '${currentStatus}'. Idea must be claimed first.`
    );
    this.name = 'ForbiddenError';
    this.reason = 'NOT_CLAIMED';
    this.currentStatus = currentStatus;
    Error.captureStackTrace(this, ForbiddenError);
  }
}

/**
 * Error thrown when a status transition is not allowed
 *
 * Maps to HTTP 400 Bad Request
 *
 * Contains details about:
 * - currentStatus: The idea's current status
 * - requestedStatus: The status that was requested
 * - allowedTransitions: Valid statuses that can be transitioned to
 */
export class InvalidTransitionError extends Error {
  public readonly currentStatus: IdeaStatus;
  public readonly requestedStatus: IdeaStatus;
  public readonly allowedTransitions: IdeaStatus[];

  constructor(
    currentStatus: IdeaStatus,
    requestedStatus: IdeaStatus,
    allowedTransitions: IdeaStatus[]
  ) {
    const allowedList =
      allowedTransitions.length > 0
        ? allowedTransitions.join(', ')
        : '(none - terminal state)';
    super(
      `Cannot transition from '${currentStatus}' to '${requestedStatus}'. ` +
        `Allowed transitions: ${allowedList}`
    );
    this.name = 'InvalidTransitionError';
    this.currentStatus = currentStatus;
    this.requestedStatus = requestedStatus;
    this.allowedTransitions = allowedTransitions;
    Error.captureStackTrace(this, InvalidTransitionError);
  }
}
