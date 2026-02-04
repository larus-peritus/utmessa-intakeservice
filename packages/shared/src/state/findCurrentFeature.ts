/**
 * Current Feature Detection
 *
 * Extracts the feature currently in progress from the event stream.
 * Pure function with no side effects.
 *
 * @module state/findCurrentFeature
 */

import type { BoothEvent, FeatureStartedEvent } from '../schemas/events';
import { findMostRecentInArray, isFeatureComplete } from './helpers';

/**
 * Find the feature currently in progress.
 *
 * Scans the event log for FEATURE_STARTED events and filters out those
 * that have completion events (FEATURE_DONE, FEATURE_FAILED, FEATURE_SKIPPED).
 * Returns the featureId of the most recent uncompleted feature.
 *
 * @param events - Array of booth events
 * @returns Feature ID (e.g., "F1") or null if no feature is active
 *
 * @example No features started
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' }
 * ];
 * const current = findCurrentFeature(events);
 * // current === null
 * ```
 *
 * @example One feature in progress
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
 *   { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' }
 * ];
 * const current = findCurrentFeature(events);
 * // current === 'F1'
 * ```
 *
 * @example Multiple features, most recent uncompleted
 * ```typescript
 * const events = [
 *   { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
 *   { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
 *   { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:06:00Z' }
 * ];
 * const current = findCurrentFeature(events);
 * // current === 'F2' (F1 is complete)
 * ```
 *
 * @example All features completed
 * ```typescript
 * const events = [
 *   { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
 *   { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
 *   { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:06:00Z' },
 *   { type: 'FEATURE_DONE', featureId: 'F2', ts: '2026-01-26T10:10:00Z' }
 * ];
 * const current = findCurrentFeature(events);
 * // current === null (all features completed)
 * ```
 */
export function findCurrentFeature(events: BoothEvent[]): string | null {
  // ==========================================================================
  // Filter to FEATURE_STARTED events
  // ==========================================================================
  const startedEvents = events.filter(
    (event): event is FeatureStartedEvent => event.type === 'FEATURE_STARTED'
  );

  // If no features have been started, no current feature
  if (startedEvents.length === 0) {
    return null;
  }

  // ==========================================================================
  // Filter out features that have completion events
  // A feature is not "current" if it has DONE, FAILED, or SKIPPED event
  // ==========================================================================
  const activeFeatures = startedEvents.filter(
    (startEvent) => !isFeatureComplete(startEvent.featureId, events)
  );

  // If all started features are complete, no current feature
  if (activeFeatures.length === 0) {
    return null;
  }

  // ==========================================================================
  // Return the most recent active feature
  // Uses timestamp comparison to find the latest
  // ==========================================================================
  const mostRecent = findMostRecentInArray(activeFeatures);
  return mostRecent.featureId;
}
