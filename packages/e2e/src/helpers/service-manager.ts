/**
 * Service Manager
 *
 * Manages starting and stopping the Orchestrator service for E2E tests.
 * Creates isolated workspaces for each test run.
 *
 * @module e2e/helpers/service-manager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Service Manager configuration
 */
export interface ServiceManagerConfig {
  orchestratorPort?: number;
  intakeUrl?: string;
  intakeApiKey?: string;
  workspacePath?: string;
  logLevel?: string;
}

/**
 * Manages Orchestrator service lifecycle for E2E tests
 */
export class ServiceManager {
  private orchestratorProcess: ChildProcess | null = null;
  private workspacePath: string;
  private orchestratorPort: number;
  private intakeUrl: string;
  private intakeApiKey: string;
  private logLevel: string;
  private ready = false;

  constructor(config: ServiceManagerConfig = {}) {
    this.orchestratorPort = config.orchestratorPort ?? 0;
    this.intakeUrl = config.intakeUrl ?? 'http://localhost:3001';
    this.intakeApiKey = config.intakeApiKey ?? 'test-api-key';
    this.workspacePath =
      config.workspacePath ?? fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-workspace-'));
    this.logLevel = config.logLevel ?? 'silent';
  }

  /**
   * Get path to orchestrator directory
   */
  private getOrchestratorPath(): string {
    // Navigate from packages/e2e/src/helpers to apps/orchestrator
    return path.resolve(__dirname, '../../../../apps/orchestrator');
  }

  /**
   * Start the Orchestrator service
   *
   * @returns Promise that resolves when the service is ready
   */
  async startOrchestrator(): Promise<{ url: string; port: number }> {
    return new Promise((resolve, reject) => {
      const orchestratorPath = this.getOrchestratorPath();

      // Use tsx to run TypeScript directly
      this.orchestratorProcess = spawn(
        'npx',
        ['tsx', 'src/index.ts'],
        {
          cwd: orchestratorPath,
          env: {
            ...process.env,
            PORT: String(this.orchestratorPort),
            INTAKE_URL: this.intakeUrl,
            INTAKE_API_KEY: this.intakeApiKey,
            WORKSPACE_PATH: this.workspacePath,
            LOG_LEVEL: this.logLevel,
            NODE_ENV: 'test',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      let stdout = '';
      let stderr = '';

      this.orchestratorProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();

        // Look for the listening message to know the service is ready
        const match = stdout.match(/Server listening on port (\d+)/);
        if (match && !this.ready) {
          this.ready = true;
          this.orchestratorPort = parseInt(match[1], 10);
          resolve({
            url: `http://localhost:${this.orchestratorPort}`,
            port: this.orchestratorPort,
          });
        }
      });

      this.orchestratorProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      this.orchestratorProcess.on('error', (err) => {
        reject(new Error(`Failed to start orchestrator: ${err.message}`));
      });

      this.orchestratorProcess.on('exit', (code) => {
        if (!this.ready) {
          reject(new Error(`Orchestrator exited with code ${code}. Stderr: ${stderr}`));
        }
      });

      // Timeout if service doesn't start
      setTimeout(() => {
        if (!this.ready) {
          this.stop();
          reject(new Error(`Orchestrator failed to start within timeout. Stdout: ${stdout}, Stderr: ${stderr}`));
        }
      }, 30000);
    });
  }

  /**
   * Stop all managed services
   */
  async stop(): Promise<void> {
    if (this.orchestratorProcess) {
      this.orchestratorProcess.kill('SIGTERM');
      this.orchestratorProcess = null;
      this.ready = false;
    }
  }

  /**
   * Get the workspace path
   */
  getWorkspacePath(): string {
    return this.workspacePath;
  }

  /**
   * Clean up workspace directory
   */
  cleanupWorkspace(): void {
    if (this.workspacePath && fs.existsSync(this.workspacePath)) {
      fs.rmSync(this.workspacePath, { recursive: true, force: true });
    }
  }

  /**
   * Create a fresh workspace
   */
  resetWorkspace(): string {
    this.cleanupWorkspace();
    this.workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-workspace-'));
    return this.workspacePath;
  }

  /**
   * Check if orchestrator is running
   */
  isRunning(): boolean {
    return this.ready && this.orchestratorProcess !== null;
  }

  /**
   * Get orchestrator URL
   */
  getOrchestratorUrl(): string {
    return `http://localhost:${this.orchestratorPort}`;
  }
}

/**
 * Create a temporary workspace directory
 */
export function createTempWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-workspace-'));
}

/**
 * Clean up a workspace directory
 */
export function cleanupWorkspace(workspacePath: string): void {
  if (workspacePath && fs.existsSync(workspacePath)) {
    fs.rmSync(workspacePath, { recursive: true, force: true });
  }
}
