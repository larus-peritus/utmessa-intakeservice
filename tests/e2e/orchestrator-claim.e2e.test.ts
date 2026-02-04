import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as claimEndpoint } from '@/app/api/ideas/[id]/claim/route';

/**
 * End-to-End Tests for Orchestrator Claim Flow
 *
 * These tests simulate the complete orchestrator workflow from the perspective
 * of an orchestrator service interacting with the Intake API.
 *
 * Test scenarios:
 * 1. Full claim workflow (create idea → claim → verify claimed)
 * 2. Authentication flow (various auth scenarios)
 * 3. Error handling (not found, already claimed, invalid inputs)
 */

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

describe('Orchestrator Claim E2E Flow', () => {
  const validOrchKey = 'e2e-test-orch-key-secret';

  // Sample idea IDs for testing
  const testIdeaId = '550e8400-e29b-41d4-a716-446655440000';
  const nonExistentIdeaId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  // Sample claimed idea
  const createDbIdea = (overrides: Partial<{
    id: string;
    status: string;
    claimedBy: string | null;
    claimedAt: Date | null;
  }> = {}) => ({
    id: overrides.id ?? testIdeaId,
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'Test Idea for E2E',
    problem: 'This is a test problem for e2e testing.',
    mustHaves: ['auth', 'dashboard'],
    email: 'e2e-test@example.com',
    status: overrides.status ?? 'claimed',
    progress: null,
    currentStep: null,
    currentFeature: null,
    waitingQuestion: null,
    demoUrl: null,
    repoUrl: null,
    claimedBy: overrides.claimedBy ?? 'e2e-orchestrator',
    claimedAt: overrides.claimedAt ?? new Date(),
    createdAt: new Date('2026-01-27T09:00:00Z'),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ORCH_KEY = validOrchKey;
    (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  afterEach(() => {
    delete process.env.ORCH_KEY;
  });

  // Helper to create claim request
  const createClaimRequest = (
    ideaId: string,
    body?: object,
    headers: Record<string, string> = { 'X-ORCH-KEY': validOrchKey }
  ) => {
    return new NextRequest(`http://localhost/api/ideas/${ideaId}/claim`, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  // Helper to create context with params
  const createContext = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  describe('Full Claim Workflow', () => {
    it('successfully claims a submitted idea', async () => {
      // Setup: Idea exists and is claimable
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createDbIdea({ status: 'claimed', claimedBy: 'e2e-orchestrator' }),
      });

      // Execute: Orchestrator claims the idea
      const request = createClaimRequest(testIdeaId, {
        claimedBy: 'e2e-orchestrator',
      });
      const response = await claimEndpoint(request, createContext(testIdeaId));

      // Verify: Response indicates success
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.id).toBe(testIdeaId);
      expect(body.status).toBe('claimed');
      expect(body.token).toBeDefined();
    });

    it('claimed idea has correct response schema', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createDbIdea(),
      });

      const request = createClaimRequest(testIdeaId, {
        claimedBy: 'e2e-orchestrator',
      });
      const response = await claimEndpoint(request, createContext(testIdeaId));
      const body = await response.json();

      // Verify all expected fields are present
      expect(body).toMatchObject({
        id: expect.any(String),
        token: expect.any(String),
        title: expect.any(String),
        problem: expect.any(String),
        email: expect.any(String),
        status: expect.any(String),
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });

    it('subsequent claim attempt returns conflict', async () => {
      // First claim succeeds
      (claimIdea as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          success: true,
          idea: createDbIdea({ claimedBy: 'first-orchestrator' }),
        })
        // Second claim fails with conflict
        .mockResolvedValueOnce({
          success: false,
          error: new ConflictError('claimed', new Date(), 'first-orchestrator'),
        });

      // First orchestrator claims successfully
      const request1 = createClaimRequest(testIdeaId, {
        claimedBy: 'first-orchestrator',
      });
      const response1 = await claimEndpoint(request1, createContext(testIdeaId));
      expect(response1.status).toBe(200);

      // Second orchestrator gets conflict
      const request2 = createClaimRequest(testIdeaId, {
        claimedBy: 'second-orchestrator',
      });
      const response2 = await claimEndpoint(request2, createContext(testIdeaId));
      expect(response2.status).toBe(409);

      const conflictBody = await response2.json();
      expect(conflictBody.error).toBe('ALREADY_CLAIMED');
      expect(conflictBody.details.claimedBy).toBe('first-orchestrator');
    });

    it('claim without claimedBy is allowed', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createDbIdea({ claimedBy: null }),
      });

      const request = createClaimRequest(testIdeaId, {});
      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(200);
      expect(claimIdea).toHaveBeenCalledWith(testIdeaId, undefined);
    });
  });

  describe('Authentication Flow', () => {
    it('rejects request without X-ORCH-KEY header', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = createClaimRequest(testIdeaId, { claimedBy: 'orch' }, {});
      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('rejects request with wrong X-ORCH-KEY', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = createClaimRequest(
        testIdeaId,
        { claimedBy: 'orch' },
        { 'X-ORCH-KEY': 'wrong-secret' }
      );
      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(401);
    });

    it('accepts request with correct X-ORCH-KEY', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createDbIdea(),
      });

      const request = createClaimRequest(testIdeaId, { claimedBy: 'orch' });
      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(200);
    });

    it('validates auth before processing request', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      // Even with valid request body, should reject first
      const request = createClaimRequest(testIdeaId, { claimedBy: 'orch' }, {});
      await claimEndpoint(request, createContext(testIdeaId));

      // claimIdea should never be called if auth fails
      expect(claimIdea).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Not Found', () => {
    it('returns 404 for non-existent idea', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: new NotFoundError(nonExistentIdeaId),
      });

      const request = createClaimRequest(nonExistentIdeaId, { claimedBy: 'orch' });
      const response = await claimEndpoint(
        request,
        createContext(nonExistentIdeaId)
      );

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe('NOT_FOUND');
      expect(body.message).toContain(nonExistentIdeaId);
    });
  });

  describe('Error Handling - Already Claimed', () => {
    it('returns 409 with conflict details', async () => {
      const claimedAt = new Date('2026-01-27T10:00:00Z');
      const claimedBy = 'original-orchestrator';

      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: new ConflictError('running', claimedAt, claimedBy),
      });

      const request = createClaimRequest(testIdeaId, { claimedBy: 'new-orch' });
      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(409);

      const body = await response.json();
      expect(body.error).toBe('ALREADY_CLAIMED');
      expect(body.details).toEqual({
        claimedAt: '2026-01-27T10:00:00.000Z',
        claimedBy: 'original-orchestrator',
        currentStatus: 'running',
      });
    });

    it('handles null claimedBy in conflict response', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: new ConflictError('claimed', new Date(), null),
      });

      const request = createClaimRequest(testIdeaId, { claimedBy: 'orch' });
      const response = await claimEndpoint(request, createContext(testIdeaId));
      const body = await response.json();

      expect(body.details.claimedBy).toBeNull();
    });
  });

  describe('Error Handling - Invalid Inputs', () => {
    it('returns 400 for invalid UUID format', async () => {
      const invalidId = 'not-a-valid-uuid';

      const request = createClaimRequest(invalidId, { claimedBy: 'orch' });
      const response = await claimEndpoint(request, createContext(invalidId));

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: 'ideaId' })
      );
    });

    it('returns 400 for empty claimedBy string', async () => {
      const request = createClaimRequest(testIdeaId, { claimedBy: '' });
      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.details).toContainEqual(
        expect.objectContaining({ field: 'claimedBy' })
      );
    });

    it('returns 400 for malformed JSON body', async () => {
      const request = new NextRequest(
        `http://localhost/api/ideas/${testIdeaId}/claim`,
        {
          method: 'POST',
          headers: { 'X-ORCH-KEY': validOrchKey },
          body: 'this is not valid json',
        }
      );

      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling - Server Errors', () => {
    it('returns 500 for database errors without exposing details', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('PostgreSQL: connection refused at localhost:5432')
      );

      const request = createClaimRequest(testIdeaId, { claimedBy: 'orch' });
      const response = await claimEndpoint(request, createContext(testIdeaId));

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('INTERNAL_ERROR');
      expect(body.message).toBe('An unexpected error occurred');
      // Should not expose internal details
      expect(body.message).not.toContain('PostgreSQL');
      expect(body.message).not.toContain('5432');
    });
  });

  describe('Orchestrator Integration Scenarios', () => {
    it('orchestrator can claim and identify itself', async () => {
      const orchestratorId = 'orchestrator-booth-42';

      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createDbIdea({ claimedBy: orchestratorId }),
      });

      const request = createClaimRequest(testIdeaId, {
        claimedBy: orchestratorId,
      });
      await claimEndpoint(request, createContext(testIdeaId));

      // Verify orchestrator ID was passed to service
      expect(claimIdea).toHaveBeenCalledWith(testIdeaId, orchestratorId);
    });

    it('response includes token for receipt URL construction', async () => {
      const receiptToken = 'receipt-token-abc123';

      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: { ...createDbIdea(), token: receiptToken },
      });

      const request = createClaimRequest(testIdeaId, { claimedBy: 'orch' });
      const response = await claimEndpoint(request, createContext(testIdeaId));
      const body = await response.json();

      expect(body.token).toBe(receiptToken);
    });

    it('response timestamps are ISO 8601 formatted', async () => {
      (claimIdea as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        idea: createDbIdea(),
      });

      const request = createClaimRequest(testIdeaId, { claimedBy: 'orch' });
      const response = await claimEndpoint(request, createContext(testIdeaId));
      const body = await response.json();

      // Verify ISO 8601 format with timezone
      expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });
});
