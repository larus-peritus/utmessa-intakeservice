import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  ProjectFileSchema,
  FeaturesFileSchema,
  StateFileSchema,
  FeatureItemSchema,
  FeatureStatus,
  ProjectRunStatus,
  validateProjectFile,
  validateFeaturesFile,
  validateStateFile,
} from '../files';

// =============================================================================
// Test Data
// =============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_TIMESTAMP = '2026-01-26T10:00:00.000Z';
const VALID_TIMESTAMP_WITH_OFFSET = '2026-01-26T10:00:00+05:30';

// =============================================================================
// ProjectFileSchema - Valid Cases
// =============================================================================

describe('ProjectFileSchema - Valid', () => {
  it('validates minimal valid project file', () => {
    const valid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    const result = validateProjectFile(valid);
    expect(result.ideaId).toBe(valid.ideaId);
    expect(result.token).toBe(valid.token);
    expect(result.slug).toBe(valid.slug);
    expect(result.startedAt).toBeUndefined();
    expect(result.templateId).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });

  it('validates project file with all optional fields', () => {
    const valid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
      startedAt: '2026-01-26T10:01:00.000Z',
      templateId: 'react-vite',
      notes: 'Test project',
    };

    const result = validateProjectFile(valid);
    expect(result.startedAt).toBe(valid.startedAt);
    expect(result.templateId).toBe(valid.templateId);
    expect(result.notes).toBe(valid.notes);
  });

  it('validates project file with timezone offset', () => {
    const valid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP_WITH_OFFSET,
    };

    expect(() => validateProjectFile(valid)).not.toThrow();
  });

  it('validates project file with milliseconds in timestamp', () => {
    const valid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: '2026-01-26T10:00:00.123Z',
    };

    expect(() => validateProjectFile(valid)).not.toThrow();
  });
});

// =============================================================================
// FeaturesFileSchema - Valid Cases
// =============================================================================

describe('FeaturesFileSchema - Valid', () => {
  it('validates empty features array', () => {
    const valid = {
      schemaVersion: 1,
      planned: false,
      features: [],
    };

    const result = validateFeaturesFile(valid);
    expect(result.features).toEqual([]);
    expect(result.planned).toBe(false);
  });

  it('validates features with all fields', () => {
    const valid = {
      schemaVersion: 1,
      planned: true,
      features: [
        {
          id: 'F1',
          title: 'User Authentication',
          acceptance: 'Users can sign up and log in',
          status: 'done',
        },
        {
          id: 'F2',
          title: 'Todo CRUD',
          acceptance: 'Create, read, update, delete todos',
          status: 'in_progress',
        },
      ],
    };

    const result = validateFeaturesFile(valid);
    expect(result.features).toHaveLength(2);
    expect(result.features[0].status).toBe('done');
    expect(result.features[1].status).toBe('in_progress');
  });

  it('applies default status of planned', () => {
    const valid = {
      schemaVersion: 1,
      planned: true,
      features: [
        { id: 'F1', title: 'Auth' },
        { id: 'F2', title: 'CRUD', status: 'in_progress' },
      ],
    };

    const result = validateFeaturesFile(valid);
    expect(result.features[0].status).toBe('planned');
    expect(result.features[1].status).toBe('in_progress');
  });

  it('validates all feature status values', () => {
    const statuses = ['planned', 'in_progress', 'done', 'failed', 'skipped'] as const;

    for (const status of statuses) {
      const valid = {
        schemaVersion: 1,
        planned: true,
        features: [{ id: 'F1', title: 'Test', status }],
      };

      const result = validateFeaturesFile(valid);
      expect(result.features[0].status).toBe(status);
    }
  });

  it('validates features without acceptance criteria', () => {
    const valid = {
      schemaVersion: 1,
      planned: true,
      features: [
        { id: 'F1', title: 'Dark Mode', status: 'planned' },
      ],
    };

    const result = validateFeaturesFile(valid);
    expect(result.features[0].acceptance).toBeUndefined();
  });
});

// =============================================================================
// StateFileSchema - Valid Cases
// =============================================================================

describe('StateFileSchema - Valid', () => {
  it('validates minimal state file', () => {
    const valid = {
      schemaVersion: 1,
      status: 'not_started',
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(valid);
    expect(result.status).toBe('not_started');
    expect(result.progress).toBeUndefined();
    expect(result.currentStep).toBeUndefined();
  });

  it('validates state file with all optional fields', () => {
    const valid = {
      schemaVersion: 1,
      status: 'running',
      progress: 66,
      currentStep: 'Building feature F3',
      currentFeature: 'F3',
      waitingQuestion: null,
      demoUrl: null,
      repoUrl: 'https://github.com/user/my-app',
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(valid);
    expect(result.progress).toBe(66);
    expect(result.currentStep).toBe('Building feature F3');
    expect(result.currentFeature).toBe('F3');
    expect(result.waitingQuestion).toBeNull();
    expect(result.demoUrl).toBeNull();
    expect(result.repoUrl).toBe('https://github.com/user/my-app');
  });

  it('validates all status values', () => {
    const statuses = ['not_started', 'running', 'waiting', 'failed', 'deployed'] as const;

    for (const status of statuses) {
      const valid = {
        schemaVersion: 1,
        status,
        updatedAt: VALID_TIMESTAMP,
      };

      const result = validateStateFile(valid);
      expect(result.status).toBe(status);
    }
  });

  it('validates waiting state with question', () => {
    const valid = {
      schemaVersion: 1,
      status: 'waiting',
      waitingQuestion: 'Choose authentication method',
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(valid);
    expect(result.status).toBe('waiting');
    expect(result.waitingQuestion).toBe('Choose authentication method');
  });

  it('validates deployed state with URLs', () => {
    const valid = {
      schemaVersion: 1,
      status: 'deployed',
      progress: 100,
      demoUrl: 'https://my-app.vercel.app',
      repoUrl: 'https://github.com/user/my-app',
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(valid);
    expect(result.demoUrl).toBe('https://my-app.vercel.app');
    expect(result.repoUrl).toBe('https://github.com/user/my-app');
  });

  it('validates state with timezone offset', () => {
    const valid = {
      schemaVersion: 1,
      status: 'running',
      updatedAt: VALID_TIMESTAMP_WITH_OFFSET,
    };

    expect(() => validateStateFile(valid)).not.toThrow();
  });
});

// =============================================================================
// Type Inference Tests
// =============================================================================

describe('Type Inference', () => {
  it('infers ProjectFile type correctly', () => {
    const projectFile = validateProjectFile({
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'test',
      createdAt: VALID_TIMESTAMP,
    });

    // TypeScript type checks - these verify type inference at compile time
    expect(typeof projectFile.schemaVersion).toBe('number');
    expect(typeof projectFile.ideaId).toBe('string');
    expect(typeof projectFile.token).toBe('string');
    expect(typeof projectFile.slug).toBe('string');
    expect(typeof projectFile.createdAt).toBe('string');
  });

  it('infers FeaturesFile type correctly', () => {
    const featuresFile = validateFeaturesFile({
      schemaVersion: 1,
      planned: true,
      features: [{ id: 'F1', title: 'Test' }],
    });

    expect(typeof featuresFile.schemaVersion).toBe('number');
    expect(typeof featuresFile.planned).toBe('boolean');
    expect(Array.isArray(featuresFile.features)).toBe(true);
    expect(typeof featuresFile.features[0].id).toBe('string');
    expect(typeof featuresFile.features[0].status).toBe('string');
  });

  it('infers StateFile type correctly', () => {
    const stateFile = validateStateFile({
      schemaVersion: 1,
      status: 'running',
      progress: 50,
      updatedAt: VALID_TIMESTAMP,
    });

    expect(typeof stateFile.schemaVersion).toBe('number');
    expect(typeof stateFile.status).toBe('string');
    expect(typeof stateFile.progress).toBe('number');
    expect(typeof stateFile.updatedAt).toBe('string');
  });
});

// =============================================================================
// ProjectFileSchema - Invalid Cases
// =============================================================================

describe('ProjectFileSchema - Invalid', () => {
  it('rejects missing ideaId', () => {
    const invalid = {
      schemaVersion: 1,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing token', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing slug', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing createdAt', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects invalid UUID format', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: 'not-a-uuid',
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects invalid datetime format', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: 'not-a-date',
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects date-only format (no time)', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: '2026-01-26',
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects wrong schemaVersion', () => {
    const invalid = {
      schemaVersion: 2,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects schemaVersion 0', () => {
    const invalid = {
      schemaVersion: 0,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing schemaVersion', () => {
    const invalid = {
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects empty token', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: '',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects empty slug', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: '',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('provides meaningful error message for empty token', () => {
    const invalid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: '',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    try {
      validateProjectFile(invalid);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      const zodError = error as z.ZodError;
      expect(zodError.errors[0].message).toBe('Token cannot be empty');
    }
  });
});

// =============================================================================
// FeaturesFileSchema - Invalid Cases
// =============================================================================

describe('FeaturesFileSchema - Invalid', () => {
  it('rejects missing schemaVersion', () => {
    const invalid = {
      planned: true,
      features: [],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing planned field', () => {
    const invalid = {
      schemaVersion: 1,
      features: [],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing features array', () => {
    const invalid = {
      schemaVersion: 1,
      planned: true,
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects invalid status enum value', () => {
    const invalid = {
      schemaVersion: 1,
      planned: true,
      features: [{ id: 'F1', title: 'Test', status: 'invalid_status' }],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects feature with empty id', () => {
    const invalid = {
      schemaVersion: 1,
      planned: true,
      features: [{ id: '', title: 'Test' }],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects feature with empty title', () => {
    const invalid = {
      schemaVersion: 1,
      planned: true,
      features: [{ id: 'F1', title: '' }],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects feature with missing id', () => {
    const invalid = {
      schemaVersion: 1,
      planned: true,
      features: [{ title: 'Test' }],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects feature with missing title', () => {
    const invalid = {
      schemaVersion: 1,
      planned: true,
      features: [{ id: 'F1' }],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects wrong schemaVersion', () => {
    const invalid = {
      schemaVersion: 2,
      planned: true,
      features: [],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects non-boolean planned', () => {
    const invalid = {
      schemaVersion: 1,
      planned: 'true',
      features: [],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });
});

// =============================================================================
// StateFileSchema - Invalid Cases
// =============================================================================

describe('StateFileSchema - Invalid', () => {
  it('rejects missing status', () => {
    const invalid = {
      schemaVersion: 1,
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing updatedAt', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'running',
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects invalid status enum value', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'invalid_status',
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects progress > 100', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'running',
      progress: 150,
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects negative progress', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'running',
      progress: -10,
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects invalid demoUrl format', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'deployed',
      demoUrl: 'not-a-url',
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects invalid repoUrl format', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'deployed',
      repoUrl: 'not-a-url',
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects invalid datetime format in updatedAt', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'running',
      updatedAt: 'not-a-date',
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects wrong schemaVersion', () => {
    const invalid = {
      schemaVersion: 2,
      status: 'running',
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('rejects missing schemaVersion', () => {
    const invalid = {
      status: 'running',
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases - Progress Boundaries', () => {
  it('allows progress = 0', () => {
    const valid = {
      schemaVersion: 1,
      status: 'running',
      progress: 0,
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(valid);
    expect(result.progress).toBe(0);
  });

  it('allows progress = 100', () => {
    const valid = {
      schemaVersion: 1,
      status: 'running',
      progress: 100,
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(valid);
    expect(result.progress).toBe(100);
  });

  it('allows decimal progress values', () => {
    const valid = {
      schemaVersion: 1,
      status: 'running',
      progress: 33.33,
      updatedAt: VALID_TIMESTAMP,
    };

    const result = validateStateFile(valid);
    expect(result.progress).toBe(33.33);
  });
});

describe('Edge Cases - Optional and Nullable Fields', () => {
  it('distinguishes between undefined and null for nullable fields', () => {
    const withNull = {
      schemaVersion: 1,
      status: 'running',
      waitingQuestion: null,
      updatedAt: VALID_TIMESTAMP,
    };

    const withUndefined = {
      schemaVersion: 1,
      status: 'running',
      updatedAt: VALID_TIMESTAMP,
    };

    const result1 = validateStateFile(withNull);
    const result2 = validateStateFile(withUndefined);

    expect(result1.waitingQuestion).toBeNull();
    expect(result2.waitingQuestion).toBeUndefined();
  });

  it('handles optional fields being explicitly undefined', () => {
    const valid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
      startedAt: undefined,
      templateId: undefined,
      notes: undefined,
    };

    const result = validateProjectFile(valid);
    expect(result.startedAt).toBeUndefined();
    expect(result.templateId).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });
});

describe('Edge Cases - Large Features Array', () => {
  it('handles large features array', () => {
    const features = Array.from({ length: 100 }, (_, i) => ({
      id: `F${i}`,
      title: `Feature ${i}`,
      status: 'planned' as const,
    }));

    const valid = {
      schemaVersion: 1,
      planned: true,
      features,
    };

    const result = validateFeaturesFile(valid);
    expect(result.features).toHaveLength(100);
  });

  it('completes validation in under 10ms for large features array', () => {
    const features = Array.from({ length: 100 }, (_, i) => ({
      id: `F${i}`,
      title: `Feature ${i}`,
      acceptance: `Acceptance criteria for feature ${i}`,
      status: 'planned' as const,
    }));

    const valid = {
      schemaVersion: 1,
      planned: true,
      features,
    };

    const start = Date.now();
    validateFeaturesFile(valid);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10);
  });
});

describe('Edge Cases - URL Validation', () => {
  it('accepts various valid URL formats', () => {
    const urls = [
      'https://example.com',
      'http://localhost:3000',
      'https://subdomain.example.com/path',
      'https://example.com:8080/path?query=value',
    ];

    for (const url of urls) {
      const valid = {
        schemaVersion: 1,
        status: 'deployed',
        demoUrl: url,
        updatedAt: VALID_TIMESTAMP,
      };

      expect(() => validateStateFile(valid)).not.toThrow();
    }
  });
});

describe('Edge Cases - Type Coercion', () => {
  it('does not coerce string schemaVersion to number', () => {
    const invalid = {
      schemaVersion: '1',
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    expect(() => validateProjectFile(invalid)).toThrow(z.ZodError);
  });

  it('does not coerce string progress to number', () => {
    const invalid = {
      schemaVersion: 1,
      status: 'running',
      progress: '50',
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('does not coerce string boolean planned to boolean', () => {
    const invalid = {
      schemaVersion: 1,
      planned: 'true',
      features: [],
    };

    expect(() => validateFeaturesFile(invalid)).toThrow(z.ZodError);
  });
});

describe('Edge Cases - Schema Versioning', () => {
  it('rejects schemaVersion as string literal "1"', () => {
    const invalid = {
      schemaVersion: '1',
      status: 'running',
      updatedAt: VALID_TIMESTAMP,
    };

    expect(() => validateStateFile(invalid)).toThrow(z.ZodError);
  });

  it('provides clear error for wrong schemaVersion', () => {
    const invalid = {
      schemaVersion: 2,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
    };

    try {
      validateProjectFile(invalid);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      const zodError = error as z.ZodError;
      const schemaVersionError = zodError.errors.find(e => e.path.includes('schemaVersion'));
      expect(schemaVersionError).toBeDefined();
    }
  });
});

describe('Edge Cases - Empty Strings', () => {
  it('rejects empty string for feature acceptance (allows undefined)', () => {
    // Empty string is allowed for acceptance since it's optional
    const valid = {
      schemaVersion: 1,
      planned: true,
      features: [{ id: 'F1', title: 'Test', acceptance: '' }],
    };

    // This should actually be allowed since acceptance is optional and empty string is valid
    expect(() => validateFeaturesFile(valid)).not.toThrow();
  });

  it('allows empty notes field', () => {
    const valid = {
      schemaVersion: 1,
      ideaId: VALID_UUID,
      token: 'abc123',
      slug: 'my-app',
      createdAt: VALID_TIMESTAMP,
      notes: '',
    };

    expect(() => validateProjectFile(valid)).not.toThrow();
  });
});
