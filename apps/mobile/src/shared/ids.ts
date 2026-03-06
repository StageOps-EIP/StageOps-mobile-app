import * as Crypto from 'expo-crypto';

/**
 * Generates a RFC 4122 v4 UUID using the platform's cryptographic RNG.
 * Works on iOS, Android and web in Expo managed workflow.
 *
 * @example
 * const id = uuid(); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 */
export function uuid(): string {
  return Crypto.randomUUID();
}

