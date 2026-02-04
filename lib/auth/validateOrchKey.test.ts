import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateOrchKey } from './validateOrchKey';

describe('validateOrchKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.ORCH_KEY = 'test-secret-key-12345';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true with valid X-ORCH-KEY header', () => {
    const request = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'test-secret-key-12345' },
    });

    expect(validateOrchKey(request)).toBe(true);
  });

  it('returns false with missing X-ORCH-KEY header', () => {
    const request = new Request('http://localhost/api/ideas');

    expect(validateOrchKey(request)).toBe(false);
  });

  it('returns false with invalid X-ORCH-KEY header', () => {
    const request = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'wrong-key' },
    });

    expect(validateOrchKey(request)).toBe(false);
  });

  it('returns false with empty X-ORCH-KEY header', () => {
    const request = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': '' },
    });

    expect(validateOrchKey(request)).toBe(false);
  });

  it('returns false when ORCH_KEY env var is not set', () => {
    delete process.env.ORCH_KEY;

    const request = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'test-secret-key-12345' },
    });

    expect(validateOrchKey(request)).toBe(false);
  });

  it('returns false when ORCH_KEY env var is empty', () => {
    process.env.ORCH_KEY = '';

    const request = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': '' },
    });

    expect(validateOrchKey(request)).toBe(false);
  });

  it('handles case-sensitive comparison correctly', () => {
    process.env.ORCH_KEY = 'CaseSensitiveKey';

    const requestLower = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'casesensitivekey' },
    });

    const requestExact = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'CaseSensitiveKey' },
    });

    expect(validateOrchKey(requestLower)).toBe(false);
    expect(validateOrchKey(requestExact)).toBe(true);
  });

  it('handles keys of different lengths', () => {
    process.env.ORCH_KEY = 'short';

    const request = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'much-longer-key-that-doesnt-match' },
    });

    expect(validateOrchKey(request)).toBe(false);
  });

  it('prevents timing attacks with constant-time comparison', () => {
    // Note: This test validates the behavior, not the actual timing
    // A true timing attack test would require statistical analysis
    process.env.ORCH_KEY = 'secret-key-abc';

    const requestWrongFirst = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'Xecret-key-abc' }, // Wrong at position 0
    });

    const requestWrongLast = new Request('http://localhost/api/ideas', {
      headers: { 'X-ORCH-KEY': 'secret-key-abX' }, // Wrong at last position
    });

    // Both should return false, and both should complete (no early return)
    expect(validateOrchKey(requestWrongFirst)).toBe(false);
    expect(validateOrchKey(requestWrongLast)).toBe(false);
  });
});
