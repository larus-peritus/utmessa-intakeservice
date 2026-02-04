import { describe, it, expect } from 'vitest';
import { BaseEventSchema } from '../src/schemas/events';

describe('BaseEventSchema', () => {
  describe('Valid events', () => {
    it('should validate minimal valid event', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(true);
    });

    it('should validate event with all fields', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
        message: 'Test message',
        meta: { key: 'value', count: 42 },
      });
      expect(result.success).toBe(true);
    });

    it('should validate ISO 8601 with timezone', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00+05:30',
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(true);
    });

    it('should validate ISO 8601 with milliseconds', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00.123Z',
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid events', () => {
    it('should reject missing timestamp', () => {
      const result = BaseEventSchema.safeParse({
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('ts');
      }
    });

    it('should reject missing type', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('type');
      }
    });

    it('should reject invalid timestamp format', () => {
      const result = BaseEventSchema.safeParse({
        ts: 'not-a-timestamp',
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(false);
    });

    it('should reject numeric timestamp', () => {
      const result = BaseEventSchema.safeParse({
        ts: 1706270400000,
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(false);
    });

    it('should reject date-only format (no time)', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26',
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Optional fields', () => {
    it('should allow undefined message', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
      });
      expect(result.success).toBe(true);
    });

    it('should allow undefined meta', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
        message: 'Message without meta',
      });
      expect(result.success).toBe(true);
    });

    it('should allow complex meta structures', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
        meta: {
          nested: { key: 'value' },
          array: [1, 2, 3],
          boolean: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty meta object', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
        meta: {},
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty string message', () => {
      const result = BaseEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
        message: '',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Type inference', () => {
    it('should produce correct type structure', () => {
      const event = BaseEventSchema.parse({
        ts: '2026-01-26T10:00:00Z',
        type: 'TEST_EVENT',
        message: 'Test',
        meta: { key: 'value' },
      });

      // These type assertions verify the inferred type structure
      expect(typeof event.ts).toBe('string');
      expect(typeof event.type).toBe('string');
      expect(typeof event.message).toBe('string');
      expect(typeof event.meta).toBe('object');
    });
  });
});
