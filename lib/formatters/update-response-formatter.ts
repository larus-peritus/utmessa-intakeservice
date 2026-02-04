import { NextResponse } from 'next/server';
import type { Idea as DbIdea } from '../db/types';
import type { IdeaStatus, UpdateIdeaResponse } from '@utmessa/shared';

/**
 * Error response structure for consistent API errors
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Invalid transition error details
 */
export interface TransitionErrorDetails {
  currentStatus: IdeaStatus;
  requestedStatus: IdeaStatus;
  allowedTransitions: IdeaStatus[];
}

/**
 * Format a successful update response
 *
 * Maps database Idea to the UpdateIdeaResponse schema expected by clients.
 * Converts Date objects to ISO 8601 strings.
 *
 * @param idea - Database idea entity
 * @returns NextResponse with 200 status and formatted response
 */
export function formatUpdateSuccessResponse(
  idea: DbIdea
): NextResponse<UpdateIdeaResponse> {
  const response: UpdateIdeaResponse = {
    id: idea.id,
    token: idea.token,
    title: idea.title,
    problem: idea.problem,
    email: idea.email ?? '',
    status: idea.status as UpdateIdeaResponse['status'],
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt?.toISOString() ?? idea.createdAt.toISOString(),
    // Optional fields - include when present
    ...(idea.mustHaves && { mustHaves: idea.mustHaves }),
    ...(idea.progress !== null &&
      idea.progress !== undefined && { progress: idea.progress }),
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
 */
export function formatUpdateErrorResponse(
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
 * Format a 404 Not Found response
 */
export function formatUpdateNotFoundResponse(
  ideaId: string
): NextResponse<ErrorResponse> {
  return formatUpdateErrorResponse(
    404,
    'NOT_FOUND',
    `Idea not found: ${ideaId}`
  );
}

/**
 * Format a 403 Forbidden response for unclaimed ideas
 */
export function formatUpdateForbiddenResponse(
  currentStatus: IdeaStatus
): NextResponse<ErrorResponse> {
  return formatUpdateErrorResponse(
    403,
    'NOT_CLAIMED',
    `Cannot update idea with status '${currentStatus}'. Idea must be claimed first.`,
    { currentStatus }
  );
}

/**
 * Format a 400 Bad Request response for invalid status transition
 */
export function formatInvalidTransitionResponse(
  currentStatus: IdeaStatus,
  requestedStatus: IdeaStatus,
  allowedTransitions: IdeaStatus[]
): NextResponse<ErrorResponse> {
  return formatUpdateErrorResponse(
    400,
    'INVALID_TRANSITION',
    `Cannot transition from '${currentStatus}' to '${requestedStatus}'`,
    {
      currentStatus,
      requestedStatus,
      allowedTransitions,
    } as TransitionErrorDetails
  );
}

/**
 * Format a 400 Bad Request response for validation errors
 */
export function formatUpdateValidationErrorResponse(
  details: { field: string; message: string }[]
): NextResponse<ErrorResponse> {
  return formatUpdateErrorResponse(
    400,
    'VALIDATION_ERROR',
    'Request validation failed',
    details
  );
}

/**
 * Format a 401 Unauthorized response
 */
export function formatUpdateAuthErrorResponse(
  message: string = 'Invalid or missing X-ORCH-KEY header'
): NextResponse<ErrorResponse> {
  return formatUpdateErrorResponse(401, 'UNAUTHORIZED', message);
}

/**
 * Format a 500 Internal Server Error response
 *
 * Note: Never expose internal error details to clients
 */
export function formatUpdateInternalErrorResponse(): NextResponse<ErrorResponse> {
  return formatUpdateErrorResponse(
    500,
    'INTERNAL_ERROR',
    'An unexpected error occurred'
  );
}
