/**
 * URL prefix every route of this service is mounted under. It lives here, next
 * to the other settings, because handlers build links to their own routes
 * (the photo URL, for example) and must not import the application root just
 * to learn it — that would make the module graph circular.
 */
export const GLOBAL_PREFIX = 'api/identity';

export interface AppConfig {
  port: number;
  databaseUrl: string;
  /**
   * URL of the primary domain database. Deployments name it
   * `DATABASE_URL_MAIN`; the older/compose `DATABASE_URL` name is accepted as a
   * fallback so either environment works without extra wiring.
   */
  databaseUrlMain: string;
  redisUrl: string;
  nodeEnv: string;
}

export function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function str(raw: string | undefined, fallback: string): string {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  return raw;
}

export const config: AppConfig = {
  port: num(process.env.PORT, 3001),
  databaseUrl: str(process.env.DATABASE_URL, ''),
  databaseUrlMain: str(
    process.env.DATABASE_URL_MAIN ?? process.env.DATABASE_URL,
    '',
  ),
  redisUrl: str(process.env.REDIS_URL, 'redis://localhost:6379'),
  nodeEnv: str(process.env.NODE_ENV, 'development'),
};

export interface MinioSettings {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSSL: boolean;
}

/**
 * Object-storage settings, read on demand rather than captured when this module
 * is first imported. The storage client is built once the application is
 * created, so anything that decides where MinIO lives — a deployment exporting
 * its variables late, or a test that has just probed which loopback port the
 * container publishes — still takes effect instead of silently falling back to
 * the defaults.
 */
export function minioSettings(): MinioSettings {
  return {
    endpoint: str(process.env.MINIO_ENDPOINT, 'localhost'),
    port: num(process.env.MINIO_PORT, 9000),
    accessKey: str(process.env.MINIO_ACCESS_KEY, 'minioadmin'),
    secretKey: str(process.env.MINIO_SECRET_KEY, 'minioadmin'),
    // Profile photos live in a private `photos` bucket by default; the
    // environment can still point the service at another one.
    bucket: str(process.env.MINIO_BUCKET, 'photos'),
    useSSL: ['true', '1'].includes(
      str(process.env.MINIO_USE_SSL, 'false').toLowerCase(),
    ),
  };
}

export interface AttendanceInternalSettings {
  /** Origin of the attendance service, without a trailing slash. */
  baseUrl: string;
  /** Shared secret presented on service-to-service calls. */
  token: string;
}

/**
 * Where the attendance service's internal endpoints live, read from the
 * environment on every call rather than captured once at start-up: a test
 * that points the service at a local stand-in takes effect without rebuilding
 * the application, and a deployment that rotates the address is picked up by
 * the next request. A trailing slash is trimmed so callers can join paths
 * without producing `//`.
 */
export function attendanceInternalSettings(): AttendanceInternalSettings {
  return {
    baseUrl: str(process.env.ATTENDANCE_INTERNAL_URL, 'http://localhost:3002').replace(
      /\/+$/,
      '',
    ),
    token: str(process.env.INTERNAL_API_TOKEN, ''),
  };
}
