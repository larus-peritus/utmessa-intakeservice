import type { IdeaStatus } from '@utmessa/shared';

/**
 * Result of a status transition validation
 */
export interface TransitionResult {
  valid: boolean;
  error?: string;
  allowedTransitions?: IdeaStatus[];
}

/**
 * Valid status transitions map
 *
 * Each status maps to the list of statuses it can transition to.
 * The orchestrator can only update ideas that have been claimed.
 *
 * Transition rules:
 * - submitted/ready: Cannot update (must claim first via F3)
 * - claimed: Can start running or fail
 * - running: Can continue running, pause (waiting), complete (deployed), or fail
 * - waiting: Can resume running or fail
 * - deployed/failed/abandoned: Idempotent (can re-send same status)
 */
const VALID_TRANSITIONS: Record<IdeaStatus, IdeaStatus[]> = {
  submitted: [], // Cannot update - must claim first
  ready: [], // Cannot update - must claim first
  claimed: ['running', 'failed'],
  running: ['running', 'waiting', 'deployed', 'failed'],
  waiting: ['running', 'failed'],
  deployed: ['deployed'], // Idempotent
  failed: ['failed'], // Idempotent
  abandoned: ['abandoned'], // Idempotent
};

/**
 * Statuses that can be updated by the orchestrator
 */
const UPDATEABLE_STATUSES: IdeaStatus[] = [
  'claimed',
  'running',
  'waiting',
  'deployed',
  'failed',
  'abandoned',
];

/**
 * Validate a status transition from current to requested status
 *
 * @param currentStatus - The idea's current status
 * @param requestedStatus - The status to transition to (undefined means no transition)
 * @returns Validation result with error details if invalid
 *
 * @example
 * ```typescript
 * // Valid transition
 * validateStatusTransition('claimed', 'running');
 * // { valid: true }
 *
 * // Invalid transition
 * validateStatusTransition('waiting', 'deployed');
 * // { valid: false, error: '...', allowedTransitions: ['running', 'failed'] }
 *
 * // No transition requested
 * validateStatusTransition('running', undefined);
 * // { valid: true }
 * ```
 */
export function validateStatusTransition(
  currentStatus: IdeaStatus,
  requestedStatus: IdeaStatus | undefined
): TransitionResult {
  // No transition requested - always valid
  if (requestedStatus === undefined) {
    return { valid: true };
  }

  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(requestedStatus)) {
    return {
      valid: false,
      error: `Cannot transition from '${currentStatus}' to '${requestedStatus}'`,
      allowedTransitions,
    };
  }

  return { valid: true };
}

/**
 * Check if an idea with the given status can be updated
 *
 * Ideas in 'submitted' or 'ready' status must be claimed first via the claim API.
 *
 * @param status - The idea's current status
 * @returns True if the idea can be updated
 *
 * @example
 * ```typescript
 * isUpdateable('submitted'); // false - must claim first
 * isUpdateable('claimed'); // true
 * isUpdateable('running'); // true
 * ```
 */
export function isUpdateable(status: IdeaStatus): boolean {
  return UPDATEABLE_STATUSES.includes(status);
}

/**
 * Get the list of allowed transitions from a given status
 *
 * @param status - The current status
 * @returns Array of statuses that can be transitioned to
 */
export function getAllowedTransitions(status: IdeaStatus): IdeaStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}
