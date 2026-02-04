import { z } from 'zod';
import { IDEA_STATUSES } from '@utmessa/shared';
import type { IdeaStatus } from '@utmessa/shared';

/**
 * Zod schema for list ideas query parameters with defaults
 */
export const ListIdeasParamsSchema = z.object({
  status: z.string().optional().default('submitted,ready'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sort: z.enum(['createdAt']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Custom validation error with additional context
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public validStatuses?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validated list ideas parameters
 */
export interface ValidatedListIdeasParams {
  statuses: IdeaStatus[];
  limit: number;
  offset: number;
  sort: 'createdAt';
  order: 'asc' | 'desc';
}

/**
 * Parse and validate query parameters for listing ideas
 *
 * @param searchParams - URLSearchParams from the request
 * @returns Validated and typed parameters
 * @throws ValidationError if status values are invalid
 * @throws ZodError if other parameters are invalid
 *
 * @example
 * ```typescript
 * const params = validateListIdeasParams(request.nextUrl.searchParams);
 * // Returns: { statuses: ['submitted', 'ready'], limit: 50, offset: 0, sort: 'createdAt', order: 'asc' }
 * ```
 */
export function validateListIdeasParams(
  searchParams: URLSearchParams
): ValidatedListIdeasParams {
  // Parse with Zod (applies defaults)
  const params = ListIdeasParamsSchema.parse({
    status: searchParams.get('status') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    sort: searchParams.get('sort') || undefined,
    order: searchParams.get('order') || undefined,
  });

  // Parse status into array
  const statusArray = params.status
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Validate each status value against IdeaStatus enum
  const validStatuses = IDEA_STATUSES;
  const invalidStatuses = statusArray.filter(
    (s) => !validStatuses.includes(s as IdeaStatus)
  );

  if (invalidStatuses.length > 0) {
    throw new ValidationError(
      `Invalid status value(s): ${invalidStatuses.join(', ')}`,
      validStatuses
    );
  }

  return {
    statuses: statusArray as IdeaStatus[],
    limit: params.limit,
    offset: params.offset,
    sort: params.sort,
    order: params.order,
  };
}
