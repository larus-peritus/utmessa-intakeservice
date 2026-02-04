import { describe, it, expect } from 'vitest';
import { validateUrl, validateUrls } from './urlValidator';

describe('URL Validator', () => {
  describe('validateUrl', () => {
    describe('valid URLs', () => {
      it('accepts valid https URL', () => {
        const result = validateUrl('https://example.com');
        expect(result.valid).toBe(true);
      });

      it('accepts valid http URL', () => {
        const result = validateUrl('http://example.com');
        expect(result.valid).toBe(true);
      });

      it('accepts URL with path', () => {
        const result = validateUrl('https://example.com/path/to/page');
        expect(result.valid).toBe(true);
      });

      it('accepts URL with query string', () => {
        const result = validateUrl('https://example.com?foo=bar&baz=qux');
        expect(result.valid).toBe(true);
      });

      it('accepts URL with port', () => {
        const result = validateUrl('https://example.com:8080/api');
        expect(result.valid).toBe(true);
      });

      it('accepts URL with subdomain', () => {
        const result = validateUrl('https://demo.staging.example.com');
        expect(result.valid).toBe(true);
      });

      it('accepts localhost URL', () => {
        const result = validateUrl('http://localhost:3000');
        expect(result.valid).toBe(true);
      });

      it('accepts URL with hash', () => {
        const result = validateUrl('https://example.com/page#section');
        expect(result.valid).toBe(true);
      });

      it('accepts GitHub URL', () => {
        const result = validateUrl('https://github.com/user/repo');
        expect(result.valid).toBe(true);
      });

      it('accepts Vercel preview URL', () => {
        const result = validateUrl('https://my-app-abc123.vercel.app');
        expect(result.valid).toBe(true);
      });
    });

    describe('null/undefined/empty values', () => {
      it('accepts null', () => {
        const result = validateUrl(null);
        expect(result.valid).toBe(true);
      });

      it('accepts undefined', () => {
        const result = validateUrl(undefined);
        expect(result.valid).toBe(true);
      });

      it('accepts empty string', () => {
        const result = validateUrl('');
        expect(result.valid).toBe(true);
      });
    });

    describe('protocol security', () => {
      it('rejects javascript: protocol', () => {
        const result = validateUrl('javascript:alert(1)');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('http or https');
      });

      it('rejects javascript: with encoded characters', () => {
        const result = validateUrl('javascript:alert%281%29');
        expect(result.valid).toBe(false);
      });

      it('rejects data: protocol', () => {
        const result = validateUrl('data:text/html,<script>alert(1)</script>');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('http or https');
      });

      it('rejects file: protocol', () => {
        const result = validateUrl('file:///etc/passwd');
        expect(result.valid).toBe(false);
      });

      it('rejects ftp: protocol', () => {
        const result = validateUrl('ftp://ftp.example.com');
        expect(result.valid).toBe(false);
      });

      it('rejects mailto: protocol', () => {
        const result = validateUrl('mailto:user@example.com');
        expect(result.valid).toBe(false);
      });

      it('rejects vbscript: protocol', () => {
        const result = validateUrl('vbscript:msgbox("XSS")');
        expect(result.valid).toBe(false);
      });
    });

    describe('invalid URL format', () => {
      it('rejects plain text', () => {
        const result = validateUrl('not a url');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });

      it('rejects URL without protocol', () => {
        const result = validateUrl('example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });

      it('rejects invalid characters', () => {
        const result = validateUrl('https://exam ple.com');
        expect(result.valid).toBe(false);
      });

      it('rejects partial URL', () => {
        const result = validateUrl('https://');
        expect(result.valid).toBe(false);
      });
    });

    describe('length limits', () => {
      it('rejects URL exceeding max length', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(3000);
        const result = validateUrl(longUrl);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('maximum length');
        expect(result.error).toContain('2083');
      });

      it('accepts URL exactly at max length', () => {
        // "https://example.com/".length = 20, so we need 2063 chars for path
        const path = 'a'.repeat(2063);
        const url = `https://example.com/${path}`;
        expect(url.length).toBe(2083); // Exactly at limit
        const result = validateUrl(url);
        expect(result.valid).toBe(true);
      });

      it('rejects URL one char over max length', () => {
        const path = 'a'.repeat(2064);
        const url = `https://example.com/${path}`;
        expect(url.length).toBe(2084); // Just over limit
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
      });

      it('accepts URL just under max length', () => {
        const path = 'a'.repeat(2060);
        const url = `https://example.com/${path}`;
        const result = validateUrl(url);
        expect(result.valid).toBe(true);
      });
    });

    describe('error messages', () => {
      it('includes rejected protocol in error', () => {
        const result = validateUrl('ftp://example.com');
        expect(result.error).toContain('ftp');
      });

      it('provides clear format error', () => {
        const result = validateUrl('invalid');
        expect(result.error).toBe('Invalid URL format');
      });
    });
  });

  describe('validateUrls', () => {
    it('returns valid when both URLs are valid', () => {
      const result = validateUrls({
        demoUrl: 'https://demo.example.com',
        repoUrl: 'https://github.com/user/repo',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('returns valid when both URLs are null', () => {
      const result = validateUrls({
        demoUrl: null,
        repoUrl: null,
      });
      expect(result.valid).toBe(true);
    });

    it('returns valid when both URLs are undefined', () => {
      const result = validateUrls({});
      expect(result.valid).toBe(true);
    });

    it('returns error for invalid demoUrl', () => {
      const result = validateUrls({
        demoUrl: 'javascript:alert(1)',
        repoUrl: 'https://github.com/user/repo',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.demoUrl).toBeDefined();
      expect(result.errors.repoUrl).toBeUndefined();
    });

    it('returns error for invalid repoUrl', () => {
      const result = validateUrls({
        demoUrl: 'https://demo.example.com',
        repoUrl: 'not a url',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.demoUrl).toBeUndefined();
      expect(result.errors.repoUrl).toBeDefined();
    });

    it('returns errors for both invalid URLs', () => {
      const result = validateUrls({
        demoUrl: 'javascript:alert(1)',
        repoUrl: 'data:text/html,<script>',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.demoUrl).toBeDefined();
      expect(result.errors.repoUrl).toBeDefined();
    });

    it('validates only provided URLs', () => {
      const result = validateUrls({
        demoUrl: 'https://demo.example.com',
        // repoUrl not provided
      });
      expect(result.valid).toBe(true);
    });
  });
});
