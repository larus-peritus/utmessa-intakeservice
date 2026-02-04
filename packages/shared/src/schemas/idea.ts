import { z } from 'zod';

// =============================================================================
// Idea Status Enum
// =============================================================================

/**
 * Idea status enum representing the lifecycle of a user-submitted idea.
 *
 * Status transitions:
 * - submitted: Initial state when user submits idea via Intake
 * - ready: Idea validated and ready to be claimed by Orchestrator
 * - claimed: Orchestrator has claimed the idea and is preparing to build
 * - running: Build process is actively running
 * - waiting: Build paused, awaiting human input (HITL)
 * - deployed: Build complete, app deployed successfully
 * - failed: Build encountered fatal error, cannot continue
 * - abandoned: User or system abandoned the idea
 *
 * @example
 * ```typescript
 * import { IdeaStatusSchema, IDEA_STATUSES } from '@utmessa/shared';
 *
 * // Validate a status
 * const status = IdeaStatusSchema.parse('running');
 *
 * // Check all valid statuses
 * console.log(IDEA_STATUSES); // ['submitted', 'ready', ...]
 * ```
 */
export const IdeaStatusSchema = z.enum([
  'submitted',
  'ready',
  'claimed',
  'running',
  'waiting',
  'deployed',
  'failed',
  'abandoned',
]);

/**
 * TypeScript type for idea status values.
 */
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

/**
 * Array of all valid idea status values.
 * Useful for iteration, dropdown options, etc.
 */
export const IDEA_STATUSES = IdeaStatusSchema.options;

// =============================================================================
// Idea Schema
// =============================================================================

/**
 * Schema for Idea - the core entity representing a user's app idea.
 *
 * An Idea is created when a user submits their app concept via the Intake system.
 * It tracks the full lifecycle from submission through deployment.
 *
 * Required fields:
 * - id: Unique UUID identifier
 * - token: Receipt token for claiming/accessing the idea
 * - title: Human-readable title (1-200 chars)
 * - problem: Description of the problem to solve (min 10 chars)
 * - status: Current lifecycle status
 * - createdAt: ISO 8601 timestamp of creation
 * - updatedAt: ISO 8601 timestamp of last update
 *
 * Optional fields:
 * - email: User's contact email
 * - mustHaves: Array of must-have features
 * - progress: Build completion percentage (0-100)
 * - currentStep: Human-readable current action
 * - currentFeature: ID of feature being worked on
 * - waitingQuestion: Question awaiting user input (when status=waiting)
 * - demoUrl: Deployed demo URL (when status=deployed)
 * - repoUrl: Git repository URL
 * - slug: URL-friendly identifier
 *
 * @example
 * ```typescript
 * import { IdeaSchema, type Idea } from '@utmessa/shared';
 *
 * const idea: Idea = IdeaSchema.parse({
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   token: 'receipt-abc123',
 *   title: 'Todo App with Dark Mode',
 *   problem: 'I need a simple todo app that supports dark mode and cloud sync.',
 *   email: 'user@example.com',
 *   status: 'running',
 *   progress: 45,
 *   currentFeature: 'F2',
 *   createdAt: '2026-01-26T10:00:00.000Z',
 *   updatedAt: '2026-01-26T11:30:00.000Z',
 * });
 * ```
 */
export const IdeaSchema = z.object({
  /** Unique UUID identifier for the idea */
  id: z.string().uuid(),

  /** Receipt token for claiming/accessing the idea */
  token: z.string().min(1, 'Token cannot be empty'),

  /** Human-readable title (1-200 characters, whitespace trimmed) */
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters').trim(),

  /** Description of the problem to solve (min 10 chars, whitespace trimmed) */
  problem: z.string().min(10, 'Problem must be at least 10 characters').trim(),

  /** Array of must-have features (optional) */
  mustHaves: z.array(z.string()).optional(),

  /** User's contact email (optional, empty strings treated as null) */
  email: z
    .string()
    .transform((val) => (val === '' ? null : val))
    .pipe(z.string().email('Invalid email format').nullable())
    .optional()
    .nullable(),

  /** Current lifecycle status */
  status: IdeaStatusSchema,

  /** Build completion percentage (0-100, optional) */
  progress: z.number().min(0, 'Progress cannot be negative').max(100, 'Progress cannot exceed 100').optional(),

  /** Human-readable current action (optional) */
  currentStep: z.string().optional(),

  /** ID of feature being worked on (optional) */
  currentFeature: z.string().optional(),

  /** Question awaiting user input (optional, used when status=waiting) */
  waitingQuestion: z.string().optional(),

  /** Deployed demo URL (optional, set when status=deployed) */
  demoUrl: z.string().url('Invalid demo URL format').optional(),

  /** Git repository URL (optional) */
  repoUrl: z.string().url('Invalid repo URL format').optional(),

  /** URL-friendly identifier (optional) */
  slug: z.string().optional(),

  /** ISO 8601 timestamp of creation */
  createdAt: z.string().datetime({ offset: true }),

  /** ISO 8601 timestamp of last update */
  updatedAt: z.string().datetime({ offset: true }),
});

/**
 * TypeScript type for Idea entity.
 * Inferred from IdeaSchema for type safety.
 */
export type Idea = z.infer<typeof IdeaSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates idea data and returns typed Idea object.
 *
 * @param data - Raw data to validate (typically from API or database)
 * @returns Validated and typed Idea
 * @throws {z.ZodError} if validation fails with detailed field-level errors
 *
 * @example
 * ```typescript
 * import { validateIdea } from '@utmessa/shared';
 *
 * try {
 *   const idea = validateIdea(apiResponse);
 *   console.log(`Processing: ${idea.title}`);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Validation failed:', error.errors);
 *   }
 * }
 * ```
 */
export function validateIdea(data: unknown): Idea {
  return IdeaSchema.parse(data);
}

/**
 * Safely validates idea data without throwing.
 *
 * @param data - Raw data to validate
 * @returns Zod SafeParseReturnType with success/error result
 *
 * @example
 * ```typescript
 * import { safeValidateIdea } from '@utmessa/shared';
 *
 * const result = safeValidateIdea(userInput);
 * if (result.success) {
 *   processIdea(result.data);
 * } else {
 *   showErrors(result.error.errors);
 * }
 * ```
 */
export function safeValidateIdea(data: unknown): z.SafeParseReturnType<unknown, Idea> {
  return IdeaSchema.safeParse(data);
}
