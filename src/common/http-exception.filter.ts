import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { AppException, type ErrorCode } from './app.exception';

/** Languages the API answers in; the default is Indonesian. */
export type Language = 'id' | 'en';

/** One language's complete set of machine-code messages. */
export type ErrorMessageTable = Record<ErrorCode, string>;

type MessageTable = Readonly<Record<string, string | undefined>>;

const ID_MESSAGES = {
  AUTH_REQUIRED:
    'Anda belum masuk atau sesi Anda sudah berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki izin untuk melakukan aksi ini.',
  AUTH_INVALID: 'Email atau kata sandi salah.',
  AUTH_LOCKED:
    'Akun dikunci setelah terlalu banyak percobaan gagal. Coba lagi nanti.',
  PASSWORD_WEAK: 'Kata sandi tidak memenuhi persyaratan keamanan.',
  PHONE_INVALID: 'Nomor telepon tidak valid.',
  PHOTO_TOO_LARGE: 'Ukuran foto melebihi batas 2 MB.',
  PHOTO_TYPE: 'Jenis foto harus JPG atau PNG.',
  EMAIL_TAKEN: 'Email sudah terdaftar.',
  NOT_FOUND: 'Halaman atau data yang diminta tidak ditemukan.',
  BAD_REQUEST: 'Permintaan tidak valid.',
  METHOD_NOT_ALLOWED: 'Metode permintaan tidak diizinkan untuk resource ini.',
  CONFLICT: 'Permintaan bertentangan dengan data yang sudah ada.',
  PAYLOAD_TOO_LARGE: 'Ukuran permintaan terlalu besar.',
  UNSUPPORTED_MEDIA_TYPE: 'Jenis konten tidak didukung.',
  TOO_MANY_REQUESTS: 'Terlalu banyak permintaan. Coba lagi nanti.',
  INTERNAL: 'Terjadi kesalahan pada server. Silakan coba lagi.',
} satisfies ErrorMessageTable;

const EN_MESSAGES = {
  AUTH_REQUIRED:
    'You are not signed in or your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  AUTH_INVALID: 'Email or password is incorrect.',
  AUTH_LOCKED:
    'Account locked after too many failed attempts. Try again later.',
  PASSWORD_WEAK: 'Password does not meet the security requirements.',
  PHONE_INVALID: 'Phone number is invalid.',
  PHOTO_TOO_LARGE: 'Photo size exceeds the 2 MB limit.',
  PHOTO_TYPE: 'Photo must be a JPG or PNG image.',
  EMAIL_TAKEN: 'Email is already registered.',
  NOT_FOUND: 'The requested page or data was not found.',
  BAD_REQUEST: 'The request is invalid.',
  METHOD_NOT_ALLOWED: 'This HTTP method is not allowed for the resource.',
  CONFLICT: 'The request conflicts with existing data.',
  PAYLOAD_TOO_LARGE: 'The request payload is too large.',
  UNSUPPORTED_MEDIA_TYPE: 'Unsupported content type.',
  TOO_MANY_REQUESTS: 'Too many requests. Try again later.',
  INTERNAL: 'A server error occurred. Please try again later.',
} satisfies ErrorMessageTable;

/** Bilingual message table, indexed by machine code. */
export const ERROR_MESSAGES: Record<Language, MessageTable> = {
  id: ID_MESSAGES,
  en: EN_MESSAGES,
};

/** Used only for codes that have no table entry and no usable own message. */
const UNPROCESSABLE_MESSAGE: Record<Language, string> = {
  id: 'Permintaan tidak dapat diproses.',
  en: 'The request could not be processed.',
};

/** Framework statuses mapped to a machine code when the error carries none. */
const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'AUTH_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'TOO_MANY_REQUESTS',
};

/**
 * Picks the response language from `Accept-Language`: loosely parsed, the first
 * tag decides — anything starting with "en" (en, en-US, …) selects English,
 * everything else (including a missing header) falls back to Indonesian.
 */
export function resolveLanguage(
  header: string | string[] | undefined,
): Language {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) {
    return 'id';
  }
  const firstTag = raw.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
  return firstTag.startsWith('en') ? 'en' : 'id';
}

interface ErrorDescription {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;
  providedMessage?: string;
}

function codeForStatus(statusCode: number): ErrorCode | string {
  if (statusCode >= 500) {
    return 'INTERNAL';
  }
  return STATUS_TO_CODE[statusCode] ?? `HTTP_${statusCode}`;
}

function describeException(exception: unknown): ErrorDescription {
  if (exception instanceof AppException) {
    return {
      statusCode: exception.statusCode,
      code: exception.code,
      details: exception.details,
    };
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response: unknown = exception.getResponse();
    if (typeof response === 'string') {
      return {
        statusCode,
        code: codeForStatus(statusCode),
        providedMessage: response,
      };
    }
    if (typeof response === 'object' && response !== null) {
      const body = response as Record<string, unknown>;
      const code =
        typeof body.code === 'string' && body.code.length > 0
          ? body.code
          : codeForStatus(statusCode);
      const providedMessage =
        typeof body.message === 'string' ? body.message : undefined;
      return { statusCode, code, providedMessage };
    }
    return { statusCode, code: codeForStatus(statusCode) };
  }
  // Anything else (programming errors, driver failures, …) stays server-side.
  return { statusCode: 500, code: 'INTERNAL' };
}

function resolveMessage(
  description: ErrorDescription,
  language: Language,
): string {
  if (description.statusCode >= 500) {
    // Server faults always answer with one generic line; details never leave.
    return (
      ERROR_MESSAGES[language]['INTERNAL'] ?? UNPROCESSABLE_MESSAGE[language]
    );
  }
  const localized = ERROR_MESSAGES[language][description.code];
  if (localized) {
    return localized;
  }
  if (description.providedMessage) {
    return description.providedMessage;
  }
  return UNPROCESSABLE_MESSAGE[language];
}

/**
 * Global exception filter producing the shared error body
 * `{statusCode, code, message}` for every failure: `message` comes from the
 * bilingual table for `code` (localized through `Accept-Language`, default
 * Indonesian), `AppException` details are merged in as extra fields, and
 * anything unknown collapses to a generic 500 `INTERNAL` without stack traces
 * or internal text. Framework exceptions keep their status and are restated
 * with a machine code (404 → `NOT_FOUND`, …).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const response = http.getResponse<{
      status(code: number): { json(body: unknown): unknown };
    }>();

    const language = resolveLanguage(request?.headers?.['accept-language']);
    const description = describeException(exception);
    const message = resolveMessage(description, language);

    response.status(description.statusCode).json({
      statusCode: description.statusCode,
      code: description.code,
      message,
      ...description.details,
    });
  }
}
