import { NextResponse } from 'next/server';
import type { Idea as DbIdea } from '../db/types';
import type { ClaimIdeaResponse } from '@utmessa/shared';

/**
 * Error response structure for consistent API errors
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Conflict error details for already-claimed responses
 */
export interface ConflictDetails {
  claimedAt: string;
  claimedBy: string | null;
  currentStatus: string;
}

/**
 * Format a successful claim response
 *
 * Maps database Idea to the ClaimIdeaResponse schema expected by clients.
 * Converts Date objects to ISO 8601 strings.
 *
 * @param idea - Database idea entity
 * @returns NextResponse with 200 status and formatted response
 *
 * @example
 * ```typescript
 * const dbIdea = await claimIdea(ideaId);
 * return formatSuccessResponse(dbIdea);
 * // Response: { id, token, title, ..., createdAt: "2026-01-27T10:00:00Z", ... }
 * ```
 */
export function formatSuccessResponse(idea: DbIdea): NextResponse<ClaimIdeaResponse> {
  const response: ClaimIdeaResponse = {
    id: idea.id,
    token: idea.token,
    title: idea.title,
    problem: idea.problem,
    email: idea.email ?? '', // Default to empty string if null
    status: idea.status as ClaimIdeaResponse['status'],
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt?.toISOString() ?? idea.createdAt.toISOString(),
    // Optional fields
    ...(idea.mustHaves && { mustHaves: idea.mustHaves }),
    ...(idea.progress !== null && idea.progress !== undefined && { progress: idea.progress }),
    ...(idea.currentStep && { currentStep: idea.currentStep }),
    ...(idea.currentFeature && { currentFeature: idea.currentFeature }),
    ...(idea.waitingQuestion && { waitingQuestion: idea.waitingQuestion }),
    ...(idea.demoUrl && { demoUrl: idea.demoUrl }),
    ...(idea.repoUrl && { repoUrl: idea.repoUrl }),
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * Format an error response with consistent structure
 *
 * @param statusCode - HTTP status code (400, 401, 404, 409, 500)
 * @param errorCode - Machine-readable error code (e.g., "NOT_FOUND", "CONFLICT")
 * @param message - Human-readable error message
 * @param details - Optional additional details (e.g., validation errors, conflict info)
 * @returns NextResponse with specified status and error payload
 *
 * @example
 * ```typescript
 * // 404 Not Found
 * return formatErrorResponse(404, 'NOT_FOUND', 'Idea not found');
 *
 * // 409 Conflict with details
 * return formatErrorResponse(409, 'ALREADY_CLAIMED', 'Idea already claimed', {
 *   claimedAt: '2026-01-27T10:00:00Z',
 *   claimedBy: 'orchestrator-1',
 * });
 * ```
 */
export function formatErrorResponse(
  statusCode: number,
  errorCode: string,
  message: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: errorCode,
    message,
    ...(details !== undefined && { details }),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Format a conflict response for already-claimed ideas
 *
 * Convenience wrapper for 409 Conflict responses with typed details.
 *
 * @param claimedAt - When the idea was claimed
 * @param claimedBy - Who claimed it (may be null)
 * @param currentStatus - Current status of the idea
 * @returns NextResponse with 409 status and conflict details
 *
 * @example
 * ```typescript
 * return formatConflictResponse(
 *   new Date('2026-01-27T10:00:00Z'),
 *   'orchestrator-1',
 *   'claimed'
 * );
 * ```
 */
export function formatConflictResponse(
  claimedAt: Date,
  claimedBy: string | null,
  currentStatus: string
): NextResponse<ErrorResponse> {
  const details: ConflictDetails = {
    claimedAt: claimedAt.toISOString(),
    claimedBy,
    currentStatus,
  };

  return formatErrorResponse(
    409,
    'ALREADY_CLAIMED',
    `Idea is not claimable. Current status: ${currentStatus}`,
    details
  );
}

/**
 * Format a validation error response
 *
 * @param details - Array of field-level validation errors
 * @returns NextResponse with 400 status
 */
export function formatValidationError(
  details: { field: string; message: string }[]
): NextResponse<ErrorResponse> {
  return formatErrorResponse(400, 'VALIDATION_ERROR', 'Request validation failed', details);
}

/**
 * Format an authentication error response
 *
 * @param message - Custom message (defaults to generic auth required message)
 * @returns NextResponse with 401 status
 */
export function formatAuthError(
  message: string = 'Invalid or missing X-ORCH-KEY header'
): NextResponse<ErrorResponse> {
  return formatErrorResponse(401, 'UNAUTHORIZED', message);
}

/**
 * Format a not found error response
 *
 * @param ideaId - The requested idea ID
 * @returns NextResponse with 404 status
 */
export function formatNotFoundError(ideaId: string): NextResponse<ErrorResponse> {
  return formatErrorResponse(404, 'NOT_FOUND', `Idea not found: ${ideaId}`);
}

/**
 * Format an internal server error response
 *
 * Note: Never expose internal error details to clients.
 *
 * @returns NextResponse with 500 status and safe error message
 */
export function formatInternalError(): NextResponse<ErrorResponse> {
  return formatErrorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
