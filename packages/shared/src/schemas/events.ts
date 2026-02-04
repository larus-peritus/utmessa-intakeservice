import { z } from 'zod';

// =============================================================================
// Base Event Schema
// =============================================================================

/**
 * Base schema for all booth events.
 * All events extend this schema with additional fields.
 *
 * @example
 * ```json
 * {
 *   "ts": "2026-01-26T10:00:00Z",
 *   "type": "JOB_STARTED",
 *   "message": "Starting build",
 *   "meta": { "buildId": "12345" }
 * }
 * ```
 */
export const BaseEventSchema = z.object({
  /**
   * ISO 8601 timestamp indicating when event occurred.
   * Must be valid datetime string (e.g., "2026-01-26T10:30:00Z").
   */
  ts: z.string().datetime({ offset: true }),

  /**
   * Event type discriminator.
   * Refined to literal string in specific event schemas.
   */
  type: z.string(),

  /**
   * Optional human-readable message providing context.
   */
  message: z.string().optional(),

  /**
   * Optional arbitrary metadata.
   * Flexible field for storing additional contextual information.
   */
  meta: z.record(z.unknown()).optional(),
});

/**
 * Base event type inferred from BaseEventSchema.
 */
export type BaseEvent = z.infer<typeof BaseEventSchema>;

// =============================================================================
// Job Events
// =============================================================================

/**
 * Job Created Event
 * Written when POC project is initialized.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"recipe-app"}
 * ```
 */
export const JobCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('JOB_CREATED'),
  projectSlug: z.string().optional(),
});
export type JobCreatedEvent = z.infer<typeof JobCreatedEventSchema>;

/**
 * Job Started Event
 * Written when build process begins execution.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED","message":"Starting build"}
 * ```
 */
export const JobStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('JOB_STARTED'),
});
export type JobStartedEvent = z.infer<typeof JobStartedEventSchema>;

/**
 * Job Failed Event
 * Written when build process encounters fatal error.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:10:00Z","type":"JOB_FAILED","reason":"Dependency install failed"}
 * ```
 */
export const JobFailedEventSchema = BaseEventSchema.extend({
  type: z.literal('JOB_FAILED'),
  reason: z.string().min(1, 'Reason cannot be empty'),
});
export type JobFailedEvent = z.infer<typeof JobFailedEventSchema>;

/**
 * Job Done Event
 * Written when build process completes successfully.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:15:30Z","type":"JOB_DONE","message":"Build complete"}
 * ```
 */
export const JobDoneEventSchema = BaseEventSchema.extend({
  type: z.literal('JOB_DONE'),
});
export type JobDoneEvent = z.infer<typeof JobDoneEventSchema>;

// =============================================================================
// Feature Events
// =============================================================================

/**
 * Features Planned Event
 * Written when feature list is finalized before implementation begins.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":5}
 * ```
 */
export const FeaturesPlannedEventSchema = BaseEventSchema.extend({
  type: z.literal('FEATURES_PLANNED'),
  total: z.number().int().positive(),
});
export type FeaturesPlannedEvent = z.infer<typeof FeaturesPlannedEventSchema>;

/**
 * Feature Started Event
 * Written when implementation of a specific feature begins.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:01:00Z","type":"FEATURE_STARTED","featureId":"F1","title":"User Authentication"}
 * ```
 */
export const FeatureStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('FEATURE_STARTED'),
  featureId: z.string().min(1, 'Feature ID cannot be empty'),
  title: z.string().optional(),
});
export type FeatureStartedEvent = z.infer<typeof FeatureStartedEventSchema>;

/**
 * Feature Done Event
 * Written when feature implementation completes successfully.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:05:00Z","type":"FEATURE_DONE","featureId":"F1"}
 * ```
 */
export const FeatureDoneEventSchema = BaseEventSchema.extend({
  type: z.literal('FEATURE_DONE'),
  featureId: z.string().min(1, 'Feature ID cannot be empty'),
});
export type FeatureDoneEvent = z.infer<typeof FeatureDoneEventSchema>;

/**
 * Feature Failed Event
 * Written when feature implementation encounters error and cannot continue.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:08:30Z","type":"FEATURE_FAILED","featureId":"F2","reason":"API endpoint returned 500"}
 * ```
 */
export const FeatureFailedEventSchema = BaseEventSchema.extend({
  type: z.literal('FEATURE_FAILED'),
  featureId: z.string().min(1, 'Feature ID cannot be empty'),
  reason: z.string().min(1, 'Reason cannot be empty'),
});
export type FeatureFailedEvent = z.infer<typeof FeatureFailedEventSchema>;

/**
 * Feature Skipped Event
 * Written when feature is intentionally skipped (not an error).
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:10:00Z","type":"FEATURE_SKIPPED","featureId":"F3","reason":"Optional feature, skipping for MVP"}
 * ```
 */
export const FeatureSkippedEventSchema = BaseEventSchema.extend({
  type: z.literal('FEATURE_SKIPPED'),
  featureId: z.string().min(1, 'Feature ID cannot be empty'),
  reason: z.string().optional(),
});
export type FeatureSkippedEvent = z.infer<typeof FeatureSkippedEventSchema>;

// =============================================================================
// Human-in-the-Loop Events
// =============================================================================

/**
 * Waiting For Input Event
 * Written when build process pauses for human decision.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:10:00Z","type":"WAITING_FOR_INPUT","question":"Choose auth method","choices":["JWT","OAuth","Session"]}
 * ```
 */
export const WaitingForInputEventSchema = BaseEventSchema.extend({
  type: z.literal('WAITING_FOR_INPUT'),
  question: z.string().min(1, 'Question cannot be empty'),
  choices: z.array(z.string()).optional(),
});
export type WaitingForInputEvent = z.infer<typeof WaitingForInputEventSchema>;

/**
 * Input Received Event
 * Written when human provides answer to waiting question.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:12:30Z","type":"INPUT_RECEIVED","answer":"JWT"}
 * ```
 */
export const InputReceivedEventSchema = BaseEventSchema.extend({
  type: z.literal('INPUT_RECEIVED'),
  answer: z.string().min(1, 'Answer cannot be empty'),
});
export type InputReceivedEvent = z.infer<typeof InputReceivedEventSchema>;

// =============================================================================
// Deployment Events
// =============================================================================

/**
 * Deploy Started Event
 * Written when deployment process begins.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:15:00Z","type":"DEPLOY_STARTED","target":"vercel"}
 * ```
 */
export const DeployStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('DEPLOY_STARTED'),
  target: z.string().optional(),
});
export type DeployStartedEvent = z.infer<typeof DeployStartedEventSchema>;

/**
 * Deploy Done Event
 * Written when deployment completes successfully.
 * URL must be valid web URL (http/https).
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:16:30Z","type":"DEPLOY_DONE","url":"https://recipe-app-abc123.vercel.app"}
 * ```
 */
export const DeployDoneEventSchema = BaseEventSchema.extend({
  type: z.literal('DEPLOY_DONE'),
  url: z.string().url(),
});
export type DeployDoneEvent = z.infer<typeof DeployDoneEventSchema>;

/**
 * Repo Published Event
 * Written when repository is published to GitHub/GitLab/etc.
 * URL must be valid web URL.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:17:00Z","type":"REPO_PUBLISHED","repoUrl":"https://github.com/user/recipe-app"}
 * ```
 */
export const RepoPublishedEventSchema = BaseEventSchema.extend({
  type: z.literal('REPO_PUBLISHED'),
  repoUrl: z.string().url(),
});
export type RepoPublishedEvent = z.infer<typeof RepoPublishedEventSchema>;

// =============================================================================
// Test Events (Optional)
// =============================================================================

/**
 * Tests Started Event
 * Written when test suite execution begins.
 * This event is optional and only written when testing is enabled.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:14:00Z","type":"TESTS_STARTED"}
 * ```
 */
export const TestsStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('TESTS_STARTED'),
});
export type TestsStartedEvent = z.infer<typeof TestsStartedEventSchema>;

/**
 * Tests Passed Event
 * Written when all tests pass successfully.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:14:30Z","type":"TESTS_PASSED"}
 * ```
 */
export const TestsPassedEventSchema = BaseEventSchema.extend({
  type: z.literal('TESTS_PASSED'),
});
export type TestsPassedEvent = z.infer<typeof TestsPassedEventSchema>;

/**
 * Tests Failed Event
 * Written when one or more tests fail.
 *
 * @example
 * ```json
 * {"ts":"2026-01-26T10:14:30Z","type":"TESTS_FAILED","reason":"2 of 10 tests failed"}
 * ```
 */
export const TestsFailedEventSchema = BaseEventSchema.extend({
  type: z.literal('TESTS_FAILED'),
  reason: z.string().min(1, 'Reason cannot be empty'),
});
export type TestsFailedEvent = z.infer<typeof TestsFailedEventSchema>;

// =============================================================================
// Discriminated Union Schema
// =============================================================================

/**
 * Union of all booth event types.
 * Uses discriminated union on 'type' field for efficient type narrowing.
 * Enables exhaustive type checking in switch statements.
 *
 * @example
 * ```typescript
 * function handleEvent(event: BoothEvent) {
 *   switch (event.type) {
 *     case 'JOB_STARTED':
 *       console.log('Job started at', event.ts);
 *       break;
 *     case 'FEATURE_DONE':
 *       console.log(`Feature ${event.featureId} completed`);
 *       break;
 *     // TypeScript enforces exhaustiveness
 *   }
 * }
 * ```
 */
export const BoothEventSchema = z.discriminatedUnion('type', [
  // Job Events
  JobCreatedEventSchema,
  JobStartedEventSchema,
  JobFailedEventSchema,
  JobDoneEventSchema,
  // Feature Events
  FeaturesPlannedEventSchema,
  FeatureStartedEventSchema,
  FeatureDoneEventSchema,
  FeatureFailedEventSchema,
  FeatureSkippedEventSchema,
  // HITL Events
  WaitingForInputEventSchema,
  InputReceivedEventSchema,
  // Deployment Events
  DeployStartedEventSchema,
  DeployDoneEventSchema,
  RepoPublishedEventSchema,
  // Test Events
  TestsStartedEventSchema,
  TestsPassedEventSchema,
  TestsFailedEventSchema,
]);

/**
 * Discriminated union type of all booth events.
 * TypeScript infers correct event-specific fields based on type narrowing.
 */
export type BoothEvent = z.infer<typeof BoothEventSchema>;

/**
 * Type representing all possible event type strings.
 */
export type BoothEventType = BoothEvent['type'];
