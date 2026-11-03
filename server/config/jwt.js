import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve server/.env path so process.cwd() variations (e.g. repo root) load correctly
dotenv.config({ path: path.resolve(__dirname, '../.env') });


/**
 * Validates and retrieves the JWT_SECRET from environment variables.
 * Fails fast on application startup if JWT_SECRET is missing, empty,
 * set to an insecure default placeholder, or too short.
 */
export const getValidatedJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      '[FATAL SECURITY ERROR] JWT_SECRET environment variable is missing or empty. ' +
      'RailAssist cannot start securely without a configured JWT_SECRET in server/.env.'
    );
  }

  const trimmed = secret.trim();

  // Insecure default values that must never be permitted in production
  const INSECURE_DEFAULTS = [
    'railassist_secret_key_12345',
    'secret',
    'jwt_secret',
    'changeme',
    'password',
    '1234567890',
    'default_secret_key'
  ];

  if (INSECURE_DEFAULTS.includes(trimmed)) {
    throw new Error(
      '[FATAL SECURITY ERROR] JWT_SECRET is set to an insecure default placeholder value. ' +
      'Please generate a strong, unique secret key for JWT signing.'
    );
  }

  if (trimmed.length < 30) {
    throw new Error(
      `[FATAL SECURITY ERROR] JWT_SECRET is insecurely short (${trimmed.length} characters). ` +
      'For HMAC-SHA256 cryptographic security, JWT_SECRET must be at least 30 characters long.'
    );
  }

  return trimmed;
};

// Evaluate immediately at module load time to enforce startup fail-fast
export const JWT_SECRET = getValidatedJwtSecret();

export default JWT_SECRET;
