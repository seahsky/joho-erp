/**
 * Encryption utilities for secure token storage
 *
 * Uses AES-256-GCM for authenticated encryption.
 * The encryption key should be set via XERO_TOKEN_ENCRYPTION_KEY environment variable.
 *
 * Format: iv:authTag:encryptedData (all base64 encoded)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable
 * Key must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer | null {
  const key = process.env.XERO_TOKEN_ENCRYPTION_KEY;

  if (!key) {
    return null;
  }

  // If key is a hex string (64 chars), decode it
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // If key is base64 encoded (44 chars with padding), decode it
  if (key.length === 44 && key.endsWith('=')) {
    return Buffer.from(key, 'base64');
  }

  // Otherwise, hash the key to get exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Check if encryption is enabled (key is configured)
 */
export function isEncryptionEnabled(): boolean {
  return getEncryptionKey() !== null;
}

/**
 * Encrypt a plaintext string
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (base64 encoded)
 *          Returns the original plaintext if encryption is not enabled
 */
export function encrypt(plaintext: string): string {
  // Validate input
  if (plaintext === undefined || plaintext === null) {
    throw new Error('Cannot encrypt undefined or null value');
  }

  if (typeof plaintext !== 'string') {
    throw new Error(`Cannot encrypt non-string value: ${typeof plaintext}`);
  }

  const key = getEncryptionKey();

  // If encryption is not enabled, return plaintext
  if (!key) {
    return plaintext;
  }

  // Generate a random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return in format: iv:authTag:ciphertext
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 *
 * @param ciphertext - The encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 *          Returns the original ciphertext if encryption is not enabled or format is invalid
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  // If encryption is not enabled, assume plaintext
  if (!key) {
    return ciphertext;
  }

  // Check if this looks like an encrypted string (has two colons)
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // Not encrypted format, return as-is (migration support)
    return ciphertext;
  }

  try {
    const [ivBase64, authTagBase64, encryptedBase64] = parts;

    // Decode parts
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');

    // Validate lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      // Invalid format, return as-is (might be unencrypted data)
      return ciphertext;
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch {
    // Decryption failed - might be unencrypted data or wrong key
    // Return as-is for migration support
    return ciphertext;
  }
}

/**
 * Generate a new encryption key (for setup purposes)
 * Returns a 32-byte key as a hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if a value appears to be encrypted
 * (has the iv:authTag:ciphertext format)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) {
    return false;
  }

  try {
    const [ivBase64, authTagBase64] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}
