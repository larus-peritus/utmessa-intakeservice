import { describe, it, expect } from 'vitest';
import {
  validateStatusTransition,
  isUpdateable,
  getAllowedTransitions,
} from './statusTransitionValidator';
import type { IdeaStatus } from '@utmessa/shared';

describe('Status Transition Validator', () => {
  describe('validateStatusTransition', () => {
    // Valid transitions
    describe('valid transitions', () => {
      const validCases: [IdeaStatus, IdeaStatus][] = [
        ['claimed', 'running'],
        ['claimed', 'failed'],
        ['running', 'running'],
        ['running', 'waiting'],
        ['running', 'deployed'],
        ['running', 'failed'],
        ['waiting', 'running'],
        ['waiting', 'failed'],
        // Idempotent transitions
        ['deployed', 'deployed'],
        ['failed', 'failed'],
        ['abandoned', 'abandoned'],
      ];

      validCases.forEach(([from, to]) => {
        it(`allows ${from} → ${to}`, () => {
          const result = validateStatusTransition(from, to);
          expect(result.valid).toBe(true);
        });
      });
    });

    // Invalid transitions from submitted
    describe('invalid transitions from submitted', () => {
      const invalidFromSubmitted: IdeaStatus[] = [
        'ready',
        'claimed',
        'running',
        'waiting',
        'deployed',
        'failed',
        'abandoned',
      ];

      invalidFromSubmitted.forEach((to) => {
        it(`rejects submitted → ${to}`, () => {
          const result = validateStatusTransition('submitted', to);
          expect(result.valid).toBe(false);
          expect(result.allowedTransitions).toEqual([]);
        });
      });
    });

    // Invalid transitions from ready
    describe('invalid transitions from ready', () => {
      const invalidFromReady: IdeaStatus[] = [
        'submitted',
        'claimed',
        'running',
        'waiting',
        'deployed',
        'failed',
        'abandoned',
      ];

      invalidFromReady.forEach((to) => {
        it(`rejects ready → ${to}`, () => {
          const result = validateStatusTransition('ready', to);
          expect(result.valid).toBe(false);
          expect(result.allowedTransitions).toEqual([]);
        });
      });
    });

    // Invalid transitions from claimed
    describe('invalid transitions from claimed', () => {
      const invalidFromClaimed: IdeaStatus[] = [
        'submitted',
        'ready',
        'claimed',
        'waiting', // Must go through running first
        'deployed', // Must go through running first
        'abandoned',
      ];

      invalidFromClaimed.forEach((to) => {
        it(`rejects claimed → ${to}`, () => {
          const result = validateStatusTransition('claimed', to);
          expect(result.valid).toBe(false);
          expect(result.allowedTransitions).toEqual(['running', 'failed']);
        });
      });
    });

    // Invalid transitions from running
    describe('invalid transitions from running', () => {
      const invalidFromRunning: IdeaStatus[] = [
        'submitted',
        'ready',
        'claimed',
        'abandoned',
      ];

      invalidFromRunning.forEach((to) => {
        it(`rejects running → ${to}`, () => {
          const result = validateStatusTransition('running', to);
          expect(result.valid).toBe(false);
          expect(result.allowedTransitions).toEqual([
            'running',
            'waiting',
            'deployed',
            'failed',
          ]);
        });
      });
    });

    // Invalid transitions from waiting
    describe('invalid transitions from waiting', () => {
      const invalidFromWaiting: IdeaStatus[] = [
        'submitted',
        'ready',
        'claimed',
        'waiting', // Cannot stay waiting, must resume or fail
        'deployed', // Must go through running first
        'abandoned',
      ];

      invalidFromWaiting.forEach((to) => {
        it(`rejects waiting → ${to}`, () => {
          const result = validateStatusTransition('waiting', to);
          expect(result.valid).toBe(false);
          expect(result.allowedTransitions).toEqual(['running', 'failed']);
        });
      });
    });

    // Invalid transitions from terminal states
    describe('invalid transitions from terminal states', () => {
      it('rejects deployed → anything else', () => {
        const statuses: IdeaStatus[] = [
          'submitted',
          'ready',
          'claimed',
          'running',
          'waiting',
          'failed',
          'abandoned',
        ];
        statuses.forEach((to) => {
          const result = validateStatusTransition('deployed', to);
          expect(result.valid).toBe(false);
        });
      });

      it('rejects failed → anything else', () => {
        const statuses: IdeaStatus[] = [
          'submitted',
          'ready',
          'claimed',
          'running',
          'waiting',
          'deployed',
          'abandoned',
        ];
        statuses.forEach((to) => {
          const result = validateStatusTransition('failed', to);
          expect(result.valid).toBe(false);
        });
      });

      it('rejects abandoned → anything else', () => {
        const statuses: IdeaStatus[] = [
          'submitted',
          'ready',
          'claimed',
          'running',
          'waiting',
          'deployed',
          'failed',
        ];
        statuses.forEach((to) => {
          const result = validateStatusTransition('abandoned', to);
          expect(result.valid).toBe(false);
        });
      });
    });

    // Undefined status (no transition)
    describe('no transition requested', () => {
      const allStatuses: IdeaStatus[] = [
        'submitted',
        'ready',
        'claimed',
        'running',
        'waiting',
        'deployed',
        'failed',
        'abandoned',
      ];

      allStatuses.forEach((status) => {
        it(`allows undefined transition from ${status}`, () => {
          const result = validateStatusTransition(status, undefined);
          expect(result.valid).toBe(true);
        });
      });
    });

    // Error message content
    describe('error messages', () => {
      it('includes current and requested status in error', () => {
        const result = validateStatusTransition('waiting', 'deployed');
        expect(result.error).toContain('waiting');
        expect(result.error).toContain('deployed');
      });

      it('includes allowed transitions', () => {
        const result = validateStatusTransition('running', 'submitted');
        expect(result.allowedTransitions).toEqual([
          'running',
          'waiting',
          'deployed',
          'failed',
        ]);
      });
    });
  });

  describe('isUpdateable', () => {
    it('returns false for submitted', () => {
      expect(isUpdateable('submitted')).toBe(false);
    });

    it('returns false for ready', () => {
      expect(isUpdateable('ready')).toBe(false);
    });

    it('returns true for claimed', () => {
      expect(isUpdateable('claimed')).toBe(true);
    });

    it('returns true for running', () => {
      expect(isUpdateable('running')).toBe(true);
    });

    it('returns true for waiting', () => {
      expect(isUpdateable('waiting')).toBe(true);
    });

    it('returns true for deployed', () => {
      expect(isUpdateable('deployed')).toBe(true);
    });

    it('returns true for failed', () => {
      expect(isUpdateable('failed')).toBe(true);
    });

    it('returns true for abandoned', () => {
      expect(isUpdateable('abandoned')).toBe(true);
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns empty array for submitted', () => {
      expect(getAllowedTransitions('submitted')).toEqual([]);
    });

    it('returns empty array for ready', () => {
      expect(getAllowedTransitions('ready')).toEqual([]);
    });

    it('returns running and failed for claimed', () => {
      expect(getAllowedTransitions('claimed')).toEqual(['running', 'failed']);
    });

    it('returns running, waiting, deployed, failed for running', () => {
      expect(getAllowedTransitions('running')).toEqual([
        'running',
        'waiting',
        'deployed',
        'failed',
      ]);
    });

    it('returns running and failed for waiting', () => {
      expect(getAllowedTransitions('waiting')).toEqual(['running', 'failed']);
    });

    it('returns deployed for deployed (idempotent)', () => {
      expect(getAllowedTransitions('deployed')).toEqual(['deployed']);
    });

    it('returns failed for failed (idempotent)', () => {
      expect(getAllowedTransitions('failed')).toEqual(['failed']);
    });

    it('returns abandoned for abandoned (idempotent)', () => {
      expect(getAllowedTransitions('abandoned')).toEqual(['abandoned']);
    });
  });
});
