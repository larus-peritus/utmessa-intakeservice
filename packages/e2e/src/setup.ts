/**
 * Global test setup for E2E integration tests
 *
 * This file runs before all tests and sets up:
 * - Environment variables
 * - Global test utilities
 * - Cleanup handlers
 *
 * @module e2e/setup
 */

import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Track cleanup functions
const cleanupFunctions: Array<() => Promise<void> | void> = [];

/**
 * Register a cleanup function to run after all tests
 */
export function registerCleanup(fn: () => Promise<void> | void): void {
  cleanupFunctions.push(fn);
}

beforeAll(() => {
  // Global setup before all tests
  console.log('🚀 Starting E2E integration tests...');
});

afterAll(async () => {
  // Run all cleanup functions
  for (const cleanup of cleanupFunctions) {
    try {
      await cleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  console.log('✅ E2E tests completed');
});
