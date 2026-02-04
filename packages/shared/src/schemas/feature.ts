import { z } from 'zod';

// =============================================================================
// Feature Status Enum
// =============================================================================

/**
 * Feature status enum representing the build state of a single feature.
 *
 * Status transitions:
 * - planned: Feature is defined but work hasn't started
 * - in_progress: Feature implementation is actively underway
 * - done: Feature completed successfully
 * - failed: Feature implementation failed (build error, test failure)
 * - skipped: Feature intentionally skipped (user decision, optional feature)
 *
 * @example
 * ```typescript
 * import { FeatureStatusSchema, FEATURE_STATUSES } from '@utmessa/shared';
 *
 * // Validate a status
 * const status = FeatureStatusSchema.parse('in_progress');
 *
 * // Check all valid statuses
 * console.log(FEATURE_STATUSES); // ['planned', 'in_progress', ...]
 * ```
 */
export const FeatureStatusSchema = z.enum([
  'planned',
  'in_progress',
  'done',
  'failed',
  'skipped',
]);

/**
 * TypeScript type for feature status values.
 */
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

/**
 * Array of all valid feature status values.
 * Useful for iteration, dropdown options, etc.
 */
export const FEATURE_STATUSES = FeatureStatusSchema.options;

// =============================================================================
// Feature Priority Enum
// =============================================================================

/**
 * Feature priority enum for categorizing features.
 *
 * - essential: Core features required for POC (0-100% progress)
 * - phase2: Nice-to-have enhancements (bonus progress)
 * - future: Future roadmap items (bonus progress)
 *
 * @example
 * ```typescript
 * import { FeaturePrioritySchema, FEATURE_PRIORITIES } from '@utmessa/shared';
 *
 * // Validate a priority
 * const priority = FeaturePrioritySchema.parse('essential');
 *
 * // Check all valid priorities
 * console.log(FEATURE_PRIORITIES); // ['essential', 'phase2', 'future']
 * ```
 */
export const FeaturePrioritySchema = z.enum([
  'essential',
  'phase2',
  'future',
]);

/**
 * TypeScript type for feature priority values.
 */
export type FeaturePriority = z.infer<typeof FeaturePrioritySchema>;

/**
 * Array of all valid feature priority values.
 */
export const FEATURE_PRIORITIES = FeaturePrioritySchema.options;

// =============================================================================
// Feature Schema
// =============================================================================

/**
 * Schema for Feature - a single feature within an Idea's implementation.
 *
 * Features are the building blocks of an app idea. Each Idea has multiple
 * features that are implemented sequentially during the build process.
 *
 * Required fields:
 * - id: Unique identifier for the feature record
 * - ideaId: UUID of the parent Idea
 * - featureId: Feature identifier within the idea (e.g., "F1", "F2")
 * - title: Human-readable feature name
 * - status: Current build status
 *
 * Optional fields:
 * - description: Detailed feature description
 * - acceptance: Acceptance criteria for completion
 * - order: Numeric order for sequencing (0-based)
 *
 * @example
 * ```typescript
 * import { FeatureSchema, type Feature } from '@utmessa/shared';
 *
 * const feature: Feature = FeatureSchema.parse({
 *   id: 'feat-123',
 *   ideaId: '550e8400-e29b-41d4-a716-446655440000',
 *   featureId: 'F1',
 *   title: 'User Authentication',
 *   description: 'Allow users to sign up and log in',
 *   acceptance: 'Users can create accounts and access protected routes',
 *   status: 'done',
 *   order: 0,
 * });
 * ```
 */
export const FeatureSchema = z.object({
  /** Unique identifier for the feature record */
  id: z.string().min(1, 'Feature ID cannot be empty'),

  /** UUID of the parent Idea */
  ideaId: z.string().uuid('Invalid idea UUID format'),

  /** Feature identifier within the idea (e.g., "F1", "F2") */
  featureId: z.string().min(1, 'Feature ID cannot be empty'),

  /** Human-readable feature name (whitespace trimmed) */
  title: z.string().min(1, 'Title cannot be empty').trim(),

  /** Detailed feature description (optional) */
  description: z.string().optional(),

  /** Acceptance criteria for completion (optional) */
  acceptance: z.string().optional(),

  /** Current build status */
  status: FeatureStatusSchema,

  /** Feature priority for progress categorization (optional, defaults to essential) */
  priority: FeaturePrioritySchema.optional(),

  /** Numeric order for sequencing (0-based, optional) */
  order: z.number().int('Order must be an integer').min(0, 'Order cannot be negative').optional(),
});

/**
 * TypeScript type for Feature entity.
 * Inferred from FeatureSchema for type safety.
 */
export type Feature = z.infer<typeof FeatureSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates feature data and returns typed Feature object.
 *
 * @param data - Raw data to validate (typically from API or database)
 * @returns Validated and typed Feature
 * @throws {z.ZodError} if validation fails with detailed field-level errors
 *
 * @example
 * ```typescript
 * import { validateFeature } from '@utmessa/shared';
 *
 * try {
 *   const feature = validateFeature(apiResponse);
 *   console.log(`Feature: ${feature.title} (${feature.status})`);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Validation failed:', error.errors);
 *   }
 * }
 * ```
 */
export function validateFeature(data: unknown): Feature {
  return FeatureSchema.parse(data);
}

/**
 * Safely validates feature data without throwing.
 *
 * @param data - Raw data to validate
 * @returns Zod SafeParseReturnType with success/error result
 *
 * @example
 * ```typescript
 * import { safeValidateFeature } from '@utmessa/shared';
 *
 * const result = safeValidateFeature(userInput);
 * if (result.success) {
 *   processFeature(result.data);
 * } else {
 *   showErrors(result.error.errors);
 * }
 * ```
 */
export function safeValidateFeature(data: unknown): z.SafeParseReturnType<unknown, Feature> {
  return FeatureSchema.safeParse(data);
}
