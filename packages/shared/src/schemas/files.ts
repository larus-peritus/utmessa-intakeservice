import { z } from 'zod';
import { FeatureStatusSchema } from './feature';

// =============================================================================
// Schema Version
// =============================================================================

/**
 * Schema version constant for all file formats.
 * Used to enforce version = 1 for MVP.
 */
const SCHEMA_VERSION = 1;

// =============================================================================
// booth.project.json Schema
// =============================================================================

/**
 * Schema for booth.project.json
 *
 * Maps local project folder to Intake idea record.
 * Located at project root: `<project>/booth.project.json`
 *
 * Required fields:
 * - schemaVersion: Must be 1
 * - ideaId: UUID of the Intake idea record
 * - token: Receipt token for claiming the idea
 * - slug: Human-readable project identifier
 * - createdAt: ISO 8601 timestamp of project creation
 *
 * Optional fields:
 * - startedAt: ISO 8601 timestamp when build started
 * - templateId: Template used for initialization
 * - notes: Additional project metadata
 *
 * @example
 * ```json
 * {
 *   "schemaVersion": 1,
 *   "ideaId": "550e8400-e29b-41d4-a716-446655440000",
 *   "token": "abc123def456",
 *   "slug": "my-todo-app",
 *   "createdAt": "2026-01-26T10:30:00.000Z",
 *   "startedAt": "2026-01-26T10:31:00.000Z",
 *   "templateId": "react-vite",
 *   "notes": "POC for team demo"
 * }
 * ```
 */
export const ProjectFileSchema = z.object({
  /** File format version (always 1 for MVP) */
  schemaVersion: z.literal(SCHEMA_VERSION),

  /** UUID of the Intake idea record */
  ideaId: z.string().uuid(),

  /** Receipt token for claiming the idea */
  token: z.string().min(1, 'Token cannot be empty'),

  /** Human-readable project identifier */
  slug: z.string().min(1, 'Slug cannot be empty'),

  /** ISO 8601 timestamp of project creation */
  createdAt: z.string().datetime({ offset: true }),

  /** ISO 8601 timestamp when build started (optional) */
  startedAt: z.string().datetime({ offset: true }).optional(),

  /** Template used for project initialization (optional) */
  templateId: z.string().optional(),

  /** Additional project metadata (optional) */
  notes: z.string().optional(),

  /** Human-readable idea title (optional, from Intake) */
  ideaTitle: z.string().optional(),

  /** Problem description from user (optional, from Intake) */
  ideaDescription: z.string().optional(),

  /** Must-have features requested by user (optional, from Intake) */
  mustHaves: z.array(z.string()).optional(),
});

/**
 * TypeScript type for booth.project.json content.
 * Inferred from ProjectFileSchema for type safety.
 */
export type ProjectFile = z.infer<typeof ProjectFileSchema>;

// =============================================================================
// Feature Status Re-export
// =============================================================================

/**
 * Re-export FeatureStatusSchema from feature.ts for use in file schemas.
 * This ensures consistency between Feature entities and file formats.
 *
 * @see {@link ./feature.ts} for the canonical definition
 */
export { FeatureStatusSchema as FeatureStatus } from './feature';
export type { FeatureStatus as FeatureStatusType } from './feature';

// =============================================================================
// features.json Schema
// =============================================================================

/**
 * Schema for individual feature item in features.json
 *
 * Required fields:
 * - id: Unique feature identifier (e.g., "F1", "auth")
 * - title: Human-readable feature name
 *
 * Optional fields:
 * - acceptance: Acceptance criteria for the feature
 * - status: Current status (defaults to 'planned')
 */
export const FeatureItemSchema = z.object({
  /** Unique feature identifier (e.g., "F1", "auth") */
  id: z.string().min(1, 'Feature ID cannot be empty'),

  /** Human-readable feature name */
  title: z.string().min(1, 'Feature title cannot be empty'),

  /** Acceptance criteria for the feature (optional) */
  acceptance: z.string().optional(),

  /** Current status (defaults to 'planned') */
  status: FeatureStatusSchema.optional().default('planned'),
});

/**
 * TypeScript type for individual feature item.
 */
export type FeatureItem = z.infer<typeof FeatureItemSchema>;

/**
 * Schema for features.json
 *
 * Defines feature list for progress computation.
 * Located at: `<project>/features.json` or `<project>/apps/<slug>/features.json`
 *
 * Required fields:
 * - schemaVersion: Must be 1
 * - planned: Whether feature planning is complete
 * - features: Array of feature definitions
 *
 * @example
 * ```json
 * {
 *   "schemaVersion": 1,
 *   "planned": true,
 *   "features": [
 *     {
 *       "id": "F1",
 *       "title": "User Authentication",
 *       "acceptance": "Users can sign up and log in",
 *       "status": "done"
 *     },
 *     {
 *       "id": "F2",
 *       "title": "Todo CRUD",
 *       "acceptance": "Create, read, update, delete todos",
 *       "status": "in_progress"
 *     },
 *     {
 *       "id": "F3",
 *       "title": "Dark Mode",
 *       "status": "planned"
 *     }
 *   ]
 * }
 * ```
 */
export const FeaturesFileSchema = z.object({
  /** File format version (always 1 for MVP) */
  schemaVersion: z.literal(SCHEMA_VERSION),

  /** Whether feature planning is complete */
  planned: z.boolean(),

  /** Array of feature definitions */
  features: z.array(FeatureItemSchema),
});

/**
 * TypeScript type for features.json content.
 * Inferred from FeaturesFileSchema for type safety.
 */
export type FeaturesFile = z.infer<typeof FeaturesFileSchema>;

// =============================================================================
// Project Run Status Enum
// =============================================================================

/**
 * Project run status enum for state file.
 * Defined locally to avoid dependency on F2 event schemas.
 *
 * Values:
 * - not_started: Project created but build not started
 * - running: Build process is actively running
 * - waiting: Build paused awaiting human input
 * - failed: Build encountered fatal error
 * - deployed: Build complete and project deployed
 */
export const ProjectRunStatus = z.enum([
  'not_started',
  'running',
  'waiting',
  'failed',
  'deployed',
]);

/**
 * TypeScript type for project run status values.
 */
export type ProjectRunStatusType = z.infer<typeof ProjectRunStatus>;

// =============================================================================
// booth.state.json Schema
// =============================================================================

/**
 * Schema for booth.state.json
 *
 * Cached computed state for fast loading.
 * Derived from events.jsonl but cached for performance.
 * Located at project root: `<project>/booth.state.json`
 *
 * Required fields:
 * - schemaVersion: Must be 1
 * - status: Current project run status
 * - updatedAt: ISO 8601 timestamp of last state update
 *
 * Optional fields:
 * - progress: Percentage complete (0-100)
 * - currentStep: Human-readable current action
 * - currentFeature: ID of feature being worked on
 * - waitingQuestion: Question awaiting user input (nullable)
 * - demoUrl: Deployed demo URL (nullable)
 * - repoUrl: Git repository URL (nullable)
 *
 * @example
 * ```json
 * {
 *   "schemaVersion": 1,
 *   "status": "running",
 *   "progress": 66,
 *   "currentStep": "Building feature F3: Dark Mode",
 *   "currentFeature": "F3",
 *   "waitingQuestion": null,
 *   "demoUrl": null,
 *   "repoUrl": "https://github.com/user/my-todo-app",
 *   "updatedAt": "2026-01-26T11:15:00.000Z"
 * }
 * ```
 */
export const StateFileSchema = z.object({
  /** File format version (always 1 for MVP) */
  schemaVersion: z.literal(SCHEMA_VERSION),

  /** Current project run status */
  status: ProjectRunStatus,

  /** Percentage complete (0-100, optional, undefined if planning) */
  progress: z.number().min(0).max(100).optional(),

  /** Human-readable current action (optional) */
  currentStep: z.string().optional(),

  /** ID of feature being worked on (optional) */
  currentFeature: z.string().optional(),

  /** Question awaiting user input (nullable, optional) */
  waitingQuestion: z.string().nullable().optional(),

  /** Deployed demo URL (nullable, optional) */
  demoUrl: z.string().url().nullable().optional(),

  /** Git repository URL (nullable, optional) */
  repoUrl: z.string().url().nullable().optional(),

  /** ISO 8601 timestamp of last state update */
  updatedAt: z.string().datetime({ offset: true }),
});

/**
 * TypeScript type for booth.state.json content.
 * Inferred from StateFileSchema for type safety.
 */
export type StateFile = z.infer<typeof StateFileSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates booth.project.json file data.
 *
 * Use this function to validate raw JSON data read from booth.project.json.
 * Returns a fully typed ProjectFile object on success.
 *
 * @param data - Raw data to validate (typically from JSON.parse)
 * @returns Validated and typed ProjectFile
 * @throws {z.ZodError} if validation fails with detailed field-level errors
 *
 * @example
 * ```typescript
 * import { validateProjectFile } from '@utmessa/shared';
 *
 * const rawData = JSON.parse(fs.readFileSync('booth.project.json', 'utf-8'));
 * try {
 *   const projectFile = validateProjectFile(rawData);
 *   console.log(`Project: ${projectFile.slug}`);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Invalid project file:', error.errors);
 *   }
 * }
 * ```
 */
export function validateProjectFile(data: unknown): ProjectFile {
  return ProjectFileSchema.parse(data);
}

/**
 * Validates features.json file data.
 *
 * Use this function to validate raw JSON data read from features.json.
 * Returns a fully typed FeaturesFile object on success.
 * Features without a status will have status defaulted to 'planned'.
 *
 * @param data - Raw data to validate (typically from JSON.parse)
 * @returns Validated and typed FeaturesFile
 * @throws {z.ZodError} if validation fails with detailed field-level errors
 *
 * @example
 * ```typescript
 * import { validateFeaturesFile } from '@utmessa/shared';
 *
 * const rawData = JSON.parse(fs.readFileSync('features.json', 'utf-8'));
 * try {
 *   const featuresFile = validateFeaturesFile(rawData);
 *   const doneCount = featuresFile.features.filter(f => f.status === 'done').length;
 *   console.log(`Progress: ${doneCount}/${featuresFile.features.length}`);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Invalid features file:', error.errors);
 *   }
 * }
 * ```
 */
export function validateFeaturesFile(data: unknown): FeaturesFile {
  return FeaturesFileSchema.parse(data);
}

/**
 * Validates booth.state.json file data.
 *
 * Use this function to validate raw JSON data read from booth.state.json.
 * Returns a fully typed StateFile object on success.
 *
 * @param data - Raw data to validate (typically from JSON.parse)
 * @returns Validated and typed StateFile
 * @throws {z.ZodError} if validation fails with detailed field-level errors
 *
 * @example
 * ```typescript
 * import { validateStateFile } from '@utmessa/shared';
 *
 * const rawData = JSON.parse(fs.readFileSync('booth.state.json', 'utf-8'));
 * try {
 *   const stateFile = validateStateFile(rawData);
 *   console.log(`Status: ${stateFile.status}, Progress: ${stateFile.progress}%`);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Invalid state file:', error.errors);
 *   }
 * }
 * ```
 */
export function validateStateFile(data: unknown): StateFile {
  return StateFileSchema.parse(data);
}
