/**
 * State Computation Tests
 *
 * Comprehensive unit tests for state computation module.
 * Tests cover all helper functions, computation functions, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import type { BoothEvent, FeatureStartedEvent, WaitingForInputEvent } from '../schemas/events';
import type { Feature } from '../schemas/feature';
import type { ProjectState } from './types';

// Import functions under test
import {
  findEvent,
  findMostRecentEvent,
  findEventAfter,
  findMostRecentInArray,
  isFeatureComplete,
  isCompletionEvent,
  extractDeploymentUrls,
} from './helpers';
import { computeStatus } from './computeStatus';
import { computeProgress, computeProgressDetail } from './computeProgress';
import { findCurrentFeature } from './findCurrentFeature';
import { findWaitingQuestion } from './findWaitingQuestion';
import { computeProjectState } from './computeProjectState';

// =============================================================================
// Test Fixtures
// =============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

/**
 * Helper to create a Feature for testing.
 */
function createFeature(
  featureId: string,
  status: Feature['status'] = 'planned',
  priority?: 'essential' | 'phase2' | 'future',
): Feature {
  return {
    id: `feat-${featureId}`,
    ideaId: VALID_UUID,
    featureId,
    title: `Feature ${featureId}`,
    status,
    priority,
  };
}

/**
 * Standard event sequences for testing.
 */
const baseJobStarted: BoothEvent = {
  type: 'JOB_STARTED',
  ts: '2026-01-26T10:00:00Z',
};

const featuresPlanned: BoothEvent = {
  type: 'FEATURES_PLANNED',
  total: 2,
  ts: '2026-01-26T10:00:10Z',
};

// =============================================================================
// Helper Function Tests - Event Lookup (T2)
// =============================================================================

describe('findEvent', () => {
  it('finds first event of given type', () => {
    const events: BoothEvent[] = [
      baseJobStarted,
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
    ];

    const result = findEvent(events, 'JOB_STARTED');
    expect(result).toBeDefined();
    expect(result?.type).toBe('JOB_STARTED');
  });

  it('returns undefined when event type not found', () => {
    const events: BoothEvent[] = [baseJobStarted];
    const result = findEvent(events, 'DEPLOY_DONE');
    expect(result).toBeUndefined();
  });

  it('returns first matching event (not most recent)', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:05:00Z' },
    ];

    const result = findEvent(events, 'FEATURE_STARTED');
    expect(result).toBeDefined();
    expect((result as FeatureStartedEvent).featureId).toBe('F1');
  });

  it('handles empty events array', () => {
    const result = findEvent([], 'JOB_STARTED');
    expect(result).toBeUndefined();
  });
});

describe('findMostRecentEvent', () => {
  it('finds most recent event by timestamp', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F3', ts: '2026-01-26T10:03:00Z' },
    ];

    const result = findMostRecentEvent(events, 'FEATURE_STARTED');
    expect(result).toBeDefined();
    expect((result as FeatureStartedEvent).featureId).toBe('F2');
  });

  it('returns undefined when event type not found', () => {
    const events: BoothEvent[] = [baseJobStarted];
    const result = findMostRecentEvent(events, 'DEPLOY_DONE');
    expect(result).toBeUndefined();
  });

  it('handles unsorted events', () => {
    const events: BoothEvent[] = [
      { type: 'DEPLOY_DONE', url: 'https://v3.com', ts: '2026-01-26T10:15:00Z' },
      { type: 'DEPLOY_DONE', url: 'https://v1.com', ts: '2026-01-26T10:05:00Z' },
      { type: 'DEPLOY_DONE', url: 'https://v2.com', ts: '2026-01-26T10:10:00Z' },
    ];

    const result = findMostRecentEvent(events, 'DEPLOY_DONE');
    expect(result?.url).toBe('https://v3.com');
  });
});

describe('findEventAfter', () => {
  it('finds event after specified timestamp', () => {
    const events: BoothEvent[] = [
      { type: 'JOB_FAILED', reason: 'Error', ts: '2026-01-26T10:05:00Z' },
      { type: 'JOB_STARTED', ts: '2026-01-26T10:10:00Z' },
    ];

    const result = findEventAfter(events, 'JOB_STARTED', '2026-01-26T10:05:00Z');
    expect(result).toBeDefined();
    expect(result?.ts).toBe('2026-01-26T10:10:00Z');
  });

  it('returns undefined when no event after timestamp', () => {
    const events: BoothEvent[] = [
      { type: 'JOB_FAILED', reason: 'Error', ts: '2026-01-26T10:05:00Z' },
      { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' }, // Before timestamp
    ];

    const result = findEventAfter(events, 'JOB_STARTED', '2026-01-26T10:05:00Z');
    expect(result).toBeUndefined();
  });

  it('excludes event at exact timestamp (uses > not >=)', () => {
    const events: BoothEvent[] = [
      { type: 'JOB_STARTED', ts: '2026-01-26T10:05:00Z' },
    ];

    const result = findEventAfter(events, 'JOB_STARTED', '2026-01-26T10:05:00Z');
    expect(result).toBeUndefined();
  });
});

describe('findMostRecentInArray', () => {
  it('finds most recent event in array', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F3', ts: '2026-01-26T10:03:00Z' },
    ];

    const result = findMostRecentInArray(events);
    expect((result as FeatureStartedEvent).featureId).toBe('F2');
  });

  it('throws error for empty array', () => {
    expect(() => findMostRecentInArray([])).toThrow('Cannot find most recent in empty array');
  });

  it('returns single element for array of one', () => {
    const events: BoothEvent[] = [baseJobStarted];
    const result = findMostRecentInArray(events);
    expect(result).toEqual(baseJobStarted);
  });
});

// =============================================================================
// Helper Function Tests - Feature Completion (T3)
// =============================================================================

describe('isCompletionEvent', () => {
  it('returns true for FEATURE_DONE', () => {
    const event: BoothEvent = { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' };
    expect(isCompletionEvent(event)).toBe(true);
  });

  it('returns true for FEATURE_FAILED', () => {
    const event: BoothEvent = { type: 'FEATURE_FAILED', featureId: 'F1', reason: 'Error', ts: '2026-01-26T10:05:00Z' };
    expect(isCompletionEvent(event)).toBe(true);
  });

  it('returns true for FEATURE_SKIPPED', () => {
    const event: BoothEvent = { type: 'FEATURE_SKIPPED', featureId: 'F1', ts: '2026-01-26T10:05:00Z' };
    expect(isCompletionEvent(event)).toBe(true);
  });

  it('returns false for FEATURE_STARTED', () => {
    const event: BoothEvent = { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' };
    expect(isCompletionEvent(event)).toBe(false);
  });

  it('returns false for non-feature events', () => {
    expect(isCompletionEvent(baseJobStarted)).toBe(false);
  });
});

describe('isFeatureComplete', () => {
  it('returns true when FEATURE_DONE exists', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
    ];
    expect(isFeatureComplete('F1', events)).toBe(true);
  });

  it('returns true when FEATURE_FAILED exists', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_FAILED', featureId: 'F1', reason: 'Error', ts: '2026-01-26T10:05:00Z' },
    ];
    expect(isFeatureComplete('F1', events)).toBe(true);
  });

  it('returns true when FEATURE_SKIPPED exists', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_SKIPPED', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
    ];
    expect(isFeatureComplete('F1', events)).toBe(true);
  });

  it('returns false when only FEATURE_STARTED exists', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
    ];
    expect(isFeatureComplete('F1', events)).toBe(false);
  });

  it('returns false when no events exist', () => {
    expect(isFeatureComplete('F1', [])).toBe(false);
  });

  it('returns false for different feature ID', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_DONE', featureId: 'F2', ts: '2026-01-26T10:05:00Z' },
    ];
    expect(isFeatureComplete('F1', events)).toBe(false);
  });
});

// =============================================================================
// Helper Function Tests - Deployment URL Extraction (T4)
// =============================================================================

describe('extractDeploymentUrls', () => {
  it('returns null for both URLs when no deployment events', () => {
    const result = extractDeploymentUrls([baseJobStarted]);
    expect(result).toEqual({ demoUrl: null, repoUrl: null });
  });

  it('extracts demoUrl from DEPLOY_DONE', () => {
    const events: BoothEvent[] = [
      { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' },
    ];
    const result = extractDeploymentUrls(events);
    expect(result.demoUrl).toBe('https://demo.example.com');
    expect(result.repoUrl).toBeNull();
  });

  it('extracts repoUrl from REPO_PUBLISHED', () => {
    const events: BoothEvent[] = [
      { type: 'REPO_PUBLISHED', repoUrl: 'https://github.com/user/repo', ts: '2026-01-26T10:16:00Z' },
    ];
    const result = extractDeploymentUrls(events);
    expect(result.demoUrl).toBeNull();
    expect(result.repoUrl).toBe('https://github.com/user/repo');
  });

  it('extracts both URLs when both events exist', () => {
    const events: BoothEvent[] = [
      { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' },
      { type: 'REPO_PUBLISHED', repoUrl: 'https://github.com/user/repo', ts: '2026-01-26T10:16:00Z' },
    ];
    const result = extractDeploymentUrls(events);
    expect(result.demoUrl).toBe('https://demo.example.com');
    expect(result.repoUrl).toBe('https://github.com/user/repo');
  });

  it('uses most recent URL when multiple DEPLOY_DONE events exist', () => {
    const events: BoothEvent[] = [
      { type: 'DEPLOY_DONE', url: 'https://v1.example.com', ts: '2026-01-26T10:10:00Z' },
      { type: 'DEPLOY_DONE', url: 'https://v2.example.com', ts: '2026-01-26T10:15:00Z' },
    ];
    const result = extractDeploymentUrls(events);
    expect(result.demoUrl).toBe('https://v2.example.com');
  });
});

// =============================================================================
// Status Derivation Tests (T5)
// =============================================================================

describe('computeStatus', () => {
  describe('Priority 1: waiting', () => {
    it('returns waiting when waitingQuestion is provided', () => {
      const events: BoothEvent[] = [baseJobStarted];
      const result = computeStatus(events, 'Choose auth method?');
      expect(result).toBe('waiting');
    });

    it('waiting overrides deployed', () => {
      const events: BoothEvent[] = [
        baseJobStarted,
        { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' },
      ];
      const result = computeStatus(events, 'Question pending');
      expect(result).toBe('waiting');
    });

    it('waiting overrides running', () => {
      const events: BoothEvent[] = [baseJobStarted];
      const result = computeStatus(events, 'Question pending');
      expect(result).toBe('waiting');
    });
  });

  describe('Priority 2: deployed', () => {
    it('returns deployed when DEPLOY_DONE exists without subsequent failure', () => {
      const events: BoothEvent[] = [
        baseJobStarted,
        { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' },
      ];
      const result = computeStatus(events, null);
      expect(result).toBe('deployed');
    });

    it('returns failed when JOB_FAILED follows DEPLOY_DONE', () => {
      const events: BoothEvent[] = [
        baseJobStarted,
        { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' },
        { type: 'JOB_FAILED', reason: 'Post-deploy failure', ts: '2026-01-26T10:20:00Z' },
      ];
      const result = computeStatus(events, null);
      expect(result).toBe('failed');
    });
  });

  describe('Priority 3: failed', () => {
    it('returns failed when JOB_FAILED exists without recovery', () => {
      const events: BoothEvent[] = [
        baseJobStarted,
        { type: 'JOB_FAILED', reason: 'Build error', ts: '2026-01-26T10:05:00Z' },
      ];
      const result = computeStatus(events, null);
      expect(result).toBe('failed');
    });

    it('returns running when JOB_STARTED follows JOB_FAILED (recovery)', () => {
      const events: BoothEvent[] = [
        baseJobStarted,
        { type: 'JOB_FAILED', reason: 'Build error', ts: '2026-01-26T10:05:00Z' },
        { type: 'JOB_STARTED', ts: '2026-01-26T10:10:00Z' },
      ];
      const result = computeStatus(events, null);
      expect(result).toBe('running');
    });
  });

  describe('Priority 4: running', () => {
    it('returns running when JOB_STARTED exists', () => {
      const events: BoothEvent[] = [baseJobStarted];
      const result = computeStatus(events, null);
      expect(result).toBe('running');
    });
  });

  describe('Priority 5: not_started', () => {
    it('returns not_started when no events', () => {
      const result = computeStatus([], null);
      expect(result).toBe('not_started');
    });

    it('returns not_started when only JOB_CREATED exists', () => {
      const events: BoothEvent[] = [
        { type: 'JOB_CREATED', ts: '2026-01-26T10:00:00Z' },
      ];
      const result = computeStatus(events, null);
      expect(result).toBe('not_started');
    });
  });
});

// =============================================================================
// Progress Computation Tests (T6)
// =============================================================================

describe('computeProgress', () => {
  it('returns null when no FEATURES_PLANNED event', () => {
    const features = [createFeature('F1'), createFeature('F2')];
    const events: BoothEvent[] = [baseJobStarted];
    const result = computeProgress(features, events);
    expect(result).toBeNull();
  });

  it('returns 0 when features array is empty', () => {
    const events: BoothEvent[] = [baseJobStarted, featuresPlanned];
    const result = computeProgress([], events);
    expect(result).toBe(0);
  });

  it('returns 0 when no features complete', () => {
    const features = [createFeature('F1'), createFeature('F2')];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
    ];
    const result = computeProgress(features, events);
    expect(result).toBe(0);
  });

  it('returns 50 when half features complete', () => {
    const features = [createFeature('F1'), createFeature('F2')];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
    ];
    const result = computeProgress(features, events);
    expect(result).toBe(50);
  });

  it('returns 100 when all features complete', () => {
    const features = [createFeature('F1'), createFeature('F2')];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F2', ts: '2026-01-26T10:10:00Z' },
    ];
    const result = computeProgress(features, events);
    expect(result).toBe(100);
  });

  it('counts FEATURE_FAILED as complete', () => {
    const features = [createFeature('F1'), createFeature('F2')];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_FAILED', featureId: 'F2', reason: 'Error', ts: '2026-01-26T10:10:00Z' },
    ];
    const result = computeProgress(features, events);
    expect(result).toBe(100);
  });

  it('counts FEATURE_SKIPPED as complete', () => {
    const features = [createFeature('F1'), createFeature('F2')];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_SKIPPED', featureId: 'F2', ts: '2026-01-26T10:10:00Z' },
    ];
    const result = computeProgress(features, events);
    expect(result).toBe(100);
  });

  it('rounds to nearest integer', () => {
    const features = [createFeature('F1'), createFeature('F2'), createFeature('F3')];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
    ];
    const result = computeProgress(features, events);
    // 1/3 = 33.33... rounds to 33
    expect(result).toBe(33);
  });
});

// =============================================================================
// Progress Detail Computation Tests
// =============================================================================

describe('computeProgressDetail', () => {
  it('returns null when no FEATURES_PLANNED event', () => {
    const features = [createFeature('F1', 'planned', 'essential')];
    const events: BoothEvent[] = [baseJobStarted];
    const result = computeProgressDetail(features, events);
    expect(result).toBeNull();
  });

  it('returns all zeros for empty features array', () => {
    const events: BoothEvent[] = [baseJobStarted, featuresPlanned];
    const result = computeProgressDetail([], events);
    expect(result).not.toBeNull();
    expect(result?.essentialCompleted).toBe(0);
    expect(result?.essentialTotal).toBe(0);
    expect(result?.essentialProgress).toBe(100); // 0/0 = 100% complete
    expect(result?.bonusCompleted).toBe(0);
    expect(result?.bonusTotal).toBe(0);
    expect(result?.bonusProgress).toBe(0);
  });

  it('separates essential and bonus features', () => {
    const features = [
      createFeature('F1', 'done', 'essential'),
      createFeature('F2', 'planned', 'essential'),
      createFeature('F3', 'done', 'phase2'),
      createFeature('F4', 'planned', 'future'),
    ];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F3', ts: '2026-01-26T10:02:00Z' },
    ];
    const result = computeProgressDetail(features, events);

    expect(result).not.toBeNull();
    expect(result?.essentialCompleted).toBe(1);
    expect(result?.essentialTotal).toBe(2);
    expect(result?.essentialProgress).toBe(50);
    expect(result?.bonusCompleted).toBe(1);
    expect(result?.bonusTotal).toBe(2); // F3 (phase2) + F4 (future)
    expect(result?.bonusProgress).toBe(50);
  });

  it('treats features without priority as essential', () => {
    const features = [
      createFeature('F1', 'done'), // No priority = essential
      createFeature('F2', 'planned'), // No priority = essential
    ];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
    ];
    const result = computeProgressDetail(features, events);

    expect(result).not.toBeNull();
    expect(result?.essentialCompleted).toBe(1);
    expect(result?.essentialTotal).toBe(2);
    expect(result?.essentialProgress).toBe(50);
    expect(result?.bonusCompleted).toBe(0);
    expect(result?.bonusTotal).toBe(0);
    expect(result?.bonusProgress).toBe(0);
  });

  it('counts all 8 essential features as 100% when done', () => {
    // Simulate plane game scenario: 8 essential, 7 bonus
    const features = [
      createFeature('F1', 'done', 'essential'),
      createFeature('F2', 'done', 'essential'),
      createFeature('F3', 'done', 'essential'),
      createFeature('F4', 'done', 'essential'),
      createFeature('F5', 'done', 'essential'),
      createFeature('F6', 'done', 'essential'),
      createFeature('F7', 'done', 'essential'),
      createFeature('F8', 'done', 'essential'),
      createFeature('F9', 'planned', 'phase2'),
      createFeature('F10', 'planned', 'phase2'),
      createFeature('F11', 'planned', 'phase2'),
      createFeature('F12', 'planned', 'future'),
      createFeature('F13', 'planned', 'future'),
      createFeature('F14', 'planned', 'future'),
      createFeature('F15', 'planned', 'future'),
    ];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F2', ts: '2026-01-26T10:02:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F3', ts: '2026-01-26T10:03:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F4', ts: '2026-01-26T10:04:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F5', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F6', ts: '2026-01-26T10:06:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F7', ts: '2026-01-26T10:07:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F8', ts: '2026-01-26T10:08:00Z' },
    ];
    const result = computeProgressDetail(features, events);

    expect(result).not.toBeNull();
    expect(result?.essentialCompleted).toBe(8);
    expect(result?.essentialTotal).toBe(8);
    expect(result?.essentialProgress).toBe(100); // All essential done!
    expect(result?.bonusCompleted).toBe(0);
    expect(result?.bonusTotal).toBe(7); // 3 phase2 + 4 future
    expect(result?.bonusProgress).toBe(0);
  });

  it('counts failed features as completed', () => {
    const features = [
      createFeature('F1', 'done', 'essential'),
      createFeature('F2', 'failed', 'essential'),
    ];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_FAILED', featureId: 'F2', reason: 'Test failure', ts: '2026-01-26T10:02:00Z' },
    ];
    const result = computeProgressDetail(features, events);

    expect(result).not.toBeNull();
    expect(result?.essentialCompleted).toBe(2); // Both count as complete
    expect(result?.essentialProgress).toBe(100);
  });

  it('counts skipped features as completed', () => {
    const features = [
      createFeature('F1', 'done', 'essential'),
      createFeature('F2', 'skipped', 'essential'),
    ];
    const events: BoothEvent[] = [
      baseJobStarted,
      featuresPlanned,
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_SKIPPED', featureId: 'F2', reason: 'User request', ts: '2026-01-26T10:02:00Z' },
    ];
    const result = computeProgressDetail(features, events);

    expect(result).not.toBeNull();
    expect(result?.essentialCompleted).toBe(2);
    expect(result?.essentialProgress).toBe(100);
  });
});

// =============================================================================
// Current Feature Detection Tests (T7)
// =============================================================================

describe('findCurrentFeature', () => {
  it('returns null when no FEATURE_STARTED events', () => {
    const events: BoothEvent[] = [baseJobStarted];
    const result = findCurrentFeature(events);
    expect(result).toBeNull();
  });

  it('returns featureId for single active feature', () => {
    const events: BoothEvent[] = [
      baseJobStarted,
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
    ];
    const result = findCurrentFeature(events);
    expect(result).toBe('F1');
  });

  it('returns most recent uncompleted feature', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:06:00Z' },
    ];
    const result = findCurrentFeature(events);
    expect(result).toBe('F2');
  });

  it('returns null when all features completed', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:06:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F2', ts: '2026-01-26T10:10:00Z' },
    ];
    const result = findCurrentFeature(events);
    expect(result).toBeNull();
  });

  it('excludes features with FEATURE_FAILED', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_FAILED', featureId: 'F1', reason: 'Error', ts: '2026-01-26T10:05:00Z' },
    ];
    const result = findCurrentFeature(events);
    expect(result).toBeNull();
  });

  it('excludes features with FEATURE_SKIPPED', () => {
    const events: BoothEvent[] = [
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'FEATURE_SKIPPED', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
    ];
    const result = findCurrentFeature(events);
    expect(result).toBeNull();
  });
});

// =============================================================================
// Waiting Question Detection Tests (T7)
// =============================================================================

describe('findWaitingQuestion', () => {
  it('returns null when no WAITING_FOR_INPUT events', () => {
    const events: BoothEvent[] = [baseJobStarted];
    const result = findWaitingQuestion(events);
    expect(result).toBeNull();
  });

  it('returns question for unclosed prompt', () => {
    const events: BoothEvent[] = [
      baseJobStarted,
      { type: 'WAITING_FOR_INPUT', question: 'Choose auth method?', ts: '2026-01-26T10:05:00Z' },
    ];
    const result = findWaitingQuestion(events);
    expect(result).toBe('Choose auth method?');
  });

  it('returns null when prompt is answered', () => {
    const events: BoothEvent[] = [
      { type: 'WAITING_FOR_INPUT', question: 'Choose auth method?', ts: '2026-01-26T10:05:00Z' },
      { type: 'INPUT_RECEIVED', answer: 'JWT', ts: '2026-01-26T10:10:00Z' },
    ];
    const result = findWaitingQuestion(events);
    expect(result).toBeNull();
  });

  it('returns most recent unclosed prompt', () => {
    const events: BoothEvent[] = [
      { type: 'WAITING_FOR_INPUT', question: 'Choose auth?', ts: '2026-01-26T10:05:00Z' },
      { type: 'INPUT_RECEIVED', answer: 'JWT', ts: '2026-01-26T10:10:00Z' },
      { type: 'WAITING_FOR_INPUT', question: 'Choose database?', ts: '2026-01-26T10:15:00Z' },
    ];
    const result = findWaitingQuestion(events);
    expect(result).toBe('Choose database?');
  });

  it('handles multiple unclosed prompts (returns most recent)', () => {
    const events: BoothEvent[] = [
      { type: 'WAITING_FOR_INPUT', question: 'First question?', ts: '2026-01-26T10:05:00Z' },
      { type: 'WAITING_FOR_INPUT', question: 'Second question?', ts: '2026-01-26T10:10:00Z' },
    ];
    const result = findWaitingQuestion(events);
    expect(result).toBe('Second question?');
  });

  it('answer must be after question (timestamp check)', () => {
    const events: BoothEvent[] = [
      { type: 'INPUT_RECEIVED', answer: 'Early answer', ts: '2026-01-26T10:00:00Z' },
      { type: 'WAITING_FOR_INPUT', question: 'Later question?', ts: '2026-01-26T10:05:00Z' },
    ];
    const result = findWaitingQuestion(events);
    // Answer came before question, so question is still unclosed
    expect(result).toBe('Later question?');
  });
});

// =============================================================================
// Main Function Tests (T8)
// =============================================================================

describe('computeProjectState', () => {
  describe('Empty/minimal inputs', () => {
    it('returns not_started with all nulls for empty events', () => {
      const features = [createFeature('F1')];
      const state = computeProjectState(features, []);

      expect(state.status).toBe('not_started');
      expect(state.progress).toBeNull();
      expect(state.currentStep).toBeNull();
      expect(state.currentFeature).toBeNull();
      expect(state.waitingQuestion).toBeNull();
      expect(state.demoUrl).toBeNull();
      expect(state.repoUrl).toBeNull();
    });

    it('handles empty features array', () => {
      const events: BoothEvent[] = [baseJobStarted, featuresPlanned];
      const state = computeProjectState([], events);

      expect(state.status).toBe('running');
      expect(state.progress).toBe(0);
    });
  });

  describe('Running state', () => {
    it('computes running state with progress', () => {
      const features = [createFeature('F1'), createFeature('F2')];
      const events: BoothEvent[] = [
        baseJobStarted,
        featuresPlanned,
        { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
        { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
        { type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:06:00Z' },
      ];

      const state = computeProjectState(features, events);

      expect(state.status).toBe('running');
      expect(state.progress).toBe(50);
      expect(state.currentFeature).toBe('F2');
      expect(state.waitingQuestion).toBeNull();
    });
  });

  describe('Waiting state', () => {
    it('computes waiting state with question', () => {
      const features = [createFeature('F1')];
      const events: BoothEvent[] = [
        baseJobStarted,
        featuresPlanned,
        { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
        { type: 'WAITING_FOR_INPUT', question: 'Choose auth method?', ts: '2026-01-26T10:05:00Z' },
      ];

      const state = computeProjectState(features, events);

      expect(state.status).toBe('waiting');
      expect(state.waitingQuestion).toBe('Choose auth method?');
      expect(state.currentFeature).toBe('F1');
    });
  });

  describe('Failed state', () => {
    it('computes failed state', () => {
      const features = [createFeature('F1')];
      const events: BoothEvent[] = [
        baseJobStarted,
        featuresPlanned,
        { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
        { type: 'JOB_FAILED', reason: 'Build error', ts: '2026-01-26T10:05:00Z' },
      ];

      const state = computeProjectState(features, events);

      expect(state.status).toBe('failed');
      expect(state.progress).toBe(0);
    });
  });

  describe('Deployed state', () => {
    it('computes deployed state with URLs', () => {
      const features = [createFeature('F1'), createFeature('F2')];
      const events: BoothEvent[] = [
        baseJobStarted,
        featuresPlanned,
        { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
        { type: 'FEATURE_DONE', featureId: 'F2', ts: '2026-01-26T10:10:00Z' },
        { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' },
        { type: 'REPO_PUBLISHED', repoUrl: 'https://github.com/user/repo', ts: '2026-01-26T10:16:00Z' },
      ];

      const state = computeProjectState(features, events);

      expect(state.status).toBe('deployed');
      expect(state.progress).toBe(100);
      expect(state.currentFeature).toBeNull();
      expect(state.demoUrl).toBe('https://demo.example.com');
      expect(state.repoUrl).toBe('https://github.com/user/repo');
    });
  });

  describe('Edge cases', () => {
    it('handles recovery scenario (JOB_FAILED then JOB_STARTED)', () => {
      const features = [createFeature('F1')];
      const events: BoothEvent[] = [
        baseJobStarted,
        featuresPlanned,
        { type: 'JOB_FAILED', reason: 'Error', ts: '2026-01-26T10:05:00Z' },
        { type: 'JOB_STARTED', ts: '2026-01-26T10:10:00Z' },
        { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:11:00Z' },
      ];

      const state = computeProjectState(features, events);

      expect(state.status).toBe('running');
      expect(state.currentFeature).toBe('F1');
    });

    it('handles deployment failure (DEPLOY_DONE then JOB_FAILED)', () => {
      const features = [createFeature('F1')];
      const events: BoothEvent[] = [
        baseJobStarted,
        featuresPlanned,
        { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
        { type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:15:00Z' },
        { type: 'JOB_FAILED', reason: 'Post-deploy failure', ts: '2026-01-26T10:20:00Z' },
      ];

      const state = computeProjectState(features, events);

      expect(state.status).toBe('failed');
      // URLs should still be present
      expect(state.demoUrl).toBe('https://demo.example.com');
    });

    it('handles unsorted events', () => {
      const features = [createFeature('F1')];
      const events: BoothEvent[] = [
        // Events in wrong order
        { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:05:00Z' },
        baseJobStarted, // Earlier event listed later
        featuresPlanned,
        { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      ];

      const state = computeProjectState(features, events);

      expect(state.status).toBe('running');
      expect(state.progress).toBe(100);
      expect(state.currentFeature).toBeNull(); // F1 is complete
    });

    it('currentStep is always null (reserved)', () => {
      const features = [createFeature('F1')];
      const events: BoothEvent[] = [baseJobStarted, featuresPlanned];

      const state = computeProjectState(features, events);

      expect(state.currentStep).toBeNull();
    });
  });
});

// =============================================================================
// Integration Tests (T9)
// =============================================================================

describe('Integration: Realistic Workflows', () => {
  it('simulates complete build lifecycle', () => {
    const features: Feature[] = [
      createFeature('F1'),
      createFeature('F2'),
      createFeature('F3'),
    ];

    // Stage 1: Not started
    let state = computeProjectState(features, []);
    expect(state.status).toBe('not_started');
    expect(state.progress).toBeNull();

    // Stage 2: Started, planning
    let events: BoothEvent[] = [
      { type: 'JOB_CREATED', ts: '2026-01-26T10:00:00Z' },
      { type: 'JOB_STARTED', ts: '2026-01-26T10:00:05Z' },
    ];
    state = computeProjectState(features, events);
    expect(state.status).toBe('running');
    expect(state.progress).toBeNull(); // No FEATURES_PLANNED yet

    // Stage 3: Features planned
    events.push({ type: 'FEATURES_PLANNED', total: 3, ts: '2026-01-26T10:00:10Z' });
    state = computeProjectState(features, events);
    expect(state.status).toBe('running');
    expect(state.progress).toBe(0);

    // Stage 4: First feature in progress
    events.push({ type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' });
    state = computeProjectState(features, events);
    expect(state.currentFeature).toBe('F1');
    expect(state.progress).toBe(0);

    // Stage 5: Waiting for input
    events.push({
      type: 'WAITING_FOR_INPUT',
      question: 'Choose authentication method?',
      ts: '2026-01-26T10:02:00Z',
    });
    state = computeProjectState(features, events);
    expect(state.status).toBe('waiting');
    expect(state.waitingQuestion).toBe('Choose authentication method?');

    // Stage 6: Input received, continue
    events.push({ type: 'INPUT_RECEIVED', answer: 'JWT', ts: '2026-01-26T10:05:00Z' });
    state = computeProjectState(features, events);
    expect(state.status).toBe('running');
    expect(state.waitingQuestion).toBeNull();

    // Stage 7: First feature done
    events.push({ type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:10:00Z' });
    state = computeProjectState(features, events);
    expect(state.progress).toBe(33); // 1/3

    // Stage 8: Second feature (skipped)
    events.push({ type: 'FEATURE_STARTED', featureId: 'F2', ts: '2026-01-26T10:11:00Z' });
    events.push({ type: 'FEATURE_SKIPPED', featureId: 'F2', reason: 'Optional', ts: '2026-01-26T10:12:00Z' });
    state = computeProjectState(features, events);
    expect(state.progress).toBe(67); // 2/3

    // Stage 9: Third feature complete
    events.push({ type: 'FEATURE_STARTED', featureId: 'F3', ts: '2026-01-26T10:13:00Z' });
    events.push({ type: 'FEATURE_DONE', featureId: 'F3', ts: '2026-01-26T10:20:00Z' });
    state = computeProjectState(features, events);
    expect(state.progress).toBe(100);
    expect(state.currentFeature).toBeNull();

    // Stage 10: Deployed
    events.push({ type: 'DEPLOY_STARTED', ts: '2026-01-26T10:25:00Z' });
    events.push({ type: 'DEPLOY_DONE', url: 'https://my-app.vercel.app', ts: '2026-01-26T10:30:00Z' });
    events.push({ type: 'REPO_PUBLISHED', repoUrl: 'https://github.com/user/my-app', ts: '2026-01-26T10:31:00Z' });
    state = computeProjectState(features, events);
    expect(state.status).toBe('deployed');
    expect(state.progress).toBe(100);
    expect(state.demoUrl).toBe('https://my-app.vercel.app');
    expect(state.repoUrl).toBe('https://github.com/user/my-app');
  });

  it('simulates failure and recovery', () => {
    const features: Feature[] = [createFeature('F1')];
    const events: BoothEvent[] = [
      { type: 'JOB_STARTED', ts: '2026-01-26T10:00:00Z' },
      { type: 'FEATURES_PLANNED', total: 1, ts: '2026-01-26T10:00:10Z' },
      { type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:01:00Z' },
      { type: 'JOB_FAILED', reason: 'Dependency install failed', ts: '2026-01-26T10:05:00Z' },
    ];

    // Failed state
    let state = computeProjectState(features, events);
    expect(state.status).toBe('failed');

    // Recovery: new JOB_STARTED
    events.push({ type: 'JOB_STARTED', ts: '2026-01-26T10:10:00Z' });
    events.push({ type: 'FEATURE_STARTED', featureId: 'F1', ts: '2026-01-26T10:11:00Z' });
    state = computeProjectState(features, events);
    expect(state.status).toBe('running');
    expect(state.currentFeature).toBe('F1');

    // Complete successfully
    events.push({ type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:15:00Z' });
    events.push({ type: 'DEPLOY_DONE', url: 'https://demo.example.com', ts: '2026-01-26T10:20:00Z' });
    state = computeProjectState(features, events);
    expect(state.status).toBe('deployed');
  });
});

// =============================================================================
// Type Safety Tests
// =============================================================================

describe('Type Safety', () => {
  it('ProjectState has all required fields defined', () => {
    const state = computeProjectState([], []);

    // TypeScript ensures all fields exist
    const keys = Object.keys(state);
    expect(keys).toContain('status');
    expect(keys).toContain('progress');
    expect(keys).toContain('progressDetail');
    expect(keys).toContain('currentStep');
    expect(keys).toContain('currentFeature');
    expect(keys).toContain('waitingQuestion');
    expect(keys).toContain('demoUrl');
    expect(keys).toContain('repoUrl');
    expect(keys.length).toBe(8);
  });

  it('status is valid ProjectRunStatus value', () => {
    const validStatuses = ['not_started', 'running', 'waiting', 'failed', 'deployed'];
    const state = computeProjectState([], []);
    expect(validStatuses).toContain(state.status);
  });
});
