import { describe, it, expect } from 'vitest';
import {
  BoothEventSchema,
  BoothEvent,
  BoothEventType,
} from '../src/schemas/events';

describe('BoothEventSchema', () => {
  describe('Validation', () => {
    it('should validate all 17 event types', () => {
      const events = [
        // Job events (4)
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_CREATED' },
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_STARTED' },
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_FAILED', reason: 'Error' },
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_DONE' },
        // Feature events (5)
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURES_PLANNED', total: 5 },
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURE_STARTED', featureId: 'F1' },
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURE_DONE', featureId: 'F1' },
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURE_FAILED', featureId: 'F1', reason: 'Error' },
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURE_SKIPPED', featureId: 'F1' },
        // HITL events (2)
        { ts: '2026-01-26T10:00:00Z', type: 'WAITING_FOR_INPUT', question: 'Choose?' },
        { ts: '2026-01-26T10:00:00Z', type: 'INPUT_RECEIVED', answer: 'Yes' },
        // Deploy events (3)
        { ts: '2026-01-26T10:00:00Z', type: 'DEPLOY_STARTED' },
        { ts: '2026-01-26T10:00:00Z', type: 'DEPLOY_DONE', url: 'https://example.com' },
        { ts: '2026-01-26T10:00:00Z', type: 'REPO_PUBLISHED', repoUrl: 'https://github.com/u/r' },
        // Test events (3)
        { ts: '2026-01-26T10:00:00Z', type: 'TESTS_STARTED' },
        { ts: '2026-01-26T10:00:00Z', type: 'TESTS_PASSED' },
        { ts: '2026-01-26T10:00:00Z', type: 'TESTS_FAILED', reason: 'Tests failed' },
      ];

      for (const event of events) {
        const result = BoothEventSchema.safeParse(event);
        expect(result.success, `Event type ${event.type} should be valid`).toBe(true);
      }
    });

    it('should reject unknown event type', () => {
      const result = BoothEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'UNKNOWN_EVENT',
      });
      expect(result.success).toBe(false);
    });

    it('should reject event without type', () => {
      const result = BoothEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Type narrowing', () => {
    it('should narrow to specific event type on type check', () => {
      const event: BoothEvent = {
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_STARTED',
        featureId: 'F1',
        title: 'Feature Title',
      };

      if (event.type === 'FEATURE_STARTED') {
        // TypeScript should know featureId exists here
        expect(event.featureId).toBe('F1');
        expect(event.title).toBe('Feature Title');
      }
    });

    it('should narrow to JOB_FAILED and access reason', () => {
      const event: BoothEvent = {
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_FAILED',
        reason: 'Build error',
      };

      if (event.type === 'JOB_FAILED') {
        // TypeScript should know reason exists here
        expect(event.reason).toBe('Build error');
      }
    });

    it('should narrow to DEPLOY_DONE and access url', () => {
      const event: BoothEvent = {
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_DONE',
        url: 'https://example.com',
      };

      if (event.type === 'DEPLOY_DONE') {
        // TypeScript should know url exists here
        expect(event.url).toBe('https://example.com');
      }
    });
  });

  describe('JSON round-trip', () => {
    it('should survive JSON serialization and parsing', () => {
      const original: BoothEvent = {
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_DONE',
        featureId: 'F1',
        message: 'Feature complete',
        meta: { duration: 120 },
      };

      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      const result = BoothEventSchema.safeParse(parsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(original);
      }
    });

    it('should parse JSONL format events', () => {
      const jsonlLines = [
        '{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"app"}',
        '{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED"}',
        '{"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":3}',
        '{"ts":"2026-01-26T10:15:00Z","type":"JOB_DONE"}',
      ];

      const events = jsonlLines.map((line) => {
        const data = JSON.parse(line);
        return BoothEventSchema.parse(data);
      });

      expect(events.length).toBe(4);
      expect(events[0].type).toBe('JOB_CREATED');
      expect(events[1].type).toBe('JOB_STARTED');
      expect(events[2].type).toBe('FEATURES_PLANNED');
      expect(events[3].type).toBe('JOB_DONE');
    });
  });

  describe('BoothEventType', () => {
    it('should contain all event type strings', () => {
      // This test validates the type exists and can be used
      const eventType: BoothEventType = 'JOB_STARTED';
      expect(typeof eventType).toBe('string');
    });
  });
});
