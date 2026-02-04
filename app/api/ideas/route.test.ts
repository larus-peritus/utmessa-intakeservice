import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the database module
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock the ideas database module
vi.mock('@/lib/db/ideas', () => ({
  createIdea: vi.fn(),
}));

// Mock the token generator
vi.mock('@/lib/utils/tokens', () => ({
  generateToken: vi.fn(() => 'test-token-123456789012'),
}));

// Mock the service layer
vi.mock('@/lib/services/ideasService', () => ({
  listIdeas: vi.fn(),
}));

import { db } from '@/lib/db/client';
import { createIdea } from '@/lib/db/ideas';
import { listIdeas } from '@/lib/services/ideasService';

describe('GET /api/ideas', () => {
  const validOrchKey = 'test-orch-key-12345';

  beforeEach(() => {
    vi.clearAllMocks();
    // Set the environment variable for authentication
    process.env.ORCH_KEY = validOrchKey;
  });

  describe('Authentication', () => {
    it('returns 401 without X-ORCH-KEY header', async () => {
      const request = new NextRequest('http://localhost/api/ideas');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.message).toBe('Invalid or missing X-ORCH-KEY header');
    });

    it('returns 401 with invalid X-ORCH-KEY', async () => {
      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': 'invalid-key' },
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('returns 200 with valid X-ORCH-KEY', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Default Filter', () => {
    it('returns submitted and ready ideas by default', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            title: 'Test Idea',
            problem: 'Test problem',
            mustHaves: ['feature1'],
            status: 'submitted',
            createdAt: '2026-01-26T10:00:00Z',
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(body.ideas).toBeInstanceOf(Array);
      expect(listIdeas).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: ['submitted', 'ready'],
        })
      );
    });
  });

  describe('Status Filtering', () => {
    it('filters by single status', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas?status=claimed', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      await GET(request);

      expect(listIdeas).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: ['claimed'],
        })
      );
    });

    it('filters by multiple statuses', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest(
        'http://localhost/api/ideas?status=running,waiting,deployed',
        { headers: { 'X-ORCH-KEY': validOrchKey } }
      );
      await GET(request);

      expect(listIdeas).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: ['running', 'waiting', 'deployed'],
        })
      );
    });

    it('returns 400 for invalid status', async () => {
      const request = new NextRequest(
        'http://localhost/api/ideas?status=invalid_status',
        { headers: { 'X-ORCH-KEY': validOrchKey } }
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.validStatuses).toBeDefined();
    });
  });

  describe('Pagination', () => {
    it('respects limit parameter', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 2,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas?limit=2', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      await GET(request);

      expect(listIdeas).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 2,
        })
      );
    });

    it('respects offset parameter', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 50,
        offset: 10,
      });

      const request = new NextRequest('http://localhost/api/ideas?offset=10', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      await GET(request);

      expect(listIdeas).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
        })
      );
    });

    it('returns total count for pagination UI', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            title: 'Test Idea',
            problem: 'Test problem',
            status: 'submitted',
            createdAt: '2026-01-26T10:00:00Z',
          },
        ],
        total: 100,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(typeof body.total).toBe('number');
      expect(body.total).toBe(100);
    });

    it('returns 400 for limit exceeding 100', async () => {
      const request = new NextRequest('http://localhost/api/ideas?limit=500', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 for negative offset', async () => {
      const request = new NextRequest('http://localhost/api/ideas?offset=-10', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Sorting', () => {
    it('sorts by createdAt ascending by default', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      await GET(request);

      expect(listIdeas).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'createdAt',
          order: 'asc',
        })
      );
    });

    it('sorts by createdAt descending when specified', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas?order=desc', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      await GET(request);

      expect(listIdeas).toHaveBeenCalledWith(
        expect.objectContaining({
          order: 'desc',
        })
      );
    });

    it('returns 400 for invalid order value', async () => {
      const request = new NextRequest('http://localhost/api/ideas?order=invalid', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Response Schema', () => {
    it('matches expected response structure', async () => {
      const mockIdeas = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Idea 1',
          problem: 'Test problem 1',
          mustHaves: ['feature1', 'feature2'],
          status: 'submitted',
          createdAt: '2026-01-26T10:00:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          title: 'Test Idea 2',
          problem: 'Test problem 2',
          status: 'ready',
          createdAt: '2026-01-26T11:00:00Z',
        },
      ];

      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: mockIdeas,
        total: 2,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);
      const body = await response.json();

      // Verify top-level structure
      expect(body).toHaveProperty('ideas');
      expect(body).toHaveProperty('total');
      expect(body.ideas).toBeInstanceOf(Array);
      expect(body.total).toBe(2);

      // Verify QueueItem structure
      const idea = body.ideas[0];
      expect(idea).toHaveProperty('id');
      expect(idea).toHaveProperty('title');
      expect(idea).toHaveProperty('problem');
      expect(idea).toHaveProperty('status');
      expect(idea).toHaveProperty('createdAt');
    });

    it('does not include sensitive fields in response', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            title: 'Test Idea',
            problem: 'Test problem',
            status: 'submitted',
            createdAt: '2026-01-26T10:00:00Z',
            // Note: email and token are NOT included because the service excludes them
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);
      const body = await response.json();

      const idea = body.ideas[0];
      expect(idea).not.toHaveProperty('email');
      expect(idea).not.toHaveProperty('token');
    });
  });

  describe('Empty Results', () => {
    it('returns empty array when no matches', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue({
        ideas: [],
        total: 0,
        limit: 50,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/ideas?status=deployed', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ideas).toEqual([]);
      expect(body.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      (listIdeas as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost/api/ideas', {
        headers: { 'X-ORCH-KEY': validOrchKey },
      });
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('INTERNAL_ERROR');
      expect(body.message).toBe('An unexpected error occurred');
    });
  });
});

describe('POST /api/ideas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new idea with valid data', async () => {
    const mockIdea = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      token: 'test-token-123456789012',
      title: 'Test Idea',
      problem: 'This is a test problem description',
      mustHaves: ['feature1'],
      email: 'test@example.com',
      status: 'submitted',
      createdAt: new Date('2026-01-26T10:00:00Z'),
    };

    (createIdea as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

    const request = new NextRequest('http://localhost/api/ideas', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Idea',
        problem: 'This is a test problem description',
        mustHaves: ['feature1'],
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(mockIdea.id);
    expect(body.token).toBe(mockIdea.token);
    expect(body.createdAt).toBe('2026-01-26T10:00:00.000Z');
  });

  it('returns 400 for invalid JSON', async () => {
    const request = new NextRequest('http://localhost/api/ideas', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 for validation errors', async () => {
    const request = new NextRequest('http://localhost/api/ideas', {
      method: 'POST',
      body: JSON.stringify({
        title: '', // Invalid: empty title
        problem: 'short', // Invalid: too short
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });
});
