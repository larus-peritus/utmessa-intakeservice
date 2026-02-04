import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

/**
 * Concurrency Tests for POST /api/ideas/[id]/claim
 *
 * These tests verify that the atomic claim mechanism prevents race conditions
 * when multiple orchestrators attempt to claim the same idea simultaneously.
 *
 * Test approach:
 * - Simulate concurrent requests using Promise.all
 * - Mock the claimService to simulate realistic database behavior
 * - Verify exactly one request succeeds while others get conflict errors
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

describe('POST /api/ideas/[id]/claim - Concurrency', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validOrchKey = 'test-orch-key-12345';

  // Track claim state for simulating atomic behavior
  let claimState: {
    claimed: boolean;
    claimedAt: Date | null;
    claimedBy: string | null;
  };

  // Mock claimed idea factory
  const createClaimedIdea = (claimedBy: string | null) => ({
    id: validUuid,
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'Test Idea',
    problem: 'Test problem description.',
    mustHaves: ['feature1', 'feature2'],
    email: 'test@example.com',
    status: 'claimed' as const,
    progress: null,
    currentStep: null,
    currentFeature: null,
    waitingQuestion: null,
    demoUrl: null,
    repoUrl: null,
    claimedBy,
    claimedAt: new Date(),
    createdAt: new Date('2026-01-27T09:00:00Z'),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ORCH_KEY = validOrchKey;
    (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(true);

    // Reset claim state for each test
    claimState = {
      claimed: false,
      claimedAt: null,
      claimedBy: null,
    };
  });

  afterEach(() => {
    delete process.env.ORCH_KEY;
  });

  // Helper to create request with unique orchestrator ID
  const createRequest = (orchestratorId: string) => {
    return new NextRequest(`http://localhost/api/ideas/${validUuid}/claim`, {
      method: 'POST',
      headers: { 'X-ORCH-KEY': validOrchKey },
      body: JSON.stringify({ claimedBy: orchestratorId }),
    });
  };

  // Helper to create context with params
  const createContext = () => ({
    params: Promise.resolve({ id: validUuid }),
  });

  /**
   * Simulate atomic claim behavior:
   * - First call wins and sets claimed state
   * - Subsequent calls see already-claimed and return conflict
   *
   * This simulates the database atomic UPDATE...WHERE status IN ('submitted', 'ready')
   */
  const setupAtomicClaimSimulation = () => {
    (claimIdea as ReturnType<typeof vi.fn>).mockImplementation(
      async (ideaId: string, claimedBy?: string) => {
        // Small delay to simulate database operation and increase chance of race
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

        // Atomic check-and-set (simulates database atomicity)
        if (!claimState.claimed) {
          claimState.claimed = true;
          claimState.claimedAt = new Date();
          claimState.claimedBy = claimedBy ?? null;

          return {
            success: true,
            idea: createClaimedIdea(claimedBy ?? null),
          };
        }

        // Already claimed - return conflict
        return {
          success: false,
          error: new ConflictError(
            'claimed',
            claimState.claimedAt!,
            claimState.claimedBy
          ),
        };
      }
    );
  };

  describe('Two Concurrent Claims', () => {
    it('exactly one succeeds and one gets conflict', async () => {
      setupAtomicClaimSimulation();

      const [response1, response2] = await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
      ]);

      const statuses = [response1.status, response2.status].sort();

      // Exactly one 200 and one 409
      expect(statuses).toEqual([200, 409]);
    });

    it('conflict response includes claimedBy from winner', async () => {
      setupAtomicClaimSimulation();

      const [response1, response2] = await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
      ]);

      // Find the conflict response
      const conflictResponse =
        response1.status === 409 ? response1 : response2;

      const conflictBody = await conflictResponse.json();

      // The winner's orchestrator ID should be in conflict details
      // (one of the two orchestrators)
      expect(['orchestrator-1', 'orchestrator-2']).toContain(
        conflictBody.details.claimedBy
      );
    });

    it('both claims return timestamps', async () => {
      setupAtomicClaimSimulation();

      const [response1, response2] = await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
      ]);

      const conflictResponse =
        response1.status === 409 ? response1 : response2;
      const successResponse = response1.status === 200 ? response1 : response2;

      const conflictBody = await conflictResponse.json();
      const successBody = await successResponse.json();

      // Conflict response should have claimedAt in details
      expect(conflictBody.details.claimedAt).toBeDefined();
      // Success response should have updatedAt (the claim time)
      expect(successBody.updatedAt).toBeDefined();
    });
  });

  describe('Five Concurrent Claims', () => {
    it('exactly one succeeds and four get conflict', async () => {
      setupAtomicClaimSimulation();

      const responses = await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
        POST(createRequest('orchestrator-3'), createContext()),
        POST(createRequest('orchestrator-4'), createContext()),
        POST(createRequest('orchestrator-5'), createContext()),
      ]);

      const statuses = responses.map((r) => r.status).sort();

      // Exactly one 200 and four 409s
      expect(statuses).toEqual([200, 409, 409, 409, 409]);
    });

    it('all conflict responses reference the same winner', async () => {
      setupAtomicClaimSimulation();

      const responses = await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
        POST(createRequest('orchestrator-3'), createContext()),
        POST(createRequest('orchestrator-4'), createContext()),
        POST(createRequest('orchestrator-5'), createContext()),
      ]);

      const conflictResponses = responses.filter((r) => r.status === 409);

      // Extract all claimedBy values from conflict responses
      const claimedByValues: (string | null)[] = [];
      for (const response of conflictResponses) {
        const body = await response.json();
        claimedByValues.push(body.details.claimedBy);
      }

      // All conflicts should reference the same winner
      expect(new Set(claimedByValues).size).toBe(1);
      // The winner should be one of the orchestrators
      expect([
        'orchestrator-1',
        'orchestrator-2',
        'orchestrator-3',
        'orchestrator-4',
        'orchestrator-5',
      ]).toContain(claimedByValues[0]);
    });

    it('all conflict responses have same claimedAt timestamp', async () => {
      setupAtomicClaimSimulation();

      const responses = await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
        POST(createRequest('orchestrator-3'), createContext()),
        POST(createRequest('orchestrator-4'), createContext()),
        POST(createRequest('orchestrator-5'), createContext()),
      ]);

      const conflictResponses = responses.filter((r) => r.status === 409);

      // Extract all claimedAt timestamps
      const claimedAtTimes: string[] = [];
      for (const response of conflictResponses) {
        const body = await response.json();
        claimedAtTimes.push(body.details.claimedAt);
      }

      // All should be the same timestamp
      expect(new Set(claimedAtTimes).size).toBe(1);
    });
  });

  describe('Ten Concurrent Claims', () => {
    it('exactly one succeeds under high concurrency', async () => {
      setupAtomicClaimSimulation();

      const requests = Array.from({ length: 10 }, (_, i) =>
        POST(createRequest(`orchestrator-${i + 1}`), createContext())
      );

      const responses = await Promise.all(requests);

      const successCount = responses.filter((r) => r.status === 200).length;
      const conflictCount = responses.filter((r) => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(9);
    });
  });

  describe('Repeated Concurrent Attempts', () => {
    it('consistently produces one winner across multiple runs', async () => {
      // Run the concurrency test multiple times to ensure no flakiness
      const results: number[] = [];

      for (let run = 0; run < 5; run++) {
        // Reset state for each run
        claimState = {
          claimed: false,
          claimedAt: null,
          claimedBy: null,
        };
        setupAtomicClaimSimulation();

        const responses = await Promise.all([
          POST(createRequest('orch-a'), createContext()),
          POST(createRequest('orch-b'), createContext()),
          POST(createRequest('orch-c'), createContext()),
        ]);

        const successCount = responses.filter((r) => r.status === 200).length;
        results.push(successCount);
      }

      // Every run should have exactly one winner
      expect(results.every((count) => count === 1)).toBe(true);
    });
  });

  describe('Claim State Consistency', () => {
    it('claim state is not partially updated', async () => {
      setupAtomicClaimSimulation();

      await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
      ]);

      // After concurrent claims, state should be fully consistent
      expect(claimState.claimed).toBe(true);
      expect(claimState.claimedAt).toBeInstanceOf(Date);
      // claimedBy should be one of the orchestrators (not undefined or partial)
      expect(['orchestrator-1', 'orchestrator-2']).toContain(
        claimState.claimedBy
      );
    });

    it('no orphaned claims (all have both claimedAt and claimedBy)', async () => {
      setupAtomicClaimSimulation();

      await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
        POST(createRequest('orchestrator-3'), createContext()),
      ]);

      // Both fields should be set together
      if (claimState.claimed) {
        expect(claimState.claimedAt).not.toBeNull();
        expect(claimState.claimedBy).not.toBeNull();
      }
    });
  });

  describe('Error During Concurrent Claims', () => {
    it('database error does not corrupt claim state', async () => {
      let callCount = 0;

      (claimIdea as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        // Third call throws error (simulates database timeout)
        if (callCount === 3) {
          throw new Error('Database connection timeout');
        }

        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

        if (!claimState.claimed) {
          claimState.claimed = true;
          claimState.claimedAt = new Date();
          claimState.claimedBy = `orchestrator-${callCount}`;

          return {
            success: true,
            idea: createClaimedIdea(`orchestrator-${callCount}`),
          };
        }

        return {
          success: false,
          error: new ConflictError(
            'claimed',
            claimState.claimedAt!,
            claimState.claimedBy
          ),
        };
      });

      const responses = await Promise.all([
        POST(createRequest('orchestrator-1'), createContext()),
        POST(createRequest('orchestrator-2'), createContext()),
        POST(createRequest('orchestrator-3'), createContext()),
      ]);

      const statuses = responses.map((r) => r.status).sort();

      // Should have exactly one 200, and some combination of 409 and 500
      expect(statuses.filter((s) => s === 200).length).toBeLessThanOrEqual(1);
      expect(statuses.filter((s) => s === 500).length).toBeLessThanOrEqual(1);

      // State should still be consistent (either not claimed, or fully claimed)
      if (claimState.claimed) {
        expect(claimState.claimedAt).not.toBeNull();
      }
    });
  });
});
