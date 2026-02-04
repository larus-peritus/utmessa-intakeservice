import { describe, it, expect } from 'vitest';
import {
  TestsStartedEventSchema,
  TestsPassedEventSchema,
  TestsFailedEventSchema,
} from '../src/schemas/events';

describe('Test Events', () => {
  describe('TestsStartedEvent', () => {
    it('should validate minimal event', () => {
      const result = TestsStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_STARTED',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with message', () => {
      const result = TestsStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_STARTED',
        message: 'Running test suite',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with meta', () => {
      const result = TestsStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_STARTED',
        meta: { totalTests: 42, testFramework: 'vitest' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = TestsStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_PASSED',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TestsPassedEvent', () => {
    it('should validate minimal event', () => {
      const result = TestsPassedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_PASSED',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with message', () => {
      const result = TestsPassedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_PASSED',
        message: 'All 42 tests passed',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with meta', () => {
      const result = TestsPassedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_PASSED',
        meta: { passedCount: 42, duration: 5.2 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = TestsPassedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_STARTED',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TestsFailedEvent', () => {
    it('should validate with reason', () => {
      const result = TestsFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_FAILED',
        reason: '2 of 10 tests failed',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing reason', () => {
      const result = TestsFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_FAILED',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = TestsFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_FAILED',
        reason: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Reason cannot be empty');
      }
    });

    it('should validate with message and meta', () => {
      const result = TestsFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_FAILED',
        reason: 'Authentication tests failed',
        message: 'Test suite completed with failures',
        meta: { failedCount: 2, passedCount: 8 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject wrong type', () => {
      const result = TestsFailedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TESTS_PASSED',
        reason: 'Some reason',
      });
      expect(result.success).toBe(false);
    });
  });
});
