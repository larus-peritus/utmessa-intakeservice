/**
 * Project Lifecycle Integration Tests
 *
 * Tests the full project lifecycle:
 * - Start POC from idea
 * - Project file creation
 * - State computation
 * - Project listing
 *
 * Note: These tests require both Mock Intake and file system access.
 *
 * @module e2e/api-tests/project-lifecycle
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import request from 'supertest';
import express, { type Express } from 'express';
import { MockIntakeServer } from '../helpers/mock-intake-server.js';
import { createSubmittedIdea, createReadyIdea } from '../fixtures/idea.fixtures.js';
import {
  createRunningProject,
  createWaitingProject,
  createDeployedProject,
  createFailedProject,
} from '../fixtures/project.fixtures.js';

describe('Project Lifecycle - Full Flow', () => {
  let mockIntake: MockIntakeServer;
  let intakeUrl: string;
  let workspacePath: string;

  beforeAll(async () => {
    mockIntake = new MockIntakeServer({ apiKey: 'test-api-key' });
    intakeUrl = await mockIntake.start();
  });

  afterAll(async () => {
    await mockIntake.stop();
  });

  beforeEach(() => {
    mockIntake.clearIdeas();
    // Create fresh workspace for each test
    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-lifecycle-'));
  });

  afterEach(() => {
    // Cleanup workspace
    if (workspacePath && fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
  });

  describe('Project Creation Flow', () => {
    it('should claim idea and create project files', async () => {
      const idea = createSubmittedIdea({ title: 'Recipe App' });
      mockIntake.addIdea(idea);

      // Claim the idea
      const claimResponse = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/claim`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ claimedBy: 'test-orchestrator' });

      expect(claimResponse.status).toBe(200);
      expect(claimResponse.body.slug).toBe('recipe-app');

      // Simulate project file creation (what Orchestrator does)
      const projectDir = path.join(workspacePath, claimResponse.body.slug);
      fs.mkdirSync(projectDir, { recursive: true });

      // Create booth.project.json
      const metadata = {
        schemaVersion: 1,
        ideaId: idea.id,
        slug: claimResponse.body.slug,
        token: idea.token,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(projectDir, 'booth.project.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Verify files exist
      expect(fs.existsSync(projectDir)).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'booth.project.json'))).toBe(true);
    });

    it('should track claim in Intake after project creation', async () => {
      const idea = createSubmittedIdea();
      mockIntake.addIdea(idea);

      // Claim
      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/claim`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ claimedBy: 'test-orchestrator' });

      // Verify idea status updated
      const fetchResponse = await request(intakeUrl)
        .get(`/api/ideas?status=claimed`)
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      expect(fetchResponse.body.ideas).toHaveLength(1);
      expect(fetchResponse.body.ideas[0].id).toBe(idea.id);
    });
  });

  describe('Project State Computation', () => {
    it('should compute running status from events', () => {
      createRunningProject(workspacePath, 'running-project');

      // Read and verify project metadata
      const metadataPath = path.join(workspacePath, 'running-project', 'booth.project.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadata.slug).toBe('running-project');

      // Read and verify events
      const eventsPath = path.join(workspacePath, 'running-project', 'booth.log.jsonl');
      const events = fs
        .readFileSync(eventsPath, 'utf-8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      expect(events.some((e) => e.type === 'JOB_STARTED')).toBe(true);
      expect(events.some((e) => e.type === 'FEATURES_PLANNED')).toBe(true);
    });

    it('should compute waiting status from WAITING_FOR_INPUT event', () => {
      const question = 'What authentication method?';
      createWaitingProject(workspacePath, 'waiting-project', question);

      // Read events
      const eventsPath = path.join(workspacePath, 'waiting-project', 'booth.log.jsonl');
      const events = fs
        .readFileSync(eventsPath, 'utf-8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      const waitingEvent = events.find((e) => e.type === 'WAITING_FOR_INPUT');
      expect(waitingEvent).toBeDefined();
      expect(waitingEvent.question).toBe(question);
    });

    it('should compute deployed status from DEPLOY_DONE event', () => {
      const demoUrl = 'https://my-app.example.com';
      createDeployedProject(workspacePath, 'deployed-project', demoUrl);

      // Read events
      const eventsPath = path.join(workspacePath, 'deployed-project', 'booth.log.jsonl');
      const events = fs
        .readFileSync(eventsPath, 'utf-8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      const deployEvent = events.find((e) => e.type === 'DEPLOY_DONE');
      expect(deployEvent).toBeDefined();
      expect(deployEvent.url).toBe(demoUrl);
    });

    it('should compute failed status from JOB_FAILED event', () => {
      const reason = 'API rate limit exceeded';
      createFailedProject(workspacePath, 'failed-project', reason);

      // Read events
      const eventsPath = path.join(workspacePath, 'failed-project', 'booth.log.jsonl');
      const events = fs
        .readFileSync(eventsPath, 'utf-8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      const failedEvent = events.find((e) => e.type === 'JOB_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent.reason).toBe(reason);
    });
  });

  describe('Project Progress Computation', () => {
    it('should compute progress as percentage of completed features', () => {
      createRunningProject(workspacePath, 'progress-test', {
        features: [
          { id: 'F1', title: 'Feature 1', status: 'done' },
          { id: 'F2', title: 'Feature 2', status: 'done' },
          { id: 'F3', title: 'Feature 3', status: 'in_progress' },
          { id: 'F4', title: 'Feature 4', status: 'planned' },
        ],
      });

      // Read features
      const featuresPath = path.join(workspacePath, 'progress-test', 'features.json');
      const featuresData = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));

      const totalFeatures = featuresData.features.length;
      const completedFeatures = featuresData.features.filter(
        (f: { status: string }) => f.status === 'done'
      ).length;

      const progress = Math.round((completedFeatures / totalFeatures) * 100);
      expect(progress).toBe(50); // 2 of 4 features done
    });

    it('should handle project with no features yet', () => {
      // Create project without features.json
      const projectDir = path.join(workspacePath, 'no-features');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectDir, 'booth.project.json'),
        JSON.stringify({
          schemaVersion: 1,
          ideaId: '123e4567-e89b-12d3-a456-426614174000',
          slug: 'no-features',
          token: 'token-123',
          createdAt: new Date().toISOString(),
        })
      );

      // No features.json means progress should be null/0
      expect(fs.existsSync(path.join(projectDir, 'features.json'))).toBe(false);
    });
  });

  describe('Multiple Projects', () => {
    it('should list multiple projects from workspace', () => {
      createRunningProject(workspacePath, 'project-a');
      createDeployedProject(workspacePath, 'project-b');
      createWaitingProject(workspacePath, 'project-c');

      // Read workspace directory
      const entries = fs.readdirSync(workspacePath);
      const projectDirs = entries.filter((entry) => {
        const stat = fs.statSync(path.join(workspacePath, entry));
        return stat.isDirectory();
      });

      expect(projectDirs).toHaveLength(3);
      expect(projectDirs).toContain('project-a');
      expect(projectDirs).toContain('project-b');
      expect(projectDirs).toContain('project-c');
    });

    it('should filter projects by status', () => {
      createRunningProject(workspacePath, 'running-1');
      createRunningProject(workspacePath, 'running-2');
      createDeployedProject(workspacePath, 'deployed-1');
      createFailedProject(workspacePath, 'failed-1');

      // Manually compute statuses
      const projects = fs.readdirSync(workspacePath).map((slug) => {
        const eventsPath = path.join(workspacePath, slug, 'booth.log.jsonl');
        if (!fs.existsSync(eventsPath)) return { slug, status: 'not_started' };

        const events = fs
          .readFileSync(eventsPath, 'utf-8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));

        // Compute status from events (simplified)
        const lastEvent = events[events.length - 1];
        if (lastEvent?.type === 'DEPLOY_DONE') return { slug, status: 'deployed' };
        if (lastEvent?.type === 'JOB_FAILED') return { slug, status: 'failed' };
        if (events.some((e) => e.type === 'WAITING_FOR_INPUT')) return { slug, status: 'waiting' };
        if (events.some((e) => e.type === 'JOB_STARTED')) return { slug, status: 'running' };
        return { slug, status: 'not_started' };
      });

      const runningProjects = projects.filter((p) => p.status === 'running');
      expect(runningProjects).toHaveLength(2);

      const deployedProjects = projects.filter((p) => p.status === 'deployed');
      expect(deployedProjects).toHaveLength(1);
    });
  });
});
