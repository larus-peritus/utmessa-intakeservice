import { describe, it, expect } from 'vitest';
import {
  validateUpdateRequest,
  validateIdeaIdForUpdate,
  isEmptyUpdate,
} from './updateRequestValidator';

describe('Update Request Validator', () => {
  describe('validateUpdateRequest', () => {
    describe('valid requests', () => {
      it('accepts valid request with all fields', () => {
        const result = validateUpdateRequest({
          status: 'running',
          progress: 50,
          currentStep: 'Building feature F2',
          currentFeature: 'F2',
          waitingQuestion: null,
          demoUrl: 'https://demo.example.com',
          repoUrl: 'https://github.com/user/repo',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('running');
          expect(result.data.progress).toBe(50);
          expect(result.data.currentStep).toBe('Building feature F2');
        }
      });

      it('accepts partial request with one field', () => {
        const result = validateUpdateRequest({ progress: 75 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.progress).toBe(75);
          expect(result.data.status).toBeUndefined();
        }
      });

      it('accepts empty object', () => {
        const result = validateUpdateRequest({});
        expect(result.success).toBe(true);
      });

      it('accepts null values for clearing fields', () => {
        const result = validateUpdateRequest({
          currentStep: null,
          currentFeature: null,
          waitingQuestion: null,
          demoUrl: null,
          repoUrl: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.currentStep).toBeNull();
          expect(result.data.demoUrl).toBeNull();
        }
      });

      it('accepts all valid statuses', () => {
        const statuses = [
          'submitted',
          'ready',
          'claimed',
          'running',
          'waiting',
          'deployed',
          'failed',
          'abandoned',
        ];
        for (const status of statuses) {
          const result = validateUpdateRequest({ status });
          expect(result.success).toBe(true);
        }
      });

      it('accepts progress at boundaries', () => {
        expect(validateUpdateRequest({ progress: 0 }).success).toBe(true);
        expect(validateUpdateRequest({ progress: 100 }).success).toBe(true);
        expect(validateUpdateRequest({ progress: 50 }).success).toBe(true);
      });
    });

    describe('invalid status', () => {
      it('rejects invalid status value', () => {
        const result = validateUpdateRequest({ status: 'invalid' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].field).toBe('status');
        }
      });

      it('rejects non-string status', () => {
        const result = validateUpdateRequest({ status: 123 });
        expect(result.success).toBe(false);
      });
    });

    describe('invalid progress', () => {
      it('rejects progress above 100', () => {
        const result = validateUpdateRequest({ progress: 101 });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].field).toBe('progress');
          expect(result.errors[0].message).toContain('exceed 100');
        }
      });

      it('rejects progress below 0', () => {
        const result = validateUpdateRequest({ progress: -1 });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].message).toContain('negative');
        }
      });

      it('rejects non-integer progress', () => {
        const result = validateUpdateRequest({ progress: 50.5 });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].message).toContain('integer');
        }
      });

      it('rejects string progress', () => {
        const result = validateUpdateRequest({ progress: '50' });
        expect(result.success).toBe(false);
      });
    });

    describe('invalid string fields', () => {
      it('rejects currentStep exceeding max length', () => {
        const longStep = 'a'.repeat(501);
        const result = validateUpdateRequest({ currentStep: longStep });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].field).toBe('currentStep');
          expect(result.errors[0].message).toContain('500');
        }
      });

      it('rejects currentFeature exceeding max length', () => {
        const longFeature = 'a'.repeat(101);
        const result = validateUpdateRequest({ currentFeature: longFeature });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].field).toBe('currentFeature');
          expect(result.errors[0].message).toContain('100');
        }
      });

      it('rejects waitingQuestion exceeding max length', () => {
        const longQuestion = 'a'.repeat(1001);
        const result = validateUpdateRequest({ waitingQuestion: longQuestion });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].field).toBe('waitingQuestion');
          expect(result.errors[0].message).toContain('1000');
        }
      });

      it('accepts string fields at max length', () => {
        expect(
          validateUpdateRequest({ currentStep: 'a'.repeat(500) }).success
        ).toBe(true);
        expect(
          validateUpdateRequest({ currentFeature: 'a'.repeat(100) }).success
        ).toBe(true);
        expect(
          validateUpdateRequest({ waitingQuestion: 'a'.repeat(1000) }).success
        ).toBe(true);
      });
    });

    describe('invalid URLs', () => {
      it('rejects invalid demoUrl format', () => {
        const result = validateUpdateRequest({ demoUrl: 'not a url' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].field).toBe('demoUrl');
        }
      });

      it('rejects javascript: in demoUrl', () => {
        const result = validateUpdateRequest({
          demoUrl: 'javascript:alert(1)',
        });
        expect(result.success).toBe(false);
      });

      it('rejects invalid repoUrl format', () => {
        const result = validateUpdateRequest({ repoUrl: 'not a url' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0].field).toBe('repoUrl');
        }
      });

      it('rejects data: protocol in repoUrl', () => {
        const result = validateUpdateRequest({
          repoUrl: 'data:text/html,<script>alert(1)</script>',
        });
        expect(result.success).toBe(false);
      });

      it('reports errors for both invalid URLs', () => {
        const result = validateUpdateRequest({
          demoUrl: 'javascript:alert(1)',
          repoUrl: 'data:text/html,<script>',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.length).toBe(2);
        }
      });
    });

    describe('unknown fields', () => {
      it('rejects unknown fields', () => {
        const result = validateUpdateRequest({
          progress: 50,
          unknownField: 'value',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(
            result.errors.some((e) => e.message.includes('Unrecognized key'))
          ).toBe(true);
        }
      });

      it('rejects extra fields even with valid known fields', () => {
        const result = validateUpdateRequest({
          status: 'running',
          progress: 50,
          extra: 'not allowed',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('type coercion', () => {
      it('does not coerce strings to numbers', () => {
        const result = validateUpdateRequest({ progress: '50' as unknown });
        expect(result.success).toBe(false);
      });

      it('does not coerce numbers to strings', () => {
        const result = validateUpdateRequest({
          currentStep: 123 as unknown,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateIdeaIdForUpdate', () => {
    it('accepts valid UUID v4', () => {
      expect(
        validateIdeaIdForUpdate('550e8400-e29b-41d4-a716-446655440000')
      ).toBe(true);
    });

    it('accepts UUID with lowercase letters', () => {
      expect(
        validateIdeaIdForUpdate('550e8400-e29b-41d4-a716-446655440000')
      ).toBe(true);
    });

    it('accepts UUID with uppercase letters', () => {
      expect(
        validateIdeaIdForUpdate('550E8400-E29B-41D4-A716-446655440000')
      ).toBe(true);
    });

    it('rejects empty string', () => {
      expect(validateIdeaIdForUpdate('')).toBe(false);
    });

    it('rejects non-UUID string', () => {
      expect(validateIdeaIdForUpdate('not-a-uuid')).toBe(false);
    });

    it('rejects partial UUID', () => {
      expect(validateIdeaIdForUpdate('550e8400-e29b-41d4')).toBe(false);
    });

    it('rejects UUID without dashes', () => {
      expect(validateIdeaIdForUpdate('550e8400e29b41d4a716446655440000')).toBe(
        false
      );
    });
  });

  describe('isEmptyUpdate', () => {
    it('returns true for empty object', () => {
      expect(isEmptyUpdate({})).toBe(true);
    });

    it('returns true when all fields are undefined', () => {
      expect(
        isEmptyUpdate({
          status: undefined,
          progress: undefined,
          currentStep: undefined,
          currentFeature: undefined,
          waitingQuestion: undefined,
          demoUrl: undefined,
          repoUrl: undefined,
        })
      ).toBe(true);
    });

    it('returns false when status is provided', () => {
      expect(isEmptyUpdate({ status: 'running' })).toBe(false);
    });

    it('returns false when progress is provided', () => {
      expect(isEmptyUpdate({ progress: 50 })).toBe(false);
    });

    it('returns false when null values are provided', () => {
      expect(isEmptyUpdate({ currentStep: null })).toBe(false);
    });

    it('returns false when any field is set', () => {
      expect(isEmptyUpdate({ demoUrl: 'https://example.com' })).toBe(false);
    });
  });
});
