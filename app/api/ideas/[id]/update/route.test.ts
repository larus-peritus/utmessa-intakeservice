import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from './route';

// Mock dependencies
vi.mock('@/lib/auth/validateOrchKey', () => ({
  validateOrchKey: vi.fn(),
}));

vi.mock('@/lib/services/updateService', () => ({
  updateIdea: vi.fn(),
}));

import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { updateIdea } from '@/lib/services/updateService';

describe('PATCH /api/ideas/[id]/update', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validOrchKey = 'test-orch-key-12345';

  // Mock updated idea
  const mockUpdatedIdea = {
    id: validUuid,
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'Test Idea',
    problem: 'Test problem description for the idea.',
    mustHaves: ['feature1', 'feature2'],
    email: 'test@example.com',
    status: 'running' as const,
    progress: 25,
    currentStep: 'Building feature F1',
    currentFeature: 'F1',
    waitingQuestion: null,
    demoUrl: null,
    repoUrl: null,
    claimedBy: 'orchestrator-1',
    claimedAt: new Date('2026-01-27T10:00:00Z'),
    createdAt: new Date('2026-01-27T09:00:00Z'),
    updatedAt: new Date('2026-01-27T11:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ORCH_KEY = validOrchKey;
    (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.ORCH_KEY;
  });

  // Helper to create request
  const createRequest = (
    body?: object,
    headers: Record<string, string> = { 'X-ORCH-KEY': validOrchKey }
  ) => {
    return new NextRequest(`http://localhost/api/ideas/${validUuid}/update`, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  // Helper to create context with params
  const createContext = (id: string = validUuid) => ({
    params: Promise.resolve({ id }),
  });

  describe('Authentication', () => {
    it('returns 401 without X-ORCH-KEY header', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = createRequest({ progress: 50 }, {});
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('returns 401 with invalid X-ORCH-KEY', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = createRequest({ progress: 50 }, { 'X-ORCH-KEY': 'invalid' });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(401);
    });

    it('proceeds with valid X-ORCH-KEY', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({ progress: 25 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
    });
  });

  describe('Request Validation', () => {
    it('returns 400 for invalid UUID', async () => {
      const request = new NextRequest('http://localhost/api/ideas/not-a-uuid/update', {
        method: 'PATCH',
        headers: { 'X-ORCH-KEY': validOrchKey },
        body: JSON.stringify({ progress: 50 }),
      });

      const response = await PATCH(request, createContext('not-a-uuid'));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: 'ideaId' })
      );
    });

    it('returns 400 for invalid JSON body', async () => {
      const request = new NextRequest(`http://localhost/api/ideas/${validUuid}/update`, {
        method: 'PATCH',
        headers: { 'X-ORCH-KEY': validOrchKey },
        body: 'invalid json',
      });

      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid progress value', async () => {
      const request = createRequest({ progress: 150 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid status value', async () => {
      const request = createRequest({ status: 'invalid-status' });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('accepts empty body', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = new NextRequest(`http://localhost/api/ideas/${validUuid}/update`, {
        method: 'PATCH',
        headers: { 'X-ORCH-KEY': validOrchKey },
        // No body
      });

      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
    });

    it('accepts empty object body', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({});
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
    });

    it('returns 400 for unknown fields', async () => {
      const request = createRequest({ unknownField: 'value' });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Success Response', () => {
    it('returns 200 with updated idea', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({ progress: 25 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(validUuid);
      expect(body.progress).toBe(25);
    });

    it('response includes all idea fields', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({ status: 'running', progress: 25 });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('problem');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('progress');
      expect(body).toHaveProperty('currentStep');
      expect(body).toHaveProperty('currentFeature');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
    });

    it('formats timestamps as ISO strings', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({ progress: 25 });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('excludes null optional fields', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({ progress: 25 });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body).not.toHaveProperty('waitingQuestion');
      expect(body).not.toHaveProperty('demoUrl');
      expect(body).not.toHaveProperty('repoUrl');
    });

    it('includes URLs when present', async () => {
      const ideaWithUrls = {
        ...mockUpdatedIdea,
        status: 'deployed' as const,
        demoUrl: 'https://demo.example.com',
        repoUrl: 'https://github.com/user/repo',
      };

      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: ideaWithUrls,
      });

      const request = createRequest({ status: 'deployed' });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body.demoUrl).toBe('https://demo.example.com');
      expect(body.repoUrl).toBe('https://github.com/user/repo');
    });
  });

  describe('Not Found Response', () => {
    it('returns 404 when idea does not exist', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'NOT_FOUND', ideaId: validUuid },
      });

      const request = createRequest({ progress: 50 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('NOT_FOUND');
      expect(body.message).toContain(validUuid);
    });
  });

  describe('Forbidden Response', () => {
    it('returns 403 when idea is not claimed (submitted)', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'NOT_CLAIMED', currentStatus: 'submitted' },
      });

      const request = createRequest({ progress: 50 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('NOT_CLAIMED');
      expect(body.details.currentStatus).toBe('submitted');
    });

    it('returns 403 when idea is not claimed (ready)', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'NOT_CLAIMED', currentStatus: 'ready' },
      });

      const request = createRequest({ progress: 50 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('NOT_CLAIMED');
      expect(body.details.currentStatus).toBe('ready');
    });

    it('includes descriptive message', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'NOT_CLAIMED', currentStatus: 'submitted' },
      });

      const request = createRequest({ progress: 50 });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body.message).toContain('submitted');
      expect(body.message).toContain('claimed');
    });
  });

  describe('Invalid Transition Response', () => {
    it('returns 400 for invalid status transition', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: {
          type: 'INVALID_TRANSITION',
          currentStatus: 'waiting',
          requestedStatus: 'deployed',
          allowedTransitions: ['running', 'failed'],
        },
      });

      const request = createRequest({ status: 'deployed' });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('INVALID_TRANSITION');
    });

    it('includes transition details', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: {
          type: 'INVALID_TRANSITION',
          currentStatus: 'waiting',
          requestedStatus: 'deployed',
          allowedTransitions: ['running', 'failed'],
        },
      });

      const request = createRequest({ status: 'deployed' });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body.details).toEqual({
        currentStatus: 'waiting',
        requestedStatus: 'deployed',
        allowedTransitions: ['running', 'failed'],
      });
    });

    it('includes statuses in message', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: {
          type: 'INVALID_TRANSITION',
          currentStatus: 'claimed',
          requestedStatus: 'deployed',
          allowedTransitions: ['running', 'failed'],
        },
      });

      const request = createRequest({ status: 'deployed' });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body.message).toContain('claimed');
      expect(body.message).toContain('deployed');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest({ progress: 50 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('INTERNAL_ERROR');
      expect(body.message).toBe('An unexpected error occurred');
    });

    it('does not expose internal error details', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('PostgreSQL: connection refused at localhost:5432')
      );

      const request = createRequest({ progress: 50 });
      const response = await PATCH(request, createContext());
      const body = await response.json();

      expect(body.message).not.toContain('PostgreSQL');
      expect(body.message).not.toContain('localhost');
      expect(body.message).not.toContain('5432');
    });
  });

  describe('Update Service Integration', () => {
    it('passes ideaId to update service', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({ progress: 50 });
      await PATCH(request, createContext());

      expect(updateIdea).toHaveBeenCalledWith(
        validUuid,
        expect.anything()
      );
    });

    it('passes update fields to service', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({
        status: 'running',
        progress: 25,
        currentStep: 'Building F1',
        currentFeature: 'F1',
      });
      await PATCH(request, createContext());

      expect(updateIdea).toHaveBeenCalledWith(
        validUuid,
        {
          status: 'running',
          progress: 25,
          currentStep: 'Building F1',
          currentFeature: 'F1',
        }
      );
    });

    it('passes empty object when no fields provided', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({});
      await PATCH(request, createContext());

      expect(updateIdea).toHaveBeenCalledWith(validUuid, {});
    });

    it('passes null values for nullable fields', async () => {
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockUpdatedIdea,
      });

      const request = createRequest({
        currentStep: null,
        currentFeature: null,
        waitingQuestion: null,
      });
      await PATCH(request, createContext());

      expect(updateIdea).toHaveBeenCalledWith(
        validUuid,
        {
          currentStep: null,
          currentFeature: null,
          waitingQuestion: null,
        }
      );
    });
  });

  describe('Partial Updates', () => {
    it('allows updating only progress', async () => {
      const idea = { ...mockUpdatedIdea, progress: 75 };
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea,
      });

      const request = createRequest({ progress: 75 });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.progress).toBe(75);
    });

    it('allows updating only status', async () => {
      const idea = { ...mockUpdatedIdea, status: 'waiting' as const };
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea,
      });

      const request = createRequest({ status: 'waiting' });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('waiting');
    });

    it('allows updating multiple fields', async () => {
      const idea = {
        ...mockUpdatedIdea,
        status: 'deployed' as const,
        progress: 100,
        demoUrl: 'https://demo.example.com',
        repoUrl: 'https://github.com/user/repo',
      };
      (updateIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea,
      });

      const request = createRequest({
        status: 'deployed',
        progress: 100,
        demoUrl: 'https://demo.example.com',
        repoUrl: 'https://github.com/user/repo',
      });
      const response = await PATCH(request, createContext());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('deployed');
      expect(body.progress).toBe(100);
      expect(body.demoUrl).toBe('https://demo.example.com');
      expect(body.repoUrl).toBe('https://github.com/user/repo');
    });
  });
});
