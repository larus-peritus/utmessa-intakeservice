import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import type { Feature } from '@utmessa/shared';

// Mock dependencies
vi.mock('@/lib/auth/validateOrchKey', () => ({
  validateOrchKey: vi.fn(),
}));

vi.mock('@/lib/services/featuresService', () => ({
  upsertFeatures: vi.fn(),
}));

import { validateOrchKey } from '@/lib/auth/validateOrchKey';
import { upsertFeatures } from '@/lib/services/featuresService';

describe('POST /api/ideas/[id]/features', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validOrchKey = 'test-orch-key-12345';

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
    return new NextRequest(`http://localhost/api/ideas/${validUuid}/features`, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  // Helper to create context with params
  const createContext = (id: string = validUuid) => ({
    params: Promise.resolve({ id }),
  });

  // Helper to create mock features
  const createMockFeatures = (ideaId: string, count: number = 2): Feature[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `feat-${i + 1}`,
      ideaId,
      featureId: `F${i + 1}`,
      title: `Feature ${i + 1}`,
      status: 'planned' as const,
    }));
  };

  describe('Authentication', () => {
    it('should reject request without X-ORCH-KEY header', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = createRequest({ features: [] }, {});
      const response = await POST(request, createContext());

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('X-ORCH-KEY');
    });

    it('should reject request with invalid X-ORCH-KEY', async () => {
      (validateOrchKey as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const request = createRequest({ features: [] }, { 'X-ORCH-KEY': 'invalid' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept request with valid X-ORCH-KEY', async () => {
      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 0,
      });

      const request = createRequest({ features: [] });
      const response = await POST(request, createContext());

      expect(response.status).not.toBe(401);
    });
  });

  describe('URL Parameter Validation', () => {
    it('should reject invalid UUID format', async () => {
      const invalidId = 'not-a-uuid';
      const request = createRequest({ features: [] });

      const response = await POST(request, createContext(invalidId));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('UUID');
    });

    it('should accept valid UUID format', async () => {
      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 0,
      });

      const request = createRequest({ features: [] });
      const response = await POST(request, createContext(validUuid));

      expect(response.status).not.toBe(400);
    });
  });

  describe('Request Body Validation', () => {
    it('should reject invalid JSON', async () => {
      const request = new NextRequest(`http://localhost/api/ideas/${validUuid}/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ORCH-KEY': validOrchKey,
        },
        body: 'not valid json{',
      });

      const response = await POST(request, createContext());

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('JSON');
    });

    it('should reject empty body', async () => {
      const request = createRequest({});
      const response = await POST(request, createContext());

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Bad Request');
      expect(data.details).toBeDefined();
    });

    it('should reject missing features field', async () => {
      const request = createRequest({ other: 'field' });
      const response = await POST(request, createContext());

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Bad Request');
      expect(data.details).toBeDefined();
    });

    it('should reject features with invalid structure', async () => {
      const request = createRequest({
        features: [
          {
            // Missing required fields
            featureId: 'F1',
          },
        ],
      });

      const response = await POST(request, createContext());

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Bad Request');
      expect(data.details).toBeDefined();
    });

    it('should reject features with invalid status', async () => {
      const request = createRequest({
        features: [
          {
            id: 'feat-1',
            ideaId: validUuid,
            featureId: 'F1',
            title: 'Feature 1',
            status: 'invalid_status',
          },
        ],
      });

      const response = await POST(request, createContext());

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Bad Request');
    });

    it('should accept valid features array', async () => {
      const validFeatures = createMockFeatures(validUuid, 1);

      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 1,
      });

      const request = createRequest({ features: validFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
    });
  });

  describe('Idea Existence Validation', () => {
    it('should return 404 when idea does not exist', async () => {
      const validFeatures = createMockFeatures(validUuid, 1);

      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'NOT_FOUND', ideaId: validUuid },
      });

      const request = createRequest({ features: validFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not Found');
      expect(data.message).toContain(validUuid);
    });

    it('should succeed when idea exists', async () => {
      const validFeatures = createMockFeatures(validUuid, 1);

      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 1,
      });

      const request = createRequest({ features: validFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
    });
  });

  describe('Successful Upsert', () => {
    it('should insert new features', async () => {
      const validFeatures = createMockFeatures(validUuid, 2);

      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 2,
      });

      const request = createRequest({ features: validFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify upsertFeatures was called with correct arguments
      expect(upsertFeatures).toHaveBeenCalledWith(validUuid, validFeatures);
    });

    it('should handle empty features array (clear all)', async () => {
      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 0,
      });

      const request = createRequest({ features: [] });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);

      // Verify upsertFeatures was called with empty array
      expect(upsertFeatures).toHaveBeenCalledWith(validUuid, []);
    });

    it('should handle all valid feature statuses', async () => {
      const allStatusFeatures: Feature[] = [
        {
          id: 'feat-1',
          ideaId: validUuid,
          featureId: 'F1',
          title: 'Feature 1',
          status: 'planned',
        },
        {
          id: 'feat-2',
          ideaId: validUuid,
          featureId: 'F2',
          title: 'Feature 2',
          status: 'in_progress',
        },
        {
          id: 'feat-3',
          ideaId: validUuid,
          featureId: 'F3',
          title: 'Feature 3',
          status: 'done',
        },
        {
          id: 'feat-4',
          ideaId: validUuid,
          featureId: 'F4',
          title: 'Feature 4',
          status: 'failed',
        },
        {
          id: 'feat-5',
          ideaId: validUuid,
          featureId: 'F5',
          title: 'Feature 5',
          status: 'skipped',
        },
      ];

      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 5,
      });

      const request = createRequest({ features: allStatusFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);

      // Verify all statuses were accepted
      expect(upsertFeatures).toHaveBeenCalledWith(validUuid, allStatusFeatures);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const validFeatures = createMockFeatures(validUuid, 1);

      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: { type: 'DATABASE_ERROR', message: 'Database connection failed' },
      });

      const request = createRequest({ features: validFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal Server Error');
    });

    it('should handle unexpected errors gracefully', async () => {
      const validFeatures = createMockFeatures(validUuid, 1);

      (upsertFeatures as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = createRequest({ features: validFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should return success response matching schema', async () => {
      const validFeatures = createMockFeatures(validUuid, 2);

      (upsertFeatures as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        ideaId: validUuid,
        featuresCount: 2,
      });

      const request = createRequest({ features: validFeatures });
      const response = await POST(request, createContext());

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should match UpsertFeaturesResponseSchema
      expect(data).toEqual({
        success: true,
      });
    });
  });
});
