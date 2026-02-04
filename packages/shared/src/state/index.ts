/**
 * State Computation Module
 *
 * Pure functions for computing project state from features and events.
 * This module provides deterministic state derivation with no side effects.
 *
 * @module state
 *
 * @example
 * ```typescript
 * import { computeProjectState, ProjectState } from '@utmessa/shared';
 *
 * const state = computeProjectState(features, events);
 * console.log(`Status: ${state.status}, Progress: ${state.progress}%`);
 * ```
 */

// =============================================================================
// Type Exports
// =============================================================================

export type { ProjectState, ProgressDetail } from './types';
export {
  ProjectRunStatusSchema,
  PROJECT_RUN_STATUSES,
} from './types';
export type { ProjectRunStatus } from './types';

// =============================================================================
// Helper Function Exports
// =============================================================================

export {
  // Event lookup helpers
  findEvent,
  findMostRecentEvent,
  findEventAfter,
  findMostRecentInArray,
  // Feature completion helpers
  isFeatureComplete,
  isCompletionEvent,
  // Deployment URL extraction
  extractDeploymentUrls,
} from './helpers';

// =============================================================================
// Computation Function Exports
// =============================================================================

export { computeStatus } from './computeStatus';
export { computeProgress, computeProgressDetail } from './computeProgress';
export { findCurrentFeature } from './findCurrentFeature';
export { findWaitingQuestion } from './findWaitingQuestion';

// =============================================================================
// Main Function Export
// =============================================================================

export { computeProjectState } from './computeProjectState';
