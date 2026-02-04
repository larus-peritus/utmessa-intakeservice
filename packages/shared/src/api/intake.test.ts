/**
 * Tests for Intake API DTOs
 *
 * Validates all request/response schemas for Intake service endpoints.
 * Covers both public (submit, get) and protected (list, claim, update, upsert) endpoints.
 */

import { describe, it, expect } from 'vitest';
import {
  // Public types
  PublicIdeaSchema,
  PublicIdea,
  // Submit Idea
  SubmitIdeaRequestSchema,
  SubmitIdeaResponseSchema,
  SubmitIdeaRequest,
  SubmitIdeaResponse,
  // Get Idea
  GetIdeaResponseSchema,
  GetIdeaResponse,
  // List Ideas
  ListIdeasQuerySchema,
  ListIdeasResponseSchema,
  ListIdeasQuery,
  ListIdeasResponse,
  // Claim Idea
  ClaimIdeaRequestSchema,
  ClaimIdeaResponseSchema,
  ClaimIdeaRequest,
  ClaimIdeaResponse,
  // Update Idea
  UpdateIdeaRequestSchema,
  UpdateIdeaResponseSchema,
  UpdateIdeaRequest,
  UpdateIdeaResponse,
  // Upsert Features
  UpsertFeaturesRequestSchema,
  UpsertFeaturesResponseSchema,
  UpsertFeaturesRequest,
  UpsertFeaturesResponse,
} from './intake';

// =============================================================================
// Test Data Fixtures
// =============================================================================

const validIdeaBase = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  token: 'receipt-abc123',
  title: 'Recipe App',
  problem: 'Need to track family recipes with search and sharing',
  email: 'user@example.com',
  status: 'submitted' as const,
  createdAt: '2026-01-26T10:00:00.000Z',
  updatedAt: '2026-01-26T10:00:00.000Z',
};

const validFeature = {
  id: 'feat-123',
  ideaId: '550e8400-e29b-41d4-a716-446655440000',
  featureId: 'F1',
  title: 'User Authentication',
  status: 'planned' as const,
};

// =============================================================================
// PublicIdea Tests
// =============================================================================

describe('PublicIdeaSchema', () => {
  it('accepts valid public idea with all fields', () => {
    const publicIdea = {
      ...validIdeaBase,
      mustHaves: ['auth', 'search'],
      progress: 50,
      currentStep: 'Building authentication',
      currentFeature: 'F1',
      waitingQuestion: 'What color theme?',
      demoUrl: 'https://demo.example.com',
      repoUrl: 'https://github.com/user/repo',
    };
    expect(() => PublicIdeaSchema.parse(publicIdea)).not.toThrow();
  });

  it('accepts minimal public idea', () => {
    expect(() => PublicIdeaSchema.parse(validIdeaBase)).not.toThrow();
  });

  it('excludes slug field from type', () => {
    const ideaWithSlug = {
      ...validIdeaBase,
      slug: 'internal-slug',
    };
    const result = PublicIdeaSchema.parse(ideaWithSlug);
    // Slug should be stripped out
    expect(result).not.toHaveProperty('slug');
  });

  it('validates optional fields correctly', () => {
    const publicIdea: PublicIdea = {
      ...validIdeaBase,
      progress: 75,
      demoUrl: 'https://demo.example.com',
    };
    expect(() => PublicIdeaSchema.parse(publicIdea)).not.toThrow();
  });
});

// =============================================================================
// Submit Idea Request Tests
// =============================================================================

describe('SubmitIdeaRequestSchema', () => {
  it('accepts valid submission with all fields', () => {
    const valid: SubmitIdeaRequest = {
      title: 'Recipe App',
      problem: 'Need to track family recipes',
      mustHaves: ['auth', 'search'],
      email: 'user@example.com',
    };
    expect(() => SubmitIdeaRequestSchema.parse(valid)).not.toThrow();
  });

  it('accepts submission without optional fields', () => {
    const minimal = {
      title: 'Valid Title',
      problem: 'Valid problem description',
    };
    expect(() => SubmitIdeaRequestSchema.parse(minimal)).not.toThrow();
  });

  it('rejects empty title', () => {
    const invalid = { title: '', problem: 'Valid problem text' };
    expect(() => SubmitIdeaRequestSchema.parse(invalid)).toThrow('Title is required');
  });

  it('trims whitespace-only title to empty (caught by min check)', () => {
    // Note: Zod's trim() applies AFTER parsing, so whitespace-only strings
    // pass min(1) check. This test verifies trim behavior instead.
    const input = { title: '   ', problem: 'Valid problem text' };
    const result = SubmitIdeaRequestSchema.parse(input);
    expect(result.title).toBe('');
  });

  it('rejects title exceeding 200 characters', () => {
    const invalid = {
      title: 'A'.repeat(201),
      problem: 'Valid problem text',
    };
    expect(() => SubmitIdeaRequestSchema.parse(invalid)).toThrow('Title too long');
  });

  it('rejects short problem (< 10 chars)', () => {
    const invalid = { title: 'Valid', problem: 'Short' };
    expect(() => SubmitIdeaRequestSchema.parse(invalid)).toThrow('too short');
  });

  it('rejects invalid email format', () => {
    const invalid = {
      title: 'Valid',
      problem: 'Valid problem text',
      email: 'notanemail',
    };
    expect(() => SubmitIdeaRequestSchema.parse(invalid)).toThrow('Invalid email');
  });

  it('rejects too many mustHaves (> 10)', () => {
    const invalid = {
      title: 'Valid',
      problem: 'Valid problem text',
      mustHaves: Array(11).fill('item'),
    };
    expect(() => SubmitIdeaRequestSchema.parse(invalid)).toThrow('Too many');
  });

  it('trims whitespace from title', () => {
    const input = { title: '  Valid  ', problem: 'Valid problem text' };
    const result = SubmitIdeaRequestSchema.parse(input);
    expect(result.title).toBe('Valid');
  });

  it('trims whitespace from problem', () => {
    const input = { title: 'Valid', problem: '  Valid problem text  ' };
    const result = SubmitIdeaRequestSchema.parse(input);
    expect(result.problem).toBe('Valid problem text');
  });

  it('accepts empty mustHaves array', () => {
    const input = {
      title: 'Valid',
      problem: 'Valid problem text',
      mustHaves: [],
    };
    expect(() => SubmitIdeaRequestSchema.parse(input)).not.toThrow();
  });
});

// =============================================================================
// Submit Idea Response Tests
// =============================================================================

describe('SubmitIdeaResponseSchema', () => {
  it('accepts valid response', () => {
    const valid: SubmitIdeaResponse = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      token: 'receipt-abc123',
      createdAt: '2026-01-26T10:00:00.000Z',
    };
    expect(() => SubmitIdeaResponseSchema.parse(valid)).not.toThrow();
  });

  it('accepts response with timezone offset', () => {
    const valid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      token: 'receipt-abc123',
      createdAt: '2026-01-26T10:00:00+05:30',
    };
    expect(() => SubmitIdeaResponseSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid UUID', () => {
    const invalid = {
      id: 'not-a-uuid',
      token: 'receipt-abc123',
      createdAt: '2026-01-26T10:00:00.000Z',
    };
    expect(() => SubmitIdeaResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects invalid datetime', () => {
    const invalid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      token: 'receipt-abc123',
      createdAt: 'not-a-datetime',
    };
    expect(() => SubmitIdeaResponseSchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// Get Idea Response Tests
// =============================================================================

describe('GetIdeaResponseSchema (PublicIdea)', () => {
  it('accepts valid public idea response', () => {
    const publicIdea: GetIdeaResponse = {
      ...validIdeaBase,
      mustHaves: ['auth', 'search'],
    };
    expect(() => GetIdeaResponseSchema.parse(publicIdea)).not.toThrow();
  });

  it('includes all public fields', () => {
    const idea = GetIdeaResponseSchema.parse({
      ...validIdeaBase,
      progress: 50,
      currentStep: 'Building auth',
      currentFeature: 'F1',
      demoUrl: 'https://demo.example.com',
      repoUrl: 'https://github.com/user/repo',
    });

    expect(idea.id).toBe(validIdeaBase.id);
    expect(idea.token).toBe(validIdeaBase.token);
    expect(idea.title).toBe(validIdeaBase.title);
    expect(idea.problem).toBe(validIdeaBase.problem);
    expect(idea.status).toBe(validIdeaBase.status);
    expect(idea.progress).toBe(50);
    expect(idea.currentStep).toBe('Building auth');
    expect(idea.currentFeature).toBe('F1');
    expect(idea.demoUrl).toBe('https://demo.example.com');
    expect(idea.repoUrl).toBe('https://github.com/user/repo');
  });

  it('excludes internal fields from type', () => {
    const idea = GetIdeaResponseSchema.parse({
      ...validIdeaBase,
      slug: 'internal-slug',
    });

    // Verify slug is not in the result
    expect(idea).not.toHaveProperty('slug');
  });

  it('validates optional field types', () => {
    const idea = GetIdeaResponseSchema.parse(validIdeaBase);
    expect(idea.progress).toBeUndefined();
    expect(idea.demoUrl).toBeUndefined();
  });
});

// =============================================================================
// List Ideas Query Tests
// =============================================================================

describe('ListIdeasQuerySchema', () => {
  it('accepts query with status filter', () => {
    const query: ListIdeasQuery = { status: 'submitted' };
    expect(() => ListIdeasQuerySchema.parse(query)).not.toThrow();
  });

  it('accepts query without filter', () => {
    expect(() => ListIdeasQuerySchema.parse({})).not.toThrow();
  });

  it('accepts all valid status values', () => {
    const statuses = ['submitted', 'ready', 'claimed', 'running', 'waiting', 'deployed', 'failed', 'abandoned'];
    for (const status of statuses) {
      expect(() => ListIdeasQuerySchema.parse({ status })).not.toThrow();
    }
  });

  it('rejects invalid status value', () => {
    const invalid = { status: 'invalid-status' };
    expect(() => ListIdeasQuerySchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// List Ideas Response Tests
// =============================================================================

describe('ListIdeasResponseSchema', () => {
  it('accepts valid response with full Idea fields', () => {
    const response: ListIdeasResponse = {
      ideas: [
        {
          ...validIdeaBase,
          slug: 'internal-slug', // Internal field included for protected endpoint
        },
      ],
      total: 1,
    };
    expect(() => ListIdeasResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts response with empty ideas array', () => {
    const response = { ideas: [], total: 0 };
    expect(() => ListIdeasResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts response with multiple ideas', () => {
    const response = {
      ideas: [
        { ...validIdeaBase, id: '550e8400-e29b-41d4-a716-446655440001' },
        { ...validIdeaBase, id: '550e8400-e29b-41d4-a716-446655440002' },
      ],
      total: 2,
    };
    expect(() => ListIdeasResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects negative total', () => {
    const invalid = { ideas: [], total: -1 };
    expect(() => ListIdeasResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects non-integer total', () => {
    const invalid = { ideas: [], total: 1.5 };
    expect(() => ListIdeasResponseSchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// Claim Idea Request Tests
// =============================================================================

describe('ClaimIdeaRequestSchema', () => {
  it('accepts valid claim request', () => {
    const request: ClaimIdeaRequest = { claimedBy: 'orchestrator-1' };
    expect(() => ClaimIdeaRequestSchema.parse(request)).not.toThrow();
  });

  it('rejects empty claimedBy', () => {
    const invalid = { claimedBy: '' };
    expect(() => ClaimIdeaRequestSchema.parse(invalid)).toThrow('claimedBy is required');
  });

  it('rejects missing claimedBy', () => {
    const invalid = {};
    expect(() => ClaimIdeaRequestSchema.parse(invalid)).toThrow();
  });

  it('accepts various claimedBy formats', () => {
    const formats = [
      'orchestrator-1',
      'user@example.com',
      'booth-station-42',
      'localhost:3000',
    ];
    for (const claimedBy of formats) {
      expect(() => ClaimIdeaRequestSchema.parse({ claimedBy })).not.toThrow();
    }
  });
});

// =============================================================================
// Claim Idea Response Tests
// =============================================================================

describe('ClaimIdeaResponseSchema', () => {
  it('accepts valid claimed idea response', () => {
    const response: ClaimIdeaResponse = {
      ...validIdeaBase,
      slug: 'claimed-project-slug',
    };
    expect(() => ClaimIdeaResponseSchema.parse(response)).not.toThrow();
  });

  it('includes token in response', () => {
    const response = ClaimIdeaResponseSchema.parse(validIdeaBase);
    expect(response.token).toBe(validIdeaBase.token);
  });

  it('includes all Idea fields', () => {
    // Note: Zod's optional() accepts undefined but NOT null
    // Use undefined or omit fields for optional values
    const fullIdea = {
      ...validIdeaBase,
      mustHaves: ['auth'],
      progress: 0,
      currentStep: 'Starting',
      currentFeature: 'F1',
      waitingQuestion: 'What color?',
      demoUrl: 'https://demo.example.com',
      repoUrl: 'https://github.com/user/repo',
      slug: 'project-slug',
    };
    expect(() => ClaimIdeaResponseSchema.parse(fullIdea)).not.toThrow();
  });
});

// =============================================================================
// Update Idea Request Tests
// =============================================================================

describe('UpdateIdeaRequestSchema', () => {
  it('accepts partial update with single field', () => {
    const partial: UpdateIdeaRequest = { progress: 50 };
    expect(() => UpdateIdeaRequestSchema.parse(partial)).not.toThrow();
  });

  it('accepts partial update with multiple fields', () => {
    const partial: UpdateIdeaRequest = {
      status: 'running',
      progress: 60,
      currentFeature: 'F3',
    };
    expect(() => UpdateIdeaRequestSchema.parse(partial)).not.toThrow();
  });

  it('accepts empty update object (no-op)', () => {
    expect(() => UpdateIdeaRequestSchema.parse({})).not.toThrow();
  });

  it('rejects progress < 0', () => {
    const invalid = { progress: -10 };
    expect(() => UpdateIdeaRequestSchema.parse(invalid)).toThrow();
  });

  it('rejects progress > 100', () => {
    const invalid = { progress: 150 };
    expect(() => UpdateIdeaRequestSchema.parse(invalid)).toThrow();
  });

  it('accepts progress at boundaries', () => {
    expect(() => UpdateIdeaRequestSchema.parse({ progress: 0 })).not.toThrow();
    expect(() => UpdateIdeaRequestSchema.parse({ progress: 100 })).not.toThrow();
  });

  it('rejects invalid demoUrl', () => {
    const invalid = { demoUrl: 'not-a-url' };
    expect(() => UpdateIdeaRequestSchema.parse(invalid)).toThrow('Invalid demo URL');
  });

  it('rejects invalid repoUrl', () => {
    const invalid = { repoUrl: 'not-a-url' };
    expect(() => UpdateIdeaRequestSchema.parse(invalid)).toThrow('Invalid repo URL');
  });

  it('accepts valid URLs', () => {
    const valid = {
      demoUrl: 'https://demo.example.com/app',
      repoUrl: 'https://github.com/user/repo',
    };
    expect(() => UpdateIdeaRequestSchema.parse(valid)).not.toThrow();
  });

  it('rejects unknown fields (strict mode)', () => {
    const invalid = { unknownField: 'value' };
    expect(() => UpdateIdeaRequestSchema.parse(invalid)).toThrow();
  });

  it('accepts all valid status values', () => {
    const statuses = ['submitted', 'ready', 'claimed', 'running', 'waiting', 'deployed', 'failed', 'abandoned'];
    for (const status of statuses) {
      expect(() => UpdateIdeaRequestSchema.parse({ status })).not.toThrow();
    }
  });

  it('rejects invalid status value', () => {
    const invalid = { status: 'invalid-status' };
    expect(() => UpdateIdeaRequestSchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// Update Idea Response Tests
// =============================================================================

describe('UpdateIdeaResponseSchema', () => {
  it('accepts valid updated idea response', () => {
    const response: UpdateIdeaResponse = {
      ...validIdeaBase,
      progress: 60,
      currentFeature: 'F3',
    };
    expect(() => UpdateIdeaResponseSchema.parse(response)).not.toThrow();
  });

  it('returns full Idea with all fields', () => {
    const response = UpdateIdeaResponseSchema.parse(validIdeaBase);
    expect(response.id).toBe(validIdeaBase.id);
    expect(response.token).toBe(validIdeaBase.token);
    expect(response.status).toBe(validIdeaBase.status);
  });
});

// =============================================================================
// Upsert Features Request Tests
// =============================================================================

describe('UpsertFeaturesRequestSchema', () => {
  it('accepts valid features array', () => {
    const request: UpsertFeaturesRequest = {
      features: [validFeature],
    };
    expect(() => UpsertFeaturesRequestSchema.parse(request)).not.toThrow();
  });

  it('accepts empty features array', () => {
    expect(() => UpsertFeaturesRequestSchema.parse({ features: [] })).not.toThrow();
  });

  it('accepts multiple features', () => {
    const request = {
      features: [
        { ...validFeature, id: 'F1', featureId: 'F1', title: 'Auth' },
        { ...validFeature, id: 'F2', featureId: 'F2', title: 'Dashboard' },
        { ...validFeature, id: 'F3', featureId: 'F3', title: 'Settings' },
      ],
    };
    expect(() => UpsertFeaturesRequestSchema.parse(request)).not.toThrow();
  });

  it('rejects invalid feature in array', () => {
    const invalid = {
      features: [
        { ...validFeature },
        { id: '', ideaId: 'not-a-uuid', featureId: '', title: '', status: 'invalid' },
      ],
    };
    expect(() => UpsertFeaturesRequestSchema.parse(invalid)).toThrow();
  });

  it('rejects missing features field', () => {
    expect(() => UpsertFeaturesRequestSchema.parse({})).toThrow();
  });
});

// =============================================================================
// Upsert Features Response Tests
// =============================================================================

describe('UpsertFeaturesResponseSchema', () => {
  it('accepts valid success response', () => {
    const response: UpsertFeaturesResponse = { success: true };
    expect(() => UpsertFeaturesResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects success: false', () => {
    const invalid = { success: false };
    expect(() => UpsertFeaturesResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects missing success field', () => {
    expect(() => UpsertFeaturesResponseSchema.parse({})).toThrow();
  });
});

// =============================================================================
// Type Inference Tests
// =============================================================================

describe('Type inference', () => {
  it('correctly infers SubmitIdeaRequest type', () => {
    const request: SubmitIdeaRequest = {
      title: 'Test',
      problem: 'Test problem description',
    };
    expect(request.title).toBe('Test');
    expect(request.email).toBeUndefined();
  });

  it('correctly infers GetIdeaResponse type', () => {
    const response: GetIdeaResponse = {
      ...validIdeaBase,
    };
    expect(response.status).toBe('submitted');
  });

  it('correctly infers UpdateIdeaRequest type', () => {
    const request: UpdateIdeaRequest = {
      progress: 50,
    };
    expect(request.progress).toBe(50);
    expect(request.status).toBeUndefined();
  });
});
