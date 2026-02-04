import { describe, it, expect } from 'vitest';
import {
  DeployStartedEventSchema,
  DeployDoneEventSchema,
  RepoPublishedEventSchema,
} from '../src/schemas/events';

describe('Deployment Events', () => {
  describe('DeployStartedEvent', () => {
    it('should validate without target', () => {
      const result = DeployStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_STARTED',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with target', () => {
      const result = DeployStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_STARTED',
        target: 'vercel',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with various targets', () => {
      const targets = ['vercel', 'netlify', 'aws', 'digitalocean', 'railway'];
      for (const target of targets) {
        const result = DeployStartedEventSchema.safeParse({
          ts: '2026-01-26T10:00:00Z',
          type: 'DEPLOY_STARTED',
          target,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should validate with message and meta', () => {
      const result = DeployStartedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_STARTED',
        target: 'vercel',
        message: 'Starting deployment',
        meta: { region: 'us-west-1' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('DeployDoneEvent', () => {
    it('should validate with valid url', () => {
      const result = DeployDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_DONE',
        url: 'https://recipe-app-abc123.vercel.app',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with http url', () => {
      const result = DeployDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_DONE',
        url: 'http://localhost:3000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid url', () => {
      const result = DeployDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_DONE',
        url: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing url', () => {
      const result = DeployDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_DONE',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty url', () => {
      const result = DeployDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_DONE',
        url: '',
      });
      expect(result.success).toBe(false);
    });

    it('should validate with message and meta', () => {
      const result = DeployDoneEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'DEPLOY_DONE',
        url: 'https://my-app.vercel.app',
        message: 'Deployment successful',
        meta: { buildTime: 45, deploymentId: 'dep_123' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('RepoPublishedEvent', () => {
    it('should validate with valid repoUrl', () => {
      const result = RepoPublishedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'REPO_PUBLISHED',
        repoUrl: 'https://github.com/user/recipe-app',
      });
      expect(result.success).toBe(true);
    });

    it('should validate gitlab url', () => {
      const result = RepoPublishedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'REPO_PUBLISHED',
        repoUrl: 'https://gitlab.com/user/recipe-app',
      });
      expect(result.success).toBe(true);
    });

    it('should validate bitbucket url', () => {
      const result = RepoPublishedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'REPO_PUBLISHED',
        repoUrl: 'https://bitbucket.org/user/recipe-app',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid repoUrl', () => {
      const result = RepoPublishedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'REPO_PUBLISHED',
        repoUrl: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing repoUrl', () => {
      const result = RepoPublishedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'REPO_PUBLISHED',
      });
      expect(result.success).toBe(false);
    });

    it('should validate with message and meta', () => {
      const result = RepoPublishedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'REPO_PUBLISHED',
        repoUrl: 'https://github.com/user/recipe-app',
        message: 'Repository published',
        meta: { visibility: 'public', stars: 0 },
      });
      expect(result.success).toBe(true);
    });
  });
});
