import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listIdeas } from './ideasService';

// Mock the database module
vi.mock('../db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from '../db/client';

describe('ideasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listIdeas', () => {
    it('returns ideas filtered by status', async () => {
      const mockIdeas = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Idea 1',
          problem: 'Test problem 1',
          mustHaves: ['feature1'],
          status: 'submitted',
          createdAt: new Date('2026-01-26T10:00:00Z'),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          title: 'Test Idea 2',
          problem: 'Test problem 2',
          mustHaves: ['feature2'],
          status: 'ready',
          createdAt: new Date('2026-01-26T11:00:00Z'),
        },
      ];

      // Mock chain for count query
      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 2 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });
      const mockCountSelect = vi.fn().mockReturnValue({ from: mockCountFrom });

      // Mock chain for data query
      const mockDataOffset = vi.fn().mockResolvedValue(mockIdeas);
      const mockDataLimit = vi.fn().mockReturnValue({ offset: mockDataOffset });
      const mockDataOrderBy = vi.fn().mockReturnValue({ limit: mockDataLimit });
      const mockDataWhere = vi.fn().mockReturnValue({ orderBy: mockDataOrderBy });
      const mockDataFrom = vi.fn().mockReturnValue({ where: mockDataWhere });
      const mockDataSelect = vi.fn().mockReturnValue({ from: mockDataFrom });

      // Set up db.select to return different chains based on call order
      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockCountFrom };
        }
        return { from: mockDataFrom };
      });

      const result = await listIdeas({
        statuses: ['submitted', 'ready'],
        limit: 50,
        offset: 0,
        sort: 'createdAt',
        order: 'asc',
      });

      expect(result.ideas.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('excludes sensitive fields from results', async () => {
      const mockIdeas = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Idea 1',
          problem: 'Test problem 1',
          mustHaves: ['feature1'],
          status: 'submitted',
          createdAt: new Date('2026-01-26T10:00:00Z'),
          // Note: email and token are NOT in this result because we only select specific fields
        },
      ];

      // Mock chain for count query
      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });

      // Mock chain for data query
      const mockDataOffset = vi.fn().mockResolvedValue(mockIdeas);
      const mockDataLimit = vi.fn().mockReturnValue({ offset: mockDataOffset });
      const mockDataOrderBy = vi.fn().mockReturnValue({ limit: mockDataLimit });
      const mockDataWhere = vi.fn().mockReturnValue({ orderBy: mockDataOrderBy });
      const mockDataFrom = vi.fn().mockReturnValue({ where: mockDataWhere });

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockCountFrom };
        }
        return { from: mockDataFrom };
      });

      const result = await listIdeas({
        statuses: ['submitted'],
        limit: 50,
        offset: 0,
        sort: 'createdAt',
        order: 'asc',
      });

      const idea = result.ideas[0];
      expect(idea).not.toHaveProperty('email');
      expect(idea).not.toHaveProperty('token');
      expect(idea).toHaveProperty('id');
      expect(idea).toHaveProperty('title');
      expect(idea).toHaveProperty('problem');
      expect(idea).toHaveProperty('mustHaves');
      expect(idea).toHaveProperty('status');
      expect(idea).toHaveProperty('createdAt');
    });

    it('returns empty array when no matches', async () => {
      // Mock chain for count query
      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 0 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });

      // Mock chain for data query (empty result)
      const mockDataOffset = vi.fn().mockResolvedValue([]);
      const mockDataLimit = vi.fn().mockReturnValue({ offset: mockDataOffset });
      const mockDataOrderBy = vi.fn().mockReturnValue({ limit: mockDataLimit });
      const mockDataWhere = vi.fn().mockReturnValue({ orderBy: mockDataOrderBy });
      const mockDataFrom = vi.fn().mockReturnValue({ where: mockDataWhere });

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockCountFrom };
        }
        return { from: mockDataFrom };
      });

      const result = await listIdeas({
        statuses: ['deployed'],
        limit: 50,
        offset: 0,
        sort: 'createdAt',
        order: 'asc',
      });

      expect(result.ideas).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('respects pagination parameters', async () => {
      const mockIdeas = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          title: 'Test Idea 2',
          problem: 'Test problem 2',
          mustHaves: ['feature2'],
          status: 'submitted',
          createdAt: new Date('2026-01-26T11:00:00Z'),
        },
      ];

      // Mock chain for count query
      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 10 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });

      // Mock chain for data query
      const mockDataOffset = vi.fn().mockResolvedValue(mockIdeas);
      const mockDataLimit = vi.fn().mockReturnValue({ offset: mockDataOffset });
      const mockDataOrderBy = vi.fn().mockReturnValue({ limit: mockDataLimit });
      const mockDataWhere = vi.fn().mockReturnValue({ orderBy: mockDataOrderBy });
      const mockDataFrom = vi.fn().mockReturnValue({ where: mockDataWhere });

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockCountFrom };
        }
        return { from: mockDataFrom };
      });

      const result = await listIdeas({
        statuses: ['submitted', 'ready'],
        limit: 5,
        offset: 5,
        sort: 'createdAt',
        order: 'asc',
      });

      expect(result.limit).toBe(5);
      expect(result.offset).toBe(5);
      expect(result.total).toBe(10);
      expect(mockDataLimit).toHaveBeenCalledWith(5);
      expect(mockDataOffset).toHaveBeenCalledWith(5);
    });

    it('throws error when statuses array is empty', async () => {
      await expect(
        listIdeas({
          statuses: [],
          limit: 50,
          offset: 0,
          sort: 'createdAt',
          order: 'asc',
        })
      ).rejects.toThrow('Status filter cannot be empty');
    });

    it('converts dates to ISO strings', async () => {
      const testDate = new Date('2026-01-26T10:30:00.000Z');
      const mockIdeas = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Idea',
          problem: 'Test problem',
          mustHaves: ['feature1'],
          status: 'submitted',
          createdAt: testDate,
        },
      ];

      // Mock chain for count query
      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });

      // Mock chain for data query
      const mockDataOffset = vi.fn().mockResolvedValue(mockIdeas);
      const mockDataLimit = vi.fn().mockReturnValue({ offset: mockDataOffset });
      const mockDataOrderBy = vi.fn().mockReturnValue({ limit: mockDataLimit });
      const mockDataWhere = vi.fn().mockReturnValue({ orderBy: mockDataOrderBy });
      const mockDataFrom = vi.fn().mockReturnValue({ where: mockDataWhere });

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockCountFrom };
        }
        return { from: mockDataFrom };
      });

      const result = await listIdeas({
        statuses: ['submitted'],
        limit: 50,
        offset: 0,
        sort: 'createdAt',
        order: 'asc',
      });

      expect(result.ideas[0].createdAt).toBe('2026-01-26T10:30:00.000Z');
    });

    it('handles null mustHaves gracefully', async () => {
      const mockIdeas = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Idea',
          problem: 'Test problem',
          mustHaves: null,
          status: 'submitted',
          createdAt: new Date('2026-01-26T10:00:00Z'),
        },
      ];

      // Mock chain for count query
      const mockCountWhere = vi.fn().mockResolvedValue([{ count: 1 }]);
      const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });

      // Mock chain for data query
      const mockDataOffset = vi.fn().mockResolvedValue(mockIdeas);
      const mockDataLimit = vi.fn().mockReturnValue({ offset: mockDataOffset });
      const mockDataOrderBy = vi.fn().mockReturnValue({ limit: mockDataLimit });
      const mockDataWhere = vi.fn().mockReturnValue({ orderBy: mockDataOrderBy });
      const mockDataFrom = vi.fn().mockReturnValue({ where: mockDataWhere });

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { from: mockCountFrom };
        }
        return { from: mockDataFrom };
      });

      const result = await listIdeas({
        statuses: ['submitted'],
        limit: 50,
        offset: 0,
        sort: 'createdAt',
        order: 'asc',
      });

      expect(result.ideas[0].mustHaves).toBeUndefined();
    });

    it('wraps database errors', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        listIdeas({
          statuses: ['submitted'],
          limit: 50,
          offset: 0,
          sort: 'createdAt',
          order: 'asc',
        })
      ).rejects.toThrow('Failed to list ideas from database');
    });
  });
});
