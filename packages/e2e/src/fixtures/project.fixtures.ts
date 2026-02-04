/**
 * Test fixtures for Project files
 *
 * Factory functions to create project directory structures with
 * booth.project.json, booth.log.jsonl, and features.json files.
 *
 * @module e2e/fixtures/project
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Event types used in booth.log.jsonl
 */
export type BoothEventType =
  | 'JOB_STARTED'
  | 'FEATURES_PLANNED'
  | 'FEATURE_STARTED'
  | 'FEATURE_DONE'
  | 'WAITING_FOR_INPUT'
  | 'INPUT_RECEIVED'
  | 'JOB_DONE'
  | 'JOB_FAILED'
  | 'DEPLOY_STARTED'
  | 'DEPLOY_DONE';

/**
 * Project metadata (booth.project.json)
 */
export interface ProjectMetadata {
  schemaVersion: number;
  ideaId: string;
  slug: string;
  token: string;
  createdAt: string;
  startedAt?: string;
  notes?: string;
}

/**
 * Feature entry for features.json
 */
export interface FeatureEntry {
  id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'done' | 'skipped';
}

/**
 * Options for creating a test project
 */
export interface CreateProjectOptions {
  ideaId?: string;
  slug?: string;
  token?: string;
  createdAt?: string;
  startedAt?: string;
  notes?: string;
  events?: Array<Record<string, unknown>>;
  features?: FeatureEntry[];
}

/**
 * Create a project directory with all necessary files
 *
 * @param workspacePath - Parent directory for projects
 * @param slug - Project slug (directory name)
 * @param options - Project configuration
 * @returns Path to created project directory
 */
export function createProjectFiles(
  workspacePath: string,
  slug: string,
  options: CreateProjectOptions = {}
): string {
  const projectDir = path.join(workspacePath, slug);
  fs.mkdirSync(projectDir, { recursive: true });

  const ideaId = options.ideaId ?? randomUUID();
  const now = new Date().toISOString();

  // Create booth.project.json
  const metadata: ProjectMetadata = {
    schemaVersion: 1,
    ideaId,
    slug,
    token: options.token ?? `token-${slug}`,
    createdAt: options.createdAt ?? now,
    startedAt: options.startedAt ?? now,
    notes: options.notes ?? `Test Project: ${slug}`,
  };

  fs.writeFileSync(
    path.join(projectDir, 'booth.project.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Create booth.log.jsonl (events)
  if (options.events && options.events.length > 0) {
    const lines = options.events.map((e) => JSON.stringify(e));
    fs.writeFileSync(path.join(projectDir, 'booth.log.jsonl'), lines.join('\n') + '\n');
  }

  // Create features.json
  if (options.features && options.features.length > 0) {
    fs.writeFileSync(
      path.join(projectDir, 'features.json'),
      JSON.stringify({ schemaVersion: 1, features: options.features }, null, 2)
    );
  }

  return projectDir;
}

/**
 * Create a running project with progress
 */
export function createRunningProject(
  workspacePath: string,
  slug: string,
  options: Partial<CreateProjectOptions> = {}
): string {
  const startedAt = options.startedAt ?? '2026-01-26T10:05:00Z';

  return createProjectFiles(workspacePath, slug, {
    ...options,
    startedAt,
    events: options.events ?? [
      { type: 'JOB_STARTED', ts: startedAt },
      { type: 'FEATURES_PLANNED', total: 3, ts: '2026-01-26T10:06:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F1', title: 'Feature 1', ts: '2026-01-26T10:07:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:08:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F2', title: 'Feature 2', ts: '2026-01-26T10:09:00Z' },
    ],
    features: options.features ?? [
      { id: 'F1', title: 'Feature 1', status: 'done' },
      { id: 'F2', title: 'Feature 2', status: 'in_progress' },
      { id: 'F3', title: 'Feature 3', status: 'planned' },
    ],
  });
}

/**
 * Create a waiting project (paused for human input)
 */
export function createWaitingProject(
  workspacePath: string,
  slug: string,
  question = 'What color scheme do you prefer?'
): string {
  return createProjectFiles(workspacePath, slug, {
    events: [
      { type: 'JOB_STARTED', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURES_PLANNED', total: 2, ts: '2026-01-26T10:06:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F1', title: 'Feature 1', ts: '2026-01-26T10:07:00Z' },
      { type: 'WAITING_FOR_INPUT', question, ts: '2026-01-26T10:08:00Z' },
    ],
    features: [
      { id: 'F1', title: 'Feature 1', status: 'in_progress' },
      { id: 'F2', title: 'Feature 2', status: 'planned' },
    ],
  });
}

/**
 * Create a deployed project
 */
export function createDeployedProject(
  workspacePath: string,
  slug: string,
  demoUrl = 'https://demo.example.com'
): string {
  return createProjectFiles(workspacePath, slug, {
    events: [
      { type: 'JOB_STARTED', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURES_PLANNED', total: 1, ts: '2026-01-26T10:06:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F1', title: 'Feature 1', ts: '2026-01-26T10:07:00Z' },
      { type: 'FEATURE_DONE', featureId: 'F1', ts: '2026-01-26T10:08:00Z' },
      { type: 'JOB_DONE', ts: '2026-01-26T10:09:00Z' },
      { type: 'DEPLOY_STARTED', ts: '2026-01-26T10:10:00Z' },
      { type: 'DEPLOY_DONE', url: demoUrl, ts: '2026-01-26T10:11:00Z' },
    ],
    features: [{ id: 'F1', title: 'Feature 1', status: 'done' }],
  });
}

/**
 * Create a failed project
 */
export function createFailedProject(
  workspacePath: string,
  slug: string,
  reason = 'Build failed: missing dependency xyz'
): string {
  return createProjectFiles(workspacePath, slug, {
    events: [
      { type: 'JOB_STARTED', ts: '2026-01-26T10:05:00Z' },
      { type: 'FEATURES_PLANNED', total: 1, ts: '2026-01-26T10:06:00Z' },
      { type: 'FEATURE_STARTED', featureId: 'F1', title: 'Feature 1', ts: '2026-01-26T10:07:00Z' },
      { type: 'JOB_FAILED', reason, ts: '2026-01-26T10:08:00Z' },
    ],
    features: [{ id: 'F1', title: 'Feature 1', status: 'planned' }],
  });
}

/**
 * Create a not-started project (just metadata, no events)
 */
export function createNotStartedProject(workspacePath: string, slug: string): string {
  return createProjectFiles(workspacePath, slug, {
    events: [],
    features: undefined,
  });
}

/**
 * Append an event to an existing project's log
 */
export function appendEvent(
  workspacePath: string,
  slug: string,
  event: Record<string, unknown>
): void {
  const logPath = path.join(workspacePath, slug, 'booth.log.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(event) + '\n');
}
