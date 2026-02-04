/**
 * State Computation Helper Functions
 *
 * Utility functions for event lookup, feature completion detection,
 * and deployment URL extraction. Used by the main state computation
 * functions.
 *
 * All functions are pure (no side effects, no mutations).
 *
 * @module state/helpers
 */

import type { BoothEvent, BoothEventType } from '../schemas/events';

// =============================================================================
// Event Lookup Helpers (T2)
// =============================================================================

/**
 * Find first event of given type in the event array.
 * Does not guarantee chronological order - use findMostRecentEvent for that.
 *
 * Uses TypeScript's discriminated union type narrowing.
 *
 * @param events - Array of booth events
 * @param type - Event type to find (e.g., 'JOB_STARTED')
 * @returns First matching event or undefined if not found
 *
 * @example
 * ```typescript
 * const jobStarted = findEvent(events, 'JOB_STARTED');
 * if (jobStarted) {
 *   console.log('Job started at', jobStarted.ts);
 * }
 * ```
 */
export function findEvent<T extends BoothEventType>(
  events: BoothEvent[],
  type: T
): Extract<BoothEvent, { type: T }> | undefined {
  return events.find((event) => event.type === type) as
    | Extract<BoothEvent, { type: T }>
    | undefined;
}

/**
 * Find most recent event of given type by timestamp.
 * Uses string comparison (ISO 8601 is lexicographically sortable).
 *
 * @param events - Array of booth events
 * @param type - Event type to find
 * @returns Most recent matching event or undefined if none found
 *
 * @example
 * ```typescript
 * const latestDeploy = findMostRecentEvent(events, 'DEPLOY_DONE');
 * if (latestDeploy) {
 *   console.log('Latest deployment:', latestDeploy.url);
 * }
 * ```
 */
export function findMostRecentEvent<T extends BoothEventType>(
  events: BoothEvent[],
  type: T
): Extract<BoothEvent, { type: T }> | undefined {
  const filtered = events.filter((event) => event.type === type);
  if (filtered.length === 0) return undefined;
  return findMostRecentInArray(filtered) as Extract<BoothEvent, { type: T }>;
}

/**
 * Find event of given type that occurs after the specified timestamp.
 * Useful for checking recovery scenarios (e.g., JOB_STARTED after JOB_FAILED).
 *
 * @param events - Array of booth events
 * @param type - Event type to find
 * @param afterTimestamp - ISO 8601 timestamp; event must be after this time
 * @returns First matching event after timestamp or undefined if none found
 *
 * @example
 * ```typescript
 * const recovery = findEventAfter(events, 'JOB_STARTED', failedEvent.ts);
 * const hasRecovered = recovery !== undefined;
 * ```
 */
export function findEventAfter<T extends BoothEventType>(
  events: BoothEvent[],
  type: T,
  afterTimestamp: string
): Extract<BoothEvent, { type: T }> | undefined {
  return events.find(
    (event) => event.type === type && event.ts > afterTimestamp
  ) as Extract<BoothEvent, { type: T }> | undefined;
}

/**
 * Find most recent event in a pre-filtered array by timestamp.
 * Uses reduce for single-pass efficiency (no sorting needed).
 *
 * @param events - Array of events with ts field (must not be empty)
 * @returns Event with the most recent timestamp
 *
 * @example
 * ```typescript
 * const featureEvents = events.filter(e => e.type === 'FEATURE_STARTED');
 * if (featureEvents.length > 0) {
 *   const mostRecent = findMostRecentInArray(featureEvents);
 *   console.log('Latest feature:', mostRecent.featureId);
 * }
 * ```
 */
export function findMostRecentInArray<T extends { ts: string }>(events: T[]): T {
  if (events.length === 0) {
    throw new Error('Cannot find most recent in empty array');
  }
  return events.reduce((latest, current) =>
    current.ts > latest.ts ? current : latest
  );
}

// =============================================================================
// Feature Completion Helpers (T3)
// =============================================================================

/**
 * Completion event types.
 * A feature is considered complete if any of these events exist for it.
 */
const COMPLETION_EVENT_TYPES = [
  'FEATURE_DONE',
  'FEATURE_FAILED',
  'FEATURE_SKIPPED',
] as const;

type CompletionEventType = (typeof COMPLETION_EVENT_TYPES)[number];

/**
 * Type guard for feature completion events.
 * Checks if an event is a FEATURE_DONE, FEATURE_FAILED, or FEATURE_SKIPPED.
 *
 * @param event - Event to check
 * @returns True if event is a completion event
 *
 * @example
 * ```typescript
 * const completionEvents = events.filter(isCompletionEvent);
 * ```
 */
export function isCompletionEvent(
  event: BoothEvent
): event is Extract<BoothEvent, { type: CompletionEventType }> {
  return (COMPLETION_EVENT_TYPES as readonly string[]).includes(event.type);
}

/**
 * Check if a feature is complete (done, failed, or skipped).
 *
 * A feature is considered complete if any of the following events
 * exist for the given featureId:
 * - FEATURE_DONE: Feature implementation succeeded
 * - FEATURE_FAILED: Feature implementation failed
 * - FEATURE_SKIPPED: Feature was intentionally skipped
 *
 * @param featureId - Feature ID to check (e.g., "F1")
 * @param events - Array of booth events
 * @returns True if feature has a completion event
 *
 * @example
 * ```typescript
 * const completedFeatures = features.filter(f =>
 *   isFeatureComplete(f.featureId, events)
 * );
 * console.log(`${completedFeatures.length} of ${features.length} complete`);
 * ```
 */
export function isFeatureComplete(
  featureId: string,
  events: BoothEvent[]
): boolean {
  return events.some((event) => {
    // Check if this is a completion event for the specified feature
    if (event.type === 'FEATURE_DONE' && event.featureId === featureId) {
      return true;
    }
    if (event.type === 'FEATURE_FAILED' && event.featureId === featureId) {
      return true;
    }
    if (event.type === 'FEATURE_SKIPPED' && event.featureId === featureId) {
      return true;
    }
    return false;
  });
}

// =============================================================================
// Deployment URL Extraction (T4)
// =============================================================================

/**
 * Result of deployment URL extraction.
 */
export interface DeploymentUrls {
  /** Live demo URL (from DEPLOY_DONE event) or null if not deployed */
  demoUrl: string | null;
  /** Repository URL (from REPO_PUBLISHED event) or null if not published */
  repoUrl: string | null;
}

/**
 * Extract deployment URLs from events.
 *
 * Finds the most recent DEPLOY_DONE and REPO_PUBLISHED events
 * and extracts their URLs.
 *
 * @param events - Array of booth events
 * @returns Object with demoUrl and repoUrl (null if not found)
 *
 * @example
 * ```typescript
 * const { demoUrl, repoUrl } = extractDeploymentUrls(events);
 *
 * if (demoUrl) {
 *   console.log('View demo at:', demoUrl);
 * }
 * if (repoUrl) {
 *   console.log('Source code:', repoUrl);
 * }
 * ```
 */
export function extractDeploymentUrls(events: BoothEvent[]): DeploymentUrls {
  // Find most recent DEPLOY_DONE event
  const deployEvent = findMostRecentEvent(events, 'DEPLOY_DONE');
  const demoUrl = deployEvent?.url ?? null;

  // Find most recent REPO_PUBLISHED event
  const repoEvent = findMostRecentEvent(events, 'REPO_PUBLISHED');
  const repoUrl = repoEvent?.repoUrl ?? null;

  return { demoUrl, repoUrl };
}
