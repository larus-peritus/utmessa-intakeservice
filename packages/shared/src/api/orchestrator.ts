/**
 * Orchestrator Local API DTOs
 *
 * Request/response type definitions for the Orchestrator's local HTTP API.
 * Used by:
 * - Orchestrator service: Shapes API responses
 * - Dashboard UI: Type-safe API consumption
 *
 * Endpoints covered:
 * - GET /api/queue
 * - POST /api/start/[ideaId]
 * - GET /api/projects
 * - GET /api/projects/[slug]
 * - GET /api/projects/[slug]/stream (SSE)
 * - POST /api/projects/[slug]/answer
 * - POST /api/projects/[slug]/manual
 *
 * @module api/orchestrator
 */

import { z } from 'zod';
import { IdeaSchema } from '../schemas/idea';
import { FeatureSchema } from '../schemas/feature';
import { BoothEventSchema } from '../schemas/events';
import {
  ProjectRunStatus as ProjectRunStatusSchemaFromFiles,
  type ProjectRunStatusType,
} from '../schemas/files';

// =============================================================================
// Queue Endpoint DTOs - GET /api/queue
// =============================================================================

/**
 * Represents a single idea in the queue (submitted/ready state).
 *
 * Queue items are Intake ideas that have not yet been claimed by
 * the Orchestrator. The Dashboard uses this to display the list
 * of ideas waiting to be started.
 *
 * @example
 * ```typescript
 * const queueItem: QueueItem = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   title: 'Recipe Manager App',
 *   problem: 'Need a way to organize family recipes',
 *   mustHaves: ['User authentication', 'Recipe search'],
 *   status: 'submitted',
 *   createdAt: '2026-01-26T10:00:00Z',
 * };
 * ```
 */
export const QueueItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  problem: z.string().min(1),
  mustHaves: z.array(z.string()).optional(),
  status: z.enum(['submitted', 'ready']),
  createdAt: z.string().datetime({ offset: true }),
});

export type QueueItem = z.infer<typeof QueueItemSchema>;

/**
 * Response for GET /api/queue endpoint.
 *
 * Contains list of ideas in submitted/ready state.
 *
 * @example
 * ```typescript
 * import { QueueResponse, QueueResponseSchema } from '@utmessa/shared';
 *
 * const response = await fetch('/api/queue');
 * const data = await response.json();
 * const validated: QueueResponse = QueueResponseSchema.parse(data);
 *
 * validated.items.forEach(item => {
 *   console.log(item.title, item.status);
 * });
 * ```
 */
export const QueueResponseSchema = z.object({
  items: z.array(QueueItemSchema),
  total: z.number().int().nonnegative(),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;

// =============================================================================
// Start POC Endpoint DTOs - POST /api/start/[ideaId]
// =============================================================================

/**
 * Success response for POST /api/start/[ideaId] endpoint.
 *
 * Returned when project folder is successfully created.
 *
 * @example
 * ```typescript
 * import { StartPocResponse, StartPocResponseSchema } from '@utmessa/shared';
 *
 * const response = await fetch(`/api/start/${ideaId}`, { method: 'POST' });
 * const data = await response.json();
 *
 * if (data.success) {
 *   const result: StartPocResponse = StartPocResponseSchema.parse(data);
 *   console.log('Project created:', result.projectSlug);
 *   console.log('Path:', result.projectPath);
 * }
 * ```
 */
export const StartPocResponseSchema = z.object({
  success: z.literal(true),
  projectSlug: z.string().min(1),
  projectPath: z.string().min(1),
});

export type StartPocResponse = z.infer<typeof StartPocResponseSchema>;

/**
 * Error response for POST /api/start/[ideaId] endpoint.
 *
 * Returned when project creation fails.
 *
 * @example
 * ```typescript
 * import { StartPocError } from '@utmessa/shared';
 *
 * if (!data.success) {
 *   const error: StartPocError = data;
 *   console.error('Failed to start:', error.error);
 * }
 * ```
 */
export const StartPocErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1),
});

export type StartPocError = z.infer<typeof StartPocErrorSchema>;

/**
 * Union type for start POC endpoint response.
 *
 * Use this when you need to handle both success and error cases.
 *
 * @example
 * ```typescript
 * import { StartPocResult, StartPocResultSchema } from '@utmessa/shared';
 *
 * const result: StartPocResult = StartPocResultSchema.parse(await response.json());
 * if (result.success) {
 *   // result is StartPocResponse
 *   console.log(result.projectSlug);
 * } else {
 *   // result is StartPocError
 *   console.error(result.error);
 * }
 * ```
 */
export const StartPocResultSchema = z.discriminatedUnion('success', [
  StartPocResponseSchema,
  StartPocErrorSchema,
]);

export type StartPocResult = z.infer<typeof StartPocResultSchema>;

// =============================================================================
// Projects List Endpoint DTOs - GET /api/projects
// =============================================================================

/**
 * Project runtime status (computed from events).
 *
 * Re-exported from files.ts for consistency with file schemas.
 *
 * - not_started: Project exists in Intake but not started locally
 * - running: Build in progress
 * - waiting: Paused for human input
 * - failed: Build failed
 * - deployed: Successfully deployed
 */
export const ProjectRunStatusSchema = ProjectRunStatusSchemaFromFiles;

export type ProjectRunStatus = ProjectRunStatusType;

/**
 * Array of all valid project run statuses.
 */
export const PROJECT_RUN_STATUSES = ProjectRunStatusSchema.options;

/**
 * Lightweight project summary for list view.
 *
 * Used by GET /api/projects endpoint.
 *
 * @example
 * ```typescript
 * const summary: ProjectSummary = {
 *   slug: 'recipe-app',
 *   ideaId: '123e4567-e89b-12d3-a456-426614174000',
 *   status: 'running',
 *   progress: 45,
 *   currentFeature: 'F2',
 *   waitingQuestion: null,
 *   updatedAt: '2026-01-26T10:30:00Z',
 * };
 * ```
 */
export const ProjectSummarySchema = z.object({
  slug: z.string().min(1),
  ideaId: z.string().uuid(),
  status: ProjectRunStatusSchema,
  progress: z.number().min(0).max(100).nullable(),
  currentFeature: z.string().nullable(),
  waitingQuestion: z.string().nullable(),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/**
 * Response for GET /api/projects endpoint.
 *
 * Contains list of all started projects with summaries.
 *
 * @example
 * ```typescript
 * import { ProjectsListResponse, ProjectsListResponseSchema } from '@utmessa/shared';
 *
 * const response = await fetch('/api/projects');
 * const data: ProjectsListResponse = ProjectsListResponseSchema.parse(await response.json());
 *
 * data.projects.forEach(project => {
 *   console.log(`${project.slug}: ${project.status} (${project.progress}%)`);
 * });
 * ```
 */
export const ProjectsListResponseSchema = z.object({
  projects: z.array(ProjectSummarySchema),
});

export type ProjectsListResponse = z.infer<typeof ProjectsListResponseSchema>;

// =============================================================================
// Project Detail Endpoint DTOs - GET /api/projects/[slug]
// =============================================================================

/**
 * Detailed progress breakdown by feature priority.
 *
 * Allows the UI to render a progress bar where:
 * - Essential features fill 0-100% (primary color)
 * - Bonus features (phase2, future) extend beyond 100% (secondary color)
 *
 * @example
 * ```typescript
 * const detail: ProgressDetail = {
 *   essentialCompleted: 8,
 *   essentialTotal: 8,
 *   essentialProgress: 100,
 *   bonusCompleted: 2,
 *   bonusTotal: 7,
 *   bonusProgress: 28,
 * };
 * ```
 */
export const ProgressDetailSchema = z.object({
  /** Number of essential features completed (done/failed/skipped) */
  essentialCompleted: z.number().int().nonnegative(),
  /** Total number of essential features */
  essentialTotal: z.number().int().nonnegative(),
  /** Essential progress percentage (0-100) */
  essentialProgress: z.number().min(0).max(100),
  /** Number of bonus features (phase2 + future) completed */
  bonusCompleted: z.number().int().nonnegative(),
  /** Total number of bonus features */
  bonusTotal: z.number().int().nonnegative(),
  /** Bonus progress percentage (0-100 of bonus features) */
  bonusProgress: z.number().min(0).max(100),
});

export type ProgressDetail = z.infer<typeof ProgressDetailSchema>;

/**
 * Computed project state from features and events.
 *
 * Contains all runtime state derived from project files.
 *
 * @example
 * ```typescript
 * const state: ProjectState = {
 *   status: 'running',
 *   progress: 75,
 *   progressDetail: {
 *     essentialCompleted: 6,
 *     essentialTotal: 8,
 *     essentialProgress: 75,
 *     bonusCompleted: 0,
 *     bonusTotal: 3,
 *     bonusProgress: 0,
 *   },
 *   currentFeature: 'F7',
 *   waitingQuestion: null,
 *   demoUrl: null,
 *   repoUrl: null,
 * };
 * ```
 */
export const ProjectStateSchema = z.object({
  status: ProjectRunStatusSchema,
  progress: z.number().min(0).max(100).nullable(),
  progressDetail: ProgressDetailSchema.nullable(),
  currentFeature: z.string().nullable(),
  waitingQuestion: z.string().nullable(),
  demoUrl: z.string().url().nullable(),
  repoUrl: z.string().url().nullable(),
});

export type ProjectState = z.infer<typeof ProjectStateSchema>;

/**
 * Comprehensive project detail including features, events, and state.
 *
 * Used by GET /api/projects/[slug] endpoint.
 * Extends ProjectSummary with additional data for detail view.
 *
 * @example
 * ```typescript
 * import { ProjectDetail, ProjectDetailSchema } from '@utmessa/shared';
 *
 * const response = await fetch('/api/projects/recipe-app');
 * const detail: ProjectDetail = ProjectDetailSchema.parse(await response.json());
 *
 * console.log(detail.slug);              // "recipe-app"
 * console.log(detail.status);            // "running"
 * console.log(detail.idea.title);        // "Recipe Manager"
 * console.log(detail.features.length);   // 5
 * console.log(detail.recentEvents[0]);   // Latest event
 * ```
 */
export const ProjectDetailSchema = ProjectSummarySchema.extend({
  idea: IdeaSchema,
  features: z.array(FeatureSchema),
  recentEvents: z.array(BoothEventSchema),
  state: ProjectStateSchema,
  demoUrl: z.string().url().nullable(),
  repoUrl: z.string().url().nullable(),
});

export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

// =============================================================================
// SSE Event Stream DTOs - GET /api/projects/[slug]/stream
// =============================================================================

/**
 * SSE event sent when project state changes.
 *
 * Sent via GET /api/projects/[slug]/stream endpoint.
 * Dashboard can update UI immediately with new state.
 *
 * @example
 * ```typescript
 * const eventSource = new EventSource('/api/projects/recipe-app/stream');
 *
 * eventSource.onmessage = (event) => {
 *   const data: SSEEvent = JSON.parse(event.data);
 *   if (data.type === 'state-change') {
 *     // Update UI with new state
 *     updateProjectState(data.state);
 *   }
 * };
 * ```
 */
export const StateChangeEventSchema = z.object({
  type: z.literal('state-change'),
  state: ProjectStateSchema,
});

export type StateChangeEvent = z.infer<typeof StateChangeEventSchema>;

/**
 * SSE event sent when new JSONL event is appended.
 *
 * Sent via GET /api/projects/[slug]/stream endpoint.
 * Dashboard can append event to log without re-fetching.
 *
 * @example
 * ```typescript
 * eventSource.onmessage = (event) => {
 *   const data: SSEEvent = JSON.parse(event.data);
 *   if (data.type === 'new-event') {
 *     // Append to event log
 *     appendEvent(data.event);
 *   }
 * };
 * ```
 */
export const NewEventEventSchema = z.object({
  type: z.literal('new-event'),
  event: BoothEventSchema,
});

export type NewEventEvent = z.infer<typeof NewEventEventSchema>;

/**
 * Discriminated union of all SSE event types.
 *
 * TypeScript automatically narrows type based on 'type' field.
 *
 * @example
 * ```typescript
 * function handleSSE(event: SSEEvent) {
 *   switch (event.type) {
 *     case 'state-change':
 *       // event.state is available
 *       console.log('New progress:', event.state.progress);
 *       break;
 *     case 'new-event':
 *       // event.event is available
 *       console.log('Event type:', event.event.type);
 *       break;
 *   }
 * }
 * ```
 */
export const SSEEventSchema = z.discriminatedUnion('type', [
  StateChangeEventSchema,
  NewEventEventSchema,
]);

export type SSEEvent = z.infer<typeof SSEEventSchema>;

// =============================================================================
// Answer Submission DTOs - POST /api/projects/[slug]/answer
// =============================================================================

/**
 * Request body for POST /api/projects/[slug]/answer endpoint.
 *
 * Used to submit human response to WAITING_FOR_INPUT question.
 *
 * @example
 * ```typescript
 * import { AnswerRequest, AnswerRequestSchema } from '@utmessa/shared';
 *
 * const request: AnswerRequest = { answer: 'Use JWT for authentication' };
 * const validated = AnswerRequestSchema.parse(request);
 *
 * await fetch(`/api/projects/${slug}/answer`, {
 *   method: 'POST',
 *   body: JSON.stringify(validated),
 * });
 * ```
 */
export const AnswerRequestSchema = z.object({
  answer: z.string().min(1, 'Answer cannot be empty').max(5000, 'Answer too long').trim(),
});

export type AnswerRequest = z.infer<typeof AnswerRequestSchema>;

/**
 * Success response for POST /api/projects/[slug]/answer endpoint.
 *
 * Confirms answer was processed and INPUT_RECEIVED event was written.
 */
export const AnswerResponseSchema = z.object({
  success: z.literal(true),
  eventWritten: z.boolean(),
});

export type AnswerResponse = z.infer<typeof AnswerResponseSchema>;

// =============================================================================
// Manual Override DTOs - POST /api/projects/[slug]/manual
// =============================================================================

/**
 * Manual override action types.
 *
 * - done: Mark job as complete (write JOB_DONE)
 * - failed: Mark job as failed (write JOB_FAILED)
 * - deployed: Mark as deployed (write DEPLOY_DONE)
 */
export const ManualOverrideActionSchema = z.enum(['done', 'failed', 'deployed']);

export type ManualOverrideAction = z.infer<typeof ManualOverrideActionSchema>;

/**
 * Array of all valid manual override actions.
 */
export const MANUAL_OVERRIDE_ACTIONS = ManualOverrideActionSchema.options;

/**
 * Request body for POST /api/projects/[slug]/manual endpoint.
 *
 * Used for manual status overrides when needed.
 *
 * @example
 * ```typescript
 * import { ManualOverrideRequest, ManualOverrideRequestSchema } from '@utmessa/shared';
 *
 * // Mark as complete
 * const doneRequest: ManualOverrideRequest = { action: 'done' };
 *
 * // Mark as failed with reason
 * const failedRequest: ManualOverrideRequest = {
 *   action: 'failed',
 *   reason: 'Manual intervention required - unable to resolve API issue',
 * };
 *
 * await fetch(`/api/projects/${slug}/manual`, {
 *   method: 'POST',
 *   body: JSON.stringify(ManualOverrideRequestSchema.parse(request)),
 * });
 * ```
 */
export const ManualOverrideRequestSchema = z.object({
  action: ManualOverrideActionSchema,
  reason: z.string().max(500, 'Reason too long').optional(),
});

export type ManualOverrideRequest = z.infer<typeof ManualOverrideRequestSchema>;

/**
 * Success response for POST /api/projects/[slug]/manual endpoint.
 *
 * Confirms manual override was applied.
 */
export const ManualOverrideResponseSchema = z.object({
  success: z.literal(true),
});

export type ManualOverrideResponse = z.infer<typeof ManualOverrideResponseSchema>;
