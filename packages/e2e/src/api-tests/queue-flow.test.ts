/**
 * Queue Flow Integration Tests
 *
 * Tests the Orchestrator ↔ Intake queue functionality:
 * - Fetching ideas from Intake queue
 * - Filtering by status
 * - Queue ordering
 *
 * @module e2e/api-tests/queue-flow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MockIntakeServer } from '../helpers/mock-intake-server.js';
import {
  createSubmittedIdea,
  createReadyIdea,
  createRunningIdea,
  createQueueIdeas,
} from '../fixtures/idea.fixtures.js';

describe('Queue Flow - Orchestrator ↔ Intake', () => {
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

  describe('GET /api/ideas - Intake API Contract', () => {
    it('should return empty list when no ideas exist', async () => {
      const response = await request(intakeUrl)
        .get('/api/ideas')
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ideas: [],
        total: 0,
      });
    });

    it('should return all ideas without filter', async () => {
      const ideas = createQueueIdeas();
      mockIntake.addIdeas(ideas);

      const response = await request(intakeUrl)
        .get('/api/ideas')
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      expect(response.status).toBe(200);
      expect(response.body.ideas).toHaveLength(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter ideas by single status', async () => {
      mockIntake.addIdea(createSubmittedIdea({ title: 'Submitted 1' }));
      mockIntake.addIdea(createReadyIdea({ title: 'Ready 1' }));
      mockIntake.addIdea(createRunningIdea({ title: 'Running 1' }));

      const response = await request(intakeUrl)
        .get('/api/ideas?status=submitted')
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      expect(response.status).toBe(200);
      expect(response.body.ideas).toHaveLength(1);
      expect(response.body.ideas[0].title).toBe('Submitted 1');
    });

    it('should filter ideas by multiple statuses', async () => {
      mockIntake.addIdea(createSubmittedIdea({ title: 'Submitted 1' }));
      mockIntake.addIdea(createReadyIdea({ title: 'Ready 1' }));
      mockIntake.addIdea(createRunningIdea({ title: 'Running 1' }));

      const response = await request(intakeUrl)
        .get('/api/ideas?status=submitted,ready')
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      expect(response.status).toBe(200);
      expect(response.body.ideas).toHaveLength(2);
      const titles = response.body.ideas.map((i: { title: string }) => i.title);
      expect(titles).toContain('Submitted 1');
      expect(titles).toContain('Ready 1');
    });

    it('should reject requests without API key', async () => {
      const response = await request(intakeUrl).get('/api/ideas');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(intakeUrl)
        .get('/api/ideas')
        .set('X-ORCH-KEY', 'wrong-key');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ideas/:id/claim - Claim Flow', () => {
    it('should successfully claim a submitted idea', async () => {
      const idea = createSubmittedIdea({ title: 'Recipe App' });
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/claim`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ claimedBy: 'orchestrator-1' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('claimed');
      expect(response.body.slug).toBe('recipe-app');
      expect(response.body.id).toBe(idea.id);
    });

    it('should return 404 for non-existent idea', async () => {
      const response = await request(intakeUrl)
        .post('/api/ideas/non-existent-id/claim')
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ claimedBy: 'orchestrator-1' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Idea not found');
    });

    it('should return 409 when idea is already claimed', async () => {
      const idea = createSubmittedIdea();
      mockIntake.addIdea(idea);

      // First claim should succeed
      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/claim`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ claimedBy: 'orchestrator-1' });

      // Second claim should fail
      const response = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/claim`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ claimedBy: 'orchestrator-2' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Idea already claimed');
    });

    it('should generate slug from title', async () => {
      const idea = createSubmittedIdea({ title: 'My Awesome App v2.0!' });
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/claim`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ claimedBy: 'orchestrator-1' });

      expect(response.status).toBe(200);
      expect(response.body.slug).toBe('my-awesome-app-v2-0');
    });
  });

  describe('POST /api/ideas/:id/update - Status Updates', () => {
    it('should update idea status', async () => {
      const idea = createSubmittedIdea();
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ status: 'running' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('running');
    });

    it('should update progress and current feature', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({
          progress: 75,
          currentFeature: 'F3',
        });

      expect(response.status).toBe(200);
      expect(response.body.progress).toBe(75);
      expect(response.body.currentFeature).toBe('F3');
    });

    it('should track update history', async () => {
      const idea = createRunningIdea();
      mockIntake.addIdea(idea);

      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ progress: 50 });

      await request(intakeUrl)
        .post(`/api/ideas/${idea.id}/update`)
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ progress: 75 });

      const history = mockIntake.getUpdateHistory();
      expect(history).toHaveLength(2);
      expect(history[0].update.progress).toBe(50);
      expect(history[1].update.progress).toBe(75);
    });

    it('should return 404 for non-existent idea', async () => {
      const response = await request(intakeUrl)
        .post('/api/ideas/non-existent-id/update')
        .set('X-ORCH-KEY', mockIntake.getApiKey())
        .send({ status: 'running' });

      expect(response.status).toBe(404);
    });
  });

  describe('Response Schema Validation', () => {
    it('should return all required idea fields', async () => {
      const idea = createSubmittedIdea({
        title: 'Complete Idea',
        problem: 'A complete problem description for testing',
        mustHaves: ['Feature A', 'Feature B'],
      });
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .get('/api/ideas')
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      expect(response.status).toBe(200);
      const returnedIdea = response.body.ideas[0];

      // Required fields
      expect(returnedIdea).toHaveProperty('id');
      expect(returnedIdea).toHaveProperty('token');
      expect(returnedIdea).toHaveProperty('title');
      expect(returnedIdea).toHaveProperty('problem');
      expect(returnedIdea).toHaveProperty('email');
      expect(returnedIdea).toHaveProperty('status');
      expect(returnedIdea).toHaveProperty('createdAt');
      expect(returnedIdea).toHaveProperty('updatedAt');

      // Optional fields
      expect(returnedIdea).toHaveProperty('mustHaves');
    });

    it('should return valid UUID for id', async () => {
      const idea = createSubmittedIdea();
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .get('/api/ideas')
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body.ideas[0].id).toMatch(uuidRegex);
    });

    it('should return valid ISO datetime strings', async () => {
      const idea = createSubmittedIdea();
      mockIntake.addIdea(idea);

      const response = await request(intakeUrl)
        .get('/api/ideas')
        .set('X-ORCH-KEY', mockIntake.getApiKey());

      const returnedIdea = response.body.ideas[0];
      expect(() => new Date(returnedIdea.createdAt)).not.toThrow();
      expect(() => new Date(returnedIdea.updatedAt)).not.toThrow();
    });
  });
});
