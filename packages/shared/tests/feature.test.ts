import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  FeatureSchema,
  FeatureStatusSchema,
  FEATURE_STATUSES,
  validateFeature,
  safeValidateFeature,
} from '../src';
import type { Feature, FeatureStatus } from '../src';

// =============================================================================
// Test Data
// =============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const createValidFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'feat-123',
  ideaId: VALID_UUID,
  featureId: 'F1',
  title: 'User Authentication',
  status: 'planned',
  ...overrides,
});

// =============================================================================
// FeatureStatusSchema Tests
// =============================================================================

describe('FeatureStatusSchema', () => {
  it('validates all 5 status enum values', () => {
    const statuses: FeatureStatus[] = [
      'planned',
      'in_progress',
      'done',
      'failed',
      'skipped',
    ];

    for (const status of statuses) {
      expect(FeatureStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid status value', () => {
    expect(() => FeatureStatusSchema.parse('invalid')).toThrow(z.ZodError);
    expect(() => FeatureStatusSchema.parse('PLANNED')).toThrow(z.ZodError);
    expect(() => FeatureStatusSchema.parse('')).toThrow(z.ZodError);
  });

  it('FEATURE_STATUSES constant has correct values', () => {
    expect(FEATURE_STATUSES).toHaveLength(5);
    expect(FEATURE_STATUSES).toContain('planned');
    expect(FEATURE_STATUSES).toContain('in_progress');
    expect(FEATURE_STATUSES).toContain('done');
    expect(FEATURE_STATUSES).toContain('failed');
    expect(FEATURE_STATUSES).toContain('skipped');
  });
});

// =============================================================================
// FeatureSchema - Valid Input Tests
// =============================================================================

describe('FeatureSchema - Valid Inputs', () => {
  it('validates minimal valid feature (required fields only)', () => {
    const feature = createValidFeature();
    const result = validateFeature(feature);
    expect(result.id).toBe(feature.id);
    expect(result.title).toBe(feature.title);
    expect(result.status).toBe('planned');
  });

  it('validates full feature with all optional fields', () => {
    const feature = createValidFeature({
      description: 'Allow users to sign up and log in',
      acceptance: 'Users can create accounts and access protected routes',
      order: 0,
    });

    const result = validateFeature(feature);
    expect(result.description).toBe('Allow users to sign up and log in');
    expect(result.acceptance).toBe('Users can create accounts and access protected routes');
    expect(result.order).toBe(0);
  });

  it('validates feature with order 0', () => {
    const feature = createValidFeature({ order: 0 });
    const result = validateFeature(feature);
    expect(result.order).toBe(0);
  });

  it('validates feature with high order number', () => {
    const feature = createValidFeature({ order: 999 });
    const result = validateFeature(feature);
    expect(result.order).toBe(999);
  });

  it('validates all status values in features', () => {
    const statuses: FeatureStatus[] = ['planned', 'in_progress', 'done', 'failed', 'skipped'];

    for (const status of statuses) {
      const feature = createValidFeature({ status });
      const result = validateFeature(feature);
      expect(result.status).toBe(status);
    }
  });
});

// =============================================================================
// FeatureSchema - Invalid Input Tests
// =============================================================================

describe('FeatureSchema - Invalid Inputs', () => {
  it('rejects empty id', () => {
    const feature = createValidFeature({ id: '' });
    expect(() => validateFeature(feature)).toThrow(z.ZodError);
  });

  it('rejects empty featureId', () => {
    const feature = createValidFeature({ featureId: '' });
    expect(() => validateFeature(feature)).toThrow(z.ZodError);
  });

  it('rejects invalid ideaId (not UUID)', () => {
    const feature = createValidFeature({ ideaId: 'not-a-uuid' });
    expect(() => validateFeature(feature)).toThrow(z.ZodError);
  });

  it('rejects title too short (empty)', () => {
    const feature = createValidFeature({ title: '' });
    expect(() => validateFeature(feature)).toThrow(z.ZodError);
  });

  it('rejects invalid status value', () => {
    const feature = { ...createValidFeature(), status: 'invalid' };
    expect(() => validateFeature(feature)).toThrow(z.ZodError);
  });

  it('rejects negative order', () => {
    const feature = createValidFeature({ order: -1 });
    expect(() => validateFeature(feature)).toThrow(z.ZodError);
  });

  it('rejects non-integer order (decimal)', () => {
    const feature = createValidFeature({ order: 1.5 });
    expect(() => validateFeature(feature)).toThrow(z.ZodError);
  });

  it('rejects missing required fields', () => {
    expect(() => validateFeature({})).toThrow(z.ZodError);
    expect(() => validateFeature({ id: 'feat-1' })).toThrow(z.ZodError);
  });

  it('provides meaningful error for invalid ideaId', () => {
    const feature = createValidFeature({ ideaId: 'invalid' });
    try {
      validateFeature(feature);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      const zodError = error as z.ZodError;
      const ideaIdError = zodError.errors.find((e) => e.path.includes('ideaId'));
      expect(ideaIdError?.message).toBe('Invalid idea UUID format');
    }
  });
});

// =============================================================================
// FeatureSchema - Edge Case Tests
// =============================================================================

describe('FeatureSchema - Edge Cases', () => {
  it('trims whitespace from title', () => {
    const feature = createValidFeature({ title: '  User Auth  ' });
    const result = validateFeature(feature);
    expect(result.title).toBe('User Auth');
  });

  it('id and featureId can be different (they are independent)', () => {
    const feature = createValidFeature({
      id: 'database-record-id-123',
      featureId: 'F1',
    });
    const result = validateFeature(feature);
    expect(result.id).toBe('database-record-id-123');
    expect(result.featureId).toBe('F1');
  });

  it('accepts very long title', () => {
    const feature = createValidFeature({ title: 'A'.repeat(1000) });
    expect(() => validateFeature(feature)).not.toThrow();
  });

  it('handles unicode in strings', () => {
    const feature = createValidFeature({
      title: 'Feature \ud83d\ude80',
      description: 'Description with \u4e2d\u6587',
    });
    const result = validateFeature(feature);
    expect(result.title).toContain('\ud83d\ude80');
    expect(result.description).toContain('\u4e2d\u6587');
  });

  it('allows empty description and acceptance', () => {
    const feature = createValidFeature({
      description: '',
      acceptance: '',
    });
    expect(() => validateFeature(feature)).not.toThrow();
  });

  it('order can be very large', () => {
    const feature = createValidFeature({ order: Number.MAX_SAFE_INTEGER });
    const result = validateFeature(feature);
    expect(result.order).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// =============================================================================
// Safe Validation Tests
// =============================================================================

describe('safeValidateFeature', () => {
  it('returns success result for valid feature', () => {
    const feature = createValidFeature();
    const result = safeValidateFeature(feature);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(feature.id);
    }
  });

  it('returns error result for invalid feature', () => {
    const result = safeValidateFeature({ id: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(z.ZodError);
      expect(result.error.errors.length).toBeGreaterThan(0);
    }
  });

  it('provides field-level error messages', () => {
    const result = safeValidateFeature({
      id: '',
      ideaId: 'not-uuid',
      featureId: '',
      title: '',
      status: 'invalid',
      order: -1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path[0]);
      expect(paths).toContain('id');
      expect(paths).toContain('ideaId');
      expect(paths).toContain('featureId');
      expect(paths).toContain('title');
      expect(paths).toContain('status');
      expect(paths).toContain('order');
    }
  });
});

// =============================================================================
// Type Inference Tests
// =============================================================================

describe('Type Inference', () => {
  it('infers Feature type correctly', () => {
    const feature = validateFeature(createValidFeature());

    // TypeScript type checks
    expect(typeof feature.id).toBe('string');
    expect(typeof feature.ideaId).toBe('string');
    expect(typeof feature.featureId).toBe('string');
    expect(typeof feature.title).toBe('string');
    expect(typeof feature.status).toBe('string');
  });

  it('infers FeatureStatus type from schema', () => {
    const status: FeatureStatus = FeatureStatusSchema.parse('in_progress');
    expect(status).toBe('in_progress');
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('Performance', () => {
  it('validates feature in <5ms', () => {
    const feature = createValidFeature();
    const start = performance.now();
    validateFeature(feature);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });

  it('batch validates 100 features in <300ms', () => {
    const features = Array.from({ length: 100 }, (_, i) =>
      createValidFeature({
        id: `feat-${i}`,
        featureId: `F${i}`,
        title: `Feature ${i}`,
        order: i,
      })
    );

    const start = performance.now();
    features.forEach((feature) => validateFeature(feature));
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(300);
  });
});
