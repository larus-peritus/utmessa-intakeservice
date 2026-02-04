import { describe, it, expect } from 'vitest';
import {
  FeaturesPlannedEventSchema,
  FeatureStartedEventSchema,
  FeatureDoneEventSchema,
  FeatureFailedEventSchema,
  FeatureSkippedEventSchema,
} from '../src/schemas/events';

describe('Feature Events', () => {
  describe('FeaturesPlannedEvent', () => {
    it('should validate with positive integer', () => {
      const result = FeaturesPlannedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURES_PLANNED',
        total: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should validate with total of 1', () => {
      const result = FeaturesPlannedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURES_PLANNED',
        total: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero total', () => {
      const result = FeaturesPlannedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURES_PLANNED',
        total: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative total', () => {
      const result = FeaturesPlannedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURES_PLANNED',
        total: -5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject decimal total', () => {
      const result = FeaturesPlannedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURES_PLANNED',
        total: 5.5,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing total', () => {
      const result = FeaturesPlannedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURES_PLANNED',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('FeatureStartedEvent', () => {
    it('should validate with featureId', () => {
      const result = FeatureStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_STARTED',
        featureId: 'F1',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with title', () => {
      const result = FeatureStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_STARTED',
        featureId: 'F1',
        title: 'User Authentication',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with all optional fields', () => {
      const result = FeatureStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_STARTED',
        featureId: 'F1',
        title: 'User Authentication',
        message: 'Starting implementation',
        meta: { complexity: 'high' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty featureId', () => {
      const result = FeatureStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_STARTED',
        featureId: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Feature ID cannot be empty');
      }
    });

    it('should reject missing featureId', () => {
      const result = FeatureStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_STARTED',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('FeatureDoneEvent', () => {
    it('should validate with featureId', () => {
      const result = FeatureDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_DONE',
        featureId: 'F1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty featureId', () => {
      const result = FeatureDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_DONE',
        featureId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should validate with message', () => {
      const result = FeatureDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_DONE',
        featureId: 'F1',
        message: 'Feature completed successfully',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('FeatureFailedEvent', () => {
    it('should validate with featureId and reason', () => {
      const result = FeatureFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_FAILED',
        featureId: 'F2',
        reason: 'Build error',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing reason', () => {
      const result = FeatureFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_FAILED',
        featureId: 'F2',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = FeatureFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_FAILED',
        featureId: 'F2',
        reason: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Reason cannot be empty');
      }
    });

    it('should reject empty featureId', () => {
      const result = FeatureFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_FAILED',
        featureId: '',
        reason: 'Some reason',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('FeatureSkippedEvent', () => {
    it('should validate without reason', () => {
      const result = FeatureSkippedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_SKIPPED',
        featureId: 'F3',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with reason', () => {
      const result = FeatureSkippedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_SKIPPED',
        featureId: 'F3',
        reason: 'Optional feature',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty featureId', () => {
      const result = FeatureSkippedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_SKIPPED',
        featureId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should allow empty reason (reason is optional)', () => {
      const result = FeatureSkippedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_SKIPPED',
        featureId: 'F3',
        reason: '',
      });
      expect(result.success).toBe(true);
    });
  });
});
