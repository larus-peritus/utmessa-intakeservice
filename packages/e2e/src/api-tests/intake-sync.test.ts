/**
 * Intake Sync Integration Tests
 *
 * Tests state synchronization from Orchestrator to Intake:
 * - Progress updates
 * - Status transitions
 * - Feature updates
 *
 * @module e2e/api-tests/intake-sync
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MockIntakeServer } from '../helpers/mock-intake-server.js';
import {
  createRunningIdea,
  createWaitingIdea,
  createClaimedIdea,
} from '../fixtures/idea.fixtures.js';

describe('Intake Sync - Orchestrator → Intake', () => {
  let mockIntake: MockIntakeServer;
  let intakeUrl: string;

  beforeAll(async () => {
    mockIntake = new MockIntakeServer({ apiKey: 'test-api-key' });
    intakeUrl = await mockIntake.start();
  });

  afterAll(async () => {
    await mockIntake.stop();
  });

  beforeEach(() => {
    mockIntake.clearIdeas();
  });

  describe('Progress Sync', () => {
    it('should sync progress updates to Intake', async () => {
      const idea = createClaimedIdea();
      mockIntake.addIdea(idea);

      // Simulate Orchestrator progress update
      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ progress: 25 });

      // Verify in Intake
      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.progress).toBe(25);
    });

    it('should track incremental progress updates', async () => {
      const idea = createRunningIdea({ progress: 0 });
      mockIntake.addIdea(idea);

      // Multiple progress updates
      const progressValues = [10, 25, 50, 75, 100];

      for (const progress of progressValues) {
        await request(intakeUrl)
          .post(`/api/ideas/${idea.id}/update`)
          .set('X-ORCH-KEY', mockIntake.getApiKey())
          .send({ progress });
      }

      // Verify final progress
      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.progress).toBe(100);

      // Verify update history
      const history = mockIntake.getUpdateHistory();
      expect(history).toHaveLength(5);
      expect(history.map((h) => h.update.progress)).toEqual(progressValues);
    });

    it('should sync currentFeature with progress', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      // Update with progress and currentFeature
      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({
          progress: 60,
          currentFeature: 'F3',
        });

      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.progress).toBe(60);
      expect(ideaAfter?.currentFeature).toBe('F3');
    });
  });

  describe('Status Transitions', () => {
    it('should sync claimed → running transition', async () => {
      const idea = createClaimedIdea();
      mockIntake.addIdea(idea);

      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ status: 'running' });

      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.status).toBe('running');
    });

    it('should sync running → waiting transition with question', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      const question = 'What authentication provider should we use?';
      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({
          status: 'waiting',
          waitingQuestion: question,
        });

      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.status).toBe('waiting');
      expect(ideaAfter?.waitingQuestion).toBe(question);
    });

    it('should sync waiting → running transition after answer', async () => {
      const idea = createWaitingIdea();
      mockIntake.addIdea(idea);

      // Answer provided, resume running
      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ status: 'running' });

      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.status).toBe('running');
    });

    it('should sync running → deployed transition with URLs', async () => {
      const idea = createRunningIdea({ progress: 100 });
      mockIntake.addIdea(idea);

      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({
          status: 'deployed',
          demoUrl: 'https://demo.example.com',
          repoUrl: 'https://github.com/user/repo',
        });

      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.status).toBe('deployed');
      expect(ideaAfter?.demoUrl).toBe('https://demo.example.com');
      expect(ideaAfter?.repoUrl).toBe('https://github.com/user/repo');
    });

    it('should sync running → failed transition with error', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({
          status: 'failed',
          currentStep: 'Build failed: npm install failed',
        });

      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.status).toBe('failed');
      expect(ideaAfter?.currentStep).toContain('failed');
    });
  });

  describe('Partial Updates', () => {
    it('should only update specified fields', async () => {
      const idea = createRunningIdea({
        progress: 50,
        currentFeature: 'F2',
      });
      mockIntake.addIdea(idea);

      // Only update progress, not currentFeature
      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ progress: 75 });

      const ideaAfter = mockIntake.getIdea(idea.id);
      expect(ideaAfter?.progress).toBe(75);
      expect(ideaAfter?.currentFeature).toBe('F2'); // Unchanged
    });

    it('should allow empty update (no-op)', async () => {
      const idea = createRunningIdea();
      const originalUpdatedAt = idea.updatedAt;
      mockIntake.addIdea(idea);

      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({});

      const ideaAfter = mockIntake.getIdea(idea.id);
      // updatedAt should be updated even for empty update
      expect(ideaAfter?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('Feature Sync', () => {
    it('should sync features to Intake', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/features`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({
          features: [
            { id: 'F1', ideaId: idea.id, featureId: 'F1', title: 'Auth', status: 'done' },
            { id: 'F2', ideaId: idea.id, featureId: 'F2', title: 'Dashboard', status: 'in_progress' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle update to non-existent idea', async () => {
      const response = await request(intakeUrl)
        .post('/api/ideas/non-existent/update')
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ progress: 50 });

      expect(response.status).toBe(404);
    });

    it('should handle unauthorized update request', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', 'wrong-key')
        .send({ progress: 50 });

      expect(response.status).toBe(401);
    });
  });

  describe('Update Timestamps', () => {
    it('should update updatedAt on each sync', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      const beforeUpdate = mockIntake.getIdea(idea.id)?.updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 10));

      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ progress: 50 });

      const afterUpdate = mockIntake.getIdea(idea.id)?.updatedAt;

      expect(new Date(afterUpdate!).getTime()).toBeGreaterThan(new Date(beforeUpdate!).getTime());
    });
  });
});
