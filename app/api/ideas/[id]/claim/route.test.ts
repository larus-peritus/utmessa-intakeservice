import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/auth/validateOrchKey', () => ({
  validateOrchKey: vi.fn(),
}));

vi.mock('@/lib/services/claimService', () => ({
  claimIdea: vi.fn(),
}));

import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { claimIdea } from '@/lib/services/claimService';
import { NotFoundError, ConflictError } from '@/lib/errors/claim-errors';

describe('POST /api/ideas/[id]/claim', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validOrchKey = 'test-orch-key-12345';

  // Mock claimed idea
  const mockClaimedIdea = {
    id: validUuid,
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'Test Idea',
    problem: 'Test problem description for the idea.',
    mustHaves: ['feature1', 'feature2'],
    email: 'test@example.com',
    status: 'claimed',
    progress: null,
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
    return new NextRequest(`http://localhost/api/ideas/${validUuid}/claim`, {
      method: 'POST',
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

      const request = createRequest({ claimedBy: 'orch-1' }, {});
      const response = await POST(request, createContext());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('returns 401 with invalid X-ORCH-KEY', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = createRequest({ claimedBy: 'orch-1' }, { 'X-ORCH-KEY': 'invalid' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(401);
    });

    it('proceeds with valid X-ORCH-KEY', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockClaimedIdea,
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
    });
  });

  describe('Request Validation', () => {
    it('returns 400 for invalid UUID', async () => {
      const request = new NextRequest('http://localhost/api/ideas/not-a-uuid/claim', {
        method: 'POST',
        headers: { 'X-ORCH-KEY': validOrchKey },
        body: JSON.stringify({ claimedBy: 'orch-1' }),
      });

      const response = await POST(request, createContext('not-a-uuid'));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: 'ideaId' })
      );
    });

    it('returns 400 for invalid JSON body', async () => {
      const request = new NextRequest(`http://localhost/api/ideas/${validUuid}/claim`, {
        method: 'POST',
        headers: { 'X-ORCH-KEY': validOrchKey },
        body: 'invalid json',
      });

      const response = await POST(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for empty claimedBy', async () => {
      const request = createRequest({ claimedBy: '' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: 'claimedBy' })
      );
    });

    it('accepts empty body', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: { ...mockClaimedIdea, claimedBy: null },
      });

      const request = new NextRequest(`http://localhost/api/ideas/${validUuid}/claim`, {
        method: 'POST',
        headers: { 'X-ORCH-KEY': validOrchKey },
        // No body
      });

      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
    });

    it('accepts empty object body', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: { ...mockClaimedIdea, claimedBy: null },
      });

      const request = createRequest({});
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
    });
  });

  describe('Success Response', () => {
    it('returns 200 with claimed idea', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockClaimedIdea,
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(validUuid);
      expect(body.status).toBe('claimed');
    });

    it('response includes all idea fields', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockClaimedIdea,
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());
      const body = await response.json();

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('problem');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
    });

    it('formats timestamps as ISO strings', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockClaimedIdea,
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());
      const body = await response.json();

      expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('Not Found Response', () => {
    it('returns 404 when idea does not exist', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: new NotFoundError(validUuid),
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('NOT_FOUND');
      expect(body.message).toContain(validUuid);
    });
  });

  describe('Conflict Response', () => {
    it('returns 409 when idea is already claimed', async () => {
      const claimedAt = new Date('2026-01-27T08:00:00Z');
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: new ConflictError('claimed', claimedAt, 'other-orchestrator'),
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe('ALREADY_CLAIMED');
    });

    it('includes conflict details in 409 response', async () => {
      const claimedAt = new Date('2026-01-27T08:00:00Z');
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: new ConflictError('running', claimedAt, 'other-orchestrator'),
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());
      const body = await response.json();

      expect(body.details).toBeDefined();
      expect(body.details.claimedAt).toBe('2026-01-27T08:00:00.000Z');
      expect(body.details.claimedBy).toBe('other-orchestrator');
      expect(body.details.currentStatus).toBe('running');
    });

    it('handles null claimedBy in conflict', async () => {
      const claimedAt = new Date('2026-01-27T08:00:00Z');
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: new ConflictError('claimed', claimedAt, null),
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());
      const body = await response.json();

      expect(body.details.claimedBy).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('INTERNAL_ERROR');
      expect(body.message).toBe('An unexpected error occurred');
    });

    it('does not expose internal error details', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('PostgreSQL: connection refused at localhost:5432')
      );

      const request = createRequest({ claimedBy: 'orch-1' });
      const response = await POST(request, createContext());
      const body = await response.json();

      expect(body.message).not.toContain('PostgreSQL');
      expect(body.message).not.toContain('localhost');
      expect(body.message).not.toContain('5432');
    });
  });

  describe('Claim Service Integration', () => {
    it('passes ideaId to claim service', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockClaimedIdea,
      });

      const request = createRequest({ claimedBy: 'orch-1' });
      await POST(request, createContext());

      expect(claimIdea).toHaveBeenCalledWith(
        validUuid,
        expect.anything()
      );
    });

    it('passes claimedBy to claim service', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: mockClaimedIdea,
      });

      const request = createRequest({ claimedBy: 'my-orchestrator-id' });
      await POST(request, createContext());

      expect(claimIdea).toHaveBeenCalledWith(
        validUuid,
        'my-orchestrator-id'
      );
    });

    it('passes undefined claimedBy when not provided', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: { ...mockClaimedIdea, claimedBy: null },
      });

      const request = createRequest({});
      await POST(request, createContext());

      expect(claimIdea).toHaveBeenCalledWith(
        validUuid,
        undefined
      );
    });
  });
});
