import { describe, it, expect } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  InvalidTransitionError,
} from './update-errors';

describe('Update Error Types', () => {
  describe('ForbiddenError', () => {
    it('creates error with reason NOT_CLAIMED', () => {
      const error = new ForbiddenError('submitted');
      expect(error.reason).toBe('NOT_CLAIMED');
    });

    it('stores currentStatus', () => {
      const error = new ForbiddenError('submitted');
      expect(error.currentStatus).toBe('submitted');
    });

    it('has descriptive message', () => {
      const error = new ForbiddenError('ready');
      expect(error.message).toContain('ready');
      expect(error.message).toContain('claimed first');
    });

    it('is instance of Error', () => {
      const error = new ForbiddenError('submitted');
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct name', () => {
      const error = new ForbiddenError('submitted');
      expect(error.name).toBe('ForbiddenError');
    });
  });

  describe('InvalidTransitionError', () => {
    it('stores transition details', () => {
      const error = new InvalidTransitionError('waiting', 'deployed', [
        'running',
        'failed',
      ]);

      expect(error.currentStatus).toBe('waiting');
      expect(error.requestedStatus).toBe('deployed');
      expect(error.allowedTransitions).toEqual(['running', 'failed']);
    });

    it('has descriptive message with statuses', () => {
      const error = new InvalidTransitionError('claimed', 'deployed', [
        'running',
        'failed',
      ]);

      expect(error.message).toContain('claimed');
      expect(error.message).toContain('deployed');
      expect(error.message).toContain('running, failed');
    });

    it('handles empty allowed transitions', () => {
      const error = new InvalidTransitionError('submitted', 'running', []);

      expect(error.message).toContain('none');
      expect(error.allowedTransitions).toEqual([]);
    });

    it('is instance of Error', () => {
      const error = new InvalidTransitionError('claimed', 'deployed', []);
      expect(error).toBeInstanceOf(Error);
    });

    it('has correct name', () => {
      const error = new InvalidTransitionError('claimed', 'deployed', []);
      expect(error.name).toBe('InvalidTransitionError');
    });
  });

  describe('Re-exported NotFoundError', () => {
    it('is correctly re-exported', () => {
      const error = new NotFoundError('test-id');
      expect(error.ideaId).toBe('test-id');
      expect(error.name).toBe('NotFoundError');
    });
  });

  describe('Re-exported ValidationError', () => {
    it('is correctly re-exported', () => {
      const error = new ValidationError([
        { field: 'progress', message: 'Invalid' },
      ]);
      expect(error.details).toHaveLength(1);
      expect(error.name).toBe('ValidationError');
    });
  });
});
