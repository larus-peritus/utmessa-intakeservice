/**
 * Intake API DTOs - Request/response types for Intake service endpoints
 *
 * This module defines TypeScript types and Zod validation schemas for all
 * request/response payloads used by the Intake service API endpoints.
 *
 * Public endpoints use PublicIdea (excludes orchestrator metadata)
 * Protected endpoints use full Idea schema (includes all fields)
 *
 * @module api/intake
 */

import { z } from 'zod';
import { IdeaSchema, IdeaStatusSchema } from '../schemas/idea';
import { FeatureSchema } from '../schemas/feature';

// =============================================================================
// Public Types
// =============================================================================

/**
 * PublicIdea - Safe subset of Idea for public-facing responses
 *
 * Excludes internal orchestrator fields that should not be exposed publicly:
 * - slug: Internal project identifier
 *
 * Note: When IdeaSchema is extended with claimedBy/claimedAt fields,
 * they should also be omitted here.
 *
 * @example
 * ```typescript
 * import { PublicIdea, PublicIdeaSchema } from '@utmessa/shared';
 *
 * const publicIdea: PublicIdea = PublicIdeaSchema.parse(ideaFromDb);
 * // publicIdea.slug is not available (excluded)
 * ```
 */
export const PublicIdeaSchema = IdeaSchema.omit({
  slug: true,
});

export type PublicIdea = z.infer<typeof PublicIdeaSchema>;

// =============================================================================
// Public Endpoint DTOs - Submit Idea (POST /api/ideas)
// =============================================================================

/**
 * POST /api/ideas - Submit new idea
 *
 * Request schema for conference attendees submitting ideas.
 * Validates title, problem description, optional must-haves and email.
 *
 * Validation rules:
 * - title: 1-200 chars, trimmed (required)
 * - problem: min 10 chars, trimmed (required)
 * - mustHaves: max 10 items (optional)
 * - email: RFC 5322 format (optional)
 *
 * @example
 * ```typescript
 * import { SubmitIdeaRequestSchema } from '@utmessa/shared';
 *
 * const request = SubmitIdeaRequestSchema.parse({
 *   title: 'Recipe App',
 *   problem: 'Need to track family recipes with search',
 *   mustHaves: ['auth', 'search'],
 *   email: 'user@example.com',
 * });
 * ```
 */
export const SubmitIdeaRequestSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  problem: z.string().min(10, 'Problem description too short').trim(),
  mustHaves: z.array(z.string()).max(10, 'Too many must-haves').optional(),
  email: z.string().email('Invalid email format').optional(),
});

export type SubmitIdeaRequest = z.infer<typeof SubmitIdeaRequestSchema>;

/**
 * POST /api/ideas - Submit idea response
 *
 * Response schema returned after successfully creating an idea.
 * Includes the minimal fields needed to construct a receipt URL.
 *
 * @example
 * ```typescript
 * import { SubmitIdeaResponse } from '@utmessa/shared';
 *
 * const response: SubmitIdeaResponse = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   token: 'receipt-abc123',
 *   createdAt: '2026-01-26T10:00:00.000Z',
 * };
 * ```
 */
export const SubmitIdeaResponseSchema = z.object({
  id: z.string().uuid(),
  token: z.string(),
  createdAt: z.string().datetime({ offset: true }),
});

export type SubmitIdeaResponse = z.infer<typeof SubmitIdeaResponseSchema>;

// =============================================================================
// Public Endpoint DTOs - Get Idea by Token (GET /api/ideas/[token])
// =============================================================================

/**
 * GET /api/ideas/[token] - Retrieve idea by receipt token
 *
 * Response schema for viewing submission status via receipt URL.
 * Returns PublicIdea (excludes internal orchestrator fields).
 *
 * @example
 * ```typescript
 * import { GetIdeaResponseSchema, GetIdeaResponse } from '@utmessa/shared';
 *
 * const idea: GetIdeaResponse = GetIdeaResponseSchema.parse(ideaFromDb);
 * console.log(idea.title, idea.status, idea.progress);
 * ```
 */
export const GetIdeaResponseSchema = PublicIdeaSchema;

export type GetIdeaResponse = z.infer<typeof GetIdeaResponseSchema>;

// =============================================================================
// Protected Endpoint DTOs - List Ideas (GET /api/ideas?status=...)
// =============================================================================

/**
 * GET /api/ideas?status=... - List ideas query parameters
 *
 * Query schema for orchestrator to filter ideas by status.
 * Protected endpoint (requires X-ORCH-KEY header).
 *
 * @example
 * ```typescript
 * import { ListIdeasQuerySchema } from '@utmessa/shared';
 *
 * const query = ListIdeasQuerySchema.parse({ status: 'submitted' });
 * ```
 */
export const ListIdeasQuerySchema = z.object({
  status: IdeaStatusSchema.optional(),
  // Future pagination fields (commented for now)
  // offset: z.coerce.number().min(0).optional(),
  // limit: z.coerce.number().min(1).max(100).optional(),
});

export type ListIdeasQuery = z.infer<typeof ListIdeasQuerySchema>;

/**
 * GET /api/ideas - List ideas response
 *
 * Response schema for orchestrator queue management.
 * Returns full Idea schema with all fields (including internal metadata).
 *
 * @example
 * ```typescript
 * import { ListIdeasResponseSchema } from '@utmessa/shared';
 *
 * const response = ListIdeasResponseSchema.parse({
 *   ideas: [...],
 *   total: 10,
 * });
 * ```
 */
export const ListIdeasResponseSchema = z.object({
  ideas: z.array(IdeaSchema),
  total: z.number().int().min(0),
});

export type ListIdeasResponse = z.infer<typeof ListIdeasResponseSchema>;

// =============================================================================
// Protected Endpoint DTOs - Claim Idea (POST /api/ideas/[id]/claim)
// =============================================================================

/**
 * POST /api/ideas/[id]/claim - Claim an idea for processing
 *
 * Request schema for orchestrator to atomically claim ideas.
 * Protected endpoint (requires X-ORCH-KEY header).
 *
 * @example
 * ```typescript
 * import { ClaimIdeaRequestSchema } from '@utmessa/shared';
 *
 * const request = ClaimIdeaRequestSchema.parse({
 *   claimedBy: 'orchestrator-1',
 * });
 * ```
 */
export const ClaimIdeaRequestSchema = z.object({
  claimedBy: z.string().min(1, 'claimedBy is required'),
});

export type ClaimIdeaRequest = z.infer<typeof ClaimIdeaRequestSchema>;

/**
 * POST /api/ideas/[id]/claim - Claim idea response
 *
 * Response schema returning the complete claimed Idea.
 * Includes token for receipt URL construction.
 *
 * @example
 * ```typescript
 * import { ClaimIdeaResponseSchema } from '@utmessa/shared';
 *
 * const claimed = ClaimIdeaResponseSchema.parse(ideaFromDb);
 * console.log(`Claimed: ${claimed.token}`);
 * ```
 */
export const ClaimIdeaResponseSchema = IdeaSchema;

export type ClaimIdeaResponse = z.infer<typeof ClaimIdeaResponseSchema>;

// =============================================================================
// Protected Endpoint DTOs - Update Idea (POST /api/ideas/[id]/update)
// =============================================================================

/**
 * POST /api/ideas/[id]/update - Update idea status and progress
 *
 * Request schema for orchestrator to sync status changes.
 * All fields optional for partial updates.
 * Uses .strict() to reject unknown fields.
 * Protected endpoint (requires X-ORCH-KEY header).
 *
 * @example
 * ```typescript
 * import { UpdateIdeaRequestSchema } from '@utmessa/shared';
 *
 * // Partial update - only progress and currentFeature
 * const request = UpdateIdeaRequestSchema.parse({
 *   progress: 60,
 *   currentFeature: 'F3',
 * });
 *
 * // Empty update is also valid (no-op)
 * const emptyRequest = UpdateIdeaRequestSchema.parse({});
 * ```
 */
export const UpdateIdeaRequestSchema = z
  .object({
    status: IdeaStatusSchema.optional(),
    progress: z.number().min(0).max(100).optional(),
    currentStep: z.string().optional(),
    currentFeature: z.string().optional(),
    waitingQuestion: z.string().optional(),
    demoUrl: z.string().url('Invalid demo URL').optional(),
    repoUrl: z.string().url('Invalid repo URL').optional(),
  })
  .strict();

export type UpdateIdeaRequest = z.infer<typeof UpdateIdeaRequestSchema>;

/**
 * POST /api/ideas/[id]/update - Update idea response
 *
 * Response schema returning the complete updated Idea.
 *
 * @example
 * ```typescript
 * import { UpdateIdeaResponseSchema } from '@utmessa/shared';
 *
 * const updated = UpdateIdeaResponseSchema.parse(ideaFromDb);
 * console.log(`Progress: ${updated.progress}%`);
 * ```
 */
export const UpdateIdeaResponseSchema = IdeaSchema;

export type UpdateIdeaResponse = z.infer<typeof UpdateIdeaResponseSchema>;

// =============================================================================
// Protected Endpoint DTOs - Upsert Features (POST /api/ideas/[id]/features)
// =============================================================================

/**
 * POST /api/ideas/[id]/features - Upsert feature list
 *
 * Request schema for orchestrator to sync feature data.
 * Optional endpoint for MVP - may be deferred.
 * Protected endpoint (requires X-ORCH-KEY header).
 *
 * @example
 * ```typescript
 * import { UpsertFeaturesRequestSchema } from '@utmessa/shared';
 *
 * const request = UpsertFeaturesRequestSchema.parse({
 *   features: [
 *     { id: 'F1', ideaId: 'uuid', featureId: 'F1', title: 'Auth', status: 'planned' },
 *     { id: 'F2', ideaId: 'uuid', featureId: 'F2', title: 'Dashboard', status: 'planned' },
 *   ],
 * });
 * ```
 */
export const UpsertFeaturesRequestSchema = z.object({
  features: z.array(FeatureSchema),
});

export type UpsertFeaturesRequest = z.infer<typeof UpsertFeaturesRequestSchema>;

/**
 * POST /api/ideas/[id]/features - Upsert features response
 *
 * Simple acknowledgment response for successful upsert.
 *
 * @example
 * ```typescript
 * import { UpsertFeaturesResponseSchema } from '@utmessa/shared';
 *
 * const response = UpsertFeaturesResponseSchema.parse({ success: true });
 * ```
 */
export const UpsertFeaturesResponseSchema = z.object({
  success: z.literal(true),
});

export type UpsertFeaturesResponse = z.infer<typeof UpsertFeaturesResponseSchema>;
