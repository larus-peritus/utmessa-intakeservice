import { describe, it, expect } from 'vitest';
import {
  validateIdeaId,
  validateClaimBody,
  validateClaimRequest,
} from './claimRequestValidator';
import { ValidationError } from '../errors/claim-errors';

describe('Claim Request Validator', () => {
  describe('validateIdeaId', () => {
    it('accepts valid UUID v4', () => {
      expect(validateIdeaId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('accepts various valid UUIDs', () => {
      const validUuids = [
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '123e4567-e89b-12d3-a456-426614174001',
      ];
      for (const uuid of validUuids) {
        expect(validateIdeaId(uuid)).toBe(true);
      }
    });

    it('throws ValidationError for invalid UUID', () => {
      expect(() => validateIdeaId('not-a-uuid')).toThrow(ValidationError);
    });

    it('throws ValidationError for empty string', () => {
      expect(() => validateIdeaId('')).toThrow(ValidationError);
    });

    it('throws ValidationError for partial UUID', () => {
      expect(() => validateIdeaId('550e8400-e29b-41d4')).toThrow(ValidationError);
    });

    it('throws ValidationError for UUID without dashes', () => {
      expect(() => validateIdeaId('550e8400e29b41d4a716446655440000')).toThrow(ValidationError);
    });

    it('includes field name in error details', () => {
      try {
        validateIdeaId('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details[0].field).toBe('ideaId');
      }
    });

    it('includes descriptive message in error details', () => {
      try {
        validateIdeaId('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details[0].message).toBe('Invalid UUID format');
      }
    });
  });

  describe('validateClaimBody', () => {
    it('accepts undefined body', () => {
      const result = validateClaimBody(undefined);
      expect(result).toEqual({});
    });

    it('accepts null body', () => {
      const result = validateClaimBody(null);
      expect(result).toEqual({});
    });

    it('accepts empty object body', () => {
      const result = validateClaimBody({});
      expect(result).toEqual({});
    });

    it('accepts valid claimedBy', () => {
      const result = validateClaimBody({ claimedBy: 'orchestrator-1' });
      expect(result.claimedBy).toBe('orchestrator-1');
    });

    it('accepts various claimedBy formats', () => {
      const formats = [
        'orchestrator-1',
        'user@example.com',
        'booth-station-42',
        'localhost:3000',
        'a', // Minimum 1 character
      ];
      for (const claimedBy of formats) {
        const result = validateClaimBody({ claimedBy });
        expect(result.claimedBy).toBe(claimedBy);
      }
    });

    it('throws ValidationError for empty claimedBy', () => {
      expect(() => validateClaimBody({ claimedBy: '' })).toThrow(ValidationError);
    });

    it('throws ValidationError for non-string claimedBy', () => {
      expect(() => validateClaimBody({ claimedBy: 123 })).toThrow(ValidationError);
      expect(() => validateClaimBody({ claimedBy: true })).toThrow(ValidationError);
      expect(() => validateClaimBody({ claimedBy: null })).toThrow(ValidationError);
    });

    it('throws ValidationError for unknown fields (strict mode)', () => {
      expect(() => validateClaimBody({ unknownField: 'value' })).toThrow(ValidationError);
    });

    it('throws ValidationError for extra fields with valid claimedBy', () => {
      expect(() => validateClaimBody({
        claimedBy: 'orch-1',
        extra: 'field'
      })).toThrow(ValidationError);
    });

    it('includes field name in validation error', () => {
      try {
        validateClaimBody({ claimedBy: '' });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details[0].field).toBe('claimedBy');
      }
    });

    it('includes descriptive message in validation error', () => {
      try {
        validateClaimBody({ claimedBy: '' });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details[0].message).toContain('empty');
      }
    });
  });

  describe('validateClaimRequest', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';

    it('accepts valid UUID with valid body', () => {
      const result = validateClaimRequest(validUuid, { claimedBy: 'orch-1' });

      expect(result.ideaId).toBe(validUuid);
      expect(result.claimedBy).toBe('orch-1');
    });

    it('accepts valid UUID with empty body', () => {
      const result = validateClaimRequest(validUuid, {});

      expect(result.ideaId).toBe(validUuid);
      expect(result.claimedBy).toBeUndefined();
    });

    it('accepts valid UUID with undefined body', () => {
      const result = validateClaimRequest(validUuid, undefined);

      expect(result.ideaId).toBe(validUuid);
      expect(result.claimedBy).toBeUndefined();
    });

    it('throws ValidationError for invalid UUID', () => {
      expect(() => validateClaimRequest('invalid', { claimedBy: 'orch-1' }))
        .toThrow(ValidationError);
    });

    it('throws ValidationError for invalid body', () => {
      expect(() => validateClaimRequest(validUuid, { claimedBy: '' }))
        .toThrow(ValidationError);
    });

    it('validates UUID before body', () => {
      // Both invalid - should throw for UUID first
      try {
        validateClaimRequest('invalid', { claimedBy: '' });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details[0].field).toBe('ideaId');
      }
    });

    it('returns correct types', () => {
      const result = validateClaimRequest(validUuid, { claimedBy: 'orch' });

      // Type assertions
      const _ideaId: string = result.ideaId;
      const _claimedBy: string | undefined = result.claimedBy;

      expect(typeof result.ideaId).toBe('string');
      expect(typeof result.claimedBy).toBe('string');
    });
  });
});
