import { describe, it, expect } from 'vitest';
import {
  BoothEventSchema,
  BoothEvent,
  BoothEventType,
  JobCreatedEventSchema,
  FeatureStartedEventSchema,
  DeployDoneEventSchema,
} from '../src';

describe('Integration Tests', () => {
  describe('JSONL Parsing Simulation', () => {
    it('should parse a complete successful build log', () => {
      const jsonlLines = [
        '{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"recipe-app"}',
        '{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED"}',
        '{"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":3}',
        '{"ts":"2026-01-26T10:01:00Z","type":"FEATURE_STARTED","featureId":"F1","title":"Auth"}',
        '{"ts":"2026-01-26T10:05:00Z","type":"FEATURE_DONE","featureId":"F1"}',
        '{"ts":"2026-01-26T10:05:10Z","type":"FEATURE_STARTED","featureId":"F2","title":"CRUD"}',
        '{"ts":"2026-01-26T10:10:00Z","type":"FEATURE_DONE","featureId":"F2"}',
        '{"ts":"2026-01-26T10:10:10Z","type":"FEATURE_STARTED","featureId":"F3","title":"Search"}',
        '{"ts":"2026-01-26T10:12:00Z","type":"FEATURE_DONE","featureId":"F3"}',
        '{"ts":"2026-01-26T10:12:10Z","type":"TESTS_STARTED"}',
        '{"ts":"2026-01-26T10:13:00Z","type":"TESTS_PASSED"}',
        '{"ts":"2026-01-26T10:13:10Z","type":"DEPLOY_STARTED","target":"vercel"}',
        '{"ts":"2026-01-26T10:14:30Z","type":"DEPLOY_DONE","url":"https://recipe-app.vercel.app"}',
        '{"ts":"2026-01-26T10:15:00Z","type":"REPO_PUBLISHED","repoUrl":"https://github.com/user/recipe-app"}',
        '{"ts":"2026-01-26T10:15:10Z","type":"JOB_DONE"}',
      ];

      const events: BoothEvent[] = [];
      const errors: string[] = [];

      for (const line of jsonlLines) {
        const data = JSON.parse(line);
        const result = BoothEventSchema.safeParse(data);
        if (result.success) {
          events.push(result.data);
        } else {
          errors.push(`Line ${line}: ${result.error.message}`);
        }
      }

      expect(errors).toHaveLength(0);
      expect(events).toHaveLength(15);
      expect(events[0].type).toBe('JOB_CREATED');
      expect(events[events.length - 1].type).toBe('JOB_DONE');
    });

    it('should handle failed build log', () => {
      const jsonlLines = [
        '{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED","projectSlug":"broken-app"}',
        '{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED"}',
        '{"ts":"2026-01-26T10:00:10Z","type":"FEATURES_PLANNED","total":2}',
        '{"ts":"2026-01-26T10:01:00Z","type":"FEATURE_STARTED","featureId":"F1","title":"DB Setup"}',
        '{"ts":"2026-01-26T10:03:00Z","type":"FEATURE_FAILED","featureId":"F1","reason":"Connection refused"}',
        '{"ts":"2026-01-26T10:03:05Z","type":"JOB_FAILED","reason":"Feature F1 failed"}',
      ];

      const events: BoothEvent[] = jsonlLines.map((line) => {
        const data = JSON.parse(line);
        return BoothEventSchema.parse(data);
      });

      expect(events).toHaveLength(6);
      expect(events[events.length - 1].type).toBe('JOB_FAILED');

      const failedEvent = events[events.length - 1];
      if (failedEvent.type === 'JOB_FAILED') {
        expect(failedEvent.reason).toBe('Feature F1 failed');
      }
    });

    it('should handle build with human input', () => {
      const jsonlLines = [
        '{"ts":"2026-01-26T10:00:00Z","type":"JOB_CREATED"}',
        '{"ts":"2026-01-26T10:00:05Z","type":"JOB_STARTED"}',
        '{"ts":"2026-01-26T10:01:00Z","type":"WAITING_FOR_INPUT","question":"Choose framework","choices":["React","Vue","Svelte"]}',
        '{"ts":"2026-01-26T10:05:00Z","type":"INPUT_RECEIVED","answer":"React"}',
        '{"ts":"2026-01-26T10:10:00Z","type":"JOB_DONE"}',
      ];

      const events: BoothEvent[] = jsonlLines.map((line) => BoothEventSchema.parse(JSON.parse(line)));

      expect(events).toHaveLength(5);

      const waitingEvent = events[2];
      if (waitingEvent.type === 'WAITING_FOR_INPUT') {
        expect(waitingEvent.question).toBe('Choose framework');
        expect(waitingEvent.choices).toEqual(['React', 'Vue', 'Svelte']);
      }

      const inputEvent = events[3];
      if (inputEvent.type === 'INPUT_RECEIVED') {
        expect(inputEvent.answer).toBe('React');
      }
    });

    it('should skip invalid events and continue parsing', () => {
      const jsonlLines = [
        '{"ts":"2026-01-26T10:00:00Z","type":"JOB_STARTED"}',
        '{"ts":"2026-01-26T10:00:05Z","type":"INVALID_EVENT"}', // Invalid
        '{"ts":"2026-01-26T10:00:10Z","type":"JOB_DONE"}',
      ];

      const events: BoothEvent[] = [];

      for (const line of jsonlLines) {
        const result = BoothEventSchema.safeParse(JSON.parse(line));
        if (result.success) {
          events.push(result.data);
        }
      }

      expect(events).toHaveLength(2);
    });
  });

  describe('Type Narrowing Verification', () => {
    it('should narrow to specific event types correctly', () => {
      const events: BoothEvent[] = [
        { ts: '2026-01-26T10:00:00Z', type: 'JOB_CREATED', projectSlug: 'app' },
        { ts: '2026-01-26T10:00:05Z', type: 'FEATURE_STARTED', featureId: 'F1', title: 'Auth' },
        { ts: '2026-01-26T10:00:10Z', type: 'DEPLOY_DONE', url: 'https://example.com' },
      ];

      for (const event of events) {
        switch (event.type) {
          case 'JOB_CREATED':
            expect(event.projectSlug).toBe('app');
            break;
          case 'FEATURE_STARTED':
            expect(event.featureId).toBe('F1');
            expect(event.title).toBe('Auth');
            break;
          case 'DEPLOY_DONE':
            expect(event.url).toBe('https://example.com');
            break;
        }
      }
    });

    it('should support exhaustive type handling', () => {
      const typeHandlers: Record<BoothEventType, string> = {
        JOB_CREATED: 'job',
        JOB_STARTED: 'job',
        JOB_FAILED: 'job',
        JOB_DONE: 'job',
        FEATURES_PLANNED: 'feature',
        FEATURE_STARTED: 'feature',
        FEATURE_DONE: 'feature',
        FEATURE_FAILED: 'feature',
        FEATURE_SKIPPED: 'feature',
        WAITING_FOR_INPUT: 'hitl',
        INPUT_RECEIVED: 'hitl',
        DEPLOY_STARTED: 'deploy',
        DEPLOY_DONE: 'deploy',
        REPO_PUBLISHED: 'deploy',
        TESTS_STARTED: 'test',
        TESTS_PASSED: 'test',
        TESTS_FAILED: 'test',
      };

      // If any event type is missing, TypeScript would error here
      expect(Object.keys(typeHandlers)).toHaveLength(17);
    });
  });

  describe('Cross-Consumer Compatibility', () => {
    it('should support imports from package index', () => {
      // Verify all major exports are accessible
      expect(BoothEventSchema).toBeDefined();
      expect(JobCreatedEventSchema).toBeDefined();
      expect(FeatureStartedEventSchema).toBeDefined();
      expect(DeployDoneEventSchema).toBeDefined();
    });

    it('should support event creation and validation', () => {
      // Orchestrator-style: create event and serialize
      const event: BoothEvent = {
        ts: new Date().toISOString(),
        type: 'JOB_STARTED',
        message: 'Build started',
        meta: { buildId: 'build_123' },
      };

      const validated = BoothEventSchema.parse(event);
      const serialized = JSON.stringify(validated);

      expect(serialized).toContain('JOB_STARTED');
      expect(serialized).toContain('build_123');
    });

    it('should support event parsing and type narrowing', () => {
      // Dashboard-style: parse event from log
      const line = '{"ts":"2026-01-26T10:00:00Z","type":"FEATURE_DONE","featureId":"F1"}';
      const event = BoothEventSchema.parse(JSON.parse(line));

      if (event.type === 'FEATURE_DONE') {
        // Dashboard can now access featureId
        expect(event.featureId).toBe('F1');
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide actionable error messages', () => {
      const result = BoothEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'JOB_FAILED',
        // Missing required reason field
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = result.error.format();
        expect(formatted).toBeDefined();
      }
    });

    it('should identify invalid discriminator values', () => {
      const result = BoothEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'NOT_A_REAL_EVENT',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message.includes('Invalid discriminator value') ||
          issue.path.includes('type')
        )).toBe(true);
      }
    });
  });
});
