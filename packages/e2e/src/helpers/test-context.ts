/**
 * Test Context
 *
 * Utilities for test isolation and shared test state management.
 * Provides setup/teardown helpers for E2E tests.
 *
 * @module e2e/helpers/test-context
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MockIntakeServer } from './mock-intake-server.js';
import { ServiceManager, cleanupWorkspace } from './service-manager.js';
import { TestSSEClient } from './sse-client.js';

/**
 * Test context configuration
 */
export interface TestContextConfig {
  startOrchestrator?: boolean;
  orchestratorPort?: number;
  intakePort?: number;
  intakeApiKey?: string;
}

/**
 * Test context state
 */
export interface TestContextState {
  workspacePath: string;
  intakeUrl: string;
  orchestratorUrl: string;
  intakeApiKey: string;
  mockIntake: MockIntakeServer;
  serviceManager: ServiceManager;
  sseClients: TestSSEClient[];
}

/**
 * Create an isolated test context with mock services
 *
 * @param config - Context configuration
 * @returns Test context with mock Intake and optionally Orchestrator
 */
export async function createTestContext(config: TestContextConfig = {}): Promise<TestContextState> {
  const apiKey = config.intakeApiKey ?? 'test-api-key';

  // Create workspace
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-test-'));

  // Start mock Intake server
  const mockIntake = new MockIntakeServer({
    port: config.intakePort ?? 0,
    apiKey,
  });
  const intakeUrl = await mockIntake.start();

  // Create service manager
  const serviceManager = new ServiceManager({
    orchestratorPort: config.orchestratorPort ?? 0,
    intakeUrl,
    intakeApiKey: apiKey,
    workspacePath,
  });

  let orchestratorUrl = '';

  // Optionally start orchestrator
  if (config.startOrchestrator !== false) {
    const result = await serviceManager.startOrchestrator();
    orchestratorUrl = result.url;
  }

  return {
    workspacePath,
    intakeUrl,
    orchestratorUrl,
    intakeApiKey: apiKey,
    mockIntake,
    serviceManager,
    sseClients: [],
  };
}

/**
 * Clean up test context
 *
 * @param context - Test context to clean up
 */
export async function cleanupTestContext(context: TestContextState): Promise<void> {
  // Close all SSE clients
  for (const client of context.sseClients) {
    client.close();
  }

  // Stop orchestrator
  await context.serviceManager.stop();

  // Stop mock Intake
  await context.mockIntake.stop();

  // Clean up workspace
  cleanupWorkspace(context.workspacePath);
}

/**
 * Create a minimal test context (mock Intake only)
 *
 * Use this when testing just the Intake API contract without Orchestrator.
 */
export async function createMinimalContext(): Promise<{
  mockIntake: MockIntakeServer;
  intakeUrl: string;
  cleanup: () => Promise<void>;
}> {
  const mockIntake = new MockIntakeServer();
  const intakeUrl = await mockIntake.start();

  return {
    mockIntake,
    intakeUrl,
    cleanup: async () => {
      await mockIntake.stop();
    },
  };
}

/**
 * Wait for a condition to be true
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum wait time in ms
 * @param interval - Check interval in ms
 * @returns Promise that resolves when condition is true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or times out
 *
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param delay - Delay between attempts in ms
 * @returns Result of the function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Retry failed');
}
