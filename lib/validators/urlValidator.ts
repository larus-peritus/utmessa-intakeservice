/**
 * URL Validation Result
 */
export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Allowed URL protocols for security
 * Only http and https are permitted to prevent XSS via javascript:, data:, etc.
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Maximum URL length for browser compatibility
 * Most browsers support URLs up to 2083 characters (IE limit)
 */
const MAX_URL_LENGTH = 2083;

/**
 * Validate a URL string
 *
 * Checks:
 * - URL format is valid (parseable by URL constructor)
 * - Protocol is http or https (prevents XSS)
 * - Length does not exceed browser limits
 * - Null/undefined are treated as valid (clearing the field)
 *
 * @param url - URL string to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * validateUrl('https://demo.example.com'); // { valid: true }
 * validateUrl('javascript:alert(1)'); // { valid: false, error: '...' }
 * validateUrl(null); // { valid: true }
 * ```
 */
export function validateUrl(url: string | null | undefined): UrlValidationResult {
  // Null or undefined is valid (clearing the field)
  if (url === null || url === undefined) {
    return { valid: true };
  }

  // Empty string is also valid (clearing the field)
  if (url === '') {
    return { valid: true };
  }

  // Check length
  if (url.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
    };
  }

  // Parse and validate URL
  try {
    const parsed = new URL(url);

    // Validate protocol (security check)
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return {
        valid: false,
        error: `URL must use http or https protocol, got '${parsed.protocol.replace(':', '')}'`,
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Validate multiple URLs at once
 *
 * @param urls - Object with URL fields to validate
 * @returns Validation result with errors keyed by field name
 *
 * @example
 * ```typescript
 * validateUrls({
 *   demoUrl: 'https://demo.example.com',
 *   repoUrl: 'javascript:alert(1)',
 * });
 * // { valid: false, errors: { repoUrl: '...' } }
 * ```
 */
export function validateUrls(urls: {
  demoUrl?: string | null;
  repoUrl?: string | null;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (urls.demoUrl !== undefined) {
    const demoResult = validateUrl(urls.demoUrl);
    if (!demoResult.valid && demoResult.error) {
      errors.demoUrl = demoResult.error;
    }
  }

  if (urls.repoUrl !== undefined) {
    const repoResult = validateUrl(urls.repoUrl);
    if (!repoResult.valid && repoResult.error) {
      errors.repoUrl = repoResult.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
