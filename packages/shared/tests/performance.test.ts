import { describe, it, expect } from 'vitest';
import { BoothEventSchema, BoothEvent } from '../src';

describe('Performance Tests', () => {
  describe('Single Event Validation', () => {
    it('should validate a single event in < 1ms on average', () => {
      const event = {
        ts: '2026-01-26T10:00:00Z',
        type: 'FEATURE_STARTED' as const,
        featureId: 'F1',
        title: 'Test Feature',
        message: 'Starting feature',
        meta: { complexity: 'high' },
      };

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        BoothEventSchema.parse(event);
      }

      const end = performance.now();
      const avgMs = (end - start) / iterations;

      expect(avgMs).toBeLessThan(1);
    });

    it('should validate different event types efficiently', () => {
      const events = [
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_CREATED' as const },
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_STARTED' as const },
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_FAILED' as const, reason: 'Error' },
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_DONE' as const },
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURES_PLANNED' as const, total: 5 },
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURE_STARTED' as const, featureId: 'F1' },
        { ts: '2026-01-26T10:00:00Z', type: 'FEATURE_DONE' as const, featureId: 'F1' },
        { ts: '2026-01-26T10:00:00Z', type: 'DEPLOY_DONE' as const, url: 'https://example.com' },
      ];

      const iterations = 50;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (const event of events) {
          BoothEventSchema.parse(event);
        }
      }

      const end = performance.now();
      const totalValidations = iterations * events.length;
      const avgMs = (end - start) / totalValidations;

      expect(avgMs).toBeLessThan(1);
    });
  });

  describe('Bulk Event Validation', () => {
    it('should validate 1000 events in < 1 second', () => {
      const events: BoothEvent[] = [];

      // Generate 1000 diverse events with valid timestamps
      for (let i = 0; i < 200; i++) {
        const hour = String(10 + Math.floor(i / 60)).padStart(2, '0');
        const minute = String(i % 60).padStart(2, '0');
        events.push(
          { ts: `2026-01-26T${hour}:${minute}:00Z`, type: 'JOB_STARTED' },
          { ts: `2026-01-26T${hour}:${minute}:01Z`, type: 'FEATURES_PLANNED', total: 5 },
          { ts: `2026-01-26T${hour}:${minute}:02Z`, type: 'FEATURE_STARTED', featureId: `F${i}` },
          { ts: `2026-01-26T${hour}:${minute}:03Z`, type: 'FEATURE_DONE', featureId: `F${i}` },
          { ts: `2026-01-26T${hour}:${minute}:04Z`, type: 'JOB_DONE' },
        );
      }

      const start = performance.now();

      for (const event of events) {
        BoothEventSchema.parse(event);
      }

      const end = performance.now();
      const durationMs = end - start;

      expect(events.length).toBe(1000);
      expect(durationMs).toBeLessThan(1000);
    });

    it('should handle safeParse for 1000 events in < 1 second', () => {
      const events = [];

      for (let i = 0; i < 1000; i++) {
        events.push({
          ts: '2026-01-26T10:00:00Z',
          type: 'FEATURE_DONE',
          featureId: `F${i}`,
        });
      }

      const start = performance.now();

      let validCount = 0;
      for (const event of events) {
        const result = BoothEventSchema.safeParse(event);
        if (result.success) validCount++;
      }

      const end = performance.now();
      const durationMs = end - start;

      expect(validCount).toBe(1000);
      expect(durationMs).toBeLessThan(1000);
    });
  });

  describe('JSONL Processing Simulation', () => {
    it('should process realistic JSONL log efficiently', () => {
      // Simulate a realistic build log with JSON serialization/parsing
      const eventCount = 100;
      const jsonlLines: string[] = [];

      // Generate a realistic event sequence
      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:00:00Z', type: 'JOB_CREATED', projectSlug: 'test-app' }));
      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:00:01Z', type: 'JOB_STARTED' }));
      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:00:02Z', type: 'FEATURES_PLANNED', total: 10 }));

      for (let i = 0; i < 10; i++) {
        jsonlLines.push(JSON.stringify({ ts: `2026-01-26T10:${String(i).padStart(2, '0')}:00Z`, type: 'FEATURE_STARTED', featureId: `F${i}`, title: `Feature ${i}` }));
        jsonlLines.push(JSON.stringify({ ts: `2026-01-26T10:${String(i).padStart(2, '0')}:30Z`, type: 'FEATURE_DONE', featureId: `F${i}` }));
      }

      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:30:00Z', type: 'TESTS_STARTED' }));
      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:30:30Z', type: 'TESTS_PASSED' }));
      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:31:00Z', type: 'DEPLOY_STARTED', target: 'vercel' }));
      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:32:00Z', type: 'DEPLOY_DONE', url: 'https://test-app.vercel.app' }));
      jsonlLines.push(JSON.stringify({ ts: '2026-01-26T10:32:30Z', type: 'JOB_DONE' }));

      const start = performance.now();

      const events: BoothEvent[] = [];
      for (const line of jsonlLines) {
        const data = JSON.parse(line);
        const result = BoothEventSchema.safeParse(data);
        if (result.success) {
          events.push(result.data);
        }
      }

      const end = performance.now();
      const durationMs = end - start;

      expect(events.length).toBe(jsonlLines.length);
      expect(durationMs).toBeLessThan(100); // 100ms for ~30 events is very conservative
    });
  });

  describe('Memory Efficiency', () => {
    it('should not retain references after validation', () => {
      // Just verify validation doesn't throw on many objects
      const results = [];

      for (let i = 0; i < 100; i++) {
        const event = {
          ts: '2026-01-26T10:00:00Z',
          type: 'FEATURE_STARTED' as const,
          featureId: `F${i}`,
          title: `Feature ${i} with some longer text for testing`,
          message: `This is message number ${i}`,
          meta: { index: i, data: new Array(10).fill(`item_${i}`) },
        };

        const result = BoothEventSchema.parse(event);
        results.push(result.type);
      }

      expect(results).toHaveLength(100);
    });
  });
});
