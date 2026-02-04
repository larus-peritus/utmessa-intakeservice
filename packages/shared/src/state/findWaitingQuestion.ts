/**
 * Waiting Question Detection
 *
 * Extracts the most recent unclosed waiting question from the event stream.
 * Pure function with no side effects.
 *
 * @module state/findWaitingQuestion
 */

import type { BoothEvent, WaitingForInputEvent } from '../schemas/events';
import { findMostRecentInArray } from './helpers';

/**
 * Find the most recent unclosed waiting question.
 *
 * Scans the event log for WAITING_FOR_INPUT events and filters out those
 * that have been answered (have subsequent INPUT_RECEIVED event).
 * Returns the question text of the most recent unclosed prompt.
 *
 * A WAITING_FOR_INPUT is considered "closed" if there's an INPUT_RECEIVED
 * event with a timestamp after the question.
 *
 * @param events - Array of booth events
 * @returns Question text or null if not waiting for input
 *
 * @example No waiting events
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' }
 * ];
 * const question = findWaitingQuestion(events);
 * // question === null
 * ```
 *
 * @example Unclosed waiting prompt
 * ```typescript
 * const events = [
 *   { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
 *   { type: 'WAITING_FOR_INPUT', question: 'Choose auth method', ts: '2026-01-26T10:05:00Z' }
 * ];
 * const question = findWaitingQuestion(events);
 * // question === 'Choose auth method'
 * ```
 *
 * @example Answered prompt (returns null)
 * ```typescript
 * const events = [
 *   { type: 'WAITING_FOR_INPUT', question: 'Choose auth method', ts: '2026-01-26T10:05:00Z' },
 *   { type: 'INPUT_RECEIVED', answer: 'JWT', ts: '2026-01-26T10:10:00Z' }
 * ];
 * const question = findWaitingQuestion(events);
 * // question === null (prompt was answered)
 * ```
 *
 * @example Multiple prompts, most recent unclosed
 * ```typescript
 * const events = [
 *   { type: 'WAITING_FOR_INPUT', question: 'Choose auth?', ts: '2026-01-26T10:05:00Z' },
 *   { type: 'INPUT_RECEIVED', answer: 'JWT', ts: '2026-01-26T10:10:00Z' },
 *   { type: 'WAITING_FOR_INPUT', question: 'Choose database?', ts: '2026-01-26T10:15:00Z' }
 * ];
 * const question = findWaitingQuestion(events);
 * // question === 'Choose database?' (second prompt is unclosed)
 * ```
 */
export function findWaitingQuestion(events: BoothEvent[]): string | null {
  // ==========================================================================
  // Filter to WAITING_FOR_INPUT events
  // ==========================================================================
  const waitingEvents = events.filter(
    (event): event is WaitingForInputEvent => event.type === 'WAITING_FOR_INPUT'
  );

  // If no waiting events, not waiting for input
  if (waitingEvents.length === 0) {
    return null;
  }

  // ==========================================================================
  // Filter out prompts that have been answered
  // A prompt is "closed" if there's an INPUT_RECEIVED with timestamp > question timestamp
  // ==========================================================================
  const unclosedPrompts = waitingEvents.filter((waitEvent) => {
    // Check if any INPUT_RECEIVED event occurs after this waiting event
    const hasAnswer = events.some(
      (event) =>
        event.type === 'INPUT_RECEIVED' && event.ts > waitEvent.ts
    );
    return !hasAnswer;
  });

  // If all prompts are answered, not waiting for input
  if (unclosedPrompts.length === 0) {
    return null;
  }

  // ==========================================================================
  // Return the question from the most recent unclosed prompt
  // Uses timestamp comparison to find the latest
  // ==========================================================================
  const mostRecent = findMostRecentInArray(unclosedPrompts);
  return mostRecent.question;
}
