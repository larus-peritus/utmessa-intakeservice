import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the database function
vi.mock('@/lib/db', () => ({
  getIdeaByToken: vi.fn(),
}));

import { getIdeaByToken } from '@/lib/db';

describe('GET /api/ideas/token/[token]', () => {
  const validToken = 'V1StGXR8Z5jdHi9B2vBJ4';

  // Mock idea from database
  const mockIdea = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    token: validToken,
    title: 'Test Idea',
    problem: 'Test problem description for the idea.',
    mustHaves: ['feature1', 'feature2'],
    email: 'test@example.com',
    status: 'running',
    progress: 50,
    currentStep: 'Building feature F2',
    currentFeature: 'F2',
    waitingQuestion: null,
    demoUrl: null,
    repoUrl: null,
    slug: 'test-idea-12345', // Internal field - should be excluded
    claimedBy: 'orchestrator-1', // Internal field - should be excluded
    claimedAt: new Date('2026-01-27T10:00:00Z'), // Internal field - should be excluded
    createdAt: new Date('2026-01-27T09:00:00Z'),
    updatedAt: new Date('2026-01-27T11:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create request
  const createRequest = (token: string) => {
    return new NextRequest(`http://localhost/api/ideas/token/${token}`, {
      method: 'GET',
    });
  };

  // Helper to create context with params
  const createContext = (token: string = validToken) => ({
    params: Promise.resolve({ token }),
  });

  describe('Token Validation', () => {
    it('returns 400 for token shorter than 10 characters', async () => {
      const shortToken = 'abc123';
      const request = createRequest(shortToken);
      const response = await GET(request, createContext(shortToken));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('INVALID_TOKEN');
      expect(body.message).toContain('Invalid receipt token format');
    });

    it('returns 400 for token longer than 30 characters', async () => {
      const longToken = 'a'.repeat(31);
      const request = createRequest(longToken);
      const response = await GET(request, createContext(longToken));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('INVALID_TOKEN');
    });

    it('returns 400 for empty token', async () => {
      const request = createRequest('');
      const response = await GET(request, createContext(''));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('INVALID_TOKEN');
    });

    it('accepts token exactly at minimum length (10 chars)', async () => {
      const minToken = 'a'.repeat(10);
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        token: minToken,
      });

      const request = createRequest(minToken);
      const response = await GET(request, createContext(minToken));

      expect(response.status).toBe(200);
    });

    it('accepts token exactly at maximum length (30 chars)', async () => {
      const maxToken = 'a'.repeat(30);
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        token: maxToken,
      });

      const request = createRequest(maxToken);
      const response = await GET(request, createContext(maxToken));

      expect(response.status).toBe(200);
    });

    it('accepts standard 21-character nanoid token', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));

      expect(response.status).toBe(200);
    });
  });

  describe('Success Response', () => {
    it('returns 200 with idea data', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));

      expect(response.status).toBe(200);
    });

    it('includes all public fields', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.id).toBe(mockIdea.id);
      expect(body.token).toBe(mockIdea.token);
      expect(body.title).toBe(mockIdea.title);
      expect(body.problem).toBe(mockIdea.problem);
      expect(body.mustHaves).toEqual(mockIdea.mustHaves);
      expect(body.email).toBe(mockIdea.email);
      expect(body.status).toBe(mockIdea.status);
    });

    it('includes progress fields when present', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.progress).toBe(50);
      expect(body.currentStep).toBe('Building feature F2');
      expect(body.currentFeature).toBe('F2');
    });

    it('excludes internal fields (slug, claimedBy, claimedAt)', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body).not.toHaveProperty('slug');
      expect(body).not.toHaveProperty('claimedBy');
      expect(body).not.toHaveProperty('claimedAt');
    });

    it('formats timestamps as ISO strings', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.createdAt).toBe('2026-01-27T09:00:00.000Z');
      expect(body.updatedAt).toBe('2026-01-27T11:00:00.000Z');
    });

    it('uses createdAt for updatedAt when updatedAt is null', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        updatedAt: null,
      });

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.updatedAt).toBe(body.createdAt);
    });

    it('defaults email to empty string when null', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        email: null,
      });

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.email).toBe('');
    });

    it('includes URLs when present', async () => {
      const ideaWithUrls = {
        ...mockIdea,
        status: 'deployed',
        demoUrl: 'https://demo.example.com',
        repoUrl: 'https://github.com/user/repo',
      };
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(ideaWithUrls);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.demoUrl).toBe('https://demo.example.com');
      expect(body.repoUrl).toBe('https://github.com/user/repo');
    });

    it('excludes null optional fields', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        progress: null,
        currentStep: null,
        currentFeature: null,
      });

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body).not.toHaveProperty('progress');
      expect(body).not.toHaveProperty('currentStep');
      expect(body).not.toHaveProperty('currentFeature');
      expect(body).not.toHaveProperty('waitingQuestion');
      expect(body).not.toHaveProperty('demoUrl');
      expect(body).not.toHaveProperty('repoUrl');
    });

    it('includes progress when 0', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        progress: 0,
      });

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.progress).toBe(0);
    });

    it('sets Cache-Control header for caching', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));

      expect(response.headers.get('Cache-Control')).toBe(
        'private, max-age=10, stale-while-revalidate=30'
      );
    });
  });

  describe('Not Found Response', () => {
    it('returns 404 when token does not match any idea', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('NOT_FOUND');
      expect(body.message).toContain('receipt token');
    });

    it('provides user-friendly 404 message', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.message).toBe(
        'The receipt token you provided does not match any submitted idea.'
      );
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on database error', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('INTERNAL_ERROR');
    });

    it('does not expose internal error details', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('PostgreSQL: connection refused at localhost:5432')
      );

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.message).not.toContain('PostgreSQL');
      expect(body.message).not.toContain('localhost');
      expect(body.message).not.toContain('5432');
      expect(body.message).toBe('An error occurred while fetching the idea.');
    });
  });

  describe('Database Integration', () => {
    it('passes token to getIdeaByToken', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      await GET(request, createContext(validToken));

      expect(getIdeaByToken).toHaveBeenCalledWith(validToken);
    });

    it('calls getIdeaByToken only once per request', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockIdea);

      const request = createRequest(validToken);
      await GET(request, createContext(validToken));

      expect(getIdeaByToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Display', () => {
    const statuses = ['submitted', 'ready', 'claimed', 'running', 'waiting', 'deployed', 'failed'];

    it.each(statuses)('returns correct status for %s', async (status) => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        status,
      });

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.status).toBe(status);
    });

    it('includes waitingQuestion when status is waiting', async () => {
      (getIdeaByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockIdea,
        status: 'waiting',
        waitingQuestion: 'Which authentication method do you prefer?',
      });

      const request = createRequest(validToken);
      const response = await GET(request, createContext(validToken));
      const body = await response.json();

      expect(body.status).toBe('waiting');
      expect(body.waitingQuestion).toBe('Which authentication method do you prefer?');
    });
  });
});
