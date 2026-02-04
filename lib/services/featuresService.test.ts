import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertFeatures, getFeaturesByIdeaId, deleteFeaturesByIdeaId } from './featuresService';
import type { Feature } from '@utmessa/shared';

// Mock the database module
vi.mock('../db/client', () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { db } from '../db/client';

describe('featuresService', () => {
  const mockIdeaId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock features
  const createMockFeatures = (count: number = 2): Feature[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `feat-${i + 1}`,
      ideaId: mockIdeaId,
      featureId: `F${i + 1}`,
      title: `Feature ${i + 1}`,
      status: 'planned' as const,
    }));
  };

  describe('upsertFeatures', () => {
    it('should successfully insert features for an existing idea', async () => {
      const featuresList = createMockFeatures(3);

      // Mock idea exists check
      const mockLimit = vi.fn().mockResolvedValue([{ id: mockIdeaId }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      // Mock transaction
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        });
      });

      const result = await upsertFeatures(mockIdeaId, featuresList);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ideaId).toBe(mockIdeaId);
        expect(result.featuresCount).toBe(3);
      }
    });

    it('should handle empty features array (clear all features)', async () => {
      // Mock idea exists check
      const mockLimit = vi.fn().mockResolvedValue([{ id: mockIdeaId }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      // Mock transaction
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          insert: vi.fn(),
        });
      });

      const result = await upsertFeatures(mockIdeaId, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.featuresCount).toBe(0);
      }
    });

    it('should return NOT_FOUND error when idea does not exist', async () => {
      const featuresList = createMockFeatures(2);

      // Mock idea not found
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await upsertFeatures(mockIdeaId, featuresList);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NOT_FOUND');
        if (result.error.type === 'NOT_FOUND') {
          expect(result.error.ideaId).toBe(mockIdeaId);
        }
      }
    });

    it('should return DATABASE_ERROR on transaction failure', async () => {
      const featuresList = createMockFeatures(2);

      // Mock idea exists check
      const mockLimit = vi.fn().mockResolvedValue([{ id: mockIdeaId }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      // Mock transaction failure
      (db.transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Transaction failed')
      );

      const result = await upsertFeatures(mockIdeaId, featuresList);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('DATABASE_ERROR');
        if (result.error.type === 'DATABASE_ERROR') {
          expect(result.error.message).toContain('Transaction failed');
        }
      }
    });

    it('should handle features with different statuses', async () => {
      const featuresList: Feature[] = [
        {
          id: 'feat-1',
          ideaId: mockIdeaId,
          featureId: 'F1',
          title: 'Feature 1',
          status: 'planned',
        },
        {
          id: 'feat-2',
          ideaId: mockIdeaId,
          featureId: 'F2',
          title: 'Feature 2',
          status: 'in_progress',
        },
        {
          id: 'feat-3',
          ideaId: mockIdeaId,
          featureId: 'F3',
          title: 'Feature 3',
          status: 'done',
        },
        {
          id: 'feat-4',
          ideaId: mockIdeaId,
          featureId: 'F4',
          title: 'Feature 4',
          status: 'failed',
        },
        {
          id: 'feat-5',
          ideaId: mockIdeaId,
          featureId: 'F5',
          title: 'Feature 5',
          status: 'skipped',
        },
      ];

      // Mock idea exists check
      const mockLimit = vi.fn().mockResolvedValue([{ id: mockIdeaId }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      // Mock transaction
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
        await callback({
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        });
      });

      const result = await upsertFeatures(mockIdeaId, featuresList);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.featuresCount).toBe(5);
      }
    });
  });

  describe('getFeaturesByIdeaId', () => {
    it('should return all features for an idea', async () => {
      const mockFeatures = [
        {
          id: 'feat-1',
          ideaId: mockIdeaId,
          featureId: 'F1',
          title: 'Feature 1',
          status: 'planned',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'feat-2',
          ideaId: mockIdeaId,
          featureId: 'F2',
          title: 'Feature 2',
          status: 'in_progress',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock database query
      const mockOrderBy = vi.fn().mockResolvedValue(mockFeatures);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await getFeaturesByIdeaId(mockIdeaId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        ideaId: mockIdeaId,
        featureId: 'F1',
        title: 'Feature 1',
        status: 'planned',
      });
    });

    it('should return empty array when no features exist', async () => {
      // Mock database query returning empty array
      const mockOrderBy = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await getFeaturesByIdeaId(mockIdeaId);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('deleteFeaturesByIdeaId', () => {
    it('should delete all features for an idea', async () => {
      // Mock select to count existing features
      const mockSelectWhere = vi.fn().mockResolvedValue([
        { id: 'feat-1' },
        { id: 'feat-2' },
        { id: 'feat-3' },
      ]);
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

      // Mock delete operation
      const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({ where: mockDeleteWhere });

      const deletedCount = await deleteFeaturesByIdeaId(mockIdeaId);

      expect(deletedCount).toBe(3);
    });

    it('should return 0 when no features exist', async () => {
      // Mock select returning empty array
      const mockSelectWhere = vi.fn().mockResolvedValue([]);
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

      const deletedCount = await deleteFeaturesByIdeaId(mockIdeaId);

      expect(deletedCount).toBe(0);
    });

    it('should not call delete when no features exist', async () => {
      // Mock select returning empty array
      const mockSelectWhere = vi.fn().mockResolvedValue([]);
      const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockSelectFrom });

      const mockDeleteWhere = vi.fn();
      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({ where: mockDeleteWhere });

      await deleteFeaturesByIdeaId(mockIdeaId);

      // Delete should not be called when there are no features
      expect(mockDeleteWhere).not.toHaveBeenCalled();
    });
  });
});
