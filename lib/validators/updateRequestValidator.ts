import { z } from 'zod';
import { IdeaStatusSchema, type IdeaStatus } from '@utmessa/shared';
import { validateUrls } from './urlValidator';

/**
 * Zod schema for UpdateIdeaRequest
 *
 * All fields are optional for partial updates.
 * Uses .strict() to reject unknown fields.
 */
const UpdateIdeaRequestSchema = z
  .object({
    status: IdeaStatusSchema.optional(),
    progress: z
      .number()
      .int('Progress must be an integer')
      .min(0, 'Progress cannot be negative')
      .max(100, 'Progress cannot exceed 100')
      .optional(),
    currentStep: z
      .string()
      .max(500, 'Current step cannot exceed 500 characters')
      .optional()
      .nullable(),
    currentFeature: z
      .string()
      .max(100, 'Current feature cannot exceed 100 characters')
      .optional()
      .nullable(),
    waitingQuestion: z
      .string()
      .max(1000, 'Waiting question cannot exceed 1000 characters')
      .optional()
      .nullable(),
    demoUrl: z.string().optional().nullable(),
    repoUrl: z.string().optional().nullable(),
  })
  .strict();

/**
 * Parsed update request type
 */
export type UpdateIdeaRequest = z.infer<typeof UpdateIdeaRequestSchema>;

/**
 * Validation result type
 */
export type ValidationResult =
  | {
      success: true;
      data: UpdateIdeaRequest;
    }
  | {
      success: false;
      errors: Array<{ field: string; message: string }>;
    };

/**
 * Convert Zod errors to field-level error objects
 */
function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.') || 'body',
    message: err.message,
  }));
}

/**
 * Validate an update request body
 *
 * Performs two-stage validation:
 * 1. Zod schema validation for types and ranges
 * 2. URL validation for security (prevents XSS)
 *
 * @param body - Raw request body (unknown)
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```typescript
 * // Valid request
 * const result = validateUpdateRequest({
 *   progress: 50,
 *   currentStep: 'Building F2',
 * });
 * if (result.success) {
 *   console.log(result.data.progress); // 50
 * }
 *
 * // Invalid request
 * const result = validateUpdateRequest({ progress: 150 });
 * if (!result.success) {
 *   console.log(result.errors); // [{ field: 'progress', message: '...' }]
 * }
 * ```
 */
export function validateUpdateRequest(body: unknown): ValidationResult {
  // Stage 1: Zod schema validation
  const zodResult = UpdateIdeaRequestSchema.safeParse(body);

  if (!zodResult.success) {
    return {
      success: false,
      errors: formatZodErrors(zodResult.error),
    };
  }

  const data = zodResult.data;

  // Stage 2: URL validation (security)
  const urlValidation = validateUrls({
    demoUrl: data.demoUrl,
    repoUrl: data.repoUrl,
  });

  if (!urlValidation.valid) {
    const urlErrors: Array<{ field: string; message: string }> = [];
    if (urlValidation.errors.demoUrl) {
      urlErrors.push({ field: 'demoUrl', message: urlValidation.errors.demoUrl });
    }
    if (urlValidation.errors.repoUrl) {
      urlErrors.push({ field: 'repoUrl', message: urlValidation.errors.repoUrl });
    }
    return {
      success: false,
      errors: urlErrors,
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * Validate idea ID format (UUID)
 *
 * @param ideaId - The idea ID to validate
 * @returns True if valid UUID format
 * @throws ValidationError if invalid format
 */
export function validateIdeaIdForUpdate(ideaId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(ideaId);
}

/**
 * Check if the request body is empty (no updates)
 *
 * @param body - Parsed request body
 * @returns True if no fields are being updated
 */
export function isEmptyUpdate(body: UpdateIdeaRequest): boolean {
  return (
    body.status === undefined &&
    body.progress === undefined &&
    body.currentStep === undefined &&
    body.currentFeature === undefined &&
    body.waitingQuestion === undefined &&
    body.demoUrl === undefined &&
    body.repoUrl === undefined
  );
}
