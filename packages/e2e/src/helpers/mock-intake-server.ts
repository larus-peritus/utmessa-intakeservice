/**
 * Mock Intake Server
 *
 * Lightweight Express server that implements the Intake API contract.
 * Used for fast, deterministic E2E tests without a real database.
 *
 * Implements:
 * - GET /api/ideas?status=... - List ideas by status
 * - POST /api/ideas/:id/claim - Claim an idea
 * - POST /api/ideas/:id/update - Update idea status/progress
 *
 * @module e2e/helpers/mock-intake-server
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import type { Idea, IdeaStatus } from '@utmessa/shared';
import { createServer, type Server } from 'http';

/**
 * Mock Intake Server configuration
 */
export interface MockIntakeConfig {
  port?: number;
  apiKey?: string;
}

/**
 * Update request body
 */
interface UpdateRequest {
  status?: IdeaStatus;
  progress?: number;
  currentStep?: string;
  currentFeature?: string;
  waitingQuestion?: string;
  demoUrl?: string;
  repoUrl?: string;
}

/**
 * Claim request body
 */
interface ClaimRequest {
  claimedBy: string;
}

/**
 * Mock Intake Server for E2E testing
 *
 * Stores ideas in memory and implements the Intake API contract.
 * Supports authentication via X-ORCH-KEY header.
 */
export class MockIntakeServer {
  private app: Express;
  private server: Server | null = null;
  private ideas: Map<string, Idea> = new Map();
  private readonly apiKey: string;
  private port: number;
  private updateHistory: Array<{ ideaId: string; update: UpdateRequest; timestamp: Date }> = [];

  constructor(config: MockIntakeConfig = {}) {
    this.apiKey = config.apiKey ?? 'test-api-key';
    this.port = config.port ?? 0; // 0 = random available port
    this.app = this.createApp();
  }

  private createApp(): Express {
    const app = express();
    app.use(express.json());

    // Authentication middleware for protected endpoints
    const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const key = req.headers['x-orch-key'];
      if (key !== this.apiKey) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
    };

    // GET /api/ideas?status=...
    app.get('/api/ideas', authMiddleware, (req: Request, res: Response) => {
      const statusParam = req.query.status as string | undefined;
      let ideas = Array.from(this.ideas.values());

      if (statusParam) {
        const statuses = statusParam.split(',').map((s) => s.trim());
        ideas = ideas.filter((idea) => statuses.includes(idea.status));
      }

      res.json({
        ideas,
        total: ideas.length,
      });
    });

    // POST /api/ideas/:id/claim
    app.post('/api/ideas/:id/claim', authMiddleware, (req: Request, res: Response) => {
      const { id } = req.params;
      const { claimedBy } = req.body as ClaimRequest;

      const idea = this.ideas.get(id);
      if (!idea) {
        res.status(404).json({ error: 'Idea not found' });
        return;
      }

      if (idea.status === 'claimed' || idea.status === 'running') {
        res.status(409).json({ error: 'Idea already claimed' });
        return;
      }

      // Update idea to claimed status
      const claimedIdea: Idea = {
        ...idea,
        status: 'claimed',
        slug: this.generateSlug(idea.title),
        updatedAt: new Date().toISOString(),
      };

      this.ideas.set(id, claimedIdea);

      res.json(claimedIdea);
    });

    // POST /api/ideas/:id/update
    app.post('/api/ideas/:id/update', authMiddleware, (req: Request, res: Response) => {
      const { id } = req.params;
      const update = req.body as UpdateRequest;

      const idea = this.ideas.get(id);
      if (!idea) {
        res.status(404).json({ error: 'Idea not found' });
        return;
      }

      // Track update history
      this.updateHistory.push({ ideaId: id, update, timestamp: new Date() });

      // Apply partial updates
      const updatedIdea: Idea = {
        ...idea,
        ...(update.status && { status: update.status }),
        ...(update.progress !== undefined && { progress: update.progress }),
        ...(update.currentStep && { currentStep: update.currentStep }),
        ...(update.currentFeature && { currentFeature: update.currentFeature }),
        ...(update.waitingQuestion && { waitingQuestion: update.waitingQuestion }),
        ...(update.demoUrl && { demoUrl: update.demoUrl }),
        ...(update.repoUrl && { repoUrl: update.repoUrl }),
        updatedAt: new Date().toISOString(),
      };

      this.ideas.set(id, updatedIdea);

      res.json(updatedIdea);
    });

    // POST /api/ideas/:id/features (optional)
    app.post('/api/ideas/:id/features', authMiddleware, (req: Request, res: Response) => {
      const { id } = req.params;

      const idea = this.ideas.get(id);
      if (!idea) {
        res.status(404).json({ error: 'Idea not found' });
        return;
      }

      res.json({ success: true });
    });

    return app;
  }

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }

  /**
   * Start the mock server
   * @returns The URL of the running server
   */
  async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server = createServer(this.app);
      this.server.listen(this.port, () => {
        const address = this.server!.address();
        if (typeof address === 'object' && address) {
          this.port = address.port;
        }
        resolve(`http://localhost:${this.port}`);
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Add an idea to the mock database
   */
  addIdea(idea: Idea): void {
    this.ideas.set(idea.id, idea);
  }

  /**
   * Add multiple ideas
   */
  addIdeas(ideas: Idea[]): void {
    for (const idea of ideas) {
      this.addIdea(idea);
    }
  }

  /**
   * Get an idea by ID
   */
  getIdea(id: string): Idea | undefined {
    return this.ideas.get(id);
  }

  /**
   * Get all ideas
   */
  getAllIdeas(): Idea[] {
    return Array.from(this.ideas.values());
  }

  /**
   * Clear all ideas
   */
  clearIdeas(): void {
    this.ideas.clear();
    this.updateHistory = [];
  }

  /**
   * Get update history for verification
   */
  getUpdateHistory(): Array<{ ideaId: string; update: UpdateRequest; timestamp: Date }> {
    return this.updateHistory;
  }

  /**
   * Get the API key for testing
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Get the port the server is running on
   */
  getPort(): number {
    return this.port;
  }
}
