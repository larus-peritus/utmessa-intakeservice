import { describe, it, expect } from 'vitest';
import { generateToken, isValidTokenFormat } from './tokens';

describe('generateToken', () => {
  it('generates 21-character tokens', () => {
    const token = generateToken();
    expect(token).toHaveLength(21);
  });

  it('uses only allowed characters', () => {
    const token = generateToken();
    // Valid pattern: 0-9, A-H, J-N, P-Z, a-h, j-n, p-z (excludes I, O, l)
    expect(token).toMatch(/^[0-9A-HJ-NP-Za-hj-np-z]+$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(10000);
  });

  it('does not include confusing characters I, l, 1 (visually similar)', () => {
    // Generate many tokens to increase probability of catching violations
    const tokens = Array.from({ length: 1000 }, () => generateToken());
    const hasConfusingIL = tokens.some((t) => /[Il]/.test(t));
    expect(hasConfusingIL).toBe(false);
  });

  it('does not include confusing characters O (visually similar to 0)', () => {
    const tokens = Array.from({ length: 1000 }, () => generateToken());
    const hasConfusingO = tokens.some((t) => /[O]/.test(t));
    expect(hasConfusingO).toBe(false);
  });

  it('is consistent in length across multiple generations', () => {
    const tokens = Array.from({ length: 100 }, () => generateToken());
    const allCorrectLength = tokens.every((t) => t.length === 21);
    expect(allCorrectLength).toBe(true);
  });
});

describe('isValidTokenFormat', () => {
  it('returns true for valid tokens', () => {
    const token = generateToken();
    expect(isValidTokenFormat(token)).toBe(true);
  });

  it('returns false for tokens that are too short', () => {
    expect(isValidTokenFormat('abc123')).toBe(false);
  });

  it('returns false for tokens that are too long', () => {
    expect(isValidTokenFormat('V1StGXR8Z5jdHi9B2vBJ4extra')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidTokenFormat('')).toBe(false);
  });

  it('returns false for tokens with invalid characters', () => {
    expect(isValidTokenFormat('V1StGXR8Z5jdHi9B2vB!#')).toBe(false);
  });

  it('returns false for tokens with confusing characters', () => {
    // Token with 'I' (uppercase i) - should be invalid
    expect(isValidTokenFormat('V1StGXR8Z5jdHI9B2vBJ4')).toBe(false);

    // Token with 'l' (lowercase L) - should be invalid
    expect(isValidTokenFormat('V1StGXR8Z5jdHl9B2vBJ4')).toBe(false);

    // Token with 'O' (uppercase o) - should be invalid
    expect(isValidTokenFormat('V1StGXR8Z5jdHO9B2vBJ4')).toBe(false);
  });

  it('returns false for tokens with spaces', () => {
    expect(isValidTokenFormat('V1StGXR8 5jdHi9B2vBJ4')).toBe(false);
  });

  it('returns false for tokens with underscores', () => {
    expect(isValidTokenFormat('V1StGXR8_5jdHi9B2vBJ4')).toBe(false);
  });

  it('returns false for tokens with hyphens', () => {
    expect(isValidTokenFormat('V1StGXR8-5jdHi9B2vBJ4')).toBe(false);
  });

  it('validates multiple generated tokens correctly', () => {
    const tokens = Array.from({ length: 100 }, () => generateToken());
    const allValid = tokens.every((t) => isValidTokenFormat(t));
    expect(allValid).toBe(true);
  });
});
