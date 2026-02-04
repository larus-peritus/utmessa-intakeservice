/**
 * Progress Computation
 *
 * Calculates build progress as percentage of completed features.
 * Supports both simple progress (all features) and detailed progress
 * (essential vs bonus features).
 *
 * Pure function with no side effects.
 *
 * @module state/computeProgress
 */

import type { BoothEvent } from '../schemas/events';
import type { Feature } from '../schemas/feature';
import type { ProgressDetail } from './types';
import { findEvent, isFeatureComplete } from './helpers';

/**
 * Priority values that count as "essential" features.
 * These features fill 0-100% of the progress bar.
 */
const ESSENTIAL_PRIORITIES = ['essential'] as const;

/**
 * Priority values that count as "bonus" features.
 * These features extend beyond 100% (shown with different color in UI).
 */
const BONUS_PRIORITIES = ['phase2', 'future'] as const;

/**
 * Compute build progress as percentage of completed features.
 *
 * **Progress Calculation:**
 * - If features haven't been planned (no FEATURES_PLANNED event): returns `null`
 * - If features array is empty: returns `0`
 * - Otherwise: `(completed / total) * 100`, rounded to nearest integer
 *
 * **Feature Completion:**
 * A feature is considered "complete" if any of these events exist for it:
 * - FEATURE_DONE: Feature implementation succeeded
 * - FEATURE_FAILED: Feature implementation failed
 * - FEATURE_SKIPPED: Feature was intentionally skipped
 *
 * Note: In-progress features (FEATURE_STARTED without completion) don't count.
 *
 * @param features - Array of feature definitions
 * @param events - Array of booth events
 * @returns Progress (0-100) or null if features not yet planned
 *
 * @example Progress: null (not planned)
 * ```typescript
 * const features = [{ featureId: 'F1', ... }];
 * const events: BoothEvent[] = []; // No FEATURES_PLANNED
 * const progress = computeProgress(features, events);
 * // progress === null
 * ```
 *
 * @example Progress: 0 (none complete)
 * ```typescript
 * const features = [
 *   { featureId: 'F1', ... },
 *   { featureId: 'F2', ... }
 * ];
 * const events = [
 *   { type: 'FEATURES_PLANNED', total: 2, ts: '...' },
 *   { type: 'FEATURE_STARTED', featureId: 'F1', ts: '...' }
 * ];
 * const progress = computeProgress(features, events);
 * // progress === 0
 * ```
 *
 * @example Progress: 50 (half complete)
 * ```typescript
 * const features = [
 *   { featureId: 'F1', ... },
 *   { featureId: 'F2', ... }
 * ];
 * const events = [
 *   { type: 'FEATURES_PLANNED', total: 2, ts: '...' },
 *   { type: 'FEATURE_DONE', featureId: 'F1', ts: '...' }
 * ];
 * const progress = computeProgress(features, events);
 * // progress === 50
 * ```
 *
 * @example Progress: 100 (all complete, including failed)
 * ```typescript
 * const features = [
 *   { featureId: 'F1', ... },
 *   { featureId: 'F2', ... }
 * ];
 * const events = [
 *   { type: 'FEATURES_PLANNED', total: 2, ts: '...' },
 *   { type: 'FEATURE_DONE', featureId: 'F1', ts: '...' },
 *   { type: 'FEATURE_FAILED', featureId: 'F2', reason: '...', ts: '...' }
 * ];
 * const progress = computeProgress(features, events);
 * // progress === 100 (failed features count as complete)
 * ```
 */
export function computeProgress(
  features: Feature[],
  events: BoothEvent[]
): number | null {
  // ==========================================================================
  // Check if features are planned
  // If no FEATURES_PLANNED event exists, we're still in planning phase
  // ==========================================================================
  const featuresPlannedEvent = findEvent(events, 'FEATURES_PLANNED');
  if (!featuresPlannedEvent) {
    return null; // Features not yet finalized
  }

  // ==========================================================================
  // Handle empty features array
  // If there are no features, progress is 0 (not division by zero!)
  // ==========================================================================
  if (features.length === 0) {
    return 0;
  }

  // ==========================================================================
  // Count completed features
  // A feature is complete if it has DONE, FAILED, or SKIPPED event
  // ==========================================================================
  const completedCount = features.filter((feature) =>
    isFeatureComplete(feature.featureId, events)
  ).length;

  // ==========================================================================
  // Compute percentage and round to nearest integer
  // ==========================================================================
  const percentage = (completedCount / features.length) * 100;
  return Math.round(percentage);
}

/**
 * Compute detailed progress breakdown by feature priority.
 *
 * Returns separate progress for essential vs bonus features.
 * This allows the UI to render a progress bar where:
 * - Essential features fill 0-100% (primary color)
 * - Bonus features (phase2, future) shown beyond 100% (secondary color)
 *
 * @param features - Array of feature definitions
 * @param events - Array of booth events
 * @returns ProgressDetail object or null if features not yet planned
 *
 * @example
 * ```typescript
 * const detail = computeProgressDetail(features, events);
 * if (detail) {
 *   console.log(`Essential: ${detail.essentialProgress}%`);
 *   console.log(`Bonus: ${detail.bonusProgress}%`);
 * }
 * ```
 */
export function computeProgressDetail(
  features: Feature[],
  events: BoothEvent[]
): ProgressDetail | null {
  // ==========================================================================
  // Check if features are planned
  // ==========================================================================
  const featuresPlannedEvent = findEvent(events, 'FEATURES_PLANNED');
  if (!featuresPlannedEvent) {
    return null;
  }

  // ==========================================================================
  // Separate features by priority
  // ==========================================================================
  const essentialFeatures = features.filter(
    (f) => !f.priority || (ESSENTIAL_PRIORITIES as readonly string[]).includes(f.priority)
  );
  const bonusFeatures = features.filter(
    (f) => f.priority && (BONUS_PRIORITIES as readonly string[]).includes(f.priority)
  );

  // ==========================================================================
  // Count completed features in each category
  // ==========================================================================
  const essentialCompleted = essentialFeatures.filter((feature) =>
    isFeatureComplete(feature.featureId, events)
  ).length;

  const bonusCompleted = bonusFeatures.filter((feature) =>
    isFeatureComplete(feature.featureId, events)
  ).length;

  // ==========================================================================
  // Compute percentages
  // ==========================================================================
  const essentialProgress =
    essentialFeatures.length > 0
      ? Math.round((essentialCompleted / essentialFeatures.length) * 100)
      : 100; // If no essential features, consider 100% complete

  const bonusProgress =
    bonusFeatures.length > 0
      ? Math.round((bonusCompleted / bonusFeatures.length) * 100)
      : 0;

  return {
    essentialCompleted,
    essentialTotal: essentialFeatures.length,
    essentialProgress,
    bonusCompleted,
    bonusTotal: bonusFeatures.length,
    bonusProgress,
  };
}
