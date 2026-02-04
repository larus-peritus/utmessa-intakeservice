/**
 * State Computation Types
 *
 * Type definitions for computed project state.
 * Used by Orchestrator to compute state from events
 * and by Dashboard to render project status.
 *
 * @module state/types
 */

// Re-export ProjectRunStatus from orchestrator (which gets it from files.ts)
// This ensures a single source of truth for the status enum
export { ProjectRunStatusSchema, PROJECT_RUN_STATUSES } from '../api/orchestrator';
export type { ProjectRunStatus } from '../api/orchestrator';

// =============================================================================
// Progress Detail Interface
// =============================================================================

/**
 * Detailed progress breakdown by feature priority.
 *
 * This allows the UI to render a progress bar where:
 * - Essential features fill 0-100% (primary color)
 * - Bonus features (phase2, future) extend beyond 100% (secondary color)
 *
 * @example
 * ```typescript
 * // 8 essential done, 2 phase2 done, 0 future done
 * const detail: ProgressDetail = {
 *   essentialCompleted: 8,
 *   essentialTotal: 8,
 *   essentialProgress: 100,
 *   bonusCompleted: 2,
 *   bonusTotal: 7,
 *   bonusProgress: 28.6,  // (2/7) * 100
 *   totalProgress: 133.3  // 100 + (2/7) * 100 * 0.333 weight or similar
 * };
 * ```
 */
export interface ProgressDetail {
  /** Number of essential features completed (done/failed/skipped) */
  essentialCompleted: number;
  /** Total number of essential features */
  essentialTotal: number;
  /** Essential progress percentage (0-100) */
  essentialProgress: number;
  /** Number of bonus features (phase2 + future) completed */
  bonusCompleted: number;
  /** Total number of bonus features */
  bonusTotal: number;
  /** Bonus progress percentage (0-100 of bonus features) */
  bonusProgress: number;
}

// =============================================================================
// ProjectState Interface
// =============================================================================

/**
 * Computed project state derived from features list and event log.
 *
 * All fields are required; use null for "not applicable".
 * This interface represents the complete runtime state of a project
 * as computed from its event history.
 *
 * @example
 * ```typescript
 * import { computeProjectState, ProjectState } from '@utmessa/shared';
 *
 * const state: ProjectState = computeProjectState(features, events);
 *
 * console.log(state.status);        // 'running'
 * console.log(state.progress);      // 50
 * console.log(state.currentFeature); // 'F2'
 * ```
 */
export interface ProjectState {
  /**
   * Current lifecycle status.
   * Derived using priority rules from event log.
   *
   * Priority (highest first):
   * 1. 'waiting' - unclosed WAITING_FOR_INPUT exists
   * 2. 'deployed' - DEPLOY_DONE without subsequent JOB_FAILED
   * 3. 'failed' - JOB_FAILED without subsequent JOB_STARTED
   * 4. 'running' - JOB_STARTED exists
   * 5. 'not_started' - default (no events)
   */
  status: import('../api/orchestrator').ProjectRunStatus;

  /**
   * Build progress as percentage (0-100 for essential, can exceed for bonus).
   * Null if features have not been planned yet (no FEATURES_PLANNED event).
   *
   * Progress = (completed features / total features) * 100
   * where completed = FEATURE_DONE | FEATURE_FAILED | FEATURE_SKIPPED
   */
  progress: number | null;

  /**
   * Detailed progress breakdown by priority.
   * Allows UI to show essential features to 100% and bonus features beyond.
   * Null if features have not been planned yet.
   */
  progressDetail: ProgressDetail | null;

  /**
   * Current build step description.
   * Reserved for future use (currently always null).
   * Will be populated when STEP_* events are implemented.
   */
  currentStep: string | null;

  /**
   * Feature ID currently in progress (e.g., "F1", "F2").
   * Null if no feature is actively being built.
   *
   * Derived from most recent FEATURE_STARTED event
   * that has no corresponding completion event
   * (FEATURE_DONE, FEATURE_FAILED, FEATURE_SKIPPED).
   */
  currentFeature: string | null;

  /**
   * Question text when waiting for user input.
   * Null if not in waiting state.
   *
   * Derived from most recent WAITING_FOR_INPUT event
   * that has no subsequent INPUT_RECEIVED event.
   */
  waitingQuestion: string | null;

  /**
   * Live demo URL after deployment.
   * Null if not deployed.
   *
   * Extracted from most recent DEPLOY_DONE event.
   */
  demoUrl: string | null;

  /**
   * Repository URL after publish (GitHub/GitLab/etc).
   * Null if not published.
   *
   * Extracted from most recent REPO_PUBLISHED event.
   */
  repoUrl: string | null;
}
