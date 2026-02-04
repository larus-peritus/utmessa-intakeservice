/**
 * SSE Client for E2E Tests
 *
 * Node.js EventSource wrapper for testing Server-Sent Events.
 * Provides promise-based API for waiting for events.
 *
 * @module e2e/helpers/sse-client
 */

import EventSource from 'eventsource';

/**
 * SSE event received from server
 */
export interface SSEEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
}

/**
 * SSE Client configuration
 */
export interface SSEClientConfig {
  timeout?: number;
}

/**
 * SSE Client for testing real-time updates
 *
 * Wraps EventSource with promise-based API for easier testing.
 */
export class TestSSEClient {
  private eventSource: EventSource | null = null;
  private events: SSEEvent[] = [];
  private eventListeners: Array<(event: SSEEvent) => void> = [];
  private connected = false;
  private readonly timeout: number;

  constructor(config: SSEClientConfig = {}) {
    this.timeout = config.timeout ?? 10000;
  }

  /**
   * Connect to an SSE endpoint
   *
   * @param url - SSE endpoint URL
   * @returns Promise that resolves when connected
   */
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(url);

      const timeoutId = setTimeout(() => {
        this.close();
        reject(new Error(`SSE connection timeout after ${this.timeout}ms`));
      }, this.timeout);

      this.eventSource.onopen = () => {
        clearTimeout(timeoutId);
        this.connected = true;
        resolve();
      };

      this.eventSource.onerror = (err) => {
        clearTimeout(timeoutId);
        if (!this.connected) {
          reject(new Error(`SSE connection failed: ${JSON.stringify(err)}`));
        }
      };

      // Listen for named events
      this.eventSource.addEventListener('connected', (event) => {
        this.handleEvent('connected', event);
      });

      this.eventSource.addEventListener('state', (event) => {
        this.handleEvent('state', event);
      });

      this.eventSource.addEventListener('heartbeat', (event) => {
        this.handleEvent('heartbeat', event);
      });

      this.eventSource.addEventListener('error', (event) => {
        this.handleEvent('error', event);
      });
    });
  }

  /**
   * Handle received event
   */
  private handleEvent(type: string, event: MessageEvent | Event): void {
    const sseEvent: SSEEvent = {
      type,
      data: 'data' in event ? this.parseData((event as MessageEvent).data) : null,
      timestamp: new Date(),
    };

    this.events.push(sseEvent);

    // Notify listeners
    for (const listener of this.eventListeners) {
      listener(sseEvent);
    }
  }

  /**
   * Parse event data (JSON or string)
   */
  private parseData(data: string): unknown {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  /**
   * Wait for an event of a specific type
   *
   * @param eventType - Event type to wait for
   * @param timeout - Timeout in ms (default: 10000)
   * @returns Promise that resolves with the event
   */
  async waitForEvent<T = unknown>(eventType: string, timeout?: number): Promise<SSEEvent<T>> {
    const waitTimeout = timeout ?? this.timeout;

    // Check if we already have a matching event
    const existing = this.events.find((e) => e.type === eventType);
    if (existing) {
      return existing as SSEEvent<T>;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, waitTimeout);

      const listener = (event: SSEEvent) => {
        if (event.type === eventType) {
          clearTimeout(timeoutId);
          this.removeEventListener(listener);
          resolve(event as SSEEvent<T>);
        }
      };

      this.addEventListener(listener);
    });
  }

  /**
   * Wait for N events of a specific type
   *
   * @param eventType - Event type to wait for
   * @param count - Number of events to collect
   * @param timeout - Timeout in ms
   * @returns Promise that resolves with the events
   */
  async waitForEvents<T = unknown>(
    eventType: string,
    count: number,
    timeout?: number
  ): Promise<Array<SSEEvent<T>>> {
    const waitTimeout = timeout ?? this.timeout * count;
    const collected: Array<SSEEvent<T>> = [];

    // Get any existing events
    for (const event of this.events) {
      if (event.type === eventType && collected.length < count) {
        collected.push(event as SSEEvent<T>);
      }
    }

    if (collected.length >= count) {
      return collected.slice(0, count);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(`Timeout waiting for ${count} events of type ${eventType}. Got ${collected.length}`)
        );
      }, waitTimeout);

      const listener = (event: SSEEvent) => {
        if (event.type === eventType) {
          collected.push(event as SSEEvent<T>);
          if (collected.length >= count) {
            clearTimeout(timeoutId);
            this.removeEventListener(listener);
            resolve(collected.slice(0, count));
          }
        }
      };

      this.addEventListener(listener);
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: SSEEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: SSEEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get all received events
   */
  getAllEvents(): SSEEvent[] {
    return [...this.events];
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type: string): SSEEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Clear received events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Close the connection
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connected = false;
    }
  }
}

/**
 * Create a connected SSE client
 *
 * @param url - SSE endpoint URL
 * @returns Connected SSE client
 */
export async function createSSEClient(url: string): Promise<TestSSEClient> {
  const client = new TestSSEClient();
  await client.connect(url);
  return client;
}
