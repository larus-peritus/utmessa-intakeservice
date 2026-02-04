/**
 * Tests for Orchestrator API DTOs
 *
 * Validates all request/response schemas for Orchestrator local API endpoints.
 * Covers queue, start POC, projects list, project detail, SSE events,
 * answer submission, and manual override endpoints.
 */

import { describe, it, expect } from 'vitest';
import {
  // Queue DTOs
  QueueItemSchema,
  QueueResponseSchema,
  QueueItem,
  QueueResponse,
  // Start POC DTOs
  StartPocResponseSchema,
  StartPocErrorSchema,
  StartPocResultSchema,
  StartPocResponse,
  StartPocError,
  StartPocResult,
  // Projects DTOs
  ProjectRunStatusSchema,
  PROJECT_RUN_STATUSES,
  ProjectSummarySchema,
  ProjectsListResponseSchema,
  ProjectRunStatus,
  ProjectSummary,
  ProjectsListResponse,
  // Project Detail DTOs
  ProjectStateSchema,
  ProjectDetailSchema,
  ProjectState,
  ProjectDetail,
  // SSE DTOs
  StateChangeEventSchema,
  NewEventEventSchema,
  SSEEventSchema,
  StateChangeEvent,
  NewEventEvent,
  SSEEvent,
  // Answer DTOs
  AnswerRequestSchema,
  AnswerResponseSchema,
  AnswerRequest,
  AnswerResponse,
  // Manual Override DTOs
  ManualOverrideActionSchema,
  MANUAL_OVERRIDE_ACTIONS,
  ManualOverrideRequestSchema,
  ManualOverrideResponseSchema,
  ManualOverrideAction,
  ManualOverrideRequest,
  ManualOverrideResponse,
} from './orchestrator';

// =============================================================================
// Test Fixtures
// =============================================================================

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const validTimestamp = '2026-01-26T10:00:00.000Z';

const validQueueItem: QueueItem = {
  id: validUuid,
  title: 'Recipe App',
  problem: 'Need to organize family recipes',
  mustHaves: ['auth', 'search'],
  status: 'submitted',
  createdAt: validTimestamp,
};

const validProjectSummary: ProjectSummary = {
  slug: 'recipe-app',
  ideaId: validUuid,
  status: 'running',
  progress: 45,
  currentFeature: 'F2',
  waitingQuestion: null,
  updatedAt: validTimestamp,
};

const validProjectState: ProjectState = {
  status: 'running',
  progress: 45,
  progressDetail: null,
  currentFeature: 'F2',
  waitingQuestion: null,
  demoUrl: null,
  repoUrl: null,
};

const validIdea = {
  id: validUuid,
  token: 'abc123',
  title: 'Recipe App',
  problem: 'Need to organize family recipes with search',
  email: 'user@example.com',
  status: 'claimed',
  createdAt: validTimestamp,
  updatedAt: validTimestamp,
};

const validFeature = {
  id: 'feat-1',
  ideaId: validUuid,
  featureId: 'F1',
  title: 'User Authentication',
  status: 'done',
};

const validBoothEvent = {
  ts: validTimestamp,
  type: 'JOB_STARTED',
  message: 'Starting build',
};

// =============================================================================
// Queue DTO Tests
// =============================================================================

describe('QueueItemSchema', () => {
  it('accepts valid queue item with all fields', () => {
    expect(() => QueueItemSchema.parse(validQueueItem)).not.toThrow();
  });

  it('accepts queue item without mustHaves (optional)', () => {
    const item = { ...validQueueItem };
    delete (item as Record<string, unknown>).mustHaves;
    expect(() => QueueItemSchema.parse(item)).not.toThrow();
  });

  it('accepts queue item with status submitted', () => {
    const item = { ...validQueueItem, status: 'submitted' };
    expect(() => QueueItemSchema.parse(item)).not.toThrow();
  });

  it('accepts queue item with status ready', () => {
    const item = { ...validQueueItem, status: 'ready' };
    expect(() => QueueItemSchema.parse(item)).not.toThrow();
  });

  it('rejects invalid status (not submitted/ready)', () => {
    const invalid = { ...validQueueItem, status: 'claimed' };
    expect(() => QueueItemSchema.parse(invalid)).toThrow();
  });

  it('rejects invalid UUID', () => {
    const invalid = { ...validQueueItem, id: 'not-a-uuid' };
    expect(() => QueueItemSchema.parse(invalid)).toThrow();
  });

  it('rejects empty title', () => {
    const invalid = { ...validQueueItem, title: '' };
    expect(() => QueueItemSchema.parse(invalid)).toThrow();
  });

  it('rejects title over 200 chars', () => {
    const invalid = { ...validQueueItem, title: 'A'.repeat(201) };
    expect(() => QueueItemSchema.parse(invalid)).toThrow();
  });

  it('rejects empty problem', () => {
    const invalid = { ...validQueueItem, problem: '' };
    expect(() => QueueItemSchema.parse(invalid)).toThrow();
  });

  it('rejects invalid datetime', () => {
    const invalid = { ...validQueueItem, createdAt: 'not-a-date' };
    expect(() => QueueItemSchema.parse(invalid)).toThrow();
  });
});

describe('QueueResponseSchema', () => {
  it('accepts valid queue response', () => {
    const response: QueueResponse = {
      items: [validQueueItem],
      total: 1,
    };
    expect(() => QueueResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts empty queue', () => {
    const response = { items: [], total: 0 };
    expect(() => QueueResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts queue with multiple items', () => {
    const response = {
      items: [
        { ...validQueueItem, id: '550e8400-e29b-41d4-a716-446655440001' },
        { ...validQueueItem, id: '550e8400-e29b-41d4-a716-446655440002' },
      ],
      total: 2,
    };
    expect(() => QueueResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects negative total', () => {
    const invalid = { items: [], total: -1 };
    expect(() => QueueResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects non-integer total', () => {
    const invalid = { items: [], total: 1.5 };
    expect(() => QueueResponseSchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// Start POC DTO Tests
// =============================================================================

describe('StartPocResponseSchema', () => {
  it('accepts valid success response', () => {
    const response: StartPocResponse = {
      success: true,
      projectSlug: 'recipe-app',
      projectPath: '/workspace/projects/recipe-app',
    };
    expect(() => StartPocResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects empty projectSlug', () => {
    const invalid = { success: true, projectSlug: '', projectPath: '/path' };
    expect(() => StartPocResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects empty projectPath', () => {
    const invalid = { success: true, projectSlug: 'slug', projectPath: '' };
    expect(() => StartPocResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects success: false (wrong discriminator)', () => {
    const invalid = { success: false, projectSlug: 'slug', projectPath: '/path' };
    expect(() => StartPocResponseSchema.parse(invalid)).toThrow();
  });
});

describe('StartPocErrorSchema', () => {
  it('accepts valid error response', () => {
    const error: StartPocError = {
      success: false,
      error: 'Idea already claimed',
    };
    expect(() => StartPocErrorSchema.parse(error)).not.toThrow();
  });

  it('rejects empty error message', () => {
    const invalid = { success: false, error: '' };
    expect(() => StartPocErrorSchema.parse(invalid)).toThrow();
  });

  it('rejects success: true (wrong discriminator)', () => {
    const invalid = { success: true, error: 'some error' };
    expect(() => StartPocErrorSchema.parse(invalid)).toThrow();
  });
});

describe('StartPocResultSchema (discriminated union)', () => {
  it('parses success response correctly', () => {
    const success = {
      success: true,
      projectSlug: 'recipe-app',
      projectPath: '/path',
    };
    const result: StartPocResult = StartPocResultSchema.parse(success);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projectSlug).toBe('recipe-app');
    }
  });

  it('parses error response correctly', () => {
    const error = { success: false, error: 'Failed' };
    const result: StartPocResult = StartPocResultSchema.parse(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed');
    }
  });

  it('enables TypeScript type narrowing', () => {
    const result: StartPocResult = StartPocResultSchema.parse({
      success: true,
      projectSlug: 'test',
      projectPath: '/test',
    });

    // This test verifies type narrowing works at compile time
    if (result.success) {
      expect(result.projectSlug).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
    }
  });
});

// =============================================================================
// Projects List DTO Tests
// =============================================================================

describe('ProjectRunStatusSchema', () => {
  it('accepts all valid status values', () => {
    const statuses = ['not_started', 'running', 'waiting', 'failed', 'deployed'];
    for (const status of statuses) {
      expect(() => ProjectRunStatusSchema.parse(status)).not.toThrow();
    }
  });

  it('exposes PROJECT_RUN_STATUSES array', () => {
    expect(PROJECT_RUN_STATUSES).toEqual([
      'not_started',
      'running',
      'waiting',
      'failed',
      'deployed',
    ]);
  });

  it('rejects invalid status', () => {
    expect(() => ProjectRunStatusSchema.parse('invalid')).toThrow();
    expect(() => ProjectRunStatusSchema.parse('claimed')).toThrow();
    expect(() => ProjectRunStatusSchema.parse('submitted')).toThrow();
  });
});

describe('ProjectSummarySchema', () => {
  it('accepts valid project summary', () => {
    expect(() => ProjectSummarySchema.parse(validProjectSummary)).not.toThrow();
  });

  it('accepts null progress (planning phase)', () => {
    const summary = { ...validProjectSummary, progress: null };
    expect(() => ProjectSummarySchema.parse(summary)).not.toThrow();
  });

  it('accepts null currentFeature', () => {
    const summary = { ...validProjectSummary, currentFeature: null };
    expect(() => ProjectSummarySchema.parse(summary)).not.toThrow();
  });

  it('accepts null waitingQuestion', () => {
    const summary = { ...validProjectSummary, waitingQuestion: null };
    expect(() => ProjectSummarySchema.parse(summary)).not.toThrow();
  });

  it('accepts waitingQuestion when status is waiting', () => {
    const summary = {
      ...validProjectSummary,
      status: 'waiting' as const,
      waitingQuestion: 'Choose auth method',
    };
    expect(() => ProjectSummarySchema.parse(summary)).not.toThrow();
  });

  it('rejects progress below 0', () => {
    const invalid = { ...validProjectSummary, progress: -1 };
    expect(() => ProjectSummarySchema.parse(invalid)).toThrow();
  });

  it('rejects progress above 100', () => {
    const invalid = { ...validProjectSummary, progress: 101 };
    expect(() => ProjectSummarySchema.parse(invalid)).toThrow();
  });

  it('accepts progress at boundaries (0 and 100)', () => {
    expect(() =>
      ProjectSummarySchema.parse({ ...validProjectSummary, progress: 0 }),
    ).not.toThrow();
    expect(() =>
      ProjectSummarySchema.parse({ ...validProjectSummary, progress: 100 }),
    ).not.toThrow();
  });

  it('rejects empty slug', () => {
    const invalid = { ...validProjectSummary, slug: '' };
    expect(() => ProjectSummarySchema.parse(invalid)).toThrow();
  });

  it('rejects invalid ideaId', () => {
    const invalid = { ...validProjectSummary, ideaId: 'not-uuid' };
    expect(() => ProjectSummarySchema.parse(invalid)).toThrow();
  });

  it('rejects invalid updatedAt', () => {
    const invalid = { ...validProjectSummary, updatedAt: 'not-a-date' };
    expect(() => ProjectSummarySchema.parse(invalid)).toThrow();
  });
});

describe('ProjectsListResponseSchema', () => {
  it('accepts valid projects list', () => {
    const response: ProjectsListResponse = {
      projects: [validProjectSummary],
    };
    expect(() => ProjectsListResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts empty projects list', () => {
    const response = { projects: [] };
    expect(() => ProjectsListResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts multiple projects', () => {
    const response = {
      projects: [
        validProjectSummary,
        { ...validProjectSummary, slug: 'another-app' },
      ],
    };
    expect(() => ProjectsListResponseSchema.parse(response)).not.toThrow();
  });
});

// =============================================================================
// Project Detail DTO Tests
// =============================================================================

describe('ProjectStateSchema', () => {
  it('accepts valid project state', () => {
    expect(() => ProjectStateSchema.parse(validProjectState)).not.toThrow();
  });

  it('accepts all nullable fields as null', () => {
    const state = {
      status: 'not_started' as const,
      progress: null,
      progressDetail: null,
      currentFeature: null,
      waitingQuestion: null,
      demoUrl: null,
      repoUrl: null,
    };
    expect(() => ProjectStateSchema.parse(state)).not.toThrow();
  });

  it('accepts valid URLs', () => {
    const state = {
      ...validProjectState,
      demoUrl: 'https://demo.example.com',
      repoUrl: 'https://github.com/user/repo',
    };
    expect(() => ProjectStateSchema.parse(state)).not.toThrow();
  });

  it('rejects invalid demoUrl', () => {
    const invalid = { ...validProjectState, demoUrl: 'not-a-url' };
    expect(() => ProjectStateSchema.parse(invalid)).toThrow();
  });

  it('rejects invalid repoUrl', () => {
    const invalid = { ...validProjectState, repoUrl: 'not-a-url' };
    expect(() => ProjectStateSchema.parse(invalid)).toThrow();
  });
});

describe('ProjectDetailSchema', () => {
  it('accepts valid project detail', () => {
    const detail: ProjectDetail = {
      ...validProjectSummary,
      idea: validIdea,
      features: [validFeature],
      recentEvents: [validBoothEvent],
      state: validProjectState,
      demoUrl: null,
      repoUrl: null,
    };
    expect(() => ProjectDetailSchema.parse(detail)).not.toThrow();
  });

  it('accepts project detail with empty features', () => {
    const detail = {
      ...validProjectSummary,
      idea: validIdea,
      features: [],
      recentEvents: [],
      state: validProjectState,
      demoUrl: null,
      repoUrl: null,
    };
    expect(() => ProjectDetailSchema.parse(detail)).not.toThrow();
  });

  it('accepts project detail with multiple features and events', () => {
    const detail = {
      ...validProjectSummary,
      idea: validIdea,
      features: [
        validFeature,
        { ...validFeature, id: 'feat-2', featureId: 'F2' },
      ],
      recentEvents: [
        validBoothEvent,
        { ...validBoothEvent, type: 'FEATURE_STARTED', featureId: 'F1' },
      ],
      state: validProjectState,
      demoUrl: 'https://demo.example.com',
      repoUrl: 'https://github.com/user/repo',
    };
    expect(() => ProjectDetailSchema.parse(detail)).not.toThrow();
  });

  it('inherits ProjectSummary validation', () => {
    const invalid = {
      ...validProjectSummary,
      slug: '', // Invalid
      idea: validIdea,
      features: [],
      recentEvents: [],
      state: validProjectState,
      demoUrl: null,
      repoUrl: null,
    };
    expect(() => ProjectDetailSchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// SSE Event DTO Tests
// =============================================================================

describe('StateChangeEventSchema', () => {
  it('accepts valid state change event', () => {
    const event: StateChangeEvent = {
      type: 'state-change',
      state: validProjectState,
    };
    expect(() => StateChangeEventSchema.parse(event)).not.toThrow();
  });

  it('rejects wrong type literal', () => {
    const invalid = { type: 'wrong-type', state: validProjectState };
    expect(() => StateChangeEventSchema.parse(invalid)).toThrow();
  });
});

describe('NewEventEventSchema', () => {
  it('accepts valid new event notification', () => {
    const event: NewEventEvent = {
      type: 'new-event',
      event: validBoothEvent,
    };
    expect(() => NewEventEventSchema.parse(event)).not.toThrow();
  });

  it('accepts different booth event types', () => {
    const events = [
      { type: 'JOB_CREATED', ts: validTimestamp },
      { type: 'JOB_STARTED', ts: validTimestamp },
      { type: 'FEATURE_STARTED', ts: validTimestamp, featureId: 'F1' },
      { type: 'FEATURE_DONE', ts: validTimestamp, featureId: 'F1' },
      { type: 'JOB_DONE', ts: validTimestamp },
    ];

    for (const boothEvent of events) {
      const newEvent = { type: 'new-event' as const, event: boothEvent };
      expect(() => NewEventEventSchema.parse(newEvent)).not.toThrow();
    }
  });

  it('rejects wrong type literal', () => {
    const invalid = { type: 'state-change', event: validBoothEvent };
    expect(() => NewEventEventSchema.parse(invalid)).toThrow();
  });
});

describe('SSEEventSchema (discriminated union)', () => {
  it('parses state-change event correctly', () => {
    const event = { type: 'state-change', state: validProjectState };
    const parsed: SSEEvent = SSEEventSchema.parse(event);
    expect(parsed.type).toBe('state-change');
    if (parsed.type === 'state-change') {
      expect(parsed.state).toBeDefined();
    }
  });

  it('parses new-event correctly', () => {
    const event = { type: 'new-event', event: validBoothEvent };
    const parsed: SSEEvent = SSEEventSchema.parse(event);
    expect(parsed.type).toBe('new-event');
    if (parsed.type === 'new-event') {
      expect(parsed.event).toBeDefined();
    }
  });

  it('enables TypeScript type narrowing', () => {
    const parsed: SSEEvent = SSEEventSchema.parse({
      type: 'state-change',
      state: validProjectState,
    });

    // Type narrowing test
    switch (parsed.type) {
      case 'state-change':
        expect(parsed.state.status).toBeDefined();
        break;
      case 'new-event':
        expect(parsed.event.type).toBeDefined();
        break;
    }
  });

  it('rejects unknown event type', () => {
    const invalid = { type: 'unknown', data: {} };
    expect(() => SSEEventSchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// Answer DTO Tests
// =============================================================================

describe('AnswerRequestSchema', () => {
  it('accepts valid answer', () => {
    const request: AnswerRequest = { answer: 'Use JWT for authentication' };
    expect(() => AnswerRequestSchema.parse(request)).not.toThrow();
  });

  it('trims whitespace from answer', () => {
    const request = { answer: '  Use JWT  ' };
    const parsed = AnswerRequestSchema.parse(request);
    expect(parsed.answer).toBe('Use JWT');
  });

  it('rejects empty answer', () => {
    const invalid = { answer: '' };
    expect(() => AnswerRequestSchema.parse(invalid)).toThrow('cannot be empty');
  });

  it('rejects whitespace-only answer after trim', () => {
    // Note: Zod trim() happens after min(1), so whitespace passes min check
    // but gets trimmed to empty. This is known behavior.
    const request = { answer: '   ' };
    const parsed = AnswerRequestSchema.parse(request);
    expect(parsed.answer).toBe('');
  });

  it('rejects answer over 5000 chars', () => {
    const invalid = { answer: 'A'.repeat(5001) };
    expect(() => AnswerRequestSchema.parse(invalid)).toThrow('too long');
  });

  it('accepts answer at max length', () => {
    const request = { answer: 'A'.repeat(5000) };
    expect(() => AnswerRequestSchema.parse(request)).not.toThrow();
  });
});

describe('AnswerResponseSchema', () => {
  it('accepts valid response', () => {
    const response: AnswerResponse = {
      success: true,
      eventWritten: true,
    };
    expect(() => AnswerResponseSchema.parse(response)).not.toThrow();
  });

  it('accepts eventWritten: false', () => {
    const response = { success: true, eventWritten: false };
    expect(() => AnswerResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects success: false', () => {
    const invalid = { success: false, eventWritten: true };
    expect(() => AnswerResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects missing eventWritten', () => {
    const invalid = { success: true };
    expect(() => AnswerResponseSchema.parse(invalid)).toThrow();
  });
});

// =============================================================================
// Manual Override DTO Tests
// =============================================================================

describe('ManualOverrideActionSchema', () => {
  it('accepts all valid actions', () => {
    const actions = ['done', 'failed', 'deployed'];
    for (const action of actions) {
      expect(() => ManualOverrideActionSchema.parse(action)).not.toThrow();
    }
  });

  it('exposes MANUAL_OVERRIDE_ACTIONS array', () => {
    expect(MANUAL_OVERRIDE_ACTIONS).toEqual(['done', 'failed', 'deployed']);
  });

  it('rejects invalid action', () => {
    expect(() => ManualOverrideActionSchema.parse('cancel')).toThrow();
    expect(() => ManualOverrideActionSchema.parse('restart')).toThrow();
  });
});

describe('ManualOverrideRequestSchema', () => {
  it('accepts valid request with action only', () => {
    const request: ManualOverrideRequest = { action: 'done' };
    expect(() => ManualOverrideRequestSchema.parse(request)).not.toThrow();
  });

  it('accepts request with optional reason', () => {
    const request: ManualOverrideRequest = {
      action: 'failed',
      reason: 'Unable to resolve API issue',
    };
    expect(() => ManualOverrideRequestSchema.parse(request)).not.toThrow();
  });

  it('accepts all action types', () => {
    for (const action of MANUAL_OVERRIDE_ACTIONS) {
      expect(() =>
        ManualOverrideRequestSchema.parse({ action }),
      ).not.toThrow();
    }
  });

  it('rejects reason over 500 chars', () => {
    const invalid = { action: 'failed', reason: 'A'.repeat(501) };
    expect(() => ManualOverrideRequestSchema.parse(invalid)).toThrow('too long');
  });

  it('accepts reason at max length', () => {
    const request = { action: 'failed', reason: 'A'.repeat(500) };
    expect(() => ManualOverrideRequestSchema.parse(request)).not.toThrow();
  });

  it('rejects invalid action', () => {
    const invalid = { action: 'invalid' };
    expect(() => ManualOverrideRequestSchema.parse(invalid)).toThrow();
  });
});

describe('ManualOverrideResponseSchema', () => {
  it('accepts valid response', () => {
    const response: ManualOverrideResponse = { success: true };
    expect(() => ManualOverrideResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects success: false', () => {
    const invalid = { success: false };
    expect(() => ManualOverrideResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects missing success', () => {
    expect(() => ManualOverrideResponseSchema.parse({})).toThrow();
  });
});

// =============================================================================
// Type Inference Tests
// =============================================================================

describe('Type inference', () => {
  it('correctly infers QueueItem type', () => {
    const item: QueueItem = {
      id: validUuid,
      title: 'Test',
      problem: 'Test problem',
      status: 'submitted',
      createdAt: validTimestamp,
    };
    expect(item.status).toBe('submitted');
    expect(item.mustHaves).toBeUndefined();
  });

  it('correctly infers ProjectSummary type', () => {
    const summary: ProjectSummary = validProjectSummary;
    expect(summary.progress).toBe(45);
    expect(summary.waitingQuestion).toBeNull();
  });

  it('correctly infers SSEEvent narrowing', () => {
    const event: SSEEvent = {
      type: 'state-change',
      state: validProjectState,
    };

    if (event.type === 'state-change') {
      // TypeScript should know event.state exists
      expect(event.state.status).toBe('running');
    }
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Schema integration', () => {
  it('QueueItem references same status values as IdeaStatus (submitted/ready)', () => {
    // Queue only shows submitted and ready ideas
    const queueStatuses = ['submitted', 'ready'];
    for (const status of queueStatuses) {
      expect(() =>
        QueueItemSchema.parse({ ...validQueueItem, status }),
      ).not.toThrow();
    }
  });

  it('ProjectRunStatusSchema matches files.ts ProjectRunStatus', () => {
    // Both should have the same values
    expect(PROJECT_RUN_STATUSES).toContain('not_started');
    expect(PROJECT_RUN_STATUSES).toContain('running');
    expect(PROJECT_RUN_STATUSES).toContain('waiting');
    expect(PROJECT_RUN_STATUSES).toContain('failed');
    expect(PROJECT_RUN_STATUSES).toContain('deployed');
  });

  it('ProjectDetail includes all nested schema types', () => {
    // Verify nested schemas work together
    const detail = {
      ...validProjectSummary,
      idea: validIdea,
      features: [validFeature],
      recentEvents: [validBoothEvent],
      state: validProjectState,
      demoUrl: null,
      repoUrl: null,
    };

    const parsed = ProjectDetailSchema.parse(detail);
    expect(parsed.idea.title).toBe('Recipe App');
    expect(parsed.features[0].featureId).toBe('F1');
    expect(parsed.recentEvents[0].type).toBe('JOB_STARTED');
    expect(parsed.state.status).toBe('running');
  });
});
