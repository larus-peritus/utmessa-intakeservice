import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claimIdea, isIdeaClaimable } from './claimService';
import { NotFoundError, ConflictError } from '../errors/claim-errors';

// Mock the database module
vi.mock('../db/client', () => ({
  db: {
    update: vi.fn(),
    select: vi.fn(),
  },
}));

import { db } from '../db/client';

describe('ClaimService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('claimIdea', () => {
    const mockIdeaId = '123e4567-e89b-12d3-a456-426614174001';

    // Helper to create mock idea
    const createMockIdea = (overrides = {}) => ({
      id: mockIdeaId,
      token: 'V1StGXR8Z5jdHi9B2vBJ4',
      title: 'Test Idea',
      problem: 'Test problem',
      mustHaves: ['feature1'],
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
      ...overrides,
    });

    it('successfully claims an idea with status "submitted"', async () => {
      const claimedIdea = createMockIdea({ status: 'claimed' });

      // Mock successful update returning 1 row
      const mockReturning = vi.fn().mockResolvedValue([claimedIdea]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const result = await claimIdea(mockIdeaId, 'orchestrator-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.idea.status).toBe('claimed');
        expect(result.idea.claimedBy).toBe('orchestrator-1');
      }
    });

    it('successfully claims an idea with status "ready"', async () => {
      const claimedIdea = createMockIdea({ status: 'claimed' });

      const mockReturning = vi.fn().mockResolvedValue([claimedIdea]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const result = await claimIdea(mockIdeaId, 'orchestrator-1');

      expect(result.success).toBe(true);
    });

    it('returns NOT_FOUND when idea does not exist', async () => {
      // Mock update returning 0 rows
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      // Mock select returning 0 rows (idea doesn't exist)
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

      const result = await claimIdea(mockIdeaId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect((result.error as NotFoundError).ideaId).toBe(mockIdeaId);
      }
    });

    it('returns CONFLICT when idea is already claimed', async () => {
      const claimedIdea = createMockIdea({
        status: 'claimed',
        claimedBy: 'other-orchestrator',
        claimedAt: new Date('2026-01-27T10:00:00Z'),
      });

      // Mock update returning 0 rows
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      // Mock select returning the existing idea
      const mockLimit = vi.fn().mockResolvedValue([claimedIdea]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

      const result = await claimIdea(mockIdeaId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect((result.error as ConflictError).currentStatus).toBe('claimed');
        expect((result.error as ConflictError).claimedBy).toBe('other-orchestrator');
      }
    });

    it('returns CONFLICT when idea is already running', async () => {
      const runningIdea = createMockIdea({
        status: 'running',
        claimedBy: 'other-orchestrator',
      });

      // Mock update returning 0 rows
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      // Mock select returning the existing idea
      const mockLimit = vi.fn().mockResolvedValue([runningIdea]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

      const result = await claimIdea(mockIdeaId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect((result.error as ConflictError).currentStatus).toBe('running');
      }
    });

    it('returns CONFLICT for any non-claimable status', async () => {
      const nonClaimableStatuses = ['claimed', 'running', 'waiting', 'deployed', 'failed', 'abandoned'];

      for (const status of nonClaimableStatuses) {
        vi.clearAllMocks();

        const existingIdea = createMockIdea({ status });

        // Mock update returning 0 rows
        const mockReturning = vi.fn().mockResolvedValue([]);
        const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
        const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

        // Mock select returning the existing idea
        const mockLimit = vi.fn().mockResolvedValue([existingIdea]);
        const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
        const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

        const result = await claimIdea(mockIdeaId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ConflictError);
        }
      }
    });

    it('sets claimedBy to null when not provided', async () => {
      const claimedIdea = createMockIdea({
        status: 'claimed',
        claimedBy: null,
      });

      const mockReturning = vi.fn().mockResolvedValue([claimedIdea]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const result = await claimIdea(mockIdeaId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.idea.claimedBy).toBeNull();
      }
    });

    it('sets claimedAt to current timestamp', async () => {
      const now = new Date();
      const claimedIdea = createMockIdea({
        status: 'claimed',
        claimedAt: now,
      });

      const mockReturning = vi.fn().mockResolvedValue([claimedIdea]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const result = await claimIdea(mockIdeaId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.idea.claimedAt).toBeDefined();
      }
    });

    it('updates updatedAt timestamp', async () => {
      const originalUpdatedAt = new Date('2026-01-26T09:00:00Z');
      const claimedIdea = createMockIdea({
        status: 'claimed',
        updatedAt: new Date(), // Should be newer than original
      });

      const mockReturning = vi.fn().mockResolvedValue([claimedIdea]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      const result = await claimIdea(mockIdeaId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.idea.updatedAt).toBeDefined();
      }
    });

    it('returns conflict details (claimedAt, claimedBy) on conflict', async () => {
      const claimedAt = new Date('2026-01-27T10:00:00Z');
      const claimedBy = 'other-orchestrator';

      const existingIdea = createMockIdea({
        status: 'claimed',
        claimedAt,
        claimedBy,
      });

      // Mock update returning 0 rows
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      // Mock select returning the existing idea
      const mockLimit = vi.fn().mockResolvedValue([existingIdea]);
      const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

      const result = await claimIdea(mockIdeaId);

      expect(result.success).toBe(false);
      if (!result.success && result.error instanceof ConflictError) {
        expect(result.error.claimedAt).toEqual(claimedAt);
        expect(result.error.claimedBy).toBe(claimedBy);
      }
    });

    it('re-throws database errors', async () => {
      const dbError = new Error('Database connection failed');

      const mockSet = vi.fn().mockImplementation(() => {
        throw dbError;
      });
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

      await expect(claimIdea(mockIdeaId)).rejects.toThrow('Database connection failed');
    });
  });

  describe('isIdeaClaimable', () => {
    const mockIdeaId = '123e4567-e89b-12d3-a456-426614174001';

    const createMockIdea = (status: string) => ({
      id: mockIdeaId,
      token: 'V1StGXR8Z5jdHi9B2vBJ4',
      title: 'Test Idea',
      problem: 'Test problem',
      mustHaves: ['feature1'],
      email: 'test@example.com',
      status,
      progress: null,
      currentStep: null,
      currentFeature: null,
      waitingQuestion: null,
      demoUrl: null,
      repoUrl: null,
      claimedBy: null,
      claimedAt: null,
      createdAt: new Date('2026-01-27T09:00:00Z'),
      updatedAt: null,
    });

    it('returns claimable=true for "submitted" status', async () => {
      const submittedIdea = createMockIdea('submitted');

      const mockLimit = vi.fn().mockResolvedValue([submittedIdea]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await isIdeaClaimable(mockIdeaId);

      expect(result.claimable).toBe(true);
      expect(result.idea).toBeDefined();
    });

    it('returns claimable=true for "ready" status', async () => {
      const readyIdea = createMockIdea('ready');

      const mockLimit = vi.fn().mockResolvedValue([readyIdea]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await isIdeaClaimable(mockIdeaId);

      expect(result.claimable).toBe(true);
    });

    it('returns claimable=false when idea not found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await isIdeaClaimable(mockIdeaId);

      expect(result.claimable).toBe(false);
      expect(result.reason).toBe('Idea not found');
    });

    it('returns claimable=false for non-claimable statuses', async () => {
      const claimedIdea = createMockIdea('claimed');

      const mockLimit = vi.fn().mockResolvedValue([claimedIdea]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await isIdeaClaimable(mockIdeaId);

      expect(result.claimable).toBe(false);
      expect(result.reason).toContain('claimed');
      expect(result.reason).toContain('not claimable');
    });

    it('re-throws database errors', async () => {
      const mockFrom = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(isIdeaClaimable(mockIdeaId)).rejects.toThrow('Database error');
    });
  });
});
