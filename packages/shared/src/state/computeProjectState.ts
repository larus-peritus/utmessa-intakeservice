/**
 * Main State Computation Function
 *
 * Computes complete project state from features and events.
 * This is the primary export of the state module.
 *
 * **Design Principles:**
 * - Pure function (no I/O, no side effects, deterministic)
 * - Same inputs always produce same output
 * - Can be safely memoized by consumers
 *
 * @module state/computeProjectState
 */

import type { BoothEvent } from '../schemas/events';
import type { Feature } from '../schemas/feature';
import type { ProjectState } from './types';
import { extractDeploymentUrls } from './helpers';
import { computeStatus } from './computeStatus';
import { computeProgress, computeProgressDetail } from './computeProgress';
import { findCurrentFeature } from './findCurrentFeature';
import { findWaitingQuestion } from './findWaitingQuestion';

/**
 * Compute complete project state from features list and event log.
 *
 * This is the main entry point for state computation. It orchestrates
 * all the helper functions to produce a complete ProjectState object.
 *
 * **Computation Order (dependencies):**
 * 1. Extract deployment URLs (simple lookups)
 * 2. Find waiting question (needed for status)
 * 3. Compute status (uses waiting question)
 * 4. Find current feature (independent)
 * 5. Compute progress (uses features + events)
 * 6. Set currentStep to null (reserved for future)
 *
 * **Usage:**
 * ```typescript
 * import { computeProjectState } from '@utmessa/shared';
 *
 * // In Orchestrator (after writing events)
 * const state = computeProjectState(features, events);
 * await updateIntakeStatus(ideaId, state);
 *
 * // In Dashboard (for rendering)
 * const state = computeProjectState(features, events);
 * renderProjectCard(state);
 * ```
 *
 * @param features - Array of feature definitions (from features.json or F1 schema)
 * @param events - Array of booth events (from booth.log.jsonl or F2 schema)
 * @returns Complete ProjectState with all fields populated
 *
 * @example Basic usage
 * ```typescript
 * import { computeProjectState, ProjectState } from '@utmessa/shared';
 * import type { Feature, BoothEvent } from '@utmessa/shared';
 *
 * const features: Feature[] = [
 *   { id: 'F1', ideaId: '...', featureId: 'F1', title: 'Auth', status: 'done' },
 *   { id: 'F2', ideaId: '...', featureId: 'F2', title: 'CRUD', status: 'in_progress' },
 * ];
 *
 * const events: BoothEvent[] = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
 *   { type: 'FEATURES_PLANNED', total: 2, ts: '2026-01-26T10:00:10Z' },
 *   { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
 *   { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
 *   { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:06:00Z' },
 * ];
 *
 * const state = computeProjectState(features, events);
 * // state = {
 * //   status: 'running',
 * //   progress: 50,
 * //   currentStep: null,
 * //   currentFeature: 'F2',
 * //   waitingQuestion: null,
 * //   demoUrl: null,
 * //   repoUrl: null,
 * // }
 * ```
 *
 * @example Empty events (not started)
 * ```typescript
 * const state = computeProjectState(features, []);
 * // state.status === 'not_started'
 * // state.progress === null
 * // state.currentFeature === null
 * ```
 *
 * @example Waiting for input
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '...' },
 *   { type: 'WAITING_FOR_INPUT', question: 'Choose auth method?', ts: '...' },
 * ];
 * const state = computeProjectState(features, events);
 * // state.status === 'waiting'
 * // state.waitingQuestion === 'Choose auth method?'
 * ```
 *
 * @example Deployed with URLs
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '...' },
 *   { type: 'FEATURES_PLANNED', total: 1, ts: '...' },
 *   { type: 'FEATURE_DONE', featureId: 'F1', ts: '...' },
 *   { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '...' },
 *   { type: 'REPO_PUBLISHED', repoUrl: 'https://github.com/user/repo', ts: '...' },
 * ];
 * const state = computeProjectState(features, events);
 * // state.status === 'deployed'
 * // state.progress === 100
 * // state.demoUrl === 'https://demo.example.com'
 * // state.repoUrl === 'https://github.com/user/repo'
 * ```
 */
export function computeProjectState(
  features: Feature[],
  events: BoothEvent[]
): ProjectState {
  // ==========================================================================
  // Step 1: Extract deployment URLs (simple lookups)
  // ==========================================================================
  const { demoUrl, repoUrl } = extractDeploymentUrls(events);

  // ==========================================================================
  // Step 2: Find waiting question (if any)
  // This must be computed before status, as status depends on it
  // ==========================================================================
  const waitingQuestion = findWaitingQuestion(events);

  // ==========================================================================
  // Step 3: Compute status (uses waiting question result)
  // Priority: waiting > deployed > failed > running > not_started
  // ==========================================================================
  const status = computeStatus(events, waitingQuestion);

  // ==========================================================================
  // Step 4: Find current feature (if any)
  // Returns the most recent FEATURE_STARTED without completion event
  // ==========================================================================
  const currentFeature = findCurrentFeature(events);

  // ==========================================================================
  // Step 5: Compute progress (depends on features + events)
  // Returns null if not planned, 0-100 otherwise
  // ==========================================================================
  const progress = computeProgress(features, events);

  // ==========================================================================
  // Step 6: Compute detailed progress by priority
  // Returns breakdown of essential vs bonus features
  // ==========================================================================
  const progressDetail = computeProgressDetail(features, events);

  // ==========================================================================
  // Step 7: Current step (reserved for future STEP_* events)
  // Always null for now
  // ==========================================================================
  const currentStep = null;

  // ==========================================================================
  // Return complete ProjectState
  // ==========================================================================
  return {
    status,
    progress,
    progressDetail,
    currentStep,
    currentFeature,
    waitingQuestion,
    demoUrl,
    repoUrl,
  };
}
