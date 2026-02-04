import { describe, it, expect } from 'vitest';
import {
  formatSuccessResponse,
  formatErrorResponse,
  formatConflictResponse,
  formatValidationError,
  formatAuthError,
  formatNotFoundError,
  formatInternalError,
} from './claim-response-formatter';
import type { Idea } from '../db/types';

describe('Claim Response Formatter', () => {
  // Mock database idea for testing
  const mockDbIdea: Idea = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'Test Idea',
    problem: 'This is a test problem description for the idea.',
    mustHaves: ['feature1', 'feature2'],
    email: 'test@example.com',
    status: 'claimed',
    progress: 0,
    currentStep: null,
    currentFeature: null,
    waitingQuestion: null,
    demoUrl: null,
    repoUrl: null,
    claimedBy: 'orchestrator-1',
    claimedAt: new Date('2026-01-27T10:00:00Z'),
    createdAt: new Date('2026-01-27T09:00:00Z'),
    updatedAt: new Date('2026-01-27T10:00:00Z'),
  };

  describe('formatSuccessResponse', () => {
    it('returns NextResponse with 200 status', async () => {
      const response = formatSuccessResponse(mockDbIdea);
      expect(response.status).toBe(200);
    });

    it('maps all required fields correctly', async () => {
      const response = formatSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body.id).toBe(mockDbIdea.id);
      expect(body.token).toBe(mockDbIdea.token);
      expect(body.title).toBe(mockDbIdea.title);
      expect(body.problem).toBe(mockDbIdea.problem);
      expect(body.email).toBe(mockDbIdea.email);
      expect(body.status).toBe(mockDbIdea.status);
    });

    it('converts timestamps to ISO 8601 format', async () => {
      const response = formatSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body.createdAt).toBe('2026-01-27T09:00:00.000Z');
      expect(body.updatedAt).toBe('2026-01-27T10:00:00.000Z');
    });

    it('includes optional fields when present', async () => {
      const response = formatSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body.mustHaves).toEqual(['feature1', 'feature2']);
      expect(body.progress).toBe(0);
    });

    it('excludes optional fields when null', async () => {
      const ideaWithNulls: Idea = {
        ...mockDbIdea,
        progress: null,
        currentStep: null,
        demoUrl: null,
      };

      const response = formatSuccessResponse(ideaWithNulls);
      const body = await response.json();

      expect(body).not.toHaveProperty('currentStep');
      expect(body).not.toHaveProperty('demoUrl');
    });

    it('uses createdAt for updatedAt when updatedAt is null', async () => {
      const ideaNoUpdate: Idea = {
        ...mockDbIdea,
        updatedAt: null,
      };

      const response = formatSuccessResponse(ideaNoUpdate);
      const body = await response.json();

      expect(body.updatedAt).toBe(body.createdAt);
    });

    it('handles null email by defaulting to empty string', async () => {
      const ideaNoEmail: Idea = {
        ...mockDbIdea,
        email: null,
      };

      const response = formatSuccessResponse(ideaNoEmail);
      const body = await response.json();

      expect(body.email).toBe('');
    });

    it('includes demoUrl and repoUrl when present', async () => {
      const ideaWithUrls: Idea = {
        ...mockDbIdea,
        demoUrl: 'https://demo.example.com',
        repoUrl: 'https://github.com/example/repo',
      };

      const response = formatSuccessResponse(ideaWithUrls);
      const body = await response.json();

      expect(body.demoUrl).toBe('https://demo.example.com');
      expect(body.repoUrl).toBe('https://github.com/example/repo');
    });
  });

  describe('formatErrorResponse', () => {
    it('returns NextResponse with specified status', async () => {
      const response = formatErrorResponse(404, 'NOT_FOUND', 'Not found');
      expect(response.status).toBe(404);
    });

    it('includes error code and message', async () => {
      const response = formatErrorResponse(400, 'BAD_REQUEST', 'Invalid input');
      const body = await response.json();

      expect(body.error).toBe('BAD_REQUEST');
      expect(body.message).toBe('Invalid input');
    });

    it('includes details when provided', async () => {
      const details = { field: 'ideaId', reason: 'Invalid UUID' };
      const response = formatErrorResponse(400, 'VALIDATION_ERROR', 'Validation failed', details);
      const body = await response.json();

      expect(body.details).toEqual(details);
    });

    it('excludes details when not provided', async () => {
      const response = formatErrorResponse(500, 'INTERNAL_ERROR', 'Error');
      const body = await response.json();

      expect(body).not.toHaveProperty('details');
    });

    it('handles various status codes', async () => {
      expect(formatErrorResponse(400, 'E', 'M').status).toBe(400);
      expect(formatErrorResponse(401, 'E', 'M').status).toBe(401);
      expect(formatErrorResponse(403, 'E', 'M').status).toBe(403);
      expect(formatErrorResponse(404, 'E', 'M').status).toBe(404);
      expect(formatErrorResponse(409, 'E', 'M').status).toBe(409);
      expect(formatErrorResponse(500, 'E', 'M').status).toBe(500);
    });
  });

  describe('formatConflictResponse', () => {
    it('returns 409 status', async () => {
      const response = formatConflictResponse(
        new Date('2026-01-27T10:00:00Z'),
        'orchestrator-1',
        'claimed'
      );
      expect(response.status).toBe(409);
    });

    it('includes ALREADY_CLAIMED error code', async () => {
      const response = formatConflictResponse(
        new Date('2026-01-27T10:00:00Z'),
        'orchestrator-1',
        'claimed'
      );
      const body = await response.json();

      expect(body.error).toBe('ALREADY_CLAIMED');
    });

    it('includes conflict details', async () => {
      const claimedAt = new Date('2026-01-27T10:00:00Z');
      const response = formatConflictResponse(claimedAt, 'orchestrator-1', 'running');
      const body = await response.json();

      expect(body.details).toEqual({
        claimedAt: '2026-01-27T10:00:00.000Z',
        claimedBy: 'orchestrator-1',
        currentStatus: 'running',
      });
    });

    it('handles null claimedBy', async () => {
      const response = formatConflictResponse(
        new Date('2026-01-27T10:00:00Z'),
        null,
        'claimed'
      );
      const body = await response.json();

      expect(body.details.claimedBy).toBeNull();
    });

    it('includes current status in message', async () => {
      const response = formatConflictResponse(
        new Date('2026-01-27T10:00:00Z'),
        'orch',
        'running'
      );
      const body = await response.json();

      expect(body.message).toContain('running');
    });
  });

  describe('formatValidationError', () => {
    it('returns 400 status', async () => {
      const response = formatValidationError([{ field: 'test', message: 'error' }]);
      expect(response.status).toBe(400);
    });

    it('includes VALIDATION_ERROR code', async () => {
      const response = formatValidationError([]);
      const body = await response.json();

      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('includes validation details', async () => {
      const details = [
        { field: 'ideaId', message: 'Invalid UUID format' },
        { field: 'claimedBy', message: 'Must be a string' },
      ];
      const response = formatValidationError(details);
      const body = await response.json();

      expect(body.details).toEqual(details);
    });
  });

  describe('formatAuthError', () => {
    it('returns 401 status', async () => {
      const response = formatAuthError();
      expect(response.status).toBe(401);
    });

    it('includes UNAUTHORIZED error code', async () => {
      const response = formatAuthError();
      const body = await response.json();

      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('uses default message when not provided', async () => {
      const response = formatAuthError();
      const body = await response.json();

      expect(body.message).toBe('Invalid or missing X-ORCH-KEY header');
    });

    it('uses custom message when provided', async () => {
      const response = formatAuthError('Custom auth error');
      const body = await response.json();

      expect(body.message).toBe('Custom auth error');
    });
  });

  describe('formatNotFoundError', () => {
    it('returns 404 status', async () => {
      const response = formatNotFoundError('test-id');
      expect(response.status).toBe(404);
    });

    it('includes NOT_FOUND error code', async () => {
      const response = formatNotFoundError('test-id');
      const body = await response.json();

      expect(body.error).toBe('NOT_FOUND');
    });

    it('includes ideaId in message', async () => {
      const ideaId = '123e4567-e89b-12d3-a456-426614174001';
      const response = formatNotFoundError(ideaId);
      const body = await response.json();

      expect(body.message).toContain(ideaId);
    });
  });

  describe('formatInternalError', () => {
    it('returns 500 status', async () => {
      const response = formatInternalError();
      expect(response.status).toBe(500);
    });

    it('includes INTERNAL_ERROR code', async () => {
      const response = formatInternalError();
      const body = await response.json();

      expect(body.error).toBe('INTERNAL_ERROR');
    });

    it('returns safe generic message', async () => {
      const response = formatInternalError();
      const body = await response.json();

      expect(body.message).toBe('An unexpected error occurred');
      // Should not contain any sensitive information
      expect(body.message).not.toContain('database');
      expect(body.message).not.toContain('connection');
      expect(body.message).not.toContain('stack');
    });

    it('does not include details', async () => {
      const response = formatInternalError();
      const body = await response.json();

      expect(body).not.toHaveProperty('details');
    });
  });
});
