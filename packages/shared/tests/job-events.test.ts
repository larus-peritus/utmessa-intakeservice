import { describe, it, expect } from 'vitest';
import {
  JobCreatedEventSchema,
  JobStartedEventSchema,
  JobFailedEventSchema,
  JobDoneEventSchema,
} from '../src/schemas/events';

describe('Job Events', () => {
  describe('JobCreatedEvent', () => {
    it('should validate without projectSlug', () => {
      const result = JobCreatedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_CREATED',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with projectSlug', () => {
      const result = JobCreatedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_CREATED',
        projectSlug: 'recipe-app',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with all optional fields', () => {
      const result = JobCreatedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_CREATED',
        projectSlug: 'recipe-app',
        message: 'Project initialized',
        meta: { creator: 'user123' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = JobCreatedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_STARTED',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('JobStartedEvent', () => {
    it('should validate minimal event', () => {
      const result = JobStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_STARTED',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with message', () => {
      const result = JobStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_STARTED',
        message: 'Starting build process',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with meta', () => {
      const result = JobStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_STARTED',
        meta: { buildId: '12345', retry: false },
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = JobStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_CREATED',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('JobFailedEvent', () => {
    it('should validate with reason', () => {
      const result = JobFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_FAILED',
        reason: 'Dependency install failed',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing reason', () => {
      const result = JobFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_FAILED',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('reason');
      }
    });

    it('should reject empty reason', () => {
      const result = JobFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_FAILED',
        reason: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Reason cannot be empty');
      }
    });

    it('should validate with reason and message', () => {
      const result = JobFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_FAILED',
        reason: 'Out of memory',
        message: 'Build failed due to resource constraints',
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = JobFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_DONE',
        reason: 'Some reason',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('JobDoneEvent', () => {
    it('should validate minimal event', () => {
      const result = JobDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_DONE',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with message', () => {
      const result = JobDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_DONE',
        message: 'Build completed successfully',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with meta', () => {
      const result = JobDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_DONE',
        meta: { duration: 120, features: 5 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = JobDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_STARTED',
      });
      expect(result.success).toBe(false);
    });
  });
});
