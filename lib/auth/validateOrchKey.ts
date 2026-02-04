/**
 * Validates the X-ORCH-KEY header for protected API endpoints
 *
 * This middleware is used by:
 * - F3: Orchestrator Claim API
 * - F4: Orchestrator Status Update API
 * - F5: Ideas Queue API
 *
 * Security notes:
 * - Uses constant-time comparison to prevent timing attacks
 * - Never logs the actual secret value
 * - Returns boolean (true = valid, false = invalid)
 */

/**
 * Validate the X-ORCH-KEY header against the ORCH_KEY environment variable
 *
 * @param request - The incoming request (must have headers)
 * @returns true if the header matches the environment variable, false otherwise
 *
 * @example
 * ```typescript
 * if (!validateOrchKey(request)) {
 *   return Response.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export function validateOrchKey(request: Request): boolean {
  const headerKey = request.headers.get('X-ORCH-KEY');
  const envKey = process.env.ORCH_KEY;

  // Fail if either key is missing
  if (!headerKey || !envKey) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (headerKey.length !== envKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < headerKey.length; i++) {
    result |= headerKey.charCodeAt(i) ^ envKey.charCodeAt(i);
  }

  return result === 0;
}
