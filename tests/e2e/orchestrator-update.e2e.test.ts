import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * E2E Tests for Orchestrator Status Update API
 *
 * Tests the complete orchestrator workflow for updating idea status and progress:
 * 1. Update progress during building
 * 2. Status transitions through the lifecycle
 * 3. Handling waiting state with questions
 * 4. Final deployment with URLs
 * 5. Error handling and edge cases
 */

// Mock dependencies
vi.mock('@/lib/auth/validateOrchKey', () => ({
  validateOrchKey: vi.fn(),
}));

vi.mock('@/lib/services/updateService', () => ({
  updateIdea: vi.fn(),
}));

import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { updateIdea } from '@/lib/services/updateService';
import { PATCH } from '../../app/api/ideas/[id]/update/route';

describe('Orchestrator Status Update E2E', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validOrchKey = 'test-orch-key-for-e2e-12345';

  // Base idea factory
  const createIdea = (overrides: Record<string, unknown> = {}) => ({
    id: validUuid,
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'My Awesome App',
    problem: 'Need to solve a complex problem',
    mustHaves: ['feature1', 'feature2', 'feature3'],
    email: 'user@example.com',
    status: 'running',
    progress: 0,
    currentStep: null,
    currentFeature: null,
    waitingQuestion: null,
    demoUrl: null,
    repoUrl: null,
    claimedBy: 'orchestrator-1',
    claimedAt: new Date('2026-01-27T10:00:00Z'),
    createdAt: new Date('2026-01-27T09:00:00Z'),
    updatedAt: new Date('2026-01-27T11:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ORCH_KEY = validOrchKey;
    (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.ORCH_KEY;
  });

  // Helper to create update request
  const createUpdateRequest = (body: object) => {
    return new NextRequest(`http://localhost/api/ideas/${validUuid}/update`, {
      method: 'PATCH',
      headers: { 'X-ORCH-KEY': validOrchKey },
      body: JSON.stringify(body),
    });
  };

  const createContext = () => ({
    params: Promise.resolve({ id: validUuid }),
  });

  describe('Complete Workflow: Claim → Build → Deploy', () => {
    it('transitions from claimed to running', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 0,
          currentStep: 'Starting build process',
          currentFeature: 'F1',
        }),
      });

      const request = createUpdateRequest({
        status: 'running',
        progress: 0,
        currentStep: 'Starting build process',
        currentFeature: 'F1',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('running');
      expect(body.progress).toBe(0);
      expect(body.currentFeature).toBe('F1');
    });

    it('updates progress during building', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 25,
          currentStep: 'Implementing feature F1',
          currentFeature: 'F1',
        }),
      });

      const request = createUpdateRequest({
        progress: 25,
        currentStep: 'Implementing feature F1',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.progress).toBe(25);
      expect(body.currentStep).toBe('Implementing feature F1');
    });

    it('handles waiting state with question', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'waiting',
          progress: 50,
          waitingQuestion:
            'Should I use PostgreSQL or MongoDB for the database?',
        }),
      });

      const request = createUpdateRequest({
        status: 'waiting',
        waitingQuestion: 'Should I use PostgreSQL or MongoDB for the database?',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('waiting');
      expect(body.waitingQuestion).toBe(
        'Should I use PostgreSQL or MongoDB for the database?'
      );
    });

    it('resumes from waiting to running', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 50,
          waitingQuestion: null,
          currentStep: 'Continuing with PostgreSQL',
        }),
      });

      const request = createUpdateRequest({
        status: 'running',
        waitingQuestion: null,
        currentStep: 'Continuing with PostgreSQL',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('running');
      expect(body).not.toHaveProperty('waitingQuestion');
    });

    it('transitions to deployed with URLs', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'deployed',
          progress: 100,
          demoUrl: 'https://my-app.vercel.app',
          repoUrl: 'https://github.com/user/my-app',
          currentStep: 'Deployment complete',
        }),
      });

      const request = createUpdateRequest({
        status: 'deployed',
        progress: 100,
        demoUrl: 'https://my-app.vercel.app',
        repoUrl: 'https://github.com/user/my-app',
        currentStep: 'Deployment complete',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('deployed');
      expect(body.progress).toBe(100);
      expect(body.demoUrl).toBe('https://my-app.vercel.app');
      expect(body.repoUrl).toBe('https://github.com/user/my-app');
    });
  });

  describe('Failure Scenarios', () => {
    it('transitions to failed from running', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'failed',
          progress: 30,
          currentStep: 'Build failed: TypeScript compilation errors',
        }),
      });

      const request = createUpdateRequest({
        status: 'failed',
        currentStep: 'Build failed: TypeScript compilation errors',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('failed');
    });

    it('transitions to failed from waiting', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'failed',
          currentStep: 'User did not respond in time',
        }),
      });

      const request = createUpdateRequest({
        status: 'failed',
        currentStep: 'User did not respond in time',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('failed');
    });
  });

  describe('Incremental Progress Updates', () => {
    it('allows updating feature marker', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 40,
          currentFeature: 'F2',
          currentStep: 'Starting feature F2',
        }),
      });

      const request = createUpdateRequest({
        currentFeature: 'F2',
        currentStep: 'Starting feature F2',
        progress: 40,
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.currentFeature).toBe('F2');
    });
  });

  describe('Idempotent Operations', () => {
    it('allows re-setting same status (deployed)', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'deployed',
          demoUrl: 'https://app.example.com',
        }),
      });

      const request = createUpdateRequest({
        status: 'deployed',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('deployed');
    });

    it('allows updating deployed idea URLs', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'deployed',
          demoUrl: 'https://new-url.example.com',
        }),
      });

      const request = createUpdateRequest({
        demoUrl: 'https://new-url.example.com',
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.demoUrl).toBe('https://new-url.example.com');
    });
  });

  describe('Error Cases', () => {
    it('rejects update without authentication', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = new NextRequest(
        `http://localhost/api/ideas/${validUuid}/update`,
        {
          method: 'PATCH',
          headers: {},
          body: JSON.stringify({ progress: 50 }),
        }
      );

      const response = await PATCH(request, createContext());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('rejects invalid UUID format', async () => {
      const request = new NextRequest(
        'http://localhost/api/ideas/not-a-uuid/update',
        {
          method: 'PATCH',
          headers: { 'X-ORCH-KEY': validOrchKey },
          body: JSON.stringify({ progress: 50 }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'not-a-uuid' }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('rejects submitted idea update (not claimed)', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'NOT_CLAIMED', currentStatus: 'submitted' },
      });

      const request = createUpdateRequest({ progress: 50 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('NOT_CLAIMED');
    });

    it('rejects progress outside valid range', async () => {
      const request = createUpdateRequest({ progress: 150 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('rejects javascript: URL (XSS prevention)', async () => {
      const request = createUpdateRequest({
        demoUrl: 'javascript:alert(document.cookie)',
      });

      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid status transition', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: {
          type: 'INVALID_TRANSITION',
          currentStatus: 'waiting',
          requestedStatus: 'deployed',
          allowedTransitions: ['running', 'failed'],
        },
      });

      const request = createUpdateRequest({
        status: 'deployed',
      });

      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('INVALID_TRANSITION');
      expect(body.details.currentStatus).toBe('waiting');
      expect(body.details.requestedStatus).toBe('deployed');
      expect(body.details.allowedTransitions).toEqual(['running', 'failed']);
    });

    it('returns 404 for non-existent idea', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'NOT_FOUND', ideaId: validUuid },
      });

      const request = createUpdateRequest({ progress: 50 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('NOT_FOUND');
    });
  });

  describe('Partial Updates', () => {
    it('updates only specified fields', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 40,
          currentStep: 'Old step',
          currentFeature: 'F1',
        }),
      });

      const request = createUpdateRequest({
        progress: 40,
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.progress).toBe(40);
      expect(body.currentStep).toBe('Old step');
      expect(body.currentFeature).toBe('F1');
    });

    it('clears fields with null', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          currentStep: null,
          currentFeature: null,
        }),
      });

      const request = createUpdateRequest({
        currentStep: null,
        currentFeature: null,
      });

      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).not.toHaveProperty('currentStep');
      expect(body).not.toHaveProperty('currentFeature');
    });

    it('accepts empty update (no-op)', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 50,
        }),
      });

      const request = createUpdateRequest({});
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.progress).toBe(50);
    });
  });

  describe('Timestamp Handling', () => {
    it('returns ISO 8601 formatted timestamps', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 60,
        }),
      });

      const request = createUpdateRequest({ progress: 60 });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
      expect(body.updatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
    });
  });

  describe('Service Integration', () => {
    it('passes correct parameters to updateIdea service', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createIdea({
          status: 'running',
          progress: 75,
          currentStep: 'Building F3',
          currentFeature: 'F3',
        }),
      });

      const request = createUpdateRequest({
        status: 'running',
        progress: 75,
        currentStep: 'Building F3',
        currentFeature: 'F3',
      });

      await PATCH(request, createContext());

      expect(updateIdea).toHaveBeenCalledWith(validUuid, {
        status: 'running',
        progress: 75,
        currentStep: 'Building F3',
        currentFeature: 'F3',
      });
    });
  });
});
