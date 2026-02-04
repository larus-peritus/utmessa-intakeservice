/**
 * Custom error types for claim operations
 *
 * These error classes provide typed, descriptive errors for the claim API.
 * Each error type maps to a specific HTTP status code and response format.
 */

/**
 * Error thrown when the requested idea does not exist
 *
 * Maps to HTTP 404 Not Found
 */
export class NotFoundError extends Error {
  public readonly ideaId: string;

  constructor(ideaId: string) {
    super(`Idea not found: ${ideaId}`);
    this.name = 'NotFoundError';
    this.ideaId = ideaId;
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, NotFoundError);
  }
}

/**
 * Error thrown when the idea has already been claimed
 *
 * Maps to HTTP 409 Conflict
 *
 * Contains details about the existing claim for the response:
 * - claimedAt: When the idea was claimed
 * - claimedBy: Who claimed it (may be null if not specified)
 */
export class ConflictError extends Error {
  public readonly claimedAt: Date;
  public readonly claimedBy: string | null;
  public readonly currentStatus: string;

  constructor(
    currentStatus: string,
    claimedAt: Date,
    claimedBy: string | null
  ) {
    const claimedByInfo = claimedBy ? ` by ${claimedBy}` : '';
    super(`Idea already claimed${claimedByInfo} at ${claimedAt.toISOString()}. Current status: ${currentStatus}`);
    this.name = 'ConflictError';
    this.claimedAt = claimedAt;
    this.claimedBy = claimedBy;
    this.currentStatus = currentStatus;
    Error.captureStackTrace(this, ConflictError);
  }
}

/**
 * Error thrown when authentication fails
 *
 * Maps to HTTP 401 Unauthorized
 *
 * Note: This error is separate from the validateOrchKey middleware
 * to provide a typed error for the claim flow specifically.
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    Error.captureStackTrace(this, AuthenticationError);
  }
}

/**
 * Error thrown when request validation fails
 *
 * Maps to HTTP 400 Bad Request
 */
export class ValidationError extends Error {
  public readonly details: { field: string; message: string }[];

  constructor(details: { field: string; message: string }[]) {
    const fieldList = details.map(d => d.field).join(', ');
    super(`Validation failed for: ${fieldList}`);
    this.name = 'ValidationError';
    this.details = details;
    Error.captureStackTrace(this, ValidationError);
  }
}
