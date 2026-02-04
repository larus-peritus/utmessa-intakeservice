/**
 * SSE Streaming Integration Tests
 *
 * Tests Server-Sent Events for real-time updates:
 * - Connection establishment
 * - State change events
 * - Heartbeat handling
 * - Multiple client connections
 *
 * Note: These tests use a simple Express SSE endpoint for testing
 * the SSE client behavior, not the full Orchestrator.
 *
 * @module e2e/api-tests/sse-streaming
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { type Express, type Response } from 'express';
import { createServer, type Server } from 'http';
import { TestSSEClient } from '../helpers/sse-client.js';
import { sleep } from '../helpers/test-context.js';

/**
 * Test SSE Server
 *
 * Simple Express server that implements SSE for testing the client.
 */
class TestSSEServer {
  private app: Express;
  private server: Server | null = null;
  private connections: Map<string, Response[]> = new Map();
  private port = 0;

  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.get('/stream/:projectSlug', (req, res) => {
      const { projectSlug } = req.params;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Add to connections
      if (!this.connections.has(projectSlug)) {
        this.connections.set(projectSlug, []);
      }
      this.connections.get(projectSlug)!.push(res);

      // Send connected event
      this.sendEvent(res, 'connected', {
        projectSlug,
        timestamp: new Date().toISOString(),
      });

      // Send initial state
      this.sendEvent(res, 'state', {
        slug: projectSlug,
        status: 'running',
        progress: 50,
        currentFeature: 'F2',
        waitingQuestion: null,
        demoUrl: null,
        repoUrl: null,
        updatedAt: new Date().toISOString(),
      });

      // Handle disconnect
      res.on('close', () => {
        const connections = this.connections.get(projectSlug);
        if (connections) {
          const index = connections.indexOf(res);
          if (index > -1) {
            connections.splice(index, 1);
          }
        }
      });
    });
  }

  private sendEvent(res: Response, eventType: string, data: unknown): void {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Broadcast an event to all connections for a project
   */
  broadcast(projectSlug: string, eventType: string, data: unknown): void {
    const connections = this.connections.get(projectSlug);
    if (connections) {
      for (const res of connections) {
        this.sendEvent(res, eventType, data);
      }
    }
  }

  /**
   * Send heartbeat to all connections
   */
  sendHeartbeat(): void {
    for (const [, connections] of this.connections) {
      for (const res of connections) {
        this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
      }
    }
  }

  /**
   * Get connection count for a project
   */
  getConnectionCount(projectSlug: string): number {
    return this.connections.get(projectSlug)?.length ?? 0;
  }

  async start(): Promise<string> {
    return new Promise((resolve) => {
      this.server = createServer(this.app);
      this.server.listen(0, () => {
        const address = this.server!.address();
        if (typeof address === 'object' && address) {
          this.port = address.port;
        }
        resolve(`http://localhost:${this.port}`);
      });
    });
  }

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
}

describe('SSE Streaming - Real-time Updates', () => {
  let sseServer: TestSSEServer;
  let serverUrl: string;
  let clients: TestSSEClient[] = [];

  beforeAll(async () => {
    sseServer = new TestSSEServer();
    serverUrl = await sseServer.start();
  });

  afterAll(async () => {
    // Close all clients
    for (const client of clients) {
      client.close();
    }
    await sseServer.stop();
  });

  beforeEach(() => {
    // Close clients from previous test
    for (const client of clients) {
      client.close();
    }
    clients = [];
  });

  describe('Connection Establishment', () => {
    it('should connect to SSE endpoint', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/test-project`);

      expect(client.isConnected()).toBe(true);
    });

    it('should receive connected event on connection', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/my-project`);

      const connectedEvent = await client.waitForEvent('connected');
      expect(connectedEvent.type).toBe('connected');
      expect(connectedEvent.data).toHaveProperty('projectSlug', 'my-project');
      expect(connectedEvent.data).toHaveProperty('timestamp');
    });

    it('should receive initial state on connection', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/initial-state`);

      const stateEvent = await client.waitForEvent('state');
      expect(stateEvent.type).toBe('state');
      expect(stateEvent.data).toHaveProperty('slug', 'initial-state');
      expect(stateEvent.data).toHaveProperty('status', 'running');
      expect(stateEvent.data).toHaveProperty('progress', 50);
    });
  });

  describe('State Updates', () => {
    it('should receive state update events', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/state-updates`);

      // Wait for initial events
      await client.waitForEvent('connected');
      await client.waitForEvent('state');

      // Clear events and wait for broadcast
      client.clearEvents();

      // Broadcast a state update
      sseServer.broadcast('state-updates', 'state', {
        slug: 'state-updates',
        status: 'waiting',
        progress: 75,
        currentFeature: 'F3',
        waitingQuestion: 'What color theme?',
        updatedAt: new Date().toISOString(),
      });

      // Wait for the state event
      const stateEvent = await client.waitForEvent('state');
      expect(stateEvent.data).toHaveProperty('status', 'waiting');
      expect(stateEvent.data).toHaveProperty('progress', 75);
      expect(stateEvent.data).toHaveProperty('waitingQuestion', 'What color theme?');
    });

    it('should receive multiple state updates', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/multi-updates`);

      // Clear initial events
      await sleep(100);
      client.clearEvents();

      // Send multiple updates
      sseServer.broadcast('multi-updates', 'state', { progress: 60 });
      sseServer.broadcast('multi-updates', 'state', { progress: 70 });
      sseServer.broadcast('multi-updates', 'state', { progress: 80 });

      // Wait for all state events
      const events = await client.waitForEvents('state', 3, 5000);
      expect(events).toHaveLength(3);

      const progressValues = events.map((e) => (e.data as { progress: number }).progress);
      expect(progressValues).toEqual([60, 70, 80]);
    });
  });

  describe('Heartbeat', () => {
    it('should receive heartbeat events', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/heartbeat-test`);

      // Clear initial events
      await sleep(50);
      client.clearEvents();

      // Trigger heartbeat
      sseServer.sendHeartbeat();

      const heartbeatEvent = await client.waitForEvent('heartbeat');
      expect(heartbeatEvent.type).toBe('heartbeat');
      expect(heartbeatEvent.data).toHaveProperty('timestamp');
    });
  });

  describe('Multiple Clients', () => {
    it('should support multiple clients for same project', async () => {
      const client1 = new TestSSEClient();
      const client2 = new TestSSEClient();
      clients.push(client1, client2);

      await client1.connect(`${serverUrl}/stream/shared-project`);
      await client2.connect(`${serverUrl}/stream/shared-project`);

      expect(client1.isConnected()).toBe(true);
      expect(client2.isConnected()).toBe(true);

      // Both should be tracked
      expect(sseServer.getConnectionCount('shared-project')).toBe(2);
    });

    it('should broadcast to all connected clients', async () => {
      const client1 = new TestSSEClient();
      const client2 = new TestSSEClient();
      clients.push(client1, client2);

      await client1.connect(`${serverUrl}/stream/broadcast-test`);
      await client2.connect(`${serverUrl}/stream/broadcast-test`);

      // Clear initial events
      await sleep(100);
      client1.clearEvents();
      client2.clearEvents();

      // Broadcast update
      sseServer.broadcast('broadcast-test', 'state', { progress: 90 });

      // Both clients should receive it
      const event1 = await client1.waitForEvent('state');
      const event2 = await client2.waitForEvent('state');

      expect((event1.data as { progress: number }).progress).toBe(90);
      expect((event2.data as { progress: number }).progress).toBe(90);
    });

    it('should isolate clients for different projects', async () => {
      const client1 = new TestSSEClient();
      const client2 = new TestSSEClient();
      clients.push(client1, client2);

      await client1.connect(`${serverUrl}/stream/project-a`);
      await client2.connect(`${serverUrl}/stream/project-b`);

      // Clear initial events
      await sleep(100);
      client1.clearEvents();
      client2.clearEvents();

      // Broadcast to project-a only
      sseServer.broadcast('project-a', 'state', { progress: 100 });

      // Only client1 should receive it
      const event1 = await client1.waitForEvent('state', 1000);
      expect((event1.data as { progress: number }).progress).toBe(100);

      // client2 should have no events
      expect(client2.getEventsByType('state')).toHaveLength(0);
    });
  });

  describe('Disconnection', () => {
    it('should handle client disconnect gracefully', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/disconnect-test`);
      expect(sseServer.getConnectionCount('disconnect-test')).toBe(1);

      // Disconnect
      client.close();

      // Wait for server to process disconnect
      await sleep(50);

      expect(sseServer.getConnectionCount('disconnect-test')).toBe(0);
    });

    it('should report disconnected state after close', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/close-test`);
      expect(client.isConnected()).toBe(true);

      client.close();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('Event History', () => {
    it('should track all received events', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/history-test`);

      // Wait for initial events
      await sleep(100);

      const events = client.getAllEvents();
      expect(events.length).toBeGreaterThanOrEqual(2); // connected + state

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('connected');
      expect(eventTypes).toContain('state');
    });

    it('should filter events by type', async () => {
      const client = new TestSSEClient();
      clients.push(client);

      await client.connect(`${serverUrl}/stream/filter-test`);

      // Send multiple heartbeats
      sseServer.sendHeartbeat();
      sseServer.sendHeartbeat();
      await sleep(100);

      const heartbeats = client.getEventsByType('heartbeat');
      expect(heartbeats.length).toBeGreaterThanOrEqual(2);

      // Each heartbeat should have data
      for (const hb of heartbeats) {
        expect(hb.data).toHaveProperty('timestamp');
      }
    });
  });
});
