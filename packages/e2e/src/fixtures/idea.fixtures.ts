/**
 * Test fixtures for Ideas
 *
 * Factory functions to create test idea data with sensible defaults.
 * All fixtures return data matching the Idea schema from @utmessa/shared.
 *
 * @module e2e/fixtures/idea
 */

import type { Idea, IdeaStatus } from '@utmessa/shared';
import { randomUUID } from 'crypto';

/**
 * Options for creating a test idea
 */
export interface CreateIdeaOptions {
  id?: string;
  token?: string;
  title?: string;
  problem?: string;
  mustHaves?: string[];
  email?: string;
  status?: IdeaStatus;
  progress?: number;
  currentStep?: string;
  currentFeature?: string;
  waitingQuestion?: string;
  demoUrl?: string;
  repoUrl?: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create a test idea with default values
 *
 * @param options - Override default values
 * @returns Complete Idea object
 */
export function createIdea(options: CreateIdeaOptions = {}): Idea {
  const id = options.id ?? randomUUID();
  const now = new Date().toISOString();

  return {
    id,
    token: options.token ?? `receipt-${id.slice(0, 8)}`,
    title: options.title ?? 'Test Idea',
    problem: options.problem ?? 'This is a test problem that needs to be solved with an app.',
    mustHaves: options.mustHaves ?? ['Feature A', 'Feature B'],
    email: options.email ?? 'test@example.com',
    status: options.status ?? 'submitted',
    progress: options.progress,
    currentStep: options.currentStep,
    currentFeature: options.currentFeature,
    waitingQuestion: options.waitingQuestion,
    demoUrl: options.demoUrl,
    repoUrl: options.repoUrl,
    slug: options.slug,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
}

/**
 * Create a submitted idea (initial state)
 */
export function createSubmittedIdea(options: CreateIdeaOptions = {}): Idea {
  return createIdea({
    ...options,
    status: 'submitted',
    progress: undefined,
    currentFeature: undefined,
  });
}

/**
 * Create a ready idea (approved for processing)
 */
export function createReadyIdea(options: CreateIdeaOptions = {}): Idea {
  return createIdea({
    ...options,
    status: 'ready',
    progress: undefined,
    currentFeature: undefined,
  });
}

/**
 * Create a claimed idea (being processed)
 */
export function createClaimedIdea(options: CreateIdeaOptions = {}): Idea {
  return createIdea({
    ...options,
    status: 'claimed',
    slug: options.slug ?? 'test-project',
  });
}

/**
 * Create a running idea (actively building)
 */
export function createRunningIdea(options: CreateIdeaOptions = {}): Idea {
  return createIdea({
    ...options,
    status: 'running',
    progress: options.progress ?? 45,
    currentFeature: options.currentFeature ?? 'F2',
    slug: options.slug ?? 'test-project',
  });
}

/**
 * Create a waiting idea (awaiting human input)
 */
export function createWaitingIdea(options: CreateIdeaOptions = {}): Idea {
  return createIdea({
    ...options,
    status: 'waiting',
    progress: options.progress ?? 30,
    waitingQuestion: options.waitingQuestion ?? 'What authentication method do you prefer?',
    slug: options.slug ?? 'test-project',
  });
}

/**
 * Create a deployed idea (successfully completed)
 */
export function createDeployedIdea(options: CreateIdeaOptions = {}): Idea {
  return createIdea({
    ...options,
    status: 'deployed',
    progress: 100,
    demoUrl: options.demoUrl ?? 'https://demo.example.com',
    repoUrl: options.repoUrl ?? 'https://github.com/example/repo',
    slug: options.slug ?? 'test-project',
  });
}

/**
 * Create a failed idea (build failed)
 */
export function createFailedIdea(options: CreateIdeaOptions = {}): Idea {
  return createIdea({
    ...options,
    status: 'failed',
    progress: options.progress ?? 60,
    currentStep: options.currentStep ?? 'Build failed: missing dependency',
    slug: options.slug ?? 'test-project',
  });
}

/**
 * Create multiple ideas with different statuses for queue testing
 */
export function createQueueIdeas(): Idea[] {
  return [
    createSubmittedIdea({ title: 'Recipe App', createdAt: '2026-01-26T10:00:00Z' }),
    createSubmittedIdea({ title: 'Todo Manager', createdAt: '2026-01-26T11:00:00Z' }),
    createReadyIdea({ title: 'Expense Tracker', createdAt: '2026-01-26T09:00:00Z' }),
  ];
}
