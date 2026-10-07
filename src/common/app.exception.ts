import { HttpException } from '@nestjs/common';

/**
 * Machine codes understood by the error filter. Every code listed here has a
 * localized message in both supported languages; the filter maps any other
 * HTTP status to a sensible fallback code instead of leaking internals.
 */
export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'AUTH_INVALID'
  | 'AUTH_LOCKED'
  | 'PASSWORD_WEAK'
  | 'PHONE_INVALID'
  | 'PHOTO_TOO_LARGE'
  | 'PHOTO_TYPE'
  | 'EMAIL_TAKEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL';

/**
 * Application error carrying a machine code and optional extra response fields.
 *
 * The global HTTP exception filter turns it into the wire body
 * `{statusCode, code, message}` where `message` is looked up from the bilingual
 * message table for `code`. Keys of `details` are merged verbatim into that
 * body, which is how route-specific extras such as `attemptsRemaining` reach
 * the client without weakening the shared error shape.
 *
 * Extends the framework's `HttpException` so anything that only understands
 * framework exceptions still observes the correct status code.
 */
export class AppException extends HttpException {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ statusCode, code, ...(details ?? {}) }, statusCode);
    this.name = 'AppException';
  }
}
