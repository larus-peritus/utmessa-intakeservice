import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ConflictError,
  AuthenticationError,
  ValidationError,
} from './claim-errors';

describe('Claim Errors', () => {
  describe('NotFoundError', () => {
    it('creates error with correct name and message', () => {
      const ideaId = '123e4567-e89b-12d3-a456-426614174001';
      const error = new NotFoundError(ideaId);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe(`Idea not found: ${ideaId}`);
    });

    it('stores ideaId property', () => {
      const ideaId = '123e4567-e89b-12d3-a456-426614174001';
      const error = new NotFoundError(ideaId);

      expect(error.ideaId).toBe(ideaId);
    });

    it('has proper stack trace', () => {
      const error = new NotFoundError('test-id');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('NotFoundError');
    });
  });

  describe('ConflictError', () => {
    const claimedAt = new Date('2026-01-27T10:00:00Z');

    it('creates error with correct name', () => {
      const error = new ConflictError('claimed', claimedAt, 'orchestrator-1');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ConflictError');
    });

    it('creates descriptive message with claimedBy', () => {
      const error = new ConflictError('claimed', claimedAt, 'orchestrator-1');

      expect(error.message).toContain('already claimed');
      expect(error.message).toContain('by orchestrator-1');
      expect(error.message).toContain('2026-01-27T10:00:00.000Z');
      expect(error.message).toContain('Current status: claimed');
    });

    it('creates message without claimedBy when null', () => {
      const error = new ConflictError('running', claimedAt, null);

      expect(error.message).toContain('already claimed');
      expect(error.message).not.toContain(' by ');
      expect(error.message).toContain('Current status: running');
    });

    it('stores conflict details', () => {
      const error = new ConflictError('claimed', claimedAt, 'orchestrator-1');

      expect(error.claimedAt).toEqual(claimedAt);
      expect(error.claimedBy).toBe('orchestrator-1');
      expect(error.currentStatus).toBe('claimed');
    });

    it('stores null claimedBy when not provided', () => {
      const error = new ConflictError('claimed', claimedAt, null);

      expect(error.claimedBy).toBeNull();
    });

    it('has proper stack trace', () => {
      const error = new ConflictError('claimed', claimedAt, 'test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConflictError');
    });
  });

  describe('AuthenticationError', () => {
    it('creates error with default message', () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Authentication required');
    });

    it('creates error with custom message', () => {
      const error = new AuthenticationError('Invalid or missing X-ORCH-KEY header');

      expect(error.message).toBe('Invalid or missing X-ORCH-KEY header');
    });

    it('has proper stack trace', () => {
      const error = new AuthenticationError();

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AuthenticationError');
    });
  });

  describe('ValidationError', () => {
    it('creates error with correct name', () => {
      const details = [{ field: 'ideaId', message: 'Invalid UUID format' }];
      const error = new ValidationError(details);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
    });

    it('creates message listing failed fields', () => {
      const details = [
        { field: 'ideaId', message: 'Invalid UUID format' },
        { field: 'claimedBy', message: 'Must be a string' },
      ];
      const error = new ValidationError(details);

      expect(error.message).toBe('Validation failed for: ideaId, claimedBy');
    });

    it('stores validation details', () => {
      const details = [
        { field: 'ideaId', message: 'Invalid UUID format' },
        { field: 'claimedBy', message: 'Must be a string' },
      ];
      const error = new ValidationError(details);

      expect(error.details).toEqual(details);
      expect(error.details).toHaveLength(2);
    });

    it('handles empty details array', () => {
      const error = new ValidationError([]);

      expect(error.message).toBe('Validation failed for: ');
      expect(error.details).toEqual([]);
    });

    it('has proper stack trace', () => {
      const error = new ValidationError([{ field: 'test', message: 'test' }]);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });
});
