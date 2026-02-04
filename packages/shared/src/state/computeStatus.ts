/**
 * Status Derivation
 *
 * Computes project runtime status from event log using priority rules.
 * Pure function with no side effects.
 *
 * @module state/computeStatus
 */

import type { BoothEvent } from '../schemas/events';
import type { ProjectRunStatus } from './types';
import { findEvent, findMostRecentEvent, findEventAfter } from './helpers';

/**
 * Derive project status from events using priority rules.
 *
 * **Priority Order (highest first):**
 *
 * 1. **'waiting'**: If waitingQuestion is not null (unclosed WAITING_FOR_INPUT)
 * 2. **'deployed'**: If DEPLOY_DONE exists without subsequent JOB_FAILED
 * 3. **'failed'**: If JOB_FAILED exists without subsequent JOB_STARTED (no recovery)
 * 4. **'running'**: If JOB_STARTED exists (build in progress)
 * 5. **'not_started'**: Default (no events or only JOB_CREATED)
 *
 * @param events - Array of booth events
 * @param waitingQuestion - Pre-computed waiting question (null if not waiting)
 * @returns Computed project status
 *
 * @example
 * ```typescript
 * // First compute waiting question
 * const waitingQuestion = findWaitingQuestion(events);
 *
 * // Then compute status with it
 * const status = computeStatus(events, waitingQuestion);
 * console.log('Project status:', status);
 * ```
 *
 * @example Status: waiting (unclosed prompt)
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
 *   { type: 'WAITING_FOR_INPUT', question: 'Choose auth', ts: '2026-01-26T10:05:00Z' }
 * ];
 * const status = computeStatus(events, 'Choose auth');
 * // status === 'waiting'
 * ```
 *
 * @example Status: deployed (successful deployment)
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
 *   { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' }
 * ];
 * const status = computeStatus(events, null);
 * // status === 'deployed'
 * ```
 *
 * @example Status: running (recovery after failure)
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
 *   { type: 'JOB_FAILED', reason: 'Error', ts: '2026-01-26T10:05:00Z' },
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:10:00Z' } // Recovery
 * ];
 * const status = computeStatus(events, null);
 * // status === 'running' (recovered from failure)
 * ```
 */
export function computeStatus(
  events: BoothEvent[],
  waitingQuestion: string | null
): ProjectRunStatus {
  // ==========================================================================
  // Priority 1: Waiting (highest priority)
  // If there's an unclosed waiting question, we're waiting for input
  // ==========================================================================
  if (waitingQuestion !== null) {
    return 'waiting';
  }

  // ==========================================================================
  // Priority 2: Deployed
  // DEPLOY_DONE exists without subsequent JOB_FAILED
  // This means the project was successfully deployed and hasn't failed since
  // ==========================================================================
  const deployDoneEvent = findMostRecentEvent(events, 'DEPLOY_DONE');
  if (deployDoneEvent) {
    // Check if there's a JOB_FAILED after the deployment
    const subsequentFailure = findEventAfter(
      events,
      'JOB_FAILED',
      deployDoneEvent.ts
    );
    if (!subsequentFailure) {
      return 'deployed';
    }
    // If there's a failure after deployment, continue to check other priorities
  }

  // ==========================================================================
  // Priority 3: Failed
  // JOB_FAILED exists without subsequent JOB_STARTED (no recovery)
  // This means the build failed and hasn't been restarted
  // ==========================================================================
  const jobFailedEvent = findMostRecentEvent(events, 'JOB_FAILED');
  if (jobFailedEvent) {
    // Check if there's a JOB_STARTED after the failure (recovery attempt)
    const subsequentStart = findEventAfter(
      events,
      'JOB_STARTED',
      jobFailedEvent.ts
    );
    if (!subsequentStart) {
      return 'failed';
    }
    // If there's a recovery, continue to check other priorities
  }

  // ==========================================================================
  // Priority 4: Running
  // JOB_STARTED exists (build is in progress)
  // ==========================================================================
  const jobStartedEvent = findEvent(events, 'JOB_STARTED');
  if (jobStartedEvent) {
    return 'running';
  }

  // ==========================================================================
  // Priority 5: Not Started (default)
  // No significant events have occurred
  // ==========================================================================
  return 'not_started';
}
