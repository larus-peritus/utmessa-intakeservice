import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateIdea, canUpdateIdea } from './updateService';
import type { IdeaStatus } from '@utmessa/shared';

// Mock the database
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from '../db';

describe('UpdateService', () => {
  // Helper to create mock idea
  const createMockIdea = (overrides: Partial<{
    id: string;
    status: string;
    progress: number | null;
    currentStep: string | null;
    currentFeature: string | null;
    waitingQuestion: string | null;
    demoUrl: string | null;
    repoUrl: string | null;
  }> = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    token: 'V1StGXR8Z5jdHi9B2vBJ4',
    title: 'Test Idea',
    problem: 'Test problem description.',
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
    claimedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateIdea', () => {
    describe('successful updates', () => {
      it('updates progress only', async () => {
        const mockIdea = createMockIdea({ status: 'claimed' });
        const updatedIdea = { ...mockIdea, progress: 50, updatedAt: new Date() };

        // Mock select to return existing idea
        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        // Mock update to return updated idea
        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { progress: 50 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.idea.progress).toBe(50);
        }
      });

      it('updates status from claimed to running', async () => {
        const mockIdea = createMockIdea({ status: 'claimed' });
        const updatedIdea = { ...mockIdea, status: 'running' };

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { status: 'running' });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.idea.status).toBe('running');
        }
      });

      it('updates multiple fields simultaneously', async () => {
        const mockIdea = createMockIdea({ status: 'running' });
        const updatedIdea = {
          ...mockIdea,
          status: 'waiting',
          progress: 75,
          currentStep: 'Need user input',
          waitingQuestion: 'Choose auth provider?',
        };

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, {
          status: 'waiting',
          progress: 75,
          currentStep: 'Need user input',
          waitingQuestion: 'Choose auth provider?',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.idea.status).toBe('waiting');
          expect(result.idea.progress).toBe(75);
          expect(result.idea.currentStep).toBe('Need user input');
          expect(result.idea.waitingQuestion).toBe('Choose auth provider?');
        }
      });

      it('clears fields with null values', async () => {
        const mockIdea = createMockIdea({
          status: 'running',
          currentStep: 'Old step',
          waitingQuestion: 'Old question',
        });
        const updatedIdea = {
          ...mockIdea,
          currentStep: null,
          waitingQuestion: null,
        };

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, {
          currentStep: null,
          waitingQuestion: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.idea.currentStep).toBeNull();
          expect(result.idea.waitingQuestion).toBeNull();
        }
      });

      it('updates URLs', async () => {
        const mockIdea = createMockIdea({ status: 'running' });
        const updatedIdea = {
          ...mockIdea,
          status: 'deployed',
          demoUrl: 'https://demo.example.com',
          repoUrl: 'https://github.com/user/repo',
        };

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, {
          status: 'deployed',
          demoUrl: 'https://demo.example.com',
          repoUrl: 'https://github.com/user/repo',
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.idea.demoUrl).toBe('https://demo.example.com');
          expect(result.idea.repoUrl).toBe('https://github.com/user/repo');
        }
      });

      it('allows idempotent status update (deployed → deployed)', async () => {
        const mockIdea = createMockIdea({ status: 'deployed' });
        const updatedIdea = { ...mockIdea };

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { status: 'deployed' });

        expect(result.success).toBe(true);
      });
    });

    describe('NOT_FOUND error', () => {
      it('returns NOT_FOUND when idea does not exist', async () => {
        const ideaId = 'non-existent-id';

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // Empty result
            }),
          }),
        });

        const result = await updateIdea(ideaId, { progress: 50 });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('NOT_FOUND');
          expect((result.error as { type: 'NOT_FOUND'; ideaId: string }).ideaId).toBe(ideaId);
        }
      });
    });

    describe('NOT_CLAIMED error', () => {
      it('returns NOT_CLAIMED for submitted status', async () => {
        const mockIdea = createMockIdea({ status: 'submitted' });

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { progress: 50 });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('NOT_CLAIMED');
          expect((result.error as { type: 'NOT_CLAIMED'; currentStatus: IdeaStatus }).currentStatus).toBe('submitted');
        }
      });

      it('returns NOT_CLAIMED for ready status', async () => {
        const mockIdea = createMockIdea({ status: 'ready' });

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { progress: 50 });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('NOT_CLAIMED');
        }
      });
    });

    describe('INVALID_TRANSITION error', () => {
      it('returns INVALID_TRANSITION for claimed → deployed', async () => {
        const mockIdea = createMockIdea({ status: 'claimed' });

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { status: 'deployed' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('INVALID_TRANSITION');
          const error = result.error as {
            type: 'INVALID_TRANSITION';
            currentStatus: IdeaStatus;
            requestedStatus: IdeaStatus;
            allowedTransitions: IdeaStatus[];
          };
          expect(error.currentStatus).toBe('claimed');
          expect(error.requestedStatus).toBe('deployed');
          expect(error.allowedTransitions).toEqual(['running', 'failed']);
        }
      });

      it('returns INVALID_TRANSITION for waiting → deployed', async () => {
        const mockIdea = createMockIdea({ status: 'waiting' });

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { status: 'deployed' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('INVALID_TRANSITION');
          const error = result.error as {
            type: 'INVALID_TRANSITION';
            allowedTransitions: IdeaStatus[];
          };
          expect(error.allowedTransitions).toEqual(['running', 'failed']);
        }
      });

      it('returns INVALID_TRANSITION for deployed → running', async () => {
        const mockIdea = createMockIdea({ status: 'deployed' });

        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        const result = await updateIdea(mockIdea.id, { status: 'running' });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('INVALID_TRANSITION');
        }
      });
    });

    describe('field preservation', () => {
      it('preserves omitted fields', async () => {
        const mockIdea = createMockIdea({
          status: 'running',
          progress: 25,
          currentStep: 'Building F1',
          currentFeature: 'F1',
        });

        // Update should include original values for omitted fields
        const capturedSetArg = vi.fn();
        (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockIdea]),
            }),
          }),
        });

        (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
          set: vi.fn().mockImplementation((arg) => {
            capturedSetArg(arg);
            return {
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  { ...mockIdea, progress: 50 },
                ]),
              }),
            };
          }),
        });

        await updateIdea(mockIdea.id, { progress: 50 });

        // Verify only progress and updatedAt were in the update
        expect(capturedSetArg).toHaveBeenCalled();
        const updateArg = capturedSetArg.mock.calls[0][0];
        expect(updateArg.progress).toBe(50);
        expect(updateArg.updatedAt).toBeDefined();
        // currentStep should NOT be in the update (preserved)
        expect(updateArg.currentStep).toBeUndefined();
      });
    });
  });

  describe('canUpdateIdea', () => {
    it('returns canUpdate: true for claimed idea', async () => {
      const mockIdea = createMockIdea({ status: 'claimed' });

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ status: mockIdea.status }]),
          }),
        }),
      });

      const result = await canUpdateIdea(mockIdea.id);

      expect(result.canUpdate).toBe(true);
      if (result.canUpdate) {
        expect(result.currentStatus).toBe('claimed');
      }
    });

    it('returns canUpdate: true for running idea', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ status: 'running' }]),
          }),
        }),
      });

      const result = await canUpdateIdea('test-id');

      expect(result.canUpdate).toBe(true);
    });

    it('returns canUpdate: false for submitted idea', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ status: 'submitted' }]),
          }),
        }),
      });

      const result = await canUpdateIdea('test-id');

      expect(result.canUpdate).toBe(false);
      if (!result.canUpdate) {
        expect(result.reason).toBe('NOT_CLAIMED');
        expect(result.currentStatus).toBe('submitted');
      }
    });

    it('returns canUpdate: false for non-existent idea', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await canUpdateIdea('non-existent');

      expect(result.canUpdate).toBe(false);
      if (!result.canUpdate) {
        expect(result.reason).toBe('NOT_FOUND');
      }
    });
  });
});
