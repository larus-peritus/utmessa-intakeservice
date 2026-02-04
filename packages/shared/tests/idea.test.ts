import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  IdeaSchema,
  IdeaStatusSchema,
  IDEA_STATUSES,
  validateIdea,
  safeValidateIdea,
} from '../src';
import type { Idea, IdeaStatus } from '../src';

// =============================================================================
// Test Data
// =============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TIMESTAMP = '2026-01-26T10:00:00.000Z';
const VALID_TIMESTAMP_WITH_OFFSET = '2026-01-26T10:00:00+05:30';

const createValidIdea = (overrides: Partial<Idea> = {}): Idea => ({
  id: VALID_UUID,
  token: 'receipt-abc123',
  title: 'Todo App with Dark Mode',
  problem: 'I need a simple todo app that supports dark mode and cloud sync.',
  email: 'user@example.com',
  status: 'submitted',
  createdAt: VALID_TIMESTAMP,
  updatedAt: VALID_TIMESTAMP,
  ...overrides,
});

// =============================================================================
// IdeaStatusSchema Tests
// =============================================================================

describe('IdeaStatusSchema', () => {
  it('validates all 8 status enum values', () => {
    const statuses: IdeaStatus[] = [
      'submitted',
      'ready',
      'claimed',
      'running',
      'waiting',
      'deployed',
      'failed',
      'abandoned',
    ];

    for (const status of statuses) {
      expect(IdeaStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid status value', () => {
    expect(() => IdeaStatusSchema.parse('invalid')).toThrow(z.ZodError);
    expect(() => IdeaStatusSchema.parse('SUBMITTED')).toThrow(z.ZodError);
    expect(() => IdeaStatusSchema.parse('')).toThrow(z.ZodError);
  });

  it('IDEA_STATUSES constant has correct values', () => {
    expect(IDEA_STATUSES).toHaveLength(8);
    expect(IDEA_STATUSES).toContain('submitted');
    expect(IDEA_STATUSES).toContain('ready');
    expect(IDEA_STATUSES).toContain('claimed');
    expect(IDEA_STATUSES).toContain('running');
    expect(IDEA_STATUSES).toContain('waiting');
    expect(IDEA_STATUSES).toContain('deployed');
    expect(IDEA_STATUSES).toContain('failed');
    expect(IDEA_STATUSES).toContain('abandoned');
  });
});

// =============================================================================
// IdeaSchema - Valid Input Tests
// =============================================================================

describe('IdeaSchema - Valid Inputs', () => {
  it('validates minimal valid idea (required fields only)', () => {
    const idea = createValidIdea();
    const result = validateIdea(idea);
    expect(result.id).toBe(idea.id);
    expect(result.title).toBe(idea.title);
    expect(result.status).toBe('submitted');
  });

  it('validates full idea with all optional fields', () => {
    const idea = createValidIdea({
      mustHaves: ['Dark mode', 'Cloud sync', 'Offline support'],
      progress: 75,
      currentStep: 'Building feature F3',
      currentFeature: 'F3',
      waitingQuestion: 'Which color scheme?',
      demoUrl: 'https://my-app.vercel.app',
      repoUrl: 'https://github.com/user/my-app',
      slug: 'my-todo-app',
    });

    const result = validateIdea(idea);
    expect(result.mustHaves).toEqual(['Dark mode', 'Cloud sync', 'Offline support']);
    expect(result.progress).toBe(75);
    expect(result.demoUrl).toBe('https://my-app.vercel.app');
    expect(result.slug).toBe('my-todo-app');
  });

  it('validates idea with empty mustHaves array', () => {
    const idea = createValidIdea({ mustHaves: [] });
    const result = validateIdea(idea);
    expect(result.mustHaves).toEqual([]);
  });

  it('validates idea with multiple mustHaves', () => {
    const mustHaves = ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'];
    const idea = createValidIdea({ mustHaves });
    const result = validateIdea(idea);
    expect(result.mustHaves).toHaveLength(5);
  });

  it('validates idea with timezone offset in timestamps', () => {
    const idea = createValidIdea({
      createdAt: VALID_TIMESTAMP_WITH_OFFSET,
      updatedAt: VALID_TIMESTAMP_WITH_OFFSET,
    });
    expect(() => validateIdea(idea)).not.toThrow();
  });

  it('validates idea with milliseconds in timestamps', () => {
    const idea = createValidIdea({
      createdAt: '2026-01-26T10:00:00.123Z',
      updatedAt: '2026-01-26T10:00:00.456Z',
    });
    expect(() => validateIdea(idea)).not.toThrow();
  });
});

// =============================================================================
// IdeaSchema - Invalid Input Tests
// =============================================================================

describe('IdeaSchema - Invalid Inputs', () => {
  it('rejects invalid UUID format', () => {
    const idea = createValidIdea({ id: 'not-a-uuid' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects empty token', () => {
    const idea = createValidIdea({ token: '' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects title too short (empty string)', () => {
    const idea = createValidIdea({ title: '' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects title too long (>200 chars)', () => {
    const idea = createValidIdea({ title: 'a'.repeat(201) });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects problem too short (<10 chars)', () => {
    const idea = createValidIdea({ problem: 'Too short' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects invalid email format', () => {
    const idea = createValidIdea({ email: 'not-an-email' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects invalid status value', () => {
    const idea = { ...createValidIdea(), status: 'invalid' };
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects progress below 0', () => {
    const idea = createValidIdea({ progress: -1 });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects progress above 100', () => {
    const idea = createValidIdea({ progress: 101 });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects invalid URL format (demoUrl)', () => {
    const idea = createValidIdea({ demoUrl: 'not-a-url' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects invalid URL format (repoUrl)', () => {
    const idea = createValidIdea({ repoUrl: 'not-a-url' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects invalid datetime format', () => {
    const idea = createValidIdea({ createdAt: 'not-a-date' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects date-only format (no time)', () => {
    const idea = createValidIdea({ createdAt: '2026-01-26' });
    expect(() => validateIdea(idea)).toThrow(z.ZodError);
  });

  it('rejects missing required fields', () => {
    expect(() => validateIdea({})).toThrow(z.ZodError);
    expect(() => validateIdea({ id: VALID_UUID })).toThrow(z.ZodError);
  });
});

// =============================================================================
// IdeaSchema - Edge Case Tests
// =============================================================================

describe('IdeaSchema - Edge Cases', () => {
  it('trims whitespace from title', () => {
    const idea = createValidIdea({ title: '  My App  ' });
    const result = validateIdea(idea);
    expect(result.title).toBe('My App');
  });

  it('trims whitespace from problem', () => {
    const idea = createValidIdea({ problem: '  I need an app that does something really important  ' });
    const result = validateIdea(idea);
    expect(result.problem).toBe('I need an app that does something really important');
  });

  it('allows progress at boundary 0', () => {
    const idea = createValidIdea({ progress: 0 });
    const result = validateIdea(idea);
    expect(result.progress).toBe(0);
  });

  it('allows progress at boundary 100', () => {
    const idea = createValidIdea({ progress: 100 });
    const result = validateIdea(idea);
    expect(result.progress).toBe(100);
  });

  it('allows decimal progress values', () => {
    const idea = createValidIdea({ progress: 33.33 });
    const result = validateIdea(idea);
    expect(result.progress).toBe(33.33);
  });

  it('handles unicode characters in strings', () => {
    const idea = createValidIdea({
      title: 'My App \ud83d\ude80',
      problem: 'I need an app that supports multiple languages including \u4e2d\u6587 and \u65e5\u672c\u8a9e.',
    });
    const result = validateIdea(idea);
    expect(result.title).toContain('\ud83d\ude80');
  });

  it('accepts title at max length (200 chars)', () => {
    const idea = createValidIdea({ title: 'a'.repeat(200) });
    expect(() => validateIdea(idea)).not.toThrow();
  });

  it('accepts problem at min length (10 chars)', () => {
    const idea = createValidIdea({ problem: '1234567890' });
    expect(() => validateIdea(idea)).not.toThrow();
  });
});

// =============================================================================
// Safe Validation Tests
// =============================================================================

describe('safeValidateIdea', () => {
  it('returns success result for valid idea', () => {
    const idea = createValidIdea();
    const result = safeValidateIdea(idea);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(idea.id);
    }
  });

  it('returns error result for invalid idea', () => {
    const result = safeValidateIdea({ id: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(z.ZodError);
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  it('provides field-level error messages', () => {
    const result = safeValidateIdea({
      id: 'not-uuid',
      token: '',
      title: '',
      problem: 'short',
      email: 'invalid',
      status: 'unknown',
      createdAt: 'bad-date',
      updatedAt: 'bad-date',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0]);
      expect(paths).toContain('id');
      expect(paths).toContain('token');
      expect(paths).toContain('title');
      expect(paths).toContain('problem');
      expect(paths).toContain('email');
      expect(paths).toContain('status');
    }
  });
});

// =============================================================================
// Type Inference Tests
// =============================================================================

describe('Type Inference', () => {
  it('infers Idea type correctly', () => {
    const idea = validateIdea(createValidIdea());

    // TypeScript type checks - verify type inference at compile time
    expect(typeof idea.id).toBe('string');
    expect(typeof idea.token).toBe('string');
    expect(typeof idea.title).toBe('string');
    expect(typeof idea.problem).toBe('string');
    expect(typeof idea.email).toBe('string');
    expect(typeof idea.status).toBe('string');
    expect(typeof idea.createdAt).toBe('string');
    expect(typeof idea.updatedAt).toBe('string');
  });

  it('infers IdeaStatus type from schema', () => {
    const status: IdeaStatus = IdeaStatusSchema.parse('running');
    expect(status).toBe('running');
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('Performance', () => {
  it('validates idea in <5ms', () => {
    const idea = createValidIdea();
    const start = performance.now();
    validateIdea(idea);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it('batch validates 100 ideas in <500ms', () => {
    const ideas = Array.from({ length: 100 }, (_, i) =>
      createValidIdea({
        id: `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
        title: `App ${i}`,
      })
    );

    const start = performance.now();
    ideas.forEach((idea) => validateIdea(idea));
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
