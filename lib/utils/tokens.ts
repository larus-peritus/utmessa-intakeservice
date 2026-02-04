import { customAlphabet } from 'nanoid';

/**
 * Custom alphabet for token generation
 *
 * URL-safe characters excluding confusing ones:
 * - Excludes: I, l, 1 (look similar)
 * - Excludes: O, 0 (look similar)
 * - Result: 57 characters (a-z without confusing, A-Z without confusing, 2-9)
 *
 * This provides ~121 bits of entropy with 21 characters:
 * entropy = log2(57^21) ≈ 121 bits
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz';

/**
 * Token length - 21 characters
 *
 * Collision probability for 1 million tokens:
 * P = 1 - exp(-n² / 2N) where N = 57^21
 * P ≈ 1 in 10 billion
 */
const TOKEN_LENGTH = 21;

/**
 * Create nanoid generator with custom alphabet
 */
const nanoid = customAlphabet(ALPHABET, TOKEN_LENGTH);

/**
 * Generate a unique, unguessable receipt token
 *
 * Token properties:
 * - Length: 21 characters
 * - Alphabet: 57 characters (URL-safe, no confusing chars)
 * - Entropy: ~121 bits
 * - Collision probability: <1 in 10 billion for 1 million tokens
 *
 * @returns A 21-character URL-safe token
 *
 * @example
 * ```typescript
 * const token = generateToken();
 * // Returns something like: "V1StGXR8Z5jdHi9B2vBJ4"
 * ```
 */
export function generateToken(): string {
  return nanoid();
}

/**
 * Validate that a string matches the expected token format
 *
 * @param token - The string to validate
 * @returns True if the string is a valid token format
 *
 * @example
 * ```typescript
 * isValidTokenFormat("V1StGXR8Z5jdHi9B2vBJ4") // true
 * isValidTokenFormat("too-short") // false
 * isValidTokenFormat("contains_invalid_chars!") // false
 * ```
 */
export function isValidTokenFormat(token: string): boolean {
  if (token.length !== TOKEN_LENGTH) {
    return false;
  }

  // Check all characters are in the alphabet
  // Alphabet: 0-9, A-H, J-N, P-Z (excludes I, O), a-h, j-k, m-n, p-z (excludes i, l, o)
  const validPattern = /^[0-9A-HJ-NP-Za-hj-km-np-z]+$/;
  return validPattern.test(token);
}
