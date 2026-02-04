import { describe, it, expect } from 'vitest';
import { validateListIdeasParams, ValidationError } from './listIdeasParams';

describe('validateListIdeasParams', () => {
  describe('status parameter', () => {
    it('applies default status when omitted', () => {
      const params = new URLSearchParams();
      const result = validateListIdeasParams(params);
      expect(result.statuses).toEqual(['submitted', 'ready']);
    });

    it('parses comma-separated statuses', () => {
      const params = new URLSearchParams('status=running,waiting,deployed');
      const result = validateListIdeasParams(params);
      expect(result.statuses).toEqual(['running', 'waiting', 'deployed']);
    });

    it('handles single status value', () => {
      const params = new URLSearchParams('status=submitted');
      const result = validateListIdeasParams(params);
      expect(result.statuses).toEqual(['submitted']);
    });

    it('trims whitespace from status values', () => {
      const params = new URLSearchParams('status= running , waiting ');
      const result = validateListIdeasParams(params);
      expect(result.statuses).toEqual(['running', 'waiting']);
    });

    it('filters empty status values', () => {
      const params = new URLSearchParams('status=running,,waiting');
      const result = validateListIdeasParams(params);
      expect(result.statuses).toEqual(['running', 'waiting']);
    });

    it('throws ValidationError for invalid status', () => {
      const params = new URLSearchParams('status=invalid_status');
      expect(() => validateListIdeasParams(params)).toThrow(ValidationError);
    });

    it('throws ValidationError with valid statuses list', () => {
      const params = new URLSearchParams('status=invalid_status');
      try {
        validateListIdeasParams(params);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).validStatuses).toBeDefined();
        expect((error as ValidationError).validStatuses).toContain('submitted');
      }
    });
  });

  describe('limit parameter', () => {
    it('applies default limit of 50', () => {
      const params = new URLSearchParams();
      const result = validateListIdeasParams(params);
      expect(result.limit).toBe(50);
    });

    it('accepts valid limit values', () => {
      const params = new URLSearchParams('limit=25');
      const result = validateListIdeasParams(params);
      expect(result.limit).toBe(25);
    });

    it('throws error when limit exceeds 100', () => {
      const params = new URLSearchParams('limit=500');
      expect(() => validateListIdeasParams(params)).toThrow();
    });

    it('throws error for negative limit', () => {
      const params = new URLSearchParams('limit=-10');
      expect(() => validateListIdeasParams(params)).toThrow();
    });

    it('throws error for zero limit', () => {
      const params = new URLSearchParams('limit=0');
      expect(() => validateListIdeasParams(params)).toThrow();
    });
  });

  describe('offset parameter', () => {
    it('applies default offset of 0', () => {
      const params = new URLSearchParams();
      const result = validateListIdeasParams(params);
      expect(result.offset).toBe(0);
    });

    it('accepts valid offset values', () => {
      const params = new URLSearchParams('offset=100');
      const result = validateListIdeasParams(params);
      expect(result.offset).toBe(100);
    });

    it('throws error for negative offset', () => {
      const params = new URLSearchParams('offset=-10');
      expect(() => validateListIdeasParams(params)).toThrow();
    });
  });

  describe('sort parameter', () => {
    it('applies default sort of createdAt', () => {
      const params = new URLSearchParams();
      const result = validateListIdeasParams(params);
      expect(result.sort).toBe('createdAt');
    });

    it('accepts createdAt as sort value', () => {
      const params = new URLSearchParams('sort=createdAt');
      const result = validateListIdeasParams(params);
      expect(result.sort).toBe('createdAt');
    });

    it('throws error for invalid sort value', () => {
      const params = new URLSearchParams('sort=invalidField');
      expect(() => validateListIdeasParams(params)).toThrow();
    });
  });

  describe('order parameter', () => {
    it('applies default order of asc', () => {
      const params = new URLSearchParams();
      const result = validateListIdeasParams(params);
      expect(result.order).toBe('asc');
    });

    it('accepts asc as order value', () => {
      const params = new URLSearchParams('order=asc');
      const result = validateListIdeasParams(params);
      expect(result.order).toBe('asc');
    });

    it('accepts desc as order value', () => {
      const params = new URLSearchParams('order=desc');
      const result = validateListIdeasParams(params);
      expect(result.order).toBe('desc');
    });

    it('throws error for invalid order value', () => {
      const params = new URLSearchParams('order=invalid');
      expect(() => validateListIdeasParams(params)).toThrow();
    });
  });

  describe('combined parameters', () => {
    it('handles all parameters together', () => {
      const params = new URLSearchParams(
        'status=running,waiting&limit=25&offset=10&sort=createdAt&order=desc'
      );
      const result = validateListIdeasParams(params);

      expect(result.statuses).toEqual(['running', 'waiting']);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
      expect(result.sort).toBe('createdAt');
      expect(result.order).toBe('desc');
    });
  });
});
