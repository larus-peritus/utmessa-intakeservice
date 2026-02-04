import { describe, it, expect } from 'vitest';
import {
  WaitingForInputEventSchema,
  InputReceivedEventSchema,
} from '../src/schemas/events';

describe('HITL Events', () => {
  describe('WaitingForInputEvent', () => {
    it('should validate with question only', () => {
      const result = WaitingForInputEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'WAITING_FOR_INPUT',
        question: 'Choose authentication method',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with question and choices', () => {
      const result = WaitingForInputEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'WAITING_FOR_INPUT',
        question: 'Choose authentication method',
        choices: ['JWT', 'OAuth', 'Session'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty question', () => {
      const result = WaitingForInputEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'WAITING_FOR_INPUT',
        question: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Question cannot be empty');
      }
    });

    it('should reject missing question', () => {
      const result = WaitingForInputEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'WAITING_FOR_INPUT',
      });
      expect(result.success).toBe(false);
    });

    it('should validate empty choices array', () => {
      const result = WaitingForInputEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'WAITING_FOR_INPUT',
        question: 'Open-ended question',
        choices: [],
      });
      expect(result.success).toBe(true);
    });

    it('should validate with single choice', () => {
      const result = WaitingForInputEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'WAITING_FOR_INPUT',
        question: 'Confirm deployment?',
        choices: ['Yes'],
      });
      expect(result.success).toBe(true);
    });

    it('should validate with message and meta', () => {
      const result = WaitingForInputEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'WAITING_FOR_INPUT',
        question: 'Choose framework',
        choices: ['React', 'Vue', 'Svelte'],
        message: 'Waiting for user input',
        meta: { timeout: 300 },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('InputReceivedEvent', () => {
    it('should validate with answer', () => {
      const result = InputReceivedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'INPUT_RECEIVED',
        answer: 'JWT',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty answer', () => {
      const result = InputReceivedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'INPUT_RECEIVED',
        answer: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Answer cannot be empty');
      }
    });

    it('should reject missing answer', () => {
      const result = InputReceivedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'INPUT_RECEIVED',
      });
      expect(result.success).toBe(false);
    });

    it('should validate with long answer', () => {
      const result = InputReceivedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'INPUT_RECEIVED',
        answer: 'This is a detailed user response that includes multiple sentences. It explains the reasoning behind the choice.',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with message and meta', () => {
      const result = InputReceivedEventSchema.safeParse({
        ts: '2026-01-26T10:00:00Z',
        type: 'INPUT_RECEIVED',
        answer: 'OAuth',
        message: 'User selected OAuth authentication',
        meta: { responseTime: 15000 },
      });
      expect(result.success).toBe(true);
    });
  });
});
