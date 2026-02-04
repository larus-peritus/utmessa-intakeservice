import { describe, it, expect } from 'vitest';
import {
  formatUpdateSuccessResponse,
  formatUpdateErrorResponse,
  formatUpdateNotFoundResponse,
  formatUpdateForbiddenResponse,
  formatInvalidTransitionResponse,
  formatUpdateValidationErrorResponse,
  formatUpdateAuthErrorResponse,
  formatUpdateInternalErrorResponse,
} from './update-response-formatter';
import type { Idea } from '../db/types';

describe('Update Response Formatter', () => {
  // Mock database idea for testing
  const mockDbIdea: Idea = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'Test Idea',
    problem: 'This is a test problem description for the idea.',
    mustHaves: ['feature1', 'feature2'],
    email: 'test@example.com',
    status: 'running',
    progress: 50,
    currentStep: 'Building feature F2',
    currentFeature: 'F2',
    waitingQuestion: null,
    demoUrl: null,
    repoUrl: null,
    claimedBy: 'orchestrator-1',
    claimedAt: new Date('2026-01-27T10:00:00Z'),
    createdAt: new Date('2026-01-27T09:00:00Z'),
    updatedAt: new Date('2026-01-27T11:00:00Z'),
  };

  describe('formatUpdateSuccessResponse', () => {
    it('returns NextResponse with 200 status', async () => {
      const response = formatUpdateSuccessResponse(mockDbIdea);
      expect(response.status).toBe(200);
    });

    it('maps all required fields correctly', async () => {
      const response = formatUpdateSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body.id).toBe(mockDbIdea.id);
      expect(body.token).toBe(mockDbIdea.token);
      expect(body.title).toBe(mockDbIdea.title);
      expect(body.problem).toBe(mockDbIdea.problem);
      expect(body.email).toBe(mockDbIdea.email);
      expect(body.status).toBe(mockDbIdea.status);
    });

    it('converts timestamps to ISO 8601 format', async () => {
      const response = formatUpdateSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body.createdAt).toBe('2026-01-27T09:00:00.000Z');
      expect(body.updatedAt).toBe('2026-01-27T11:00:00.000Z');
    });

    it('includes progress when present', async () => {
      const response = formatUpdateSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body.progress).toBe(50);
    });

    it('includes current activity fields when present', async () => {
      const response = formatUpdateSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body.currentStep).toBe('Building feature F2');
      expect(body.currentFeature).toBe('F2');
    });

    it('excludes null optional fields', async () => {
      const response = formatUpdateSuccessResponse(mockDbIdea);
      const body = await response.json();

      expect(body).not.toHaveProperty('waitingQuestion');
      expect(body).not.toHaveProperty('demoUrl');
      expect(body).not.toHaveProperty('repoUrl');
    });

    it('includes URLs when present', async () => {
      const ideaWithUrls: Idea = {
        ...mockDbIdea,
        status: 'deployed',
        demoUrl: 'https://demo.example.com',
        repoUrl: 'https://github.com/user/repo',
      };

      const response = formatUpdateSuccessResponse(ideaWithUrls);
      const body = await response.json();

      expect(body.demoUrl).toBe('https://demo.example.com');
      expect(body.repoUrl).toBe('https://github.com/user/repo');
    });

    it('handles null email by defaulting to empty string', async () => {
      const ideaNoEmail: Idea = {
        ...mockDbIdea,
        email: null,
      };

      const response = formatUpdateSuccessResponse(ideaNoEmail);
      const body = await response.json();

      expect(body.email).toBe('');
    });

    it('uses createdAt for updatedAt when null', async () => {
      const ideaNoUpdate: Idea = {
        ...mockDbIdea,
        updatedAt: null,
      };

      const response = formatUpdateSuccessResponse(ideaNoUpdate);
      const body = await response.json();

      expect(body.updatedAt).toBe(body.createdAt);
    });

    it('includes progress when 0', async () => {
      const ideaZeroProgress: Idea = {
        ...mockDbIdea,
        progress: 0,
      };

      const response = formatUpdateSuccessResponse(ideaZeroProgress);
      const body = await response.json();

      expect(body.progress).toBe(0);
    });

    it('excludes progress when null', async () => {
      const ideaNullProgress: Idea = {
        ...mockDbIdea,
        progress: null,
      };

      const response = formatUpdateSuccessResponse(ideaNullProgress);
      const body = await response.json();

      expect(body).not.toHaveProperty('progress');
    });
  });

  describe('formatUpdateErrorResponse', () => {
    it('returns NextResponse with specified status', async () => {
      const response = formatUpdateErrorResponse(404, 'NOT_FOUND', 'Not found');
      expect(response.status).toBe(404);
    });

    it('includes error code and message', async () => {
      const response = formatUpdateErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Invalid input'
      );
      const body = await response.json();

      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Invalid input');
    });

    it('includes details when provided', async () => {
      const details = { field: 'progress', reason: 'Out of range' };
      const response = formatUpdateErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Validation failed',
        details
      );
      const body = await response.json();

      expect(body.details).toEqual(details);
    });

    it('excludes details when not provided', async () => {
      const response = formatUpdateErrorResponse(
        500,
        'INTERNAL_ERROR',
        'Error'
      );
      const body = await response.json();

      expect(body).not.toHaveProperty('details');
    });
  });

  describe('formatUpdateNotFoundResponse', () => {
    it('returns 404 status', async () => {
      const response = formatUpdateNotFoundResponse('test-id');
      expect(response.status).toBe(404);
    });

    it('includes NOT_FOUND error code', async () => {
      const response = formatUpdateNotFoundResponse('test-id');
      const body = await response.json();

      expect(body.error).toBe('NOT_FOUND');
    });

    it('includes ideaId in message', async () => {
      const ideaId = '123e4567-e89b-12d3-a456-426614174001';
      const response = formatUpdateNotFoundResponse(ideaId);
      const body = await response.json();

      expect(body.message).toContain(ideaId);
    });
  });

  describe('formatUpdateForbiddenResponse', () => {
    it('returns 403 status', async () => {
      const response = formatUpdateForbiddenResponse('submitted');
      expect(response.status).toBe(403);
    });

    it('includes NOT_CLAIMED error code', async () => {
      const response = formatUpdateForbiddenResponse('submitted');
      const body = await response.json();

      expect(body.error).toBe('NOT_CLAIMED');
    });

    it('includes currentStatus in details', async () => {
      const response = formatUpdateForbiddenResponse('ready');
      const body = await response.json();

      expect(body.details.currentStatus).toBe('ready');
    });

    it('includes descriptive message', async () => {
      const response = formatUpdateForbiddenResponse('submitted');
      const body = await response.json();

      expect(body.message).toContain('submitted');
      expect(body.message).toContain('claimed');
    });
  });

  describe('formatInvalidTransitionResponse', () => {
    it('returns 400 status', async () => {
      const response = formatInvalidTransitionResponse('waiting', 'deployed', [
        'running',
        'failed',
      ]);
      expect(response.status).toBe(400);
    });

    it('includes INVALID_TRANSITION error code', async () => {
      const response = formatInvalidTransitionResponse('waiting', 'deployed', [
        'running',
        'failed',
      ]);
      const body = await response.json();

      expect(body.error).toBe('INVALID_TRANSITION');
    });

    it('includes transition details', async () => {
      const response = formatInvalidTransitionResponse('waiting', 'deployed', [
        'running',
        'failed',
      ]);
      const body = await response.json();

      expect(body.details).toEqual({
        currentStatus: 'waiting',
        requestedStatus: 'deployed',
        allowedTransitions: ['running', 'failed'],
      });
    });

    it('includes statuses in message', async () => {
      const response = formatInvalidTransitionResponse('claimed', 'deployed', [
        'running',
        'failed',
      ]);
      const body = await response.json();

      expect(body.message).toContain('claimed');
      expect(body.message).toContain('deployed');
    });
  });

  describe('formatUpdateValidationErrorResponse', () => {
    it('returns 400 status', async () => {
      const response = formatUpdateValidationErrorResponse([]);
      expect(response.status).toBe(400);
    });

    it('includes VALIDATION_ERROR code', async () => {
      const response = formatUpdateValidationErrorResponse([]);
      const body = await response.json();

      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('includes validation details', async () => {
      const details = [
        { field: 'progress', message: 'Must be between 0 and 100' },
        { field: 'demoUrl', message: 'Invalid URL format' },
      ];
      const response = formatUpdateValidationErrorResponse(details);
      const body = await response.json();

      expect(body.details).toEqual(details);
    });
  });

  describe('formatUpdateAuthErrorResponse', () => {
    it('returns 401 status', async () => {
      const response = formatUpdateAuthErrorResponse();
      expect(response.status).toBe(401);
    });

    it('includes UNAUTHORIZED error code', async () => {
      const response = formatUpdateAuthErrorResponse();
      const body = await response.json();

      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('uses default message when not provided', async () => {
      const response = formatUpdateAuthErrorResponse();
      const body = await response.json();

      expect(body.message).toBe('Invalid or missing X-ORCH-KEY header');
    });

    it('uses custom message when provided', async () => {
      const response = formatUpdateAuthErrorResponse('Custom auth error');
      const body = await response.json();

      expect(body.message).toBe('Custom auth error');
    });
  });

  describe('formatUpdateInternalErrorResponse', () => {
    it('returns 500 status', async () => {
      const response = formatUpdateInternalErrorResponse();
      expect(response.status).toBe(500);
    });

    it('includes INTERNAL_ERROR code', async () => {
      const response = formatUpdateInternalErrorResponse();
      const body = await response.json();

      expect(body.error).toBe('INTERNAL_ERROR');
    });

    it('returns safe generic message', async () => {
      const response = formatUpdateInternalErrorResponse();
      const body = await response.json();

      expect(body.message).toBe('An unexpected error occurred');
      expect(body.message).not.toContain('database');
      expect(body.message).not.toContain('connection');
    });

    it('does not include details', async () => {
      const response = formatUpdateInternalErrorResponse();
      const body = await response.json();

      expect(body).not.toHaveProperty('details');
    });
  });
});
