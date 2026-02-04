import { z } from 'zod';
import { ValidationError } from '../errors/claim-errors';

/**
 * Schema for validating UUID format
 */
const UuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Schema for claim request body
 *
 * The body is optional - if provided, claimedBy must be a non-empty string.
 * This allows orchestrators to claim without identifying themselves.
 */
const ClaimRequestBodySchema = z.object({
  claimedBy: z.string().min(1, 'claimedBy cannot be empty').optional(),
}).strict(); // Reject unknown fields

/**
 * Parsed and validated claim request
 */
export interface ValidatedClaimRequest {
  ideaId: string;
  claimedBy?: string;
}

/**
 * Validate an idea ID as a valid UUID
 *
 * @param ideaId - The string to validate as a UUID
 * @returns True if valid
 * @throws ValidationError if invalid
 *
 * @example
 * ```typescript
 * try {
 *   validateIdeaId('not-a-uuid');
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(error.details); // [{ field: 'ideaId', message: 'Invalid UUID format' }]
 *   }
 * }
 * ```
 */
export function validateIdeaId(ideaId: string): boolean {
  const result = UuidSchema.safeParse(ideaId);

  if (!result.success) {
    throw new ValidationError([
      { field: 'ideaId', message: 'Invalid UUID format' }
    ]);
  }

  return true;
}

/**
 * Validate the claim request body
 *
 * The body is optional - empty body or undefined is acceptable.
 * If body is provided, it must contain valid fields.
 *
 * @param body - The request body to validate (may be undefined, null, or empty object)
 * @returns Validated body with optional claimedBy
 * @throws ValidationError if body has invalid fields
 *
 * @example
 * ```typescript
 * // All valid:
 * validateClaimBody(undefined);           // { }
 * validateClaimBody({});                  // { }
 * validateClaimBody({ claimedBy: 'orch-1' }); // { claimedBy: 'orch-1' }
 *
 * // Invalid:
 * validateClaimBody({ claimedBy: '' });   // throws - empty string not allowed
 * validateClaimBody({ unknown: 'x' });    // throws - unknown field
 * ```
 */
export function validateClaimBody(body: unknown): { claimedBy?: string } {
  // Handle null/undefined/empty as valid empty body
  if (body === undefined || body === null) {
    return {};
  }

  // Parse with Zod
  const result = ClaimRequestBodySchema.safeParse(body);

  if (!result.success) {
    const details = result.error.errors.map(err => ({
      field: err.path.join('.') || 'body',
      message: err.message,
    }));
    throw new ValidationError(details);
  }

  return result.data;
}

/**
 * Validate a complete claim request (ideaId from URL + body)
 *
 * Combines UUID validation for the idea ID with body validation.
 *
 * @param ideaId - The idea ID from the URL path
 * @param body - The request body (may be undefined)
 * @returns Fully validated request with ideaId and optional claimedBy
 * @throws ValidationError if any validation fails
 *
 * @example
 * ```typescript
 * const validated = validateClaimRequest(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   { claimedBy: 'orchestrator-1' }
 * );
 * // { ideaId: '550e...', claimedBy: 'orchestrator-1' }
 * ```
 */
export function validateClaimRequest(
  ideaId: string,
  body: unknown
): ValidatedClaimRequest {
  // Validate UUID
  validateIdeaId(ideaId);

  // Validate body
  const validatedBody = validateClaimBody(body);

  return {
    ideaId,
    claimedBy: validatedBody.claimedBy,
  };
}
