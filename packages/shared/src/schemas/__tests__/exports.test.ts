import { describe, it, expect } from 'vitest';
import {
  // File Format Schemas
  ProjectFileSchema,
  FeaturesFileSchema,
  FeatureItemSchema,
  StateFileSchema,

  // File Format Validation Functions
  validateProjectFile,
  validateFeaturesFile,
  validateStateFile,

  // F1 Schemas (Idea & Feature)
  FeatureStatusSchema,

  // F6 Orchestrator API DTOs
  ProjectRunStatusSchema,
} from '../../index';

import type {
  // File Format Types
  ProjectFile,
  FeaturesFile,
  FeatureItem,
  StateFile,
  ProjectRunStatusType,

  // F1 Types
  FeatureStatus,
} from '../../index';

// =============================================================================
// Test Constants
// =============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TIMESTAMP = '2026-01-26T10:00:00.000Z';

// =============================================================================
// Export Verification Tests
// =============================================================================

describe('Package Exports - Schemas', () => {
  it('exports ProjectFileSchema', () => {
    expect(ProjectFileSchema).toBeDefined();
    expect(ProjectFileSchema.parse).toBeTypeOf('function');
  });

  it('exports FeaturesFileSchema', () => {
    expect(FeaturesFileSchema).toBeDefined();
    expect(FeaturesFileSchema.parse).toBeTypeOf('function');
  });

  it('exports FeatureItemSchema', () => {
    expect(FeatureItemSchema).toBeDefined();
    expect(FeatureItemSchema.parse).toBeTypeOf('function');
  });

  it('exports StateFileSchema', () => {
    expect(StateFileSchema).toBeDefined();
    expect(StateFileSchema.parse).toBeTypeOf('function');
  });

  it('exports FeatureStatusSchema enum', () => {
    expect(FeatureStatusSchema).toBeDefined();
    expect(FeatureStatusSchema.options).toContain('planned');
    expect(FeatureStatusSchema.options).toContain('in_progress');
    expect(FeatureStatusSchema.options).toContain('done');
    expect(FeatureStatusSchema.options).toContain('failed');
    expect(FeatureStatusSchema.options).toContain('skipped');
  });

  it('exports ProjectRunStatusSchema enum', () => {
    expect(ProjectRunStatusSchema).toBeDefined();
    expect(ProjectRunStatusSchema.options).toContain('not_started');
    expect(ProjectRunStatusSchema.options).toContain('running');
    expect(ProjectRunStatusSchema.options).toContain('waiting');
    expect(ProjectRunStatusSchema.options).toContain('failed');
    expect(ProjectRunStatusSchema.options).toContain('deployed');
  });
});

describe('Package Exports - Validation Functions', () => {
  it('exports validateProjectFile function', () => {
    expect(validateProjectFile).toBeTypeOf('function');
  });

  it('exports validateFeaturesFile function', () => {
    expect(validateFeaturesFile).toBeTypeOf('function');
  });

  it('exports validateStateFile function', () => {
    expect(validateStateFile).toBeTypeOf('function');
  });
});

describe('Package Exports - Type Inference', () => {
  it('infers ProjectFile type correctly', () => {
    const projectFile: ProjectFile = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'test',
      createdAt: VALID_TIMESTAMP,
    };

    const result = validateProjectFile(projectFile);
    expect(result).toEqual(projectFile);
  });

  it('infers FeaturesFile type correctly', () => {
    const featuresFile: FeaturesFile = {
      schemaVersion: 1,
      planned: true,
      features: [
        { id: 'F1', title: 'Test', status: 'planned' },
      ],
    };

    const result = validateFeaturesFile(featuresFile);
    expect(result.features).toHaveLength(1);
  });

  it('infers FeatureItem type correctly', () => {
    const featureItem: FeatureItem = {
      id: 'F1',
      title: 'Test Feature',
      acceptance: 'Feature works correctly',
      status: 'planned',
    };

    const result = FeatureItemSchema.parse(featureItem);
    expect(result.id).toBe('F1');
  });

  it('infers StateFile type correctly', () => {
    const stateFile: StateFile = {
      schemaVersion: 1,
      status: 'running',
      progress: 50,
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(stateFile);
    expect(result.status).toBe('running');
  });

  it('infers FeatureStatus type correctly', () => {
    const status: FeatureStatus = 'in_progress';
    expect(FeatureStatusSchema.parse(status)).toBe('in_progress');
  });

  it('infers ProjectRunStatusType correctly', () => {
    const status: ProjectRunStatusType = 'deployed';
    expect(ProjectRunStatusSchema.parse(status)).toBe('deployed');
  });
});

describe('Package Exports - Integration', () => {
  it('works in a typical Orchestrator workflow', () => {
    // Create a project file
    const projectFile: ProjectFile = validateProjectFile({
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'receipt-token-123',
      slug: 'my-todo-app',
      createdAt: VALID_TIMESTAMP,
    });

    // Create a features file
    const featuresFile: FeaturesFile = validateFeaturesFile({
      schemaVersion: 1,
      planned: true,
      features: [
        { id: 'F1', title: 'User Authentication' },
        { id: 'F2', title: 'Todo CRUD', status: 'in_progress' },
      ],
    });

    // Create a state file
    const stateFile: StateFile = validateStateFile({
      schemaVersion: 1,
      status: 'running',
      progress: 50,
      currentFeature: 'F2',
      updatedAt: VALID_TIMESTAMP,
    });

    // Verify all work together
    expect(projectFile.slug).toBe('my-todo-app');
    expect(featuresFile.features[0].status).toBe('planned');
    expect(stateFile.currentFeature).toBe('F2');
  });

  it('works in a typical Dashboard workflow', () => {
    // Dashboard receives state from API
    const apiResponse = {
      schemaVersion: 1,
      status: 'deployed',
      progress: 100,
      demoUrl: 'https://my-app.vercel.app',
      repoUrl: 'https://github.com/user/my-app',
      updatedAt: VALID_TIMESTAMP,
    };

    const state: StateFile = validateStateFile(apiResponse);

    // Dashboard can safely use typed properties
    expect(state.status).toBe('deployed');
    expect(state.demoUrl).toBe('https://my-app.vercel.app');
    expect(state.progress).toBe(100);
  });
});
